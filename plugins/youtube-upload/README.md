# YouTube upload

Connect **existing** YouTube channels, then upload finished local videos with supplied
titles, descriptions, tags, optional long-form thumbnails and other supported metadata.
Registration means OAuth onboarding, not account/channel creation. No text, artwork or
video generation is performed unless separately requested through an appropriate workflow.

Plugin ID: `youtube-upload`; skill: `youtube-upload:youtube-upload`.

```sh
claude plugin install youtube-upload@guille-plugins
```

The plugin has no automatic install hooks or scheduled jobs. Python 3.10+ is required.
Execution currently requires **macOS Keychain**; dry-run validation needs no credential store.
The bundled workflow tests use POSIX file locks and run on macOS/Linux with the test dependencies.
There is no plaintext-token fallback on other systems. A future port needs a reviewed
native credential-store integration. Do not export tokens into a JSON file to work around it.

## Private environment

Set `PLUGIN` to this plugin's installed root. Ask before dependency installation when
your agent/tool policy requires it; these commands are instructions, not an install hook.

```sh
PLUGIN="/path/to/installed/youtube-upload"
STATE="$HOME/Library/Application Support/YouTubeUpload"
mkdir -p "$STATE"
chmod 700 "$STATE"
python3 -m venv "$STATE/.venv"
"$STATE/.venv/bin/python" -m pip install --index-url https://pypi.org/simple \
  -r "$PLUGIN/requirements.txt"
PYTHON="$STATE/.venv/bin/python"
```

Use an existing compatible isolated environment instead if already available. Requirements
are pinned to the versions used for local tests. No dependencies were installed as part of
packaging this plugin. Scripts never install packages themselves. Runtime state/credentials
must live outside the plugin and all Git repositories; write operations refuse those locations.

This plugin uses its own `YouTubeUpload` storage namespace. It does not discover/copy another
uploader's credentials or change an existing connection. Migration from another helper is a
separate explicitly reviewed operation, not an automatic installation side effect.

## Provision your own Google client

1. Inspect your existing Cloud projects first. One project and Desktop OAuth client may
   serve multiple owned channels; do not create duplicate projects/clients per channel.
2. Enable **YouTube Data API v3** in the intended project. Configure the OAuth app and
   provision a **Desktop app** client through Google Cloud. The scripts do not create/reset
   clients, enable billing, accept policies, change Branding or submit audits. User-only
   credential-entry/security-warning handoffs and any action-time agreements still apply.
3. Use only `https://www.googleapis.com/auth/youtube.upload` for this tool. Each channel
   requires a separately approved grant. Ordinary user OAuth is used, not a service account.
4. For an External app in **Testing**, add only the intended test user as needed. YouTube
   scopes have Testing-specific seven-day refresh-token expiry. For continuing use, review
   switching the app to **In production**, its actual Console prerequisites and any applicable
   verification/personal-use exception. Production does not mean verified, and removes only
   that Testing-specific expiry for fresh qualifying grants. Other invalidation remains possible.
   Do not claim every blank Branding field or a Terms URL is mandatory: inspect the actual gate.
5. Download your own client JSON privately. Never paste it into a chat, commit it, or inspect
   its secret in a screenshot/log. Keep it outside repositories. Import preview then execution:

```sh
"$PYTHON" "$PLUGIN/scripts/connect.py" setup \
  --client-config "/private/path/downloaded-desktop-client.json"

# Only after approval to save this particular client locally:
"$PYTHON" "$PLUGIN/scripts/connect.py" setup \
  --client-config "/private/path/downloaded-desktop-client.json" --execute
```

Setup defaults to preview and imports an already-created Desktop client with official Google
endpoints. It writes `client_secret.json` and nonsecret `settings.json` privately. Repeating the
same setup is idempotent; a differing/existing partial configuration stops for review instead
of replacing credentials. The original downloaded file is not removed; manage it privately
after confirming the import. `examples/settings.json` illustrates the nonsecret settings shape
with **no registered channels**; it is not a usable credential or existing connection.

## Register/connect one existing channel

Obtain the exact existing channel name and channel ID from the owner's channel settings.
Get approval for that channel/account/project, upload-only offline access and Keychain storage.
Use an alias such as `my-channel`. Replace every placeholder below with the reviewed target:

```sh
"$PYTHON" "$PLUGIN/scripts/connect.py" connect \
  --alias my-channel --channel-id YOUR_EXISTING_CHANNEL_ID \
  --channel-name "Exact channel name" --account-email owner@example.com

# Start the same approved plan with actual OAuth:
"$PYTHON" "$PLUGIN/scripts/connect.py" connect \
  --alias my-channel --channel-id YOUR_EXISTING_CHANNEL_ID \
  --channel-name "Exact channel name" --account-email owner@example.com --execute
```

The first command is a preview with no browser or Keychain access. Execution starts one
20-minute helper on loopback using PKCE, random OAuth state and a dynamically assigned port.
It prints only a safe **local `/start` URL** and a nonsecret flow ID. Open that URL in the
approved browser while keeping the helper running. Select the intended account and **channel**;
one Google account may offer several brand-channel choices.

If Google displays “hasn't verified this app,” the **user must handle the unsafe/security-warning
continuation** themselves. Agents must not click it, automate it, bypass it through another tool,
or assume the user completed it. No script bypasses warnings. New agreements/permissions still
need the applicable approval. If authorization is declined, stop rather than automatically retry.

After independently observing the intended channel in the browser, or receiving the user's
explicit confirmation of its exact visible name, record that selection in a second terminal:

```sh
"$PYTHON" "$PLUGIN/scripts/connect.py" confirm-channel \
  --flow-id CURRENT_HELPER_FLOW_ID --channel-id YOUR_EXISTING_CHANNEL_ID \
  --channel-name "Exact channel name" --execute
```

This command requires the matching current flow ID/name/ID and unexpired flow. It is a record
of an observed selection, not a way to guess the channel. Confirmation can happen before or
just after Google's callback; the helper waits for it instead of racing the browser. Complete
the approved upload-only consent promptly. The helper verifies an actual fresh refresh token,
scope, non-upload refresh and Keychain write/readback before reporting connected. Channel
identity is based on browser/human evidence, not an API channel-ID query: no read scope is added.

Stale/wrong-state, replayed or expired callbacks are ignored; codes/state/PKCE remain in memory
only. Callback logging/tracebacks are suppressed, the HTML title is fixed, and browser history
is replaced with `/complete`. Never enumerate raw OAuth tab URLs/titles or enable HTTP tracing.
Only one helper per state directory can run. On timeout/interruption, inspect status and start
a new authorized flow; never replay the old callback/code.

```sh
"$PYTHON" "$PLUGIN/scripts/connect.py" status
```

To renew an existing connection, use the same approved target with `connect --renew --execute`.
Renewal requests fresh offline consent and requires a **different returned refresh token**,
verified refresh and Keychain readback before success. It does not merely relabel/reuse a cached
Testing token. If storage is interrupted, inspect status before retrying; the outcome may be
uncertain even if consent occurred. Each additional channel needs its own approval/connection.

For a separate private state directory, put `--state-dir /private/path` **before** the connect
subcommand; upload accepts it in any argument position. Do not use it to escape a stopped job.

## Validate/upload a video

Copy `examples/metadata.json` to your own working folder and edit it for the actual video.
`made_for_kids` must be an explicit boolean; the example's false and category 27 are examples,
not a judgement about your audience. The complete format is [metadata.schema.json](metadata.schema.json).

```json
{
  "title": "Your reviewed title",
  "description": "Your reviewed description.",
  "tags": ["example"],
  "category_id": "27",
  "made_for_kids": false,
  "privacy": "private",
  "video_type": "long",
  "thumbnail": "thumbnail.jpg",
  "notify_subscribers": false
}
```

Only title, category and made-for-kids are required. Description defaults empty and tags to
an empty list. Unknown/duplicate fields are rejected. Limits: title 100 characters; description
5000 UTF-8 bytes; tags a combined 500 characters counting separators/space quoting. Numeric
category format is checked locally; YouTube decides actual category/region eligibility.
Optional `contains_synthetic_media` is an explicit boolean for the appropriate disclosure;
it is never inferred. Video files must be nonempty regular files at most 256 billion bytes.
Codec/duration/content validity and processing acceptance are not established by dry-run.

```sh
"$PYTHON" "$PLUGIN/scripts/upload.py" --channel my-channel \
  --video "/path/video.mp4" --metadata "/path/metadata.json" --dry-run

# Only after approval of this exact video/channel/metadata/visibility:
"$PYTHON" "$PLUGIN/scripts/upload.py" --channel my-channel \
  --video "/path/video.mp4" --metadata "/path/metadata.json" --execute
```

Omitting both flags is also dry-run: no network, Keychain access or state writes. Only a registered
alias may execute. Tokens determine the actual destination channel; ordinary user uploads cannot
select a channel with a channel-ID request parameter. The eventual upload response channel ID
must match the configured target before any thumbnail is sent; a mismatch is recorded and blocked.

**Private is the default.** Public/unlisted execution requires `--execute --allow-publication`.
For a new scheduled upload, keep privacy private and add a future RFC3339 timestamp such as
`"publish_at": "2030-01-02T09:00:00-05:00"`. Use the intended timezone's offset on that date.
The CLI normalizes UTC and requires at least ten minutes ahead as a local safety margin, allowing
time for upload/processing. YouTube requires scheduling on a never-published private video and
treats a past timestamp as immediate publication, so past/naive/incompatible schedules are rejected.
Scheduled execution also requires `--allow-publication`: it later makes the video **public**.
YouTube handles the scheduled release; no recurring local upload job or sleep setting is configured.

### Thumbnails and partial success

Provide JPEG/PNG with `video_type: "long"`; paths are relative to the metadata JSON or absolute.
File signatures and a 50 MiB bound are checked; Google decides actual image/channel eligibility.
The thumbnail is a separate request **after** saving the uploaded video ID. Both methods use
`youtube.upload`. Current YouTube Help describes custom **Shorts** thumbnails as Studio desktop
only; API support is unverified, so the CLI rejects Short+thumbnail before uploading. Upload the
Short without a thumbnail field, then use Studio. `video_type` is a safety hint, not an API switch
that forces Shorts classification. The API does not generate tags or artwork for this script.

A thumbnail failure returns **exit 3** with the existing video ID. Repeat the identical command
to retry only that thumbnail. If metadata/image bytes need changing, edit the existing video in
Studio; no force/reupload shortcut is bundled.

### Retry and duplicate protection

Full video content hash plus channel ID identifies a job; renaming a file does not evade it.
Metadata/thumbnail hashes must stay unchanged, and a file-change guard checks during upload.
Per-job locks prevent concurrent duplicates. Completed jobs return their saved video ID.

Intent is durably saved before initiation, and the resumable session capability goes to Keychain
before any media bytes. Resume/transient failure probes server progress first, including recovery
of a lost final video-ID response. Transient errors use at most five retries per failed step,
exponential jitter up to 32 seconds and Retry-After up to 60 seconds. Longer server delays stop
for a later retry. Requests have 15/120-second connect/read timeouts; Google's auth transport
has its own bounded refresh retries. Thumbnail bytes can be replayed safely after authorization refresh.

An uncertain initiation without a saved session or an expired/missing session stops for manual
Studio review. **Never delete receipts/sessions, change metadata, or start another state directory
to force a retry.** No API idempotency key exists, so exactly-once delivery cannot be guaranteed
after lost/deleted local state. No automatic replacement upload is made for a blocked job.

## Storage and operational limits

- Client config/settings: private state directory, mode 700; files 600, outside source/plugin.
- Tokens: Keychain service `YouTubeUpload.tokens.<project-id>`, account = channel ID.
- Resumable capabilities: Keychain service `YouTubeUpload.resumable.<project-id>`, account = job ID.
  They are sensitive URLs and are not printed or stored in receipt JSON.
- Nonsecret job receipts: `uploads/` under the state directory; IDs, hashes, progress and returned
  visibility/thumbnail state, not full metadata, source content or credentials.
- Nonsecret pending-flow/confirmation records: `onboarding/`; no OAuth state/codes or tokens.
  Receipts and sessions are retained for safe resumption; no timed cleanup or backup guarantees.
  Review before manual deletion. Revoking local access does not delete already-uploaded videos.
- Logs suppress raw OAuth/transport errors and tracebacks. An unexpected failure after a request
  does not prove nothing uploaded: inspect the receipt and Studio before another action.

Exit codes: 0 preview/dry-run/success/already-uploaded; 2 stopped/error; 3 video uploaded with
thumbnail failure; 130 interrupted. Status is local configuration, not a fresh credential/API test.

There is no live-upload/public-publishing certification. Current Google documentation conflicts
about public-upload restrictions on unverified projects; OAuth Production is separate from API
audit/verification and actual public visibility. Test only with explicit video/visibility approval.
Project API quotas and channel upload/thumbnail limits are separate; inspect both for any batch.
No paid service, purchase, broad scope, channel creation, audit submission or automated job is bundled.

## Develop and verify

```sh
cd "$PLUGIN/scripts"
PYTHONDONTWRITEBYTECODE=1 "$PYTHON" -m unittest discover -s ../tests -v
claude plugin validate "$PLUGIN" --strict
```

Tests use fabricated credentials/media, mock APIs/transport and a mock Keychain. They never
authorize a real account/channel or upload. Run marketplace validation at the repository root
as well. Do not substitute fake media for an approved live test.

Official references checked 2026-10-27:
[Desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app),
[refresh-token expiry](https://developers.google.com/identity/protocols/oauth2#expiration),
[video insertion](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert),
[video metadata/scheduling](https://developers.google.com/youtube/data/reference/rest/v3/videos),
[resumable protocol](https://developers.google.com/youtube/data/guides/using_resumable_upload_protocol),
[thumbnail API](https://developers.google.com/youtube/data/reference/rest/v3/thumbnails/set),
[current Shorts thumbnail guidance](https://support.google.com/youtube/answer/72431?hl=en),
[conflicting public-upload Help](https://support.google.com/youtube/answer/7300965?hl=en).
