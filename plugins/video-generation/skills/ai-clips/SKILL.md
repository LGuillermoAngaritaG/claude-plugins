---
name: ai-clips
description: >
  This skill should be used when the user asks for AI-generated media rendered on their
  Google Colab GPU: text-to-video or image-to-video clips (LTX-2.5), speech from text
  (Chatterbox), sound effects (Stable Audio 3) or music (ACE-Step), or gives a Colab
  Video Studio URL and KEY. It plans the items with the user, gets explicit approval,
  drives the Colab server from the terminal, downloads the results, and shuts the GPU
  down. The clips and music feed the ad-video and story-video skills, which cut them into a
  finished video. Not for coded animation or editing existing footage.
metadata:
  version: "0.3.0"
---

# Generate media on Colab

One notebook on a Colab GPU starts a server and prints a `URL` and a `KEY`. Everything else happens from the terminal with `references/studio.py`. GPU time costs the user money, so nothing renders until the user approves the plan, and the session always ends with the runtime killed.

Files in `references/`:
- `studio.py` is the client. Run it with `python3 <skill dir>/references/studio.py <command>`.
- `server.py` is the Colab side. The notebook loads it from GitHub; never paste it.
- `workflows/` holds one ComfyUI workflow per kind of output.
- `models-and-prompting.md` holds model limits, defaults, estimates and prompt patterns.
- `assembling.md` holds what was learned turning clips into a finished video: what to draw in code, how to keep a person the same, prompts, checks, pacing and sound.

| Model | Makes | A shot takes |
|---|---|---|
| `ltx` | Video from text, or from a first frame when the shot has `image` | `prompt`, `seconds`, `aspect`, `megapixels`, `seed`, `image`, `enhance_prompt` |
| `tts` | Speech | `prompt` (the text), `language`, `voice` (audio sample to clone), `seed` |
| `sfx` | Sound effects | `prompt`, `seconds`, `seed` |
| `music` | Music | `prompt` (style tags), `lyrics`, `seconds`, `bpm`, `keyscale`, `language`, `seed` |

## Stage 1: Plan and get approval

Read `references/models-and-prompting.md` first, and `references/assembling.md` when the result is a video cut from several clips. For a finished ad, the `ad-video` skill owns the script, the start pictures (the workspace's `scripts/art.py`, type `ad`) and the cut; this skill only renders.

1. Gather what is missing: purpose and audience, look and feel, aspect ratio, clip length, number of shots, language, and which audio is wanted (speech, effects, music). Ask about at most three gaps at a time and propose sensible choices for the rest.
2. For video, ask the model only for generic, believable footage: people and places. Plan every screen, interface, caption and logo as a drawing in code laid over the clip, never as something the model films.
3. When the same person or place appears in several clips, use image-to-video: make one reference picture, make each scene's first frame from it, check every frame against its line of the script and redo the ones that miss until all pass, then show the frames to the user and pass each as the shot's `image`. Text alone does not keep a face the same between clips. For text-to-video, write a **style anchor**, one paragraph that fixes the look, and reuse it word for word in every prompt.
4. Present the plan: models, the full prompt or text per shot, and the estimate in minutes and Colab compute units.
5. Ask the user to approve, edit, or drop shots. Repeat until approval.

Treat only an explicit go-ahead ("approved", "run it", "go") as approval. Questions or partial comments are not approval.

## Stage 2: Connect

1. Start the notebook:
   `https://colab.research.google.com/github/LGuillermoAngaritaG/claude-plugins/blob/main/plugins/video-generation/notebook.ipynb`
   - When you can drive a browser where the user is signed in to Colab (the Claude desktop app's built-in browser),
     do it yourself. Open the notebook. In Secrets (the key icon) `HF_TOKEN` needs notebook access on: if it is off,
     ask the user before you turn it on, and never turn on another secret. Run the cell on an L4 and read the `URL`
     and `KEY` lines from its output (about a minute). The cell keeps running while the server is up, which keeps
     Colab from stopping an idle notebook: never stop it. A robot check, a sign-in page or "no GPU available" is the
     user's to answer: notify them and wait, and never solve a robot check.
   - Otherwise ask the user to open the notebook, run its one cell on an L4, and paste the `URL` and `KEY` lines. A
     copy saved in their Drive keeps its access to the `HF_TOKEN` secret between sessions.
2. Run `studio.py connect <url> <key>`. Do not repeat the key in replies.
3. Run `studio.py status` until `phase` is `ready` (ComfyUI installs in about 2 minutes). `gpu` must name an L4 or A100.

## Stage 3: Generate

For each model in the plan, one at a time:

1. `studio.py load <model>` downloads the weights and waits. It prints each file as it goes.
2. Write the approved shots to a job file, `{"model": "<model>", "shots": [...]}`, and run `studio.py run <job.json> <out dir>`. For a video of a workspace, `python3 scripts/clips.py <series>/<id> jobs` writes the jobs from its `script.json`, and `... import <out dir>` brings the results in. Results land in the out dir as `01_<name>_seed<N>.<ext>` with a `result.json`. A failed shot does not stop the others; the command exits non-zero when any shot failed. A run skips every shot whose file is already in the out dir, so running a job again finishes what an earlier run left; put a redo in a new out dir.
3. Before loading a different model, run `studio.py unload` to free the GPU memory.

Render speech and music before video: they take minutes, and the length of each voice line sets the length of its scene.

Check every result before showing it. For video, look at six large frames from every clip, spread from first to last (`python3 scripts/frames.py <clips>` in a workspace makes the sheets); a sheet of small thumbnails hides melted objects, odd faces and moving lips. Redo bad clips in the same session. Report plainly what failed.

Offer revisions while the server is up: a redo only costs render time. Reuse a shot's `seed` from `result.json` for a small change to a shot the user liked.

## Stage 4: Kill

Run `studio.py kill` as soon as the user is done. It releases the GPU and waits until the URL stops answering. If it reports that the server still answers, run it once more: the first call has failed to release the runtime before. If the server still answers after that, ask the user to choose **Runtime → Disconnect and delete runtime** in the Colab tab. Never end the task with a live runtime.

The server also kills itself after 20 minutes without a request, and after 5 hours in any case.

## When the server dies

Start every `studio.py run` in the background, with no keep-alive loop or wrapper around it. When the URL stops answering, any `studio.py` command stops within about two minutes with exit code 3 and `SERVER GONE` (it first waits 60 seconds, so one dropped request does not count). That exit is the alarm:

1. Tell the user at once, with a push notification when they may be away: what died, how many shots are left, and whether you are restarting it.
2. If you started the notebook yourself, start it again in the same browser tab: reload the page, run the cell (a new runtime connects), read the new `URL` and `KEY`, `connect`, wait for `ready`, `load` the model again, and run the same jobs into the same out dirs. Shots already there are skipped. A restart costs about 6 minutes of GPU (ComfyUI and the LTX weights).
3. Restart at most twice in one session. A third death means something else is wrong (Colab quota, the plan, the tunnel): stop, notify the user, and wait.
4. If the user started the notebook, ask them to run the cell again and paste the new lines.

## When things fail

| Symptom | Action |
|---|---|
| `HTTP 401` | Wrong key, or a new session. Read the current `URL` and `KEY` lines from the notebook, or ask for them |
| `SERVER GONE`, exit code 3 | The runtime or its tunnel is gone. Follow **When the server dies** |
| `load` fails with 401 or 403 | LTX-2.5 licence not accepted on Hugging Face, or `HF_TOKEN` missing in Colab Secrets with notebook access on |
| A shot fails with out-of-memory | `studio.py unload`, then lower `megapixels` or `seconds`; confirm the new settings with the user |
| A shot fails for another reason | `curl -H "X-Studio-Key: <key>" <url>/log` shows the end of the ComfyUI log |
| `load` answers `busy` | Another load or the install is still running; check `status` |

Report failures plainly. Never describe a job as complete if any shot failed or was skipped.
