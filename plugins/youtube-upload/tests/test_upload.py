import contextlib
from datetime import datetime, timezone
import io
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import Mock, patch

import upload as u

PROJECT = "example-project"
CLIENT = "example-client.apps.googleusercontent.com"
CHANNEL = "UC0000000000000000000000"
VIDEO_ID = "abcdefghijk"
SESSION = u.UPLOAD_URL + "?uploadType=resumable&upload_id=FAKE_CAPABILITY_NEVER_REAL"
NOW = datetime(2030, 1, 1, tzinfo=timezone.utc)
CONFIG = {"project_id": PROJECT, "client_id": CLIENT, "channels": {"example-channel": {
    "name": "Example Channel", "channel_id": CHANNEL, "connected": True}}}


class Response:
    def __init__(self, status, body=None, headers=None):
        self.status_code = status
        self.headers = headers or {}
        self.body = body

    def json(self):
        return self.body


def complete(channel=CHANNEL):
    return Response(200, {"id": VIDEO_ID, "snippet": {"channelId": channel},
                          "status": {"privacyStatus": "private", "uploadStatus": "uploaded"}})


class FakeVault:
    def __init__(self):
        self.values = {}

    def get_session(self, job):
        return self.values.get(job)

    def set_session(self, job, uri):
        self.values[job] = uri


class FakeApi:
    def __init__(self, probes=None, chunks=None, thumbnails=None, initiation=None):
        self.probes = list(probes if probes is not None else [Response(308)])
        self.chunks = list(chunks if chunks is not None else [complete()])
        self.thumbnails = list(thumbnails or [None])
        self.initiation = initiation or SESSION
        self.init_calls = self.probe_calls = self.chunk_calls = self.thumb_calls = 0
        self.offsets = []

    @staticmethod
    def pop(values):
        value = values.pop(0)
        if isinstance(value, Exception):
            raise value
        return value

    def initiate(self, plan):
        self.init_calls += 1
        if isinstance(self.initiation, Exception):
            raise self.initiation
        return self.initiation

    def probe(self, uri, size):
        self.probe_calls += 1
        return self.pop(self.probes)

    def chunk(self, uri, data, offset, size):
        self.chunk_calls += 1
        self.offsets.append(offset)
        return self.pop(self.chunks)

    def thumbnail(self, plan, video_id):
        self.thumb_calls += 1
        assert video_id == VIDEO_ID
        return self.pop(self.thumbnails)


class UploaderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.video = self.root / "fixture.mp4"
        self.video.write_bytes(b"LOCAL TEST FIXTURE - NOT A REAL VIDEO - NEVER UPLOAD")
        self.image = self.root / "fixture.png"
        self.image.write_bytes(b"\x89PNG\r\n\x1a\nLOCAL TEST FIXTURE")
        self.meta = {"title": "A reviewed example", "description": "Example", "tags": ["example"],
                     "category_id": "27", "made_for_kids": False}
        self.store = u.Store(self.root / "state")
        self.vault = FakeVault()
        self.sleeps = []

    def tearDown(self):
        self.temp.cleanup()

    def plan(self, **changes):
        return u.prepare(self.video, self.meta | changes, "example-channel", CONFIG, NOW)

    def run_job(self, api=None, plan=None, retries=2):
        api = api or FakeApi()
        result = u.run_upload(plan or self.plan(), self.store, self.vault, lambda: api,
                              self.sleeps.append, retries)
        return result, api

    def test_private_default_and_explicit_audience(self):
        plan = self.plan()
        self.assertEqual(plan.body["status"]["privacyStatus"], "private")
        self.assertFalse(plan.body["status"]["selfDeclaredMadeForKids"])
        del self.meta["made_for_kids"]
        with self.assertRaisesRegex(u.UploaderError, "made_for_kids"):
            self.plan()

    def test_unknown_or_unconnected_channel(self):
        for alias in ["other", "Example Channel"]:
            with self.assertRaisesRegex(u.UploaderError, "Unknown or unconnected"):
                u.prepare(self.video, self.meta, alias, CONFIG, NOW)
        config = json.loads(json.dumps(CONFIG))
        config["channels"]["example-channel"]["connected"] = False
        with self.assertRaises(u.UploaderError):
            u.prepare(self.video, self.meta, "example-channel", config, NOW)

    def test_title_description_tag_limits(self):
        for changes in [{"title": "x" * 101}, {"title": ""}, {"title": "<unsafe>"},
                        {"description": "é" * 2501}, {"tags": ["x" * 501]},
                        {"tags": ["a b" * 166, "z"]}, {"tags": "not-list"},
                        {"made_for_kids": "false"}, {"notify_subscribers": 1},
                        {"contains_synthetic_media": "true"}, {"category_id": 27},
                        {"invented_field": True}, {"privacy": "members"}]:
            with self.subTest(changes=changes), self.assertRaises(u.UploaderError):
                self.plan(**changes)
        self.plan(title="x" * 100, description="é" * 2500, tags=["x" * 500])

    def test_schedule_timezone_private_future(self):
        plan = self.plan(publish_at="2030-01-02T09:00:00-05:00")
        self.assertEqual(plan.body["status"]["publishAt"], "2030-01-02T14:00:00.000000Z")
        for date in ["2030-01-02T09:00:00", "2029-12-31T23:00:00Z", "2030-01-01T00:05:00Z",
                     "2030-02-30T10:00:00Z", "2030-01-02", None]:
            with self.subTest(date=date), self.assertRaises(u.UploaderError):
                self.plan(publish_at=date)
        with self.assertRaisesRegex(u.UploaderError, "start private"):
            self.plan(privacy="public", publish_at="2030-01-02T09:00:00Z")

    def test_shorts_thumbnail_rejected_before_upload(self):
        with self.assertRaisesRegex(u.UploaderError, "Shorts"):
            self.plan(video_type="short", thumbnail=str(self.image))
        self.plan(video_type="short")
        with self.assertRaisesRegex(u.UploaderError, "video_type=long"):
            self.plan(thumbnail=str(self.image))

    def test_thumbnail_signature_not_extension(self):
        self.image.write_bytes(b"This is not a PNG")
        with self.assertRaisesRegex(u.UploaderError, "signature"):
            self.plan(video_type="long", thumbnail=str(self.image))

    def test_missing_empty_file_and_modified_video(self):
        plan = self.plan()
        self.video.write_bytes(b"different")
        with self.assertRaisesRegex(u.UploaderError, "changed"):
            plan.check_file()
        self.video.write_bytes(b"")
        with self.assertRaises(u.UploaderError):
            self.plan()
        self.video.unlink()
        with self.assertRaises(u.UploaderError):
            self.plan()

    def test_success_and_private_receipt_no_session_uri(self):
        result, api = self.run_job()
        self.assertEqual(result["result"], "uploaded")
        self.assertEqual(result["actual_privacy"], "private")
        self.assertEqual(api.init_calls, 1)
        path = self.store.root / (self.plan().job_id + ".json")
        self.assertEqual(path.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.store.root.stat().st_mode & 0o777, 0o700)
        self.assertNotIn("FAKE_CAPABILITY", path.read_text())
        self.assertNotIn("upload_id", path.read_text())

    def test_same_content_renamed_does_not_upload_again(self):
        self.run_job()
        renamed = self.root / "renamed.mp4"
        shutil.copyfile(self.video, renamed)
        plan = u.prepare(renamed, self.meta, "example-channel", CONFIG, NOW)
        factory = Mock(side_effect=AssertionError("No API/Keychain should be accessed"))
        result = u.run_upload(plan, self.store, self.vault, factory)
        self.assertEqual(result["result"], "already_uploaded")
        factory.assert_not_called()

    def test_changed_metadata_is_blocked(self):
        self.run_job()
        with self.assertRaisesRegex(u.UploaderError, "different metadata"):
            self.run_job(plan=self.plan(title="Changed title"))

    def test_network_retry_probes_before_resending(self):
        api = FakeApi(probes=[Response(308), Response(308)],
                      chunks=[u.ApiError("Interrupted", True), complete()])
        result, _ = self.run_job(api)
        self.assertEqual(result["result"], "uploaded")
        self.assertEqual((api.init_calls, api.probe_calls, api.chunk_calls), (1, 2, 2))
        self.assertEqual(len(self.sleeps), 1)
        self.assertLessEqual(self.sleeps[0], 32)

    def test_lost_final_response_recovers_id_without_resend(self):
        api = FakeApi(probes=[Response(308), complete()], chunks=[u.ApiError("Lost reply", True)])
        self.run_job(api)
        self.assertEqual((api.init_calls, api.chunk_calls), (1, 1))

    def test_retry_budget_is_bounded_and_resume_never_reinitiates(self):
        api = FakeApi(probes=[u.ApiError("temporary", True)] * 3)
        with self.assertRaises(u.ApiError):
            self.run_job(api, retries=2)
        self.assertEqual(len(self.sleeps), 2)
        resumed = FakeApi(probes=[complete()])
        self.run_job(resumed)
        self.assertEqual((resumed.init_calls, resumed.chunk_calls), (0, 0))

    def test_interrupted_initiation_blocks_duplicate(self):
        api = FakeApi(initiation=u.ApiError("Initiation outcome uncertain", True))
        with self.assertRaises(u.ApiError):
            self.run_job(api)
        with self.assertRaisesRegex(u.UploaderError, "no saved session"):
            self.run_job(api)
        self.assertEqual(api.init_calls, 1)

    def test_orphan_keychain_session_blocks_new_post(self):
        self.vault.values[self.plan().job_id] = SESSION
        api = FakeApi()
        with self.assertRaisesRegex(u.UploaderError, "without its receipt"):
            self.run_job(api)
        self.assertEqual(api.init_calls, 0)

    def test_expired_session_blocks_all_future_reinsertion(self):
        api = FakeApi(probes=[Response(410)])
        with self.assertRaisesRegex(u.UploaderError, "expired"):
            self.run_job(api)
        with self.assertRaisesRegex(u.UploaderError, "manual review"):
            self.run_job(api)
        self.assertEqual(api.init_calls, 1)

    def test_resume_uses_server_offset(self):
        api = FakeApi(probes=[Response(308, headers={"Range": "bytes=0-9"})])
        self.run_job(api)
        self.assertEqual(api.offsets, [10])

    def test_chunk_boundaries_and_checkpoint_progress(self):
        with patch.object(u, "CHUNK_SIZE", 16):
            plan = self.plan()
            api = FakeApi(chunks=[Response(308, headers={"Range": "bytes=0-15"}),
                                 Response(308, headers={"Range": "bytes=0-31"}), complete()])
            self.run_job(api, plan)
            self.assertEqual(api.offsets, [0, 16, 32])

    def test_stalled_progress_stops(self):
        api = FakeApi(chunks=[Response(308)] * 3)
        with self.assertRaisesRegex(u.UploaderError, "no progress"):
            self.run_job(api, retries=2)

    def test_wrong_response_channel_blocks_thumbnail_and_retries(self):
        plan = self.plan(video_type="long", thumbnail=str(self.image))
        api = FakeApi(chunks=[complete("UCwrong")])
        with self.assertRaisesRegex(u.UploaderError, "channel did not match"):
            self.run_job(api, plan)
        with self.assertRaisesRegex(u.UploaderError, "manual review"):
            self.run_job(api, plan)
        self.assertEqual(api.thumb_calls, 0)
        self.assertEqual(self.store.load(plan.job_id)["video_id"], VIDEO_ID)

    def test_thumbnail_partial_failure_then_only_thumbnail_retry(self):
        plan = self.plan(video_type="long", thumbnail=str(self.image))
        api = FakeApi(thumbnails=[u.ApiError("forbidden")])
        result, _ = self.run_job(api, plan)
        self.assertEqual(result["result"], "video_uploaded_thumbnail_failed")
        self.assertEqual(result["video_id"], VIDEO_ID)
        again = FakeApi()
        result, _ = self.run_job(again, plan)
        self.assertEqual(result["result"], "uploaded")
        self.assertEqual((again.init_calls, again.chunk_calls, again.thumb_calls), (0, 0, 1))

    def test_thumbnail_retry_bounded_and_existing_id_saved_first(self):
        plan = self.plan(video_type="long", thumbnail=str(self.image))
        api = FakeApi(thumbnails=[u.ApiError("temporary", True)] * 3)
        result, _ = self.run_job(api, plan, retries=2)
        self.assertEqual(result["result"], "video_uploaded_thumbnail_failed")
        self.assertEqual(api.thumb_calls, 3)
        self.assertEqual(len(self.sleeps), 2)
        self.assertEqual(self.store.load(plan.job_id)["video_id"], VIDEO_ID)

    def test_concurrent_job_blocked(self):
        with self.store.locked(self.plan().job_id):
            with self.assertRaisesRegex(u.UploaderError, "Another process"):
                self.run_job()

    def test_unexpected_endpoint_rejected(self):
        for uri in ["http://www.googleapis.com/upload/youtube/v3/videos?x=1",
                    "https://evil.example/upload/youtube/v3/videos?x=1",
                    "https://www.googleapis.com.evil.example/upload/youtube/v3/videos?x=1"]:
            with self.assertRaises(u.UploaderError):
                u.session_uri(uri)

    def test_transport_timeouts_no_redirect_and_payload(self):
        session = Mock()
        session.request.return_value = Response(200, headers={"Location": SESSION})
        api = u.Api(session)
        self.assertEqual(api.initiate(self.plan()), SESSION)
        args, kwargs = session.request.call_args
        self.assertEqual(args, ("POST", u.UPLOAD_URL))
        self.assertFalse(kwargs["allow_redirects"])
        self.assertEqual(kwargs["timeout"], (15, 120))
        self.assertEqual(kwargs["json"]["status"]["privacyStatus"], "private")
        self.assertEqual(kwargs["params"]["notifySubscribers"], "false")
        self.assertNotIn("channelId", kwargs["params"])

    def test_transport_error_redacts_message_and_session(self):
        from requests.exceptions import ConnectionError
        session = Mock()
        session.request.side_effect = ConnectionError("SECRET " + SESSION)
        with self.assertRaises(u.ApiError) as caught:
            u.Api(session).probe(SESSION, 10)
        self.assertNotIn("SECRET", str(caught.exception))
        self.assertNotIn("upload_id", str(caught.exception))

    def test_api_error_reason_allowlist(self):
        with self.assertRaises(u.ApiError) as caught:
            u.reject_response(Response(403, {"error": {"errors": [{"reason": "SECRET"}], "message": SESSION}}))
        self.assertNotIn("SECRET", str(caught.exception))
        with self.assertRaisesRegex(u.ApiError, "quotaExceeded"):
            u.reject_response(Response(403, {"error": {"errors": [{"reason": "quotaExceeded"}]}}))

    def test_retry_after_is_respected_and_large_delay_stops(self):
        self.assertEqual(u.retry_after(Response(429, headers={"Retry-After": "30"})), 30)
        with self.assertRaisesRegex(u.UploaderError, "longer retry delay"):
            u.retry_after(Response(429, headers={"Retry-After": "120"}))
        api = FakeApi(probes=[u.ApiError("Rate limited", True, retry_after=30), Response(308)])
        self.run_job(api)
        self.assertEqual(self.sleeps, [30])

    def test_non_retryable_upload_error_does_not_loop(self):
        api = FakeApi(chunks=[u.ApiError("forbidden", False)])
        with self.assertRaisesRegex(u.ApiError, "forbidden"):
            self.run_job(api)
        self.assertEqual(self.sleeps, [])
        self.assertEqual(api.init_calls, 1)
        self.assertEqual(api.chunk_calls, 1)

    def test_thumbnail_transport_is_separate_and_uses_existing_video_id(self):
        session = Mock()
        session.request.return_value = Response(200, {})
        plan = self.plan(video_type="long", thumbnail=str(self.image))
        u.Api(session).thumbnail(plan, VIDEO_ID)
        args, kwargs = session.request.call_args
        self.assertEqual(args, ("POST", u.THUMBNAIL_URL))
        self.assertEqual(kwargs["params"]["videoId"], VIDEO_ID)
        self.assertEqual(kwargs["headers"]["Content-Type"], "image/png")
        self.assertIsInstance(kwargs["data"], bytes)

    def test_changed_thumbnail_rejected_before_sending(self):
        session = Mock()
        plan = self.plan(video_type="long", thumbnail=str(self.image))
        self.image.write_bytes(b"changed")
        with self.assertRaisesRegex(u.UploaderError, "Thumbnail changed"):
            u.Api(session).thumbnail(plan, VIDEO_ID)
        session.request.assert_not_called()

    def test_vault_rejects_broader_or_wrong_client_before_auth_transport(self):
        vault = object.__new__(u.Vault)
        vault.backend = Mock()
        vault.client_id = CLIENT
        vault.token_service = "YouTubeUpload.tokens." + PROJECT
        for value in [{"client_id": "wrong"},
                      {"client_id": CLIENT, "scopes": [u.SCOPE, "extra"]},
                      {"client_id": CLIENT, "scopes": [u.SCOPE],
                       "refresh_token": "FAKE_ONLY", "token_uri": "https://evil.example/token"}]:
            vault.backend.get_password.return_value = json.dumps(value)
            with patch('google.auth.transport.requests.AuthorizedSession') as transport:
                with self.assertRaisesRegex(u.UploaderError, "approved upload-only"):
                    vault.session(CONFIG["channels"]["example-channel"])
                transport.assert_not_called()

    def test_vault_refresh_and_keychain_readback_use_mocks_only(self):
        vault = object.__new__(u.Vault)
        vault.backend = Mock()
        vault.client_id = CLIENT
        vault.token_service = "YouTubeUpload.tokens." + PROJECT
        fake = {"client_id": CLIENT, "scopes": [u.SCOPE],
                "refresh_token": "FAKE_TEST_VALUE", "token_uri": "https://oauth2.googleapis.com/token"}
        payload = json.dumps(fake)
        vault.backend.get_password.side_effect = [payload, payload]
        credentials = Mock()
        credentials._did_refresh = False
        type(credentials).valid = property(lambda self: getattr(self, '_did_refresh', False))
        credentials.refresh.side_effect = lambda request: setattr(credentials, '_did_refresh', True)
        credentials.to_json.return_value = payload
        with patch('google.oauth2.credentials.Credentials.from_authorized_user_info', return_value=credentials), \
             patch('google.auth.transport.requests.AuthorizedSession', return_value="MOCK_SESSION"):
            self.assertEqual(vault.session(CONFIG['channels']['example-channel']), "MOCK_SESSION")
        credentials.refresh.assert_called_once()
        vault.backend.set_password.assert_called_once_with("YouTubeUpload.tokens." + PROJECT, CHANNEL, payload)

    def test_duplicate_json_fields_rejected(self):
        path = self.root / "duplicates.json"
        path.write_text('{"title":"first","title":"second"}')
        with self.assertRaises(u.UploaderError):
            u.load_json(path)

    def cli_args(self, metadata=None):
        path = self.root / "metadata.json"
        path.write_text(json.dumps(metadata or self.meta))
        config = self.root / "channels.json"
        config.write_text(json.dumps(CONFIG))
        return ["--channel", "example-channel", "--video", str(self.video),
                "--metadata", str(path), "--config", str(config), "--state-dir", str(self.root / "private-runtime")]

    def test_cli_default_dry_run_cannot_access_vault_or_network_or_state(self):
        output = io.StringIO()
        with patch.object(u, "Vault", side_effect=AssertionError("no credentials")), \
             patch.object(u, "Store", side_effect=AssertionError("no state writes")), \
             contextlib.redirect_stdout(output):
            self.assertEqual(u.main(self.cli_args()), 0)
        result = json.loads(output.getvalue())
        self.assertEqual(result["result"], "dry_run")
        self.assertEqual(result["network_calls"], 0)
        self.assertFalse(result["keychain_access"])

    def test_cli_public_execute_needs_extra_publication_flag(self):
        with patch.object(u, "Vault", side_effect=AssertionError("must stop first")), \
             contextlib.redirect_stderr(io.StringIO()) as output:
            self.assertEqual(u.main(self.cli_args(self.meta | {"privacy": "public"}) + ["--execute"]), 2)
            self.assertIn("--allow-publication", output.getvalue())

    def test_cli_no_secret_tracebacks(self):
        with patch.object(u, "Vault", side_effect=RuntimeError("SECRET")), \
             contextlib.redirect_stderr(io.StringIO()) as output:
            self.assertEqual(u.main(self.cli_args() + ["--execute"]), 2)
            self.assertNotIn("SECRET", output.getvalue())
            self.assertNotIn("Traceback", output.getvalue())

    def test_execute_uses_canonical_private_runtime_for_receipts(self):
        canonical = self.root / "canonical-private"
        with patch.object(u, 'secure_runtime', return_value=canonical), \
             patch.object(u, 'Vault'), patch.object(u, 'Store') as store, \
             patch.object(u, 'run_upload', return_value={'result':'already_uploaded'}), \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(u.main(self.cli_args() + ['--execute']), 0)
        store.assert_called_once_with(canonical / 'uploads')


if __name__ == "__main__":
    unittest.main()
