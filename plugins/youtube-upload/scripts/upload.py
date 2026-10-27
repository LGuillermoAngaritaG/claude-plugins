#!/usr/bin/env python3
"""Personal Mac uploader. No network or Keychain access without --execute."""
import argparse
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
try:
    import fcntl
except ImportError:
    fcntl = None
import hashlib
import json
import logging
import mimetypes
import os
from pathlib import Path
import random
import re
import stat
import sys
import tempfile
import time
from urllib.parse import urlsplit

ROOT = Path.home() / "Library/Application Support/YouTubeUpload"
SCOPE = "https://www.googleapis.com/auth/youtube.upload"
UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
THUMBNAIL_URL = "https://www.googleapis.com/upload/youtube/v3/thumbnails/set"
CHUNK_SIZE = 8 * 1024 * 1024
RETRY_STATUSES = {408, 429, 500, 502, 503, 504}
SAFE_REASONS = {
    "quotaExceeded", "dailyLimitExceeded", "uploadLimitExceeded", "forbidden",
    "insufficientPermissions", "invalidTitle", "invalidDescription", "invalidTags",
    "invalidCategoryId", "invalidPublishAt", "invalidVideoMetadata", "invalidImage",
    "mediaBodyRequired", "uploadRateLimitExceeded", "videoNotFound", "badRequest",
    "unsupportedMediaFormat", "invalidVideo", "rateLimitExceeded",
}


class UploaderError(Exception):
    """Only our own nonsecret messages may cross the CLI boundary."""


class ApiError(UploaderError):
    def __init__(self, message, retryable=False, retry_after=0):
        super().__init__(message)
        self.retryable = retryable
        self.retry_after = retry_after


def valid_project(value):
    return isinstance(value, str) and re.fullmatch(r"[a-z][a-z0-9-]{4,61}[a-z0-9]", value) is not None


def valid_client(value):
    return isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9._-]+\.apps\.googleusercontent\.com", value) is not None


def secure_runtime(path):
    resolved = path.expanduser().resolve()
    plugin = Path(__file__).resolve().parent.parent
    if resolved == plugin or plugin in resolved.parents:
        raise UploaderError("Runtime credentials/state must stay outside the installed plugin.")
    if any((parent / ".git").exists() for parent in [resolved, *resolved.parents]):
        raise UploaderError("Runtime credentials/state must stay outside Git repositories.")
    private_directory(resolved)
    if resolved.stat().st_uid != os.getuid():
        raise UploaderError("Runtime directory must belong to the current user.")
    return resolved


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest_file(path):
    value = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(CHUNK_SIZE), b""):
            value.update(chunk)
    return value.hexdigest()


def load_json(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise UploaderError("JSON contains a duplicate field.")
            result[key] = value
        return result
    try:
        if path.stat().st_size > 1024 * 1024:
            raise UploaderError("JSON exceeds 1 MiB.")
        return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique)
    except (OSError, ValueError, UnicodeError):
        raise UploaderError("Cannot read valid UTF-8 JSON.") from None


def regular_file(value, label, maximum):
    try:
        path = Path(value).expanduser().resolve(strict=True)
        info = path.stat()
        if not stat.S_ISREG(info.st_mode) or not 0 < info.st_size <= maximum:
            raise UploaderError(label + " must be a nonempty regular file within the size limit.")
        return path
    except (OSError, TypeError, ValueError):
        raise UploaderError(label + " file is missing or unreadable.") from None


def publication_time(value, now):
    if (not isinstance(value, str) or not re.fullmatch(
            r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})", value)):
        raise UploaderError("publish_at needs RFC3339 date/time with Z or an explicit timezone offset.")
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        raise UploaderError("publish_at is not a valid date/time.") from None
    # Prevent a past timestamp (which YouTube treats as immediate publication).
    if result < now + timedelta(minutes=10):
        raise UploaderError("publish_at must be at least 10 minutes in the future; allow time for upload/processing.")
    return result.isoformat(timespec="microseconds").replace("+00:00", "Z")


@dataclass
class Plan:
    video: Path
    channel: dict
    body: dict
    notify: bool
    thumbnail: Path | None
    thumbnail_mime: str | None
    thumbnail_hash: str | None
    size: int
    identity: tuple
    file_hash: str
    job_id: str
    plan_hash: str

    def check_file(self):
        info = self.video.stat()
        if (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns) != self.identity:
            raise UploaderError("Video changed during preparation/upload. Stop and inspect the existing job.")


def prepare(video, metadata, alias, config, now=None):
    now = now or datetime.now(timezone.utc)
    if (not isinstance(config, dict) or not valid_project(config.get("project_id"))
            or not valid_client(config.get("client_id"))
            or not isinstance(config.get("channels"), dict)):
        raise UploaderError("Invalid project/client/channel settings. Run the approved onboarding setup.")
    channel = config["channels"].get(alias)
    if (not isinstance(channel, dict) or channel.get("connected") is not True
            or not re.fullmatch(r"UC[A-Za-z0-9_-]{22}", channel.get("channel_id", ""))):
        raise UploaderError("Unknown or unconnected channel alias. Only approved configured connections may upload.")
    if not isinstance(metadata, dict):
        raise UploaderError("Metadata must be a JSON object.")
    allowed = {"title", "description", "tags", "category_id", "made_for_kids", "privacy",
               "publish_at", "thumbnail", "video_type", "notify_subscribers", "contains_synthetic_media"}
    if set(metadata) - allowed:
        raise UploaderError("Unknown metadata field. See example.metadata.json for supported names.")
    title = metadata.get("title")
    if not isinstance(title, str) or not title.strip() or len(title) > 100 or any(c in title for c in "<>\x00"):
        raise UploaderError("title must contain 1–100 characters, excluding <, > and NUL.")
    description = metadata.get("description", "")
    if (not isinstance(description, str) or len(description.encode("utf-8")) > 5000
            or any(c in description for c in "<>\x00")):
        raise UploaderError("description must be at most 5000 UTF-8 bytes, excluding <, > and NUL.")
    tags = metadata.get("tags", [])
    if (not isinstance(tags, list) or any(not isinstance(t, str) or not t.strip()
            or any(c in t for c in "<>\x00") for t in tags)):
        raise UploaderError("tags must be a list of nonempty strings.")
    if sum(len(t) + (2 if " " in t else 0) for t in tags) + max(0, len(tags) - 1) > 500:
        raise UploaderError("tags exceed YouTube's 500-character limit including commas/space quoting.")
    category = metadata.get("category_id")
    if not isinstance(category, str) or not re.fullmatch(r"[1-9]\d{0,3}", category):
        raise UploaderError("category_id must be an explicit numeric string for a YouTube video category.")
    if type(metadata.get("made_for_kids")) is not bool:
        raise UploaderError("Set made_for_kids explicitly to true or false; no audience is inferred.")
    privacy = metadata.get("privacy", "private")
    if privacy not in ("private", "unlisted", "public"):
        raise UploaderError("privacy must be private, unlisted or public.")
    status = {"privacyStatus": privacy, "selfDeclaredMadeForKids": metadata["made_for_kids"]}
    if "publish_at" in metadata:
        if privacy != "private":
            raise UploaderError("A scheduled upload must start private. publish_at later makes it public.")
        status["publishAt"] = publication_time(metadata["publish_at"], now)
    for local, remote in [("contains_synthetic_media", "containsSyntheticMedia")]:
        if local in metadata:
            if type(metadata[local]) is not bool:
                raise UploaderError(local + " must be a boolean.")
            status[remote] = metadata[local]
    notify = metadata.get("notify_subscribers", False)
    if type(notify) is not bool:
        raise UploaderError("notify_subscribers must be a boolean.")
    kind = metadata.get("video_type")
    if kind is not None and kind not in ("long", "short"):
        raise UploaderError("video_type must be long or short.")
    thumbnail, thumbnail_mime, thumb_hash = None, None, None
    if "thumbnail" in metadata:
        if kind != "long":
            raise UploaderError("API thumbnails require video_type=long. Custom Shorts thumbnails use Studio on desktop; API support is unverified.")
        thumbnail = regular_file(metadata["thumbnail"], "Thumbnail", 50 * 1024 * 1024)
        with thumbnail.open("rb") as image:
            header = image.read(12)
        if header.startswith(b"\x89PNG\r\n\x1a\n"):
            thumbnail_mime = "image/png"
        elif header.startswith(b"\xff\xd8\xff"):
            thumbnail_mime = "image/jpeg"
        else:
            raise UploaderError("Thumbnail must have a JPEG or PNG signature, not just a matching extension.")
        thumb_hash = digest_file(thumbnail)
    video = regular_file(video, "Video", 256_000_000_000)
    info = video.stat()
    identity = (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns)
    file_hash = digest_file(video)
    body = {"snippet": {"title": title, "description": description, "tags": tags, "categoryId": category},
            "status": status}
    job_id = hashlib.sha256((channel["channel_id"] + ":" + file_hash).encode()).hexdigest()
    plan_hash = hashlib.sha256(canonical({"body": body, "notify": notify, "thumbnail": thumb_hash,
                                         "video_type": kind}).encode()).hexdigest()
    plan = Plan(video, channel, body, notify, thumbnail, thumbnail_mime, thumb_hash, info.st_size,
                identity, file_hash, job_id, plan_hash)
    plan.check_file()
    return plan


def private_directory(path):
    if path.is_symlink():
        raise UploaderError("Private state directory must not be a symlink.")
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    if stat.S_IMODE(path.stat().st_mode) & 0o077:
        raise UploaderError("Private state directory must have mode 700.")


class Store:
    def __init__(self, root):
        self.root = root

    @contextmanager
    def locked(self, job):
        if fcntl is None:
            raise UploaderError("Secure job locking requires POSIX; credential/upload execution currently targets macOS.")
        private_directory(self.root)
        fd = os.open(self.root / (job + ".lock"), os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
        try:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise UploaderError("Another process owns this video/channel job. No upload started.") from None
            yield
        finally:
            os.close(fd)

    def load(self, job):
        path = self.root / (job + ".json")
        if not path.exists():
            return None
        if path.is_symlink() or stat.S_IMODE(path.stat().st_mode) & 0o077:
            raise UploaderError("Upload receipt must be a private regular file (mode 600).")
        return load_json(path)

    def save(self, job, value):
        value["updated_at"] = datetime.now(timezone.utc).isoformat()
        fd, temporary = tempfile.mkstemp(prefix=".receipt-", dir=self.root)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as output:
                output.write(canonical(value) + "\n")
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, self.root / (job + ".json"))
            directory = os.open(self.root, os.O_RDONLY)
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


class Vault:
    def __init__(self, project_id, client_id):
        self.project_id = project_id
        self.client_id = client_id
        self.token_service = "YouTubeUpload.tokens." + project_id
        self.session_service = "YouTubeUpload.resumable." + project_id
        if sys.platform != "darwin":
            raise UploaderError("This configuration requires macOS Keychain.")
        from keyring.backends.macOS import Keyring
        self.backend = Keyring()

    def get_session(self, job):
        return self.backend.get_password(self.session_service, job)

    def set_session(self, job, uri):
        self.backend.set_password(self.session_service, job, uri)
        if self.get_session(job) != uri:
            raise UploaderError("Resumable session could not be verified in Keychain. Stop and inspect this job.")

    def session(self, channel):
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import AuthorizedSession, Request
        try:
            raw = self.backend.get_password(self.token_service, channel["channel_id"])
            value = json.loads(raw) if raw else {}
            scopes = value.get("scopes", [])
            scopes = scopes.split() if isinstance(scopes, str) else scopes
            if (value.get("client_id") != self.client_id or set(scopes) != {SCOPE}
                    or value.get("token_uri") != "https://oauth2.googleapis.com/token"
                    or not value.get("refresh_token")):
                raise UploaderError("Channel lacks the approved upload-only Keychain connection.")
            credentials = Credentials.from_authorized_user_info(value, scopes=[SCOPE])
            if not credentials.valid:
                credentials.refresh(Request())
            if not credentials.valid:
                raise UploaderError("Channel credentials are not valid. Reconnect through the approved helper.")
            payload = credentials.to_json()
            self.backend.set_password(self.token_service, channel["channel_id"], payload)
            if self.backend.get_password(self.token_service, channel["channel_id"]) != payload:
                raise UploaderError("Refreshed Keychain entry could not be verified.")
            return AuthorizedSession(credentials)
        except UploaderError:
            raise
        except Exception:
            raise UploaderError("Cannot access or refresh this channel's Keychain connection. No upload started.") from None


def session_uri(uri):
    if not isinstance(uri, str):
        raise UploaderError("Missing resumable session. Inspect the job before starting another upload.")
    parsed = urlsplit(uri)
    if (parsed.scheme != "https" or parsed.netloc != "www.googleapis.com"
            or parsed.path != "/upload/youtube/v3/videos" or not parsed.query or parsed.fragment):
        raise UploaderError("Unexpected resumable endpoint; no credentials or media sent there.")
    return uri


def retry_after(response):
    value = response.headers.get("Retry-After", "0")
    try:
        seconds = float(value)
    except ValueError:
        try:
            seconds = (parsedate_to_datetime(value) - datetime.now(timezone.utc)).total_seconds()
        except (TypeError, ValueError, OverflowError):
            seconds = 0
    if not 0 <= seconds <= 60:
        raise UploaderError("YouTube requested a longer retry delay. Wait and rerun the same command; the existing job is retained.")
    return seconds


def reject_response(response):
    status = response.status_code
    reason = ""
    try:
        errors = response.json().get("error", {}).get("errors", [])
        if errors and errors[0].get("reason") in SAFE_REASONS:
            reason = ": " + errors[0]["reason"]
    except (ValueError, TypeError, AttributeError):
        pass
    raise ApiError("YouTube rejected the request (HTTP " + str(status) + ")" + reason,
                   status in RETRY_STATUSES, retry_after(response))


class Api:
    def __init__(self, session):
        self.session = session

    def call(self, method, url, **kwargs):
        from requests.exceptions import RequestException
        try:
            return self.session.request(method, url, timeout=(15, 120), allow_redirects=False, **kwargs)
        except RequestException:
            raise ApiError("Network request interrupted; the job is retained for safe resumption.", True) from None

    def initiate(self, plan):
        mime = mimetypes.guess_type(plan.video.name)[0]
        if not mime or not mime.startswith("video/"):
            mime = "application/octet-stream"
        result = self.call("POST", UPLOAD_URL,
            params={"uploadType": "resumable", "part": "snippet,status",
                    "notifySubscribers": str(plan.notify).lower(),
                    "fields": "id,snippet/channelId,status/privacyStatus,status/publishAt,status/uploadStatus"},
            headers={"X-Upload-Content-Length": str(plan.size), "X-Upload-Content-Type": mime},
            json=plan.body)
        if result.status_code not in (200, 201):
            reject_response(result)
        return session_uri(result.headers.get("Location"))

    def probe(self, uri, size):
        return self.call("PUT", session_uri(uri), headers={"Content-Length": "0", "Content-Range": f"bytes */{size}"}, data=b"")

    def chunk(self, uri, data, offset, size):
        return self.call("PUT", session_uri(uri), data=data,
                         headers={"Content-Length": str(len(data)),
                                  "Content-Range": f"bytes {offset}-{offset + len(data) - 1}/{size}"})

    def thumbnail(self, plan, video_id):
        # Setting the same thumbnail on an existing video is safe to retry; it never inserts a video.
        with plan.thumbnail.open("rb") as image:
            data = image.read(50 * 1024 * 1024 + 1)
        if hashlib.sha256(data).hexdigest() != plan.thumbnail_hash:
            raise UploaderError("Thumbnail changed during the upload. Video is retained; inspect it in Studio.")
        # Bytes can be replayed intact if AuthorizedSession refreshes after a 401.
        response = self.call("POST", THUMBNAIL_URL,
            params={"uploadType": "media", "videoId": video_id}, data=data,
            headers={"Content-Type": plan.thumbnail_mime})
        if response.status_code not in (200, 201):
            reject_response(response)


def retry_delay(attempt):
    return min(32.0, 2**attempt + random.random())


def run_upload(plan, store, vault, api_factory, sleep=time.sleep, retries=5):
    """Persist intent before any POST; never create a second session for an existing job."""
    with store.locked(plan.job_id):
        record = store.load(plan.job_id)
        if record and (record.get("plan_hash") != plan.plan_hash
                       or record.get("channel_id") != plan.channel["channel_id"]):
            raise UploaderError("This video/channel already has a job with different metadata. Inspect its receipt/Studio; do not bypass duplicate protection.")
        if record and record.get("phase") in ("needs_review", "channel_mismatch"):
            raise UploaderError("This job requires manual review in YouTube Studio. No new video was created.")
        if record and record.get("video_id") and record.get("thumbnail") in ("done", "not_requested"):
            return {"result": "already_uploaded", "job_id": plan.job_id, "video_id": record["video_id"]}
        api = api_factory()
        if record is None:
            if vault.get_session(plan.job_id):
                raise UploaderError("A saved session exists without its receipt. Inspect Studio; refusing to create another upload.")
            record = {"version": 1, "job_id": plan.job_id, "plan_hash": plan.plan_hash,
                      "channel_id": plan.channel["channel_id"], "file_sha256": plan.file_hash,
                      "phase": "initiating", "bytes_sent": 0,
                      "thumbnail": "pending" if plan.thumbnail else "not_requested"}
            store.save(plan.job_id, record)
            # Ambiguous initiation is deliberately not retried automatically.
            plan.check_file()
            uri = api.initiate(plan)
            vault.set_session(plan.job_id, uri)
            record["phase"] = "uploading"
            store.save(plan.job_id, record)
        else:
            uri = None if record.get("video_id") else vault.get_session(plan.job_id)
            if not record.get("video_id") and not uri:
                raise UploaderError("Interrupted initiation has no saved session. Inspect Studio and the receipt; refusing to start another upload.")
        if not record.get("video_id"):
            uri = session_uri(uri)
            failures, stalled, offset, probe = 0, 0, 0, True
            with plan.video.open("rb") as video:
                while not record.get("video_id"):
                    plan.check_file()
                    try:
                        if probe:
                            response = api.probe(uri, plan.size)
                        else:
                            if offset >= plan.size:
                                raise UploaderError("Server reported all bytes without a video ID. Inspect this session; no new upload will be started.")
                            video.seek(offset)
                            data = video.read(min(CHUNK_SIZE, plan.size - offset))
                            if not data:
                                raise UploaderError("Video cannot be read completely. Existing job retained.")
                            response = api.chunk(uri, data, offset, plan.size)
                        if response.status_code in (404, 410):
                            record["phase"] = "needs_review"
                            store.save(plan.job_id, record)
                            raise UploaderError("Resumable session expired or disappeared. Check Studio before any replacement upload; this job is blocked.")
                        if response.status_code in (200, 201):
                            try:
                                result = response.json()
                                video_id = result.get("id", "")
                                if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
                                    raise ValueError()
                            except (ValueError, AttributeError, TypeError):
                                raise UploaderError("Upload response lacks a valid video ID. Existing session retained; do not create a new upload.") from None
                            matched = result.get("snippet", {}).get("channelId") == plan.channel["channel_id"]
                            record.update({"video_id": video_id,
                                           "phase": "uploaded" if matched else "channel_mismatch",
                                           "channel_response_verified": matched, "bytes_sent": plan.size})
                            status = result.get("status", {})
                            record["actual_privacy"] = status.get("privacyStatus")
                            record["actual_publish_at"] = status.get("publishAt")
                            store.save(plan.job_id, record)
                            if not matched:
                                raise UploaderError("Video created but response channel did not match the configured channel. Stop and inspect Studio; no thumbnail sent.")
                            break
                        if response.status_code != 308:
                            reject_response(response)
                        range_header = response.headers.get("Range")
                        if range_header is None:
                            new_offset = 0
                        else:
                            match = re.fullmatch(r"bytes=0-(\d+)", range_header)
                            if not match or int(match[1]) + 1 > plan.size:
                                raise UploaderError("Invalid server progress response. Existing session retained.")
                            new_offset = int(match[1]) + 1
                        stalled = stalled + 1 if not probe and new_offset <= offset else 0
                        if stalled > retries:
                            raise UploaderError("Upload made no progress after bounded attempts. Existing session retained.")
                        if response.headers.get("Location"):
                            uri = session_uri(response.headers["Location"])
                            vault.set_session(plan.job_id, uri)
                        offset, probe, failures = new_offset, False, 0
                        record["bytes_sent"] = offset
                        record["phase"] = "uploading"
                        store.save(plan.job_id, record)
                        delay = retry_after(response)
                        if delay:
                            sleep(delay)
                    except ApiError as exc:
                        if not exc.retryable or failures >= retries:
                            raise
                        sleep(max(retry_delay(failures), exc.retry_after))
                        failures += 1
                        probe = True
        if plan.thumbnail and record["thumbnail"] != "done":
            for attempt in range(retries + 1):
                try:
                    api.thumbnail(plan, record["video_id"])
                    record["thumbnail"] = "done"
                    store.save(plan.job_id, record)
                    break
                except (UploaderError, OSError) as exc:
                    record["thumbnail"] = "failed"
                    store.save(plan.job_id, record)
                    if not isinstance(exc, ApiError) or not exc.retryable or attempt >= retries:
                        return {"result": "video_uploaded_thumbnail_failed", "job_id": plan.job_id,
                                "video_id": record["video_id"],
                                "error": str(exc) if isinstance(exc, UploaderError) else "Local thumbnail file could not be read.",
                                "next_step": "Repeat the identical command to retry only the thumbnail, or set it in Studio."}
                    sleep(max(retry_delay(attempt), exc.retry_after))
        record["phase"] = "complete"
        store.save(plan.job_id, record)
        return {"result": "uploaded", "job_id": plan.job_id, "video_id": record["video_id"],
                "thumbnail": record["thumbnail"], "actual_privacy": record.get("actual_privacy"),
                "actual_publish_at": record.get("actual_publish_at"),
                "processing": "not checked; upload acceptance does not establish processing/public visibility"}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--channel", required=True, help="Alias registered by connect.py")
    parser.add_argument("--video", required=True, type=Path)
    parser.add_argument("--metadata", required=True, type=Path)
    parser.add_argument("--config", type=Path, help="Private settings.json (default: state directory/settings.json)")
    parser.add_argument("--state-dir", type=Path, default=ROOT, help="Private runtime directory, outside repositories")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--execute", action="store_true", help="Send actual video/metadata and optional thumbnail to YouTube")
    mode.add_argument("--dry-run", action="store_true", help="Default: validate locally, no network/Keychain/state writes")
    parser.add_argument("--allow-publication", action="store_true", help="Required with --execute for public/unlisted or scheduled visibility")
    args = parser.parse_args(argv)
    os.umask(0o077)
    logging.disable(logging.CRITICAL)
    try:
        args.metadata = args.metadata.expanduser()
        state_dir = args.state_dir.expanduser().resolve()
        metadata = load_json(args.metadata)
        # Thumbnail paths in JSON are relative to that JSON file, not the shell's directory.
        if isinstance(metadata, dict) and isinstance(metadata.get("thumbnail"), str):
            metadata["thumbnail"] = str(args.metadata.expanduser().resolve().parent / Path(metadata["thumbnail"]).expanduser())
        config_path = args.config.expanduser() if args.config else state_dir / "settings.json"
        config = load_json(config_path)
        plan = prepare(args.video, metadata, args.channel, config)
        publication = (plan.body["status"]["privacyStatus"] != "private"
                       or "publishAt" in plan.body["status"])
        if not args.execute:
            print(json.dumps({"result": "dry_run", "channel_alias": args.channel,
                "channel_name": plan.channel.get("name"), "job_id": plan.job_id,
                "size_bytes": plan.size, "privacy": plan.body["status"]["privacyStatus"],
                "publish_at": plan.body["status"].get("publishAt"),
                "made_for_kids": plan.body["status"]["selfDeclaredMadeForKids"],
                "thumbnail_requested": plan.thumbnail is not None, "notify_subscribers": plan.notify,
                "network_calls": 0, "keychain_access": False, "state_writes": 0,
                "connection": "not refreshed or checked during dry-run",
                "publication_flag_required_on_execute": publication}, indent=2))
            return 0
        if publication and not args.allow_publication:
            raise UploaderError("Public/unlisted/scheduled execution requires --allow-publication in addition to --execute.")
        state_dir = secure_runtime(state_dir)
        vault = Vault(config["project_id"], config["client_id"])
        result = run_upload(plan, Store(state_dir / "uploads"), vault,
                            lambda: Api(vault.session(plan.channel)))
        print(json.dumps(result, indent=2))
        return 3 if result["result"] == "video_uploaded_thumbnail_failed" else 0
    except UploaderError as exc:
        print(json.dumps({"result": "stopped", "error": str(exc)}), file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("Stopped. The existing job/session is retained; rerun the identical command to resume safely.", file=sys.stderr)
        return 130
    except Exception:
        # Never render transport, Keychain, OAuth errors or tracebacks containing credentials/session URIs.
        print('Unexpected local failure. Existing job retained. Check file permissions and Keychain; do not delete upload receipts to retry.', file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
