#!/usr/bin/env python3
"""Onboard an existing YouTube channel; never create channels or upload videos."""
import argparse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import logging
import os
from pathlib import Path
import re
import secrets
import sys
import tempfile
import time
from urllib.parse import parse_qs, urlsplit
import uuid

from upload import (ROOT, SCOPE, Store, UploaderError, Vault, load_json,
                    secure_runtime, valid_client, valid_project)

AUTH_URIS = {"https://accounts.google.com/o/oauth2/auth", "https://accounts.google.com/o/oauth2/v2/auth"}
TOKEN_URI = "https://oauth2.googleapis.com/token"
CHANNEL_PATTERN = r"UC[A-Za-z0-9_-]{22}"
ALIAS_PATTERN = r"[a-z0-9][a-z0-9-]{0,63}"


def exact_scope(value):
    scopes = value.split() if isinstance(value, str) else value or []
    return set(scopes) == {SCOPE}


def write_private(path, value):
    fd, temporary = tempfile.mkstemp(prefix=".setup-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            json.dump(value, output, ensure_ascii=False, indent=2)
            output.write("\n")
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def desktop_config(value):
    installed = value.get("installed") if isinstance(value, dict) else None
    if (not isinstance(installed, dict) or "web" in value or not valid_project(installed.get("project_id"))
            or not valid_client(installed.get("client_id"))
            or not isinstance(installed.get("client_secret"), str) or not installed["client_secret"]
            or installed.get("auth_uri") not in AUTH_URIS
            or installed.get("token_uri") != TOKEN_URI):
        raise UploaderError("Expected your downloaded Google Desktop OAuth client with official Google endpoints.")
    return installed


def setup(root, source, execute):
    client = load_json(source)
    installed = desktop_config(client)
    result = {"result": "setup_preview", "project_id": installed["project_id"],
              "client_type": "Desktop", "scope": SCOPE, "state_writes": 0}
    if not execute:
        return result
    root = secure_runtime(root)
    with Store(root).locked("setup"):
        client_path, settings_path = root / "client_secret.json", root / "settings.json"
        if client_path.exists() or settings_path.exists():
            if (client_path.is_file() and not client_path.is_symlink() and settings_path.is_file()
                    and not settings_path.is_symlink() and load_json(client_path) == client):
                settings = load_json(settings_path)
                if (settings.get("project_id") == installed["project_id"]
                        and settings.get("client_id") == installed["client_id"]):
                    return result | {"result": "already_configured"}
            raise UploaderError("Runtime configuration already exists or differs. Inspect it; credential changes require a separate user handoff.")
        write_private(client_path, client)
        write_private(settings_path, {"version": 1, "project_id": installed["project_id"],
                                      "client_id": installed["client_id"], "channels": {}})
    return result | {"result": "configured", "state_writes": 2, "channel_grants": 0}


def read_settings(root):
    value = load_json(root / "settings.json")
    if (not isinstance(value, dict) or not valid_project(value.get("project_id"))
            or not valid_client(value.get("client_id")) or not isinstance(value.get("channels"), dict)):
        raise UploaderError("Invalid private settings. Preview setup with your own Desktop client first.")
    return value


def validate_target(alias, channel_id, name, account_email):
    if (not re.fullmatch(ALIAS_PATTERN, alias) or not re.fullmatch(CHANNEL_PATTERN, channel_id)
            or not name.strip() or len(name) > 100 or any(c in name for c in "\r\n\x00")
            or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", account_email)):
        raise UploaderError("Specify a simple alias, exact existing channel name/ID and intended Google account email.")


class QuietServer(HTTPServer):
    def handle_error(self, request, client_address):
        # BaseHTTPServer's default traceback can include callback credentials.
        self.local_error = True

    def get_request(self):
        request, address = super().get_request()
        request.settimeout(5)
        return request, address


class Callback(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        server = self.server
        parsed = urlsplit(self.path)
        if parsed.path == "/start" and not parsed.query and server.auth_url:
            self.send_response(302)
            self.send_header("Location", server.auth_url)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Referrer-Policy", "no-referrer")
            self.end_headers()
            return
        try:
            query = parse_qs(parsed.query, max_num_fields=20)
        except ValueError:
            query = {}
        received = query.get("state", [""])[0]
        valid = (parsed.path == "/callback" and bool(server.expected_state)
                 and secrets.compare_digest(received.encode("utf-8"), server.expected_state.encode("utf-8"))
                 and bool(query.get("code") or query.get("error"))
                 and server.response_uri is None and time.monotonic() < server.deadline)
        if valid:
            server.response_uri = server.redirect_uri + "?" + parsed.query
            server.denied = bool(query.get("error"))
        message = ("Response received. Return to your assistant or terminal for verification."
                   if valid else "This response is inactive. Use the current authorization window.")
        body = ('<!doctype html><html><head><meta charset="utf-8">'
                '<meta name="referrer" content="no-referrer">'
                '<title>YouTube authorization response</title>'
                '<script>history.replaceState(null,"","/complete");</script>'
                '</head><body><p>' + message + ' No video was uploaded.</p></body></html>').encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def confirm_channel(root, flow_id, channel_id, channel_name, execute):
    if not re.fullmatch(r"[a-f0-9]{32}", flow_id):
        raise UploaderError("Invalid flow ID; use the current nonsecret helper flow ID.")
    store = Store(root / "onboarding")
    active = store.load("active")
    if (not active or active.get("flow_id") != flow_id or active.get("expires_at", 0) <= time.time()
            or active.get("phase") not in ("waiting_for_browser", "waiting_for_confirmation")):
        raise UploaderError("Flow is stale, expired or complete. Do not reuse its callback; inspect current status.")
    if active.get("channel_id") != channel_id or active.get("channel_name") != channel_name:
        raise UploaderError("Confirmation differs from the intended channel. Nothing changed.")
    if execute:
        store.save(flow_id, {"flow_id": flow_id, "channel_id": channel_id,
                             "channel_name": channel_name, "confirmed": True})
    return {"result": "channel_confirmation_saved" if execute else "confirmation_preview",
            "channel_name": channel_name, "channel_id_api_verified": False}


def verify_grant(flow, previous, renew):
    token = flow.oauth2session.token
    credentials = flow.credentials
    if not exact_scope(token.get("scope") or credentials.granted_scopes) or not token.get("refresh_token"):
        raise UploaderError("A fresh upload-only offline grant was not returned. Existing token was retained.")
    if renew and token["refresh_token"] == previous.get("refresh_token"):
        raise UploaderError("Renewal did not return a different refresh token. Existing token was retained.")
    from google.auth.transport.requests import Request
    credentials.refresh(Request())
    if not credentials.valid:
        raise UploaderError("Non-upload refresh verification failed. Existing token was retained.")
    return credentials.to_json()


def connect(root, alias, channel_id, channel_name, account_email, renew, execute):
    validate_target(alias, channel_id, channel_name, account_email)
    settings = read_settings(root)
    existing_alias = settings["channels"].get(alias)
    if existing_alias and existing_alias.get("channel_id") != channel_id:
        raise UploaderError("Alias already belongs to another channel; refusing to replace it.")
    if any(k != alias and v.get("channel_id") == channel_id for k, v in settings["channels"].items()):
        raise UploaderError("Channel is already registered under another alias. Use its existing connection.")
    if existing_alias and not renew:
        return {"result": "already_registered", "next_step": "Use --renew only with approved fresh consent."}
    if not execute:
        return {"result": "connection_preview", "project_id": settings["project_id"],
                "alias": alias, "channel_name": channel_name, "channel_id": channel_id,
                "scope": SCOPE, "offline_access": True, "renewal": renew,
                "browser_started": False, "keychain_access": False}
    root = secure_runtime(root)
    onboarding = root / "onboarding"
    onboarding.mkdir(mode=0o700, exist_ok=True)
    store = Store(onboarding)
    with store.locked("connect"):
        vault = Vault(settings["project_id"], settings["client_id"])
        raw = vault.backend.get_password(vault.token_service, channel_id)
        previous = json.loads(raw) if raw else {}
        if raw and not renew:
            raise UploaderError("A Keychain entry already exists. Review it before any approved renewal; no browser started.")
        if renew and (previous.get("client_id") != settings["client_id"]
                      or not exact_scope(previous.get("scopes")) or not previous.get("refresh_token")):
            raise UploaderError("No matching upload-only connection exists for this renewal.")
        config = load_json(root / "client_secret.json")
        installed = desktop_config(config)
        if installed["project_id"] != settings["project_id"] or installed["client_id"] != settings["client_id"]:
            raise UploaderError("Private client configuration does not match settings. Nothing started.")
        from google_auth_oauthlib.flow import InstalledAppFlow
        flow = InstalledAppFlow.from_client_config(config, [SCOPE], autogenerate_code_verifier=True)
        flow_id = uuid.uuid4().hex
        active = {"flow_id": flow_id, "alias": alias, "channel_id": channel_id,
                  "channel_name": channel_name, "expires_at": time.time() + 1200,
                  "phase": "waiting_for_browser"}
        with QuietServer(("127.0.0.1", 0), Callback) as server:
            server.timeout = 1
            server.deadline = time.monotonic() + 1200
            server.response_uri, server.denied = None, False
            server.redirect_uri = f"http://127.0.0.1:{server.server_port}/callback"
            flow.redirect_uri = server.redirect_uri
            server.auth_url, server.expected_state = flow.authorization_url(
                access_type="offline", prompt="consent select_account",
                login_hint=account_email, include_granted_scopes="false")
            store.save("active", active)
            print(json.dumps({"result": "waiting_for_user", "flow_id": flow_id,
                "open_local_url": f"http://127.0.0.1:{server.server_port}/start",
                "channel_name": channel_name,
                "next_step": "Select the intended account/channel. A user must handle security warnings. Confirm the visible channel using confirm-channel."}), flush=True)
            try:
                while server.response_uri is None and time.monotonic() < server.deadline:
                    server.handle_request()
                if server.response_uri is None:
                    raise UploaderError("Authorization expired. Start a new approved flow; never reuse old callbacks.")
                if server.denied:
                    raise UploaderError("Google authorization was declined. No token was stored; do not automatically retry.")
                active["phase"] = "waiting_for_confirmation"
                store.save("active", active)
                print(json.dumps({"result": "callback_received",
                                  "flow_id": flow_id, "channel_confirmation_required": True}), flush=True)
                while time.monotonic() < server.deadline:
                    confirmation = store.load(flow_id)
                    if (confirmation and confirmation.get("confirmed") is True
                            and confirmation.get("flow_id") == flow_id
                            and confirmation.get("channel_id") == channel_id
                            and confirmation.get("channel_name") == channel_name):
                        break
                    time.sleep(1)
                else:
                    raise UploaderError("Channel confirmation expired. No token was stored; old connection retained.")
                # Keep the code/PKCE/state only in memory; oauthlib verifies state again.
                response = server.response_uri.replace("http://", "https://", 1)
                flow.fetch_token(authorization_response=response)
                payload = verify_grant(flow, previous, renew)
                vault.backend.set_password(vault.token_service, channel_id, payload)
                if vault.backend.get_password(vault.token_service, channel_id) != payload:
                    raise UploaderError("Keychain write could not be verified. Inspect before another authorization.")
                settings["channels"][alias] = {"name": channel_name, "channel_id": channel_id,
                    "connected": True, "channel_name_confirmed": True, "channel_id_api_verified": False,
                    "verified_at": datetime.now(timezone.utc).isoformat()}
                write_private(root / "settings.json", settings)
                active["phase"] = "complete"
                store.save("active", active)
                return {"result": "connected", "alias": alias, "channel_name": channel_name,
                    "upload_only_scope_verified": True, "fresh_refresh_token_returned": True,
                    "fresh_refresh_token_changed": renew, "refresh_verified": True,
                    "keychain_readback_verified": True, "channel_id_api_verified": False,
                    "channel_verification": "visible browser selection, explicitly confirmed; not API queried",
                    "videos_uploaded": 0}
            except BaseException:
                active["phase"] = "stopped"
                store.save("active", active)
                raise


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state-dir", type=Path, default=ROOT)
    commands = parser.add_subparsers(dest="command", required=True)
    setup_parser = commands.add_parser("setup", help="Preview/import your own downloaded Desktop client")
    setup_parser.add_argument("--client-config", type=Path, required=True)
    setup_parser.add_argument("--execute", action="store_true")
    register = commands.add_parser("connect", help="Preview/authorize one existing YouTube channel")
    for name in ["alias", "channel-id", "channel-name", "account-email"]:
        register.add_argument("--" + name, required=True)
    register.add_argument("--renew", action="store_true")
    register.add_argument("--execute", action="store_true")
    confirm = commands.add_parser("confirm-channel", help="Record a freshly observed browser channel selection")
    for name in ["flow-id", "channel-id", "channel-name"]:
        confirm.add_argument("--" + name, required=True)
    confirm.add_argument("--execute", action="store_true")
    commands.add_parser("status", help="Read configured aliases; never print credentials")
    args = parser.parse_args(argv)
    os.umask(0o077)
    logging.disable(logging.CRITICAL)
    root = args.state_dir.expanduser()
    try:
        if args.command == "setup":
            result = setup(root, args.client_config.expanduser(), args.execute)
        elif args.command == "connect":
            result = connect(root, args.alias, args.channel_id, args.channel_name,
                             args.account_email, args.renew, args.execute)
        elif args.command == "confirm-channel":
            result = confirm_channel(root, args.flow_id, args.channel_id, args.channel_name, args.execute)
        else:
            settings = read_settings(root)
            result = {"project_id": settings["project_id"], "channels": settings["channels"],
                      "credentials_checked": False}
        print(json.dumps(result, indent=2))
        return 0
    except UploaderError as exc:
        print(json.dumps({"result": "stopped", "error": str(exc)}), file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("Authorization stopped. Do not reuse its callback. Inspect status before retrying; do not assume token storage completed.", file=sys.stderr)
        return 130
    except Exception:
        print("Onboarding stopped safely. Inspect nonsecret status before retrying; no raw OAuth/Keychain error is displayed.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
