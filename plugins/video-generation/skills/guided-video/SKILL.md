---
name: guided-video
description: >
  Makes a video with the user checking every stage in a review page in their browser: what we
  make, the script and plan, the pictures and motion, the voice, music and AI clips, and the final
  cut. The agent does all the work; the user approves each item or asks for a change, and nothing
  moves on until they send the stage. Use it when the user wants to see or approve the steps,
  says "step by step", "let me review", "human in the loop", "guided", "check with me first", or
  is unsure which type of video fits. It drives the math-video, sketch-video, story-video,
  ad-video and ai-clips skills and the tools of this plugin.
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh *)
---

# Guided video

You make the video; the user decides at five gates, in a page served by `scripts/review.py` of
the workspace. The page is built from the files of the video, so a picture shows up as soon as it
is drawn and a changed line as soon as you save it. The user's answers land in
`src/videos/<series>/<id>/review.json`; you read them as a to-do list.

## Rules that matter most

- Never start a stage before the user has sent the one before it. Silence is not approval.
- Every change the user asks for is done, then shown again in the same stage, until they send it
  with no change. Say in the stage note what you changed.
- No GPU time before the user has approved the clips and music in the plan stage, with the
  estimate in your note. That approval is the go-ahead the `ai-clips` skill asks for.
- An answer the user gives in chat counts too: apply it, and stage again so the page shows it.
- Notes to the user are short, plain words: what is new, what you need decided, what it costs.
- Everything else (narration, layout, sound, checks) follows the pipeline and the skill of the type.

## Set up

1. Read `${CLAUDE_PLUGIN_ROOT}/docs/pipeline.md` and `${CLAUDE_PLUGIN_ROOT}/docs/tools.md`, and run
   `${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh <workspace>` (`--apply` if it lists changes).
2. Start the page server from the workspace, in the background (Bash with `run_in_background`):
   `python3 scripts/review.py serve`. It prints `http://localhost:4600`. One server serves every
   video; if the port is taken, it is probably already running: open the address to check.
3. Pick the series and the id (see the pipeline), start the review (below), then open
   `http://localhost:4600/?video=<series>/<id>` in the Browser pane (`preview_start` with that
   `url`) and give the user the link, so they can also open it in their own browser.

## The loop of every stage

1. Make what the stage shows (below).
2. `python3 scripts/review.py stage <series>/<id> <stage> "<note to the user>"`.
3. `python3 scripts/review.py wait <series>/<id>` with `run_in_background`: you are told when the
   user sends. Meanwhile, do the work that does not depend on their answer.
4. Read what it printed: `CHANGE <item>: <what they want>` lines, the approved items, and their
   message. Do every change, then go back to 2 with the same stage and a note that says what
   changed. The page marks changed items and keeps the approvals of the others.
5. When the user sent the stage with no change, go on to the next one.

Items are named after the files: `scene:<id>`, `image:<name>`, `clip:<name>`, `voice`, `style`,
`music`, `line:<scene>:<n>`, `audio:<name>`, `bed`, `stills:<sheet>`, `final`.

## The steps

**1 to 3. What we make (`brief`).** From the user's idea, write the brief and start the review:

```bash
python3 scripts/review.py start <series>/<id> '{"idea": "<their words>", "types": ["ad"], "length": "20 seconds", "language": "English", "audience": "...", "questions": ["Which screens of the app should we show?"]}'
```

`types` are your suggestion, from the type rules of the pipeline: `math`, `sketch`, `story`, `ad`,
or `other`. Ask at most three `questions`, only what you cannot decide yourself. The user checks
types, edits the fields, answers, and sends. Then:

- **Several types**: one video has one look, which sets its canvas and captions. Take the main
  type and borrow parts of the others (a `Clip` of the ad kit in a story, a `Sketch` drawing in an
  ad, a formula from the math kit in a sketch). When the mix needs both shapes, wide and upright,
  propose two videos.
- **`other`**: read what they need in the brief. If a tool or a skill covers it, say which in the
  plan note. If none does, say plainly what is missing and propose the closest thing you can
  make; a new tool goes into the plugin (`docs/tools.md`, at its end).

**4 to 6. Script and plan (`plan`).** Start the video with `python3 scripts/new.py <type>
<series>/<id> "<title>"` (it keeps `review.json`), then write the whole plan into `script.json`, in
words, before anything is generated:

- the `lines` of every scene, by the rules of the type's skill; check them with
  `npm run -s tts -- --phonemes <series>/<id>`;
- `"voice"` and `"speed"`, and `"mood"`: how it should sound. The local voice has no mood control: the
  mood decides the voice and the speed, or a Chatterbox take (`ai-clips`, then `take.py`);
- `"images"`: every picture to draw, with `"ref"` for a recurring person or place;
- per scene, `"visual"` (what moves on screen: drawings, camera, panels, numbers) and `"sound"`
  (which effects, on what);
- `"music"`, and for AI clips `"style"` and `"clips"` (see `scripts/clips.py`).

Stage `plan` with a note that gives the length, and for clips or music the GPU estimate (minutes
and compute units, from `ai-clips/references/models-and-prompting.md`).

**7 to 9. Pictures and motion (`pictures`).** As soon as the plan is approved:

1. In the background: the voice (`npm run -s tts <series>/<id>`, then `align.py`: the timing the
   code needs; the user hears it in stage 4) and the pictures (`.venv/bin/python scripts/art.py
   <series>/<id>`).
2. Stage `pictures` at once, with a note that they appear as they are drawn.
3. While they are drawn, write `index.tsx`: the animation, the panels, the cues, the sounds. Run
   `check.py` and `stills.mjs`; the sheets appear in the page too. Look at every picture and
   sheet yourself before the user does, and fix what you can see.

A change to a picture: change its words in `images` and run `art.py` again (only it is drawn
again). A change to motion or layout: change `index.tsx` and run the stills again.

**10 and 11. Voice, music and clips (`sound`).** Make what the plan approved: music and clips with
the `ai-clips` skill (`clips.py jobs`, `studio.py run`, `clips.py import`, `frames.py` on every
clip; the sheet shows in the page), the voice already made (or `take.py` for another voice). Run
`mix.py` and set the bed's `vol`. Stage `sound` with a note that names any line the speech check
flagged and where the music sits. Kill the GPU runtime as soon as the user has approved the clips.

**12 and 13. Final cut (`final`).** `scripts/build.sh <series>/<id>`, then for an upright video
`python3 scripts/safezones.py <series>/<id>` (its frames show in the page). Stage `final` with the
length, the result of the file check (`qc.py`) and anything you left as it is and why. The user
sends changes (go back to the stage they belong to, then build again) or marks the video done.

## Done

`wait` prints `marked the video DONE`. Report as the pipeline says, stop the page server, and
leave `review.json` in the video folder: it is the record of what the user decided.
