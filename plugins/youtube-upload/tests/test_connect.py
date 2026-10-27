import contextlib
import io
import json
from pathlib import Path
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

import connect as c
import upload as u

CHANNEL = "UC0000000000000000000000"
CLIENT = "example-client.apps.googleusercontent.com"
PROJECT = "example-project"
FLOW = "a" * 32


def client_config():
    # These are fabricated values, never a real Google credential.
    return {"installed": {"project_id": PROJECT, "client_id": CLIENT,
            "client_secret": "FAKE_TEST_ONLY_NOT_A_CREDENTIAL",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": c.TOKEN_URI, "redirect_uris": ["http://localhost"]}}


class ConnectTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.state = self.root / "private"
        self.source = self.root / "fake-client.json"
        self.source.write_text(json.dumps(client_config()))

    def tearDown(self):
        self.temporary.cleanup()

    def setup_private(self):
        return c.setup(self.state, self.source, True)

    def test_setup_preview_no_writes_or_secret_output(self):
        result = c.setup(self.state, self.source, False)
        self.assertEqual(result["result"], "setup_preview")
        self.assertFalse(self.state.exists())
        self.assertNotIn("FAKE_TEST", json.dumps(result))

    def test_setup_execute_private_and_idempotent(self):
        self.assertEqual(self.setup_private()["result"], "configured")
        self.assertEqual(self.state.stat().st_mode & 0o777, 0o700)
        for name in ["settings.json", "client_secret.json"]:
            self.assertEqual((self.state / name).stat().st_mode & 0o777, 0o600)
        self.assertEqual(c.setup(self.state, self.source, True)["result"], "already_configured")
        self.assertEqual(c.read_settings(self.state)["channels"], {})

    def test_setup_different_client_refused_no_overwrite(self):
        self.setup_private()
        original = (self.state / "client_secret.json").read_bytes()
        value = client_config()
        value["installed"]["client_secret"] = "FAKE_DIFFERENT_TEST_VALUE"
        self.source.write_text(json.dumps(value))
        with self.assertRaisesRegex(c.UploaderError, "already exists or differs"):
            c.setup(self.state, self.source, True)
        self.assertEqual((self.state / "client_secret.json").read_bytes(), original)

    def test_reject_web_client_and_non_google_endpoints(self):
        for value in [{"web": client_config()["installed"]},
                      client_config() | {"web": {"auth_uri": "https://evil.example/auth"}},
                      {"installed": client_config()["installed"] | {"auth_uri": "https://evil.example/auth"}},
                      {"installed": client_config()["installed"] | {"token_uri": "https://evil.example/token"}}]:
            with self.assertRaises(c.UploaderError):
                c.desktop_config(value)

    def test_runtime_inside_git_or_plugin_rejected(self):
        (self.root / ".git").mkdir()
        with self.assertRaisesRegex(c.UploaderError, "outside Git"):
            u.secure_runtime(self.state)
        with self.assertRaisesRegex(c.UploaderError, "outside the installed plugin"):
            u.secure_runtime(Path(c.__file__).resolve().parent / "runtime")

    def test_invalid_target_rejected(self):
        for alias, channel, name, account in [("../escape", CHANNEL, "Example", "owner@example.com"),
                ("example", "bad", "Example", "owner@example.com"),
                ("example", CHANNEL, "", "owner@example.com"),
                ("example", CHANNEL, "Example", "missing-account")]:
            with self.assertRaises(c.UploaderError):
                c.validate_target(alias, channel, name, account)

    def test_connect_preview_no_browser_or_vault(self):
        self.setup_private()
        with patch.object(c, "Vault", side_effect=AssertionError("must not read Keychain")):
            result = c.connect(self.state, "example", CHANNEL, "Example", "owner@example.com", False, False)
        self.assertFalse(result["browser_started"])
        self.assertFalse(result["keychain_access"])

    def test_existing_alias_never_silently_changes_channel(self):
        self.setup_private()
        settings = c.read_settings(self.state)
        settings["channels"]["example"] = {"name": "Example", "channel_id": CHANNEL, "connected": True}
        c.write_private(self.state / "settings.json", settings)
        with self.assertRaisesRegex(c.UploaderError, "another channel"):
            c.connect(self.state, "example", "UC1111111111111111111111", "Other", "owner@example.com", True, True)
        result = c.connect(self.state, "example", CHANNEL, "Example", "owner@example.com", False, True)
        self.assertEqual(result["result"], "already_registered")

    def active(self):
        u.private_directory(self.state)
        store = u.Store(self.state / "onboarding")
        u.private_directory(store.root)
        value = {"flow_id": FLOW, "channel_id": CHANNEL, "channel_name": "Example",
                 "phase": "waiting_for_browser", "expires_at": time.time() + 1200}
        store.save("active", value)
        return store, value

    def test_fresh_channel_confirmation_matches_flow_and_target(self):
        store, _ = self.active()
        preview = c.confirm_channel(self.state, FLOW, CHANNEL, "Example", False)
        self.assertEqual(preview["result"], "confirmation_preview")
        self.assertIsNone(store.load(FLOW))
        c.confirm_channel(self.state, FLOW, CHANNEL, "Example", True)
        self.assertTrue(store.load(FLOW)["confirmed"])
        with self.assertRaisesRegex(c.UploaderError, "differs"):
            c.confirm_channel(self.state, FLOW, CHANNEL, "Wrong Name", True)

    def test_stale_expired_and_completed_confirmation_rejected(self):
        store, value = self.active()
        with self.assertRaisesRegex(c.UploaderError, "stale"):
            c.confirm_channel(self.state, "b" * 32, CHANNEL, "Example", True)
        for changes in [{"expires_at": time.time() - 1}, {"phase": "complete"}, {"phase": "stopped"}]:
            store.save("active", value | changes)
            with self.assertRaisesRegex(c.UploaderError, "stale"):
                c.confirm_channel(self.state, FLOW, CHANNEL, "Example", True)

    def callback(self, path, **changes):
        server = SimpleNamespace(auth_url="https://accounts.google.com/o/oauth2/auth?state=FAKE",
            expected_state="FAKE_CURRENT_STATE", response_uri=None, denied=False,
            redirect_uri="http://127.0.0.1:12345/callback", deadline=time.monotonic() + 60)
        for key, value in changes.items():
            setattr(server, key, value)
        handler = object.__new__(c.Callback)
        handler.server, handler.path, handler.wfile = server, path, io.BytesIO()
        handler.send_response = Mock()
        handler.send_header = Mock()
        handler.end_headers = Mock()
        handler.do_GET()
        return handler, server

    def test_callback_state_and_pkce_response_never_rendered(self):
        handler, server = self.callback("/callback?state=FAKE_CURRENT_STATE&code=FAKE_CODE")
        self.assertIn("FAKE_CODE", server.response_uri)  # memory only
        body = handler.wfile.getvalue().decode()
        self.assertNotIn("FAKE_CODE", body)
        self.assertNotIn("FAKE_CURRENT_STATE", body)
        self.assertIn('history.replaceState(null,"","/complete")', body)
        self.assertIn('<title>YouTube authorization response</title>', body)
        handler.send_header.assert_any_call("Content-Type", "text/html; charset=utf-8")
        handler.send_header.assert_any_call("Cache-Control", "no-store")
        handler.send_header.assert_any_call("Referrer-Policy", "no-referrer")

    def test_stale_unicode_expired_replayed_callbacks_ignored(self):
        for path, changes in [("/callback?state=OLD&code=FAKE", {}),
                ("/callback?state=%C3%A9&code=FAKE", {}),
                ("/callback?state=FAKE_CURRENT_STATE&code=FAKE", {"deadline": time.monotonic() - 1}),
                ("/callback?state=FAKE_CURRENT_STATE&code=FAKE", {"response_uri": "ALREADY_RECEIVED"})]:
            handler, server = self.callback(path, **changes)
            self.assertEqual(server.response_uri, changes.get("response_uri"))
            self.assertIn(b"inactive", handler.wfile.getvalue())

    def test_google_denial_captured_without_token_exchange(self):
        _, server = self.callback("/callback?state=FAKE_CURRENT_STATE&error=access_denied")
        self.assertTrue(server.denied)

    def test_callback_logging_and_server_tracebacks_suppressed(self):
        output = io.StringIO()
        with contextlib.redirect_stderr(output), contextlib.redirect_stdout(output):
            c.Callback.log_message(None, "FAKE_CODE")
            server = object.__new__(c.QuietServer)
            c.QuietServer.handle_error(server, None, None)
        self.assertEqual(output.getvalue(), "")
        self.assertTrue(server.local_error)

    def test_start_page_redirect_keeps_authorization_url_out_of_body(self):
        handler, server = self.callback("/start")
        handler.send_response.assert_called_once_with(302)
        handler.send_header.assert_any_call("Location", server.auth_url)
        self.assertEqual(handler.wfile.getvalue(), b"")

    def flow(self, token=None, granted=None):
        credentials = Mock()
        credentials.valid = True
        credentials.granted_scopes = granted
        credentials.to_json.return_value = "FAKE_SERIALIZED_TOKEN"
        return SimpleNamespace(oauth2session=SimpleNamespace(token=token or {}), credentials=credentials)

    def test_fresh_scope_exact_refresh_and_changed_refresh_required(self):
        for token in [{"scope": u.SCOPE}, {"scope": u.SCOPE + " extra", "refresh_token": "FAKE_NEW"}]:
            with self.assertRaisesRegex(c.UploaderError, "fresh upload-only"):
                c.verify_grant(self.flow(token), {}, False)
        flow = self.flow({"scope": u.SCOPE, "refresh_token": "FAKE_SAME"})
        with self.assertRaisesRegex(c.UploaderError, "different refresh token"):
            c.verify_grant(flow, {"refresh_token": "FAKE_SAME"}, True)
        flow.credentials.refresh.assert_not_called()

    def test_non_upload_refresh_verified_before_payload_return(self):
        flow = self.flow({"scope": u.SCOPE, "refresh_token": "FAKE_NEW"})
        self.assertEqual(c.verify_grant(flow, {"refresh_token": "FAKE_OLD"}, True), "FAKE_SERIALIZED_TOKEN")
        flow.credentials.refresh.assert_called_once()
        flow.credentials.valid = False
        with self.assertRaisesRegex(c.UploaderError, "refresh verification failed"):
            c.verify_grant(flow, {}, False)

    def test_cli_suppresses_raw_oauth_exception(self):
        with patch.object(c, "setup", side_effect=RuntimeError("FAKE_CODE_TOKEN_SECRET")), \
             contextlib.redirect_stderr(io.StringIO()) as output:
            code = c.main(["setup", "--client-config", str(self.source)])
        self.assertEqual(code, 2)
        self.assertNotIn("FAKE_CODE_TOKEN_SECRET", output.getvalue())
        self.assertNotIn("Traceback", output.getvalue())

    def test_complete_onboarding_with_fake_browser_token_and_keychain(self):
        self.setup_private()
        flow = self.flow({"scope": u.SCOPE, "refresh_token": "FAKE_NEW"})
        flow.authorization_url = Mock(return_value=("https://accounts.google.com/o/oauth2/auth?state=FAKE_STATE", "FAKE_STATE"))
        flow.fetch_token = Mock()
        backend = Mock()
        backend.get_password.side_effect = [None, "FAKE_SERIALIZED_TOKEN"]
        vault = SimpleNamespace(backend=backend, token_service="YouTubeUpload.tokens." + PROJECT)
        root = self.state

        class FakeServer:
            server_port = 12345

            def __init__(self, *args):
                pass

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def handle_request(self):
                self.response_uri = self.redirect_uri + "?state=FAKE_STATE&code=FAKE_CALLBACK_CODE"
                active = u.Store(root / "onboarding").load("active")
                c.confirm_channel(root, active["flow_id"], CHANNEL, "Example", True)

        output = io.StringIO()
        with patch.object(c, "Vault", return_value=vault), patch.object(c, "QuietServer", FakeServer), \
             patch('google_auth_oauthlib.flow.InstalledAppFlow.from_client_config', return_value=flow) as factory, \
             contextlib.redirect_stdout(output):
            result = c.connect(root, "example", CHANNEL, "Example", "owner@example.com", False, True)
        factory.assert_called_once_with(client_config(), [u.SCOPE], autogenerate_code_verifier=True)
        flow.authorization_url.assert_called_once_with(access_type="offline", prompt="consent select_account",
            login_hint="owner@example.com", include_granted_scopes="false")
        flow.fetch_token.assert_called_once()
        backend.set_password.assert_called_once()
        self.assertEqual(result["result"], "connected")
        self.assertTrue(result["keychain_readback_verified"])
        self.assertTrue(c.read_settings(root)["channels"]["example"]["connected"])
        for sensitive in ["FAKE_CALLBACK_CODE", "FAKE_SERIALIZED_TOKEN", "FAKE_STATE", "client_secret"]:
            self.assertNotIn(sensitive, output.getvalue())

    def test_denied_onboarding_never_exchanges_or_stores(self):
        self.setup_private()
        flow = self.flow({"scope": u.SCOPE, "refresh_token": "FAKE_NEW"})
        flow.authorization_url = Mock(return_value=("https://accounts.google.com/o/oauth2/auth?state=FAKE_STATE", "FAKE_STATE"))
        flow.fetch_token = Mock()
        backend = Mock()
        backend.get_password.return_value = None
        vault = SimpleNamespace(backend=backend, token_service="YouTubeUpload.tokens." + PROJECT)

        class DeniedServer:
            server_port = 12345
            def __init__(self, *args): pass
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def handle_request(self):
                self.response_uri = self.redirect_uri + "?state=FAKE_STATE&error=access_denied"
                self.denied = True

        with patch.object(c, "Vault", return_value=vault), patch.object(c, "QuietServer", DeniedServer), \
             patch('google_auth_oauthlib.flow.InstalledAppFlow.from_client_config', return_value=flow), \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(c.UploaderError, "declined"):
                c.connect(self.state, "example", CHANNEL, "Example", "owner@example.com", False, True)
        flow.fetch_token.assert_not_called()
        backend.set_password.assert_not_called()
        self.assertEqual(c.read_settings(self.state)["channels"], {})


if __name__ == "__main__":
    unittest.main()
