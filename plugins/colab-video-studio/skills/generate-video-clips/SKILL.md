---
name: generate-video-clips
description: >
  This skill should be used when the user asks to "generate a video", "make a clip",
  "create video clips", "render scenes", "make a short film", "animate this idea",
  or names MiniMax H3 or LTX-2.5 for video generation. It plans the clips with the
  user, gets explicit approval, renders them on a Google Colab GPU through the
  colab-mcp server, saves them to Google Drive, shows them, and shuts the GPU down.
metadata:
  version: "0.1.0"
---

# Generate video clips on Colab

Turn a video idea into approved clips rendered on a Colab GPU. GPU time costs the user money, so nothing runs until the user approves the plan, and the runtime always ends unassigned.

Files in `references/`:
- `runner.py` holds all Colab-side code. Paste it into Colab verbatim. Never retype or edit it.
- `models-and-prompting.md` holds model specs, defaults, cost estimates, and prompt patterns.

## Stage 1: Pick the model

If the user named a model, use it. Otherwise ask with AskUserQuestion before planning anything, since prompt style and limits differ. Explain both options in the question:

- **MiniMax H3** (`h3`): best open-weights quality, strong physics and prompt following, clips up to 15 s, stereo audio. Slower. Its license excludes the EU, UK, South Korea and the US, and Colab servers usually sit in the US, so the user must judge whether that applies to them.
- **LTX-2.5** (`ltx`): faster, sharper default resolution, audio included. Ranks below H3 on blind preference. Needs a Hugging Face token with the LTX-2.5 license accepted.

## Stage 2: Agree on look, feel and scenes

Read `references/models-and-prompting.md` first.

1. Gather what is missing from the request: purpose and audience, visual style, color palette, lighting, camera language, mood, era or setting, recurring characters, audio (ambience, music, dialogue), aspect ratio, clip length, number of scenes. Ask about at most three gaps at a time and propose sensible choices for the rest.
2. Write a **style anchor**, one paragraph that fixes the look and feel. Reuse it word for word in every prompt so the clips cut together. Do the same for any recurring character description.
3. Write the shot list. Each shot gets a short name, length in seconds, a one-line description, and the full prompt in the chosen model's pattern.
4. Present the plan in this order:
   - Model and settings (aspect, resolution, turbo or prompt enhancement)
   - Style anchor
   - Shot table: number, name, seconds, one-line description
   - Full prompt per shot
   - Estimate: render minutes and Colab compute units, including ~10 min of setup per batch
5. Ask the user to approve, edit, or drop shots. Apply edits and show only the changed shots plus the new estimate. Repeat until approval.

Treat only an explicit go-ahead ("approved", "run it", "go") as approval. Questions or partial comments are not approval. Never open Colab before approval.

## Stage 3: Render on Colab

Track these steps with the task list.

1. **Connect.** Call the colab-mcp `open_colab_browser_connection` tool. It opens a Colab notebook in the user's browser and unlocks notebook tools. If it returns false, ask the user to keep the opened Colab tab in front and signed in, then call it once more. Use whatever notebook tools appear afterwards to add and run code cells; their names come from Colab and can change.
2. **Check the GPU.** Run `!nvidia-smi --query-gpu=name,memory.total --format=csv`. Anything other than an L4 or A100 (no GPU, T4) means asking the user to choose **Runtime → Change runtime type → L4 → Save**, waiting for their confirmation, and checking again.
3. **Load the runner.** Read `references/runner.py` and paste its full content into one cell. Run it and expect `Runner loaded`.
4. **Mount Drive.** Run `mount_drive()` and tell the user to approve the Google Drive popup in the Colab tab.
5. **LTX only.** The runner reads the token from Colab Secrets as `HF_TOKEN`. Before starting, confirm the user has accepted the license at huggingface.co/Lightricks/LTX-2.5 and stored the token in Colab Secrets with notebook access on.
6. **Start the batch.** Build the shots as a JSON list of the approved values, then run:
   ```python
   start_batch("h3", SHOTS, batch_name="<short-name>", max_minutes=<limit>)
   ```
   Each shot needs `name` and `prompt`, plus any of `seconds`, `aspect`, `megapixels`, `seed`, and `turbo` (h3) or `enhance_prompt` (ltx). Set `max_minutes` to twice the estimate plus 20. The call returns at once and prints the Drive output folder; note it.
7. **Poll.** Run `status()` in a new cell every 2-3 minutes. Tell the user only at milestones: setup done, each shot finished, errors. Keep cells short; long-running cells can time out the MCP call.
8. **Shut down.** The runner unassigns the runtime by itself when the batch finishes, fails, or hits `max_minutes`. Confirm it: after the final status, the Colab connection drops or the tab shows the runtime disconnected. If the runtime is still alive (status shows no `runtime` field), run `stop()`. If cells stop responding, ask the user to pick **Runtime → Disconnect and delete runtime** in the Colab tab. Never end the task with a live runtime.

## Stage 4: Deliver

1. Find the batch folder in Google Drive under `claude_videos/` with the Google Drive connector. It holds the clips (`01_<name>_seed<N>.mp4`, ...), `shots.json`, and `status.json`.
2. Download each clip and show it to the user: send it into the chat, or save it to a folder on their computer when one is connected.
3. Report briefly: clips rendered, minutes per shot, total runtime, approximate units used (L4 ≈ 1.7 units per hour).
4. Offer revisions. Batch all re-renders into one new run, since each run pays the setup cost again. Keep seeds from `shots.json` when the user wants small prompt changes on a shot they liked.

If no Drive connector is available, tell the user the clips are in `My Drive/claude_videos/<batch>/` and ask them to open them there.

## When things fail

| Symptom | Action |
|---|---|
| `status()` shows `phase: error` with out-of-memory | Lower `megapixels`, shorten `seconds`, or use `turbo=True` (h3); confirm the new settings with the user before rerunning |
| Download error 401 or 403 (ltx) | License not accepted or `HF_TOKEN` missing in Colab Secrets |
| `Drive is not mounted` | Rerun `mount_drive()` |
| `No GPU` or Colab says no GPU is available | Ask the user to retry later or pick an A100; do not fall back to CPU |
| Colab shows a captcha or sign-in page | Stop and ask the user to resolve it in the tab |
| A shot fails but others finished | Deliver the finished clips, then offer to rerun the failed shot |

Report failures plainly. Never describe a batch as complete if any shot failed or was skipped.
