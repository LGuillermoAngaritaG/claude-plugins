---
name: youtube-upload
description: Connect an existing YouTube channel with upload-only Google OAuth, or upload a finished local video with supplied title, description, tags and optional thumbnail. Use for registering a channel connection, renewing consent, validating upload metadata, or sending an approved video to a specified channel. Does not create YouTube channels or generate video/title/art by default.
---

# YouTube upload

Use the bundled Python scripts for deterministic validation, OAuth, resumable uploads
and duplicate protection. Read [the plugin README](../../README.md) for setup/CLI
commands and [the metadata schema](../../metadata.schema.json) for supported fields.
Scripts are at `${CLAUDE_PLUGIN_ROOT}/scripts/` (or derive the plugin root from this
skill's location). Runtime data belongs outside the plugin and all repositories.

## Decide what the user authorized

"Register" means authorize an **existing channel**, not create an account/channel.
Inspect existing private settings/aliases first; avoid duplicate clients and grants.
One Cloud project/Desktop client can serve multiple channels; each channel requires
its own explicitly approved consent and Keychain mapping.

Before a grant/renewal, ensure the user approved the exact Google account, project,
existing channel, `youtube.upload` offline access and secure token storage. Before an
actual upload, ensure approval identifies the exact channel, video, reviewed metadata,
thumbnail and intended visibility/schedule. If missing, ask one specific approval
question after preparing a dry-run for review. Honor prior explicit approval within
that same scope; preparation alone, plugin installation and vague "check it" requests
do not authorize uploads. A scheduled private upload later becomes public: disclose
the actual publication time/timezone. No implicit recurring publishing or batch expansion.

## Connect an existing channel

1. Use the user's own enabled YouTube Data API v3 project and Desktop OAuth client.
   Read the setup section for Testing/Production limits. Do not buy services, create
   credentials, change audience/branding or accept new agreements without the applicable
   specific approval or mandatory user handoff. The script only imports a client the
   user already provisioned; it cannot create/reset Google credentials.
2. Preview `connect.py setup`, then import into private storage with `--execute` only
   when authorized. Never print the downloaded client JSON or credential values.
3. Preview `connect.py connect` using the approved account, alias and exact channel
   name/ID. After consent approval, start one helper with `--execute`; it prints a
   **local start URL**, not the secret-bearing Google authorization URL. Keep that
   process alive. If another flow is active, stop and inspect it; do not start parallel
   callbacks. Expired/stale callbacks must not be reused.
4. Open the local URL with supported browser controls. Select the approved Google
   account and verify the exact **channel name** in the chooser/consent screen. Never
   choose a different channel merely because it is the account default. Use only
   `youtube.upload`; do not add read scopes just to query channel identity.
5. **Security-warning bypass is user-only.** If an unverified-app warning appears,
   leave it open and have the user handle “Advanced” / unsafe continuation themselves.
   Do not activate it through another API, keyboard shortcut or alternate route.
   A user saying "done" is context: inspect actual state before continuing.
6. Once the intended channel is visibly verified (or the user explicitly confirms the
   exact visible name), run `confirm-channel` for the **current flow ID**, exact name
   and ID with `--execute`. This records the observation, not another OAuth grant.
   It may happen before or just after the callback; the helper waits for confirmation
   to prevent a fast callback race. Finish only the approved upload-only consent.
7. Report success only after the helper confirms a fresh offline token, exact scope,
   non-upload refresh and Keychain write/readback. Renewal also requires a different
   returned refresh token. Scope/name verification is not an API channel-ID check;
   disclose that limit. Stop on denial; do not automatically repeat consent.

Never emit raw OAuth URLs, callback titles/addresses, codes, tokens, client secrets
or HTTP traces. Filter browser metadata before output and avoid secret-bearing
screenshots. The callback uses fixed HTML/title and clears its query from the browser;
this is no reason to inspect or expose the original request.

## Upload supplied content

1. Resolve the configured alias with `connect.py status`. Only approved registered
   channels may execute. Use the existing isolated environment or ask before installing
   documented requirements; no automatic install hooks are bundled.
2. Validate the supplied metadata and source files with `upload.py --dry-run`.
   Do not infer made-for-kids, synthetic-media disclosure, category or public visibility.
   The API uploads supplied text/art; it does not generate them. Create/rewrite these
   only if separately requested. A long-form thumbnail must be JPEG/PNG; current Shorts
   guidance limits custom thumbnails to Studio desktop, so the CLI refuses Short+image.
3. Present the concrete upload plan and obtain any missing exact approval. Default is
   **private**. Execute with `--execute` only after authorization; public, unlisted or
   scheduled execution additionally needs `--allow-publication`.
4. On interruption, rerun the **same** command and metadata. Never delete receipts,
   alter metadata to evade a checkpoint, or start another session to bypass a failure.
   A lost/expired session requires review in Studio, not an automatic new upload.
5. Report the returned video ID, actual returned visibility/schedule, thumbnail state
   and any error. Thumbnail failure is partial success (exit 3); repeating the unchanged
   command retries only that thumbnail. Upload acceptance does not establish completed
   processing or public visibility. Keep public-publishing claims conditional until tested.

Do not enable a recurring job, change sleep settings, submit verification/audit forms,
authorize additional channels, or delete uploaded videos as part of this skill unless
the user explicitly requests and authorizes that separate work.
