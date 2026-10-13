---
name: generate-video-clips
description: >
  This skill should be used when the user asks for AI-generated media rendered on their
  Google Colab GPU: text-to-video or image-to-video clips (LTX-2.5), speech from text
  (Chatterbox), sound effects (Stable Audio 3) or music (ACE-Step), or gives a Colab
  Video Studio URL and KEY. It plans the items with the user, gets explicit approval,
  drives the Colab server from the terminal, downloads the results, and shuts the GPU
  down. Not for narrated explainer videos, coded animation (Remotion, Manim), or editing
  existing footage.
metadata:
  version: "0.2.0"
---

# Generate media on Colab

The user runs one notebook on a Colab GPU. It starts a server and prints a `URL` and a `KEY`. Everything else happens from the terminal with `references/studio.py`. GPU time costs the user money, so nothing renders until the user approves the plan, and the session always ends with the runtime killed.

Files in `references/`:
- `studio.py` is the client. Run it with `python3 <skill dir>/references/studio.py <command>`.
- `server.py` is the Colab side. The notebook loads it from GitHub; never paste it.
- `workflows/` holds one ComfyUI workflow per kind of output.
- `models-and-prompting.md` holds model limits, defaults, estimates and prompt patterns.

| Model | Makes | A shot takes |
|---|---|---|
| `ltx` | Video from text, or from a first frame when the shot has `image` | `prompt`, `seconds`, `aspect`, `megapixels`, `seed`, `image`, `enhance_prompt` |
| `tts` | Speech | `prompt` (the text), `language`, `voice` (audio sample to clone), `seed` |
| `sfx` | Sound effects | `prompt`, `seconds`, `seed` |
| `music` | Music | `prompt` (style tags), `lyrics`, `seconds`, `bpm`, `keyscale`, `language`, `seed` |

## Stage 1: Plan and get approval

Read `references/models-and-prompting.md` first.

1. Gather what is missing: purpose and audience, look and feel, aspect ratio, clip length, number of shots, language, and which audio is wanted (speech, effects, music). Ask about at most three gaps at a time and propose sensible choices for the rest.
2. For video, write a **style anchor**, one paragraph that fixes the look, and reuse it word for word in every prompt. When the same person or place must appear in several clips, use image-to-video: make the first frames first, show them to the user, and pass each as the shot's `image`. Text alone does not keep a face the same between clips.
3. Present the plan: models, the full prompt or text per shot, and the estimate in minutes and Colab compute units.
4. Ask the user to approve, edit, or drop shots. Repeat until approval.

Treat only an explicit go-ahead ("approved", "run it", "go") as approval. Questions or partial comments are not approval.

## Stage 2: Connect

1. Ask the user to open the notebook, run its one cell on an L4, and paste the `URL` and `KEY` lines:
   `https://colab.research.google.com/github/LGuillermoAngaritaG/claude-plugins/blob/main/plugins/colab-video-studio/notebook.ipynb`
   A copy saved in their Drive keeps its access to the `HF_TOKEN` secret between sessions.
2. Run `studio.py connect <url> <key>`. Do not repeat the key in replies.
3. Run `studio.py status` until `phase` is `ready` (ComfyUI installs in about 2 minutes). `gpu` must name an L4 or A100.

## Stage 3: Generate

For each model in the plan, one at a time:

1. `studio.py load <model>` downloads the weights and waits. It prints each file as it goes.
2. Write the approved shots to a job file, `{"model": "<model>", "shots": [...]}`, and run `studio.py run <job.json> <out dir>`. Results land in the out dir as `01_<name>_seed<N>.<ext>` with a `result.json`. A failed shot does not stop the others; the command exits non-zero when any shot failed.
3. Before loading a different model, run `studio.py unload` to free the GPU memory.

Check every result before showing it. For video, make a contact sheet with ffmpeg and look at it. Report plainly what failed.

Offer revisions while the server is up: a redo only costs render time. Reuse a shot's `seed` from `result.json` for a small change to a shot the user liked.

## Stage 4: Kill

Run `studio.py kill` as soon as the user is done. It releases the GPU and waits until the URL stops answering. If it reports that the server still answers, ask the user to choose **Runtime → Disconnect and delete runtime** in the Colab tab. Never end the task with a live runtime.

The server also kills itself after 20 minutes without a request, and after 2 hours in any case.

## When things fail

| Symptom | Action |
|---|---|
| `HTTP 401` | Wrong key, or a new session. Ask for the current `URL` and `KEY` lines |
| The URL does not answer | The runtime is gone (idle limit, or the tab was closed). Ask the user to run the cell again |
| `load` fails with 401 or 403 | LTX-2.5 licence not accepted on Hugging Face, or `HF_TOKEN` missing in Colab Secrets with notebook access on |
| A shot fails with out-of-memory | `studio.py unload`, then lower `megapixels` or `seconds`; confirm the new settings with the user |
| A shot fails for another reason | `curl -H "X-Studio-Key: <key>" <url>/log` shows the end of the ComfyUI log |
| `load` answers `busy` | Another load or the install is still running; check `status` |

Report failures plainly. Never describe a job as complete if any shot failed or was skipped.
