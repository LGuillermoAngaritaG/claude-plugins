---
name: explainer-video
description: >
  Makes long, high-quality narrated explainers (10 to 12 minutes by default, landscape) that do not feel like AI slop,
  and on request cuts three one-minute upright Shorts out of them. For each moment of the script it picks the medium
  that explains best (3D cutaways in three.js, Codex pictures, image-to-video clips on the Colab GPU, 2D animation in
  code), with the local Phonon voice, every claim sourced in facts.json and an independent anti-slop review
  before the render. It writes the script and the plan first and waits for the user's approval, and starts the Colab
  notebook (or asks for its URL and key) when the plan needs clips. Use it for "make a video about X", "explain how X works", "a deep dive on X",
  "cut Shorts from it", for any topic told to a curious viewer: money, technology, AI, how everyday objects and machines
  work, health and how diseases work. Not for 3Blue1Brown-style equation videos (math-video), hand-drawn shorts
  (sketch-video), stories (story-video) or ads (ad-video).
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh *)
---

# Explainer video

The goal is a video a person learns from and enjoys, that a specialist would not fault, and that nobody mistakes for
AI filler. The tools do not make a video good; choices do. This skill is the director: it decides what each moment
must show, picks the medium, and checks the result before anyone watches it.

## Rules that matter most

1. **Explain every term** the first time the voice says it, in plain words, in the narration itself ("the volute, a
   spiral casing that gets wider"). Never assume the viewer knows a word of the field. **Introduce every person and
   named thing** the same way, in one line: who they are and why they matter ("David Gross, who won the Nobel Prize
   in Physics"; "the Yang-Mills problem, one of seven math problems with a million-dollar prize").
2. **Show, do not write.** When the voice talks about a thing, show the thing: a 3D part, a picture, a clip, a drawing.
   Words on screen are short tags (one to four words) and the odd number. No bullet lists, no paragraphs, no text recap.
   Where you would write a word, show a picture of it instead (a drawing, an icon, a Codex picture). The one exception
   is a worked example: an equation that builds term by term while the voice says each number. `stills.mjs` reports a
   frame with more than 12 words to read.
3. **Show everything the voice names, when it names it, but do not point at what the viewer already sees.** If the
   voice says "the outlet", the outlet is on screen at that second. Tag it only when its name is new and the picture
   alone does not say which part it is; a thing anyone recognises (a tooth, a car, a phone, a city) gets no tag, and a
   part the voice names glows or moves on its word instead of getting a pill. At most three tags at once
   (`stills.mjs` reports more).
4. **One medium per moment, chosen for what it explains.** Never add a medium to look rich. A clip that explains
   nothing is slop.
5. **Every claim has a source** in `facts.json`; the check refuses a number no claim covers. Health and money: only
   what is well established, explain how things work, give no personal medical or financial advice, and say "talk to
   a doctor" or "it depends on your situation" where a viewer could act on it. Mental health (depression, anxiety,
   self-harm): no diagnosis, nothing that reads as therapy, and point the viewer to a professional.
6. **It moves all the time.** A video is motion: every second shows something moving that explains (3D, 2D
   animation, a drawing that draws itself, an AI clip). A still picture or page is never all there is for more than
   3 seconds, and a slow camera on it does not count: draw over it (an arrow, a path, a flow, a part that lights up),
   put a moving view beside it, or make it a clip. `stills.mjs` reports every such stretch ("only a still picture").
   Something new to understand comes at least every five seconds, and it is not decoration.
7. **Plan first, build after approval.** The user sees the script and the plan before any picture, clip or scene is
   made, and approves Colab clips only when the plan needs them. In a channel's week the user approves outlines
   instead, once for the week (`references/channel-week.md`).

## Before you write

1. Read `${CLAUDE_PLUGIN_ROOT}/docs/pipeline.md` (the workspace, the loop, the checks, narration, the report). It all
   holds here; this skill lists what is different.
2. Run `${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh <workspace>` and fix what it reports.
3. Read `references/media.md` beside this file (how to choose and how to use each medium), `references/plan.md` (the
   plan the user approves) and `src/kits/explainer.tsx` in the workspace. `references/review.md` is the checklist the
   review uses: read it now, so you build to it. `references/script-review.md` is the checklist for the script, before
   the voice.
4. Read the finished example `${CLAUDE_PLUGIN_ROOT}/examples/everyday/01-ballpoint-pen/` (and its model in
   `examples/everyday/_pen.tsx`): a short video with a three.js cutaway, a 2D diagram, a Codex picture, the Gemini
   voice and `facts.json`. Its first review found a fact the animation got wrong (thick ink shown pouring) and a tag on
   the wrong part; both were fixed. It shows the parts, not a template.

## The brief

Topic, viewer, length, language. Defaults: a curious adult new to the topic; **landscape, 10 to 12 minutes**; English.
A shorter video only when the user asks. Start with `python3 scripts/new.py explainer <series>/<id> "<title>"`.

A video for one of the user's channels starts with `--channel <channel>` and takes its look, voice, usual length,
closing line, sources, number of fact reviewers and extra review rules from `src/channels/<channel>.json`. Read
`references/channels.md` first. When the user asks for a channel's week (several videos, "next week", "the week's
videos"), follow `references/channel-week.md`: one approval of outlines, then each video without stops, built by
parallel builders with `references/builder-brief.md`.

## Stage 1: script and plan, then stop

1. **Research and facts.** Read sources (official bodies, textbooks, makers' data sheets, review papers; for health,
   WHO, NHS, CDC, Mayo Clinic or the medical literature; for money, regulators and central banks). Write `facts.json`:

   ```json
   {"claims": [
     {"says": "About seventy to eighty percent of the energy comes back (round trip 70 to 80 %).", "source": "https://..."},
     {"says": "One cubic metre lifted one hundred metres stores about a quarter of a kilowatt hour (1000 x 9.81 x 100 J = 0.27 kWh).", "source": "computed: E = m g h"}
   ]}
   ```

   A number you computed names the formula as its source. A claim you cannot source does not go in the video. A claim
   may carry `"date"`, the year (or day) its source was published: always for a number that changes over time.

   **A second fact reviewer**, when the channel's profile says `"fact_reviewers": 2` (health and money): once the
   script is written, start a reviewer with no context of your work and give it only `facts.json`, `references.md` and
   the script's lines. It opens every source and reports each claim the source does not say, says more strongly, or
   says for a different case. Fix or drop each one before the voice.

   Then write `references.md` beside it: the same sources in readable form, for the video's description, so a viewer
   can go deeper. One line each: title, who wrote or published it, year, link; mark one that is not free. Group them by
   chapter, each chapter heading followed by its scenes in a comment, `<!-- scenes: reverse generator power -->`, so
   `short.py` gives each Short only its chapters. Open with "To go deeper": two to four of the best sources for a
   curious viewer (an open review paper, a good book, an official explainer), not the narrowest ones. Find each title
   on the page itself and open every link; a site that blocks scripts ("Just a moment...", 403) is opened in the
   browser. A source with a dead link or a title you cannot confirm is replaced in both files. `check.py` refuses a
   source of `facts.json` that `references.md` does not list.
2. **Script.** 10 to 12 minutes is about 1,650 to 2,000 words: the pace is 160 to 175 words a minute, pauses
   included. At 135 to 146 (week 45) the user found the videos too slow and watched them at 1.1 to 1.15 times speed;
   `check.py` refuses a channel video under 155 once it is voiced. Shape it in **chapters** of 1.5 to 3 minutes; each
   opens with its own question and ends on its answer, so the viewer always knows why they are watching. Simple
   English, B1, short sentences. Make it a story the viewer wants to follow:
   - **The first line is a question to the viewer**, the picture already moving: "Did you know ...?", "What happens
     if you ...?", or the stakes as a question ("Is Anthropic going to go bankrupt? It reported a loss of ..."). Not
     an order or a flat report ("Cut the power to a big pump, and ..."; "Anthropic reported a loss of ..."). It says
     what the video is about and surprises, and the first frame catches the eye with no sound (the YouTube preview
     plays silent). `check.py` wants a question in the first line of a channel video.
   - **Give the map in the first minute.** Right after the hook, one or two lines say what the video covers and in
     what order, and promise the best part: "We'll see how an IPO works, what those losses mean, and who could win or
     lose money." (the user liked this one). It gives the viewer a reason to keep watching; keep the promise later.
   - **Join every chapter to the one before.** A chapter's first line grows out of the last answer with "but", "so"
     or "then": "But then why can't a hole in a tooth heal?", not "Why can't a hole in a tooth heal?". A new topic
     that starts with no link feels out of context.
   - **Say what kind of moment is coming.** Name the important parts with a word of weight before you explain them:
     "The third result is the INTERESTING one, because ...", "Here's the problem.", "This is the part most people get
     wrong." The viewer then knows where to pay attention.
   - **Give the problems their weight.** Risks, limits, what can go wrong and what is still unproven get their own
     lines, said plainly, not one clause at the end of a sentence. They are often the most interesting part.
   - **Compare every big number and every abstract quantity to an everyday thing**: "enough to power about N homes",
     "like water falling from the top of a 30-storey building". Compute or source the comparison in `facts.json`, as
     any number.
   - **End with a question for the comments.** The last chapter answers the opening question and lands its payoff;
     then one line asks the viewer a real question about their own life or opinion ("Would you buy shares at that
     price?", "How long is your commute?"), then the channel's closing line if it has one. Never stop right after the
     last fact, never a summary list, never "follow for more". `check.py` wants a question in the last two lines of a
     channel video.
   - **Write the last line first**, then write toward it.
   - **Turn with "but" and "so", not "and then".** Give the context, then the problem ("But fast water isn't what we
     want"), then what follows from it. Open a question and close it later ("Keep this map in mind. We'll need it.").
   - **Vary the rhythm.** Mix long sentences with short ones. Two words can land a point. A paragraph of equal sentences
     sounds read aloud.
   - **Talk to one friend:** "you", "we", contractions ("it's", "don't"), questions the viewer would ask.
   - **Put the feeling in the words.** The local voice reads every line in one steady tone and skips `"tone"` and
     voice tags (`<short pause>`), so a turn lives in the words and the rhythm: a two-word line before a reveal, a
     question, or "Here's the strange part." A word in CAPS is read as a normal word.
   Then read it as the viewer twice: once for words they might not know (explain each where it first comes), once for
   the "show it" rule (every noun the voice names needs something on screen).
3. **Mark the Short runs**: three, or as many as the channel's `shorts` says. Each is about a minute: 150 to 190 words,
   whole scenes, starting on a line that works as a hook and ending on a payoff, so it can be cut into a Short later
   without new narration. Count the words, not the scenes: calm voices read about 150 words a minute, and runs picked by
   scene came out at 1:05 to 1:35 in the first channel week. `short.py` prints a Short's real length; one over 75 s
   loses a scene, or a line of its scenes, before the scenes are coded.
4. **Script review.** Start one reviewer with no context of your work and give it only `script.json`, `facts.json`
   and `references/script-review.md`, plus the `review` rules of the channel's profile if the video has one. Fix every real problem in the script (and the facts) before you go on; this is
   where a wrong definition, an unexplained term or one word used for two things is cheapest to fix. In the pump
   video, about ten such problems were only found after the voice and the scenes were made.
5. **Plan.** Write `plan.md` beside the script as `references/plan.md` shows: chapters, every scene with its medium and
   what is on screen, the pictures, the 3D models, the Colab clips (with their start pictures, motion, seconds and the
   GPU estimate), the Short runs, the cost.
6. **Show the user and stop.** Send the script and the plan (the files, and a short summary in your message: length,
   chapters, media per chapter, Short runs, cost). Ask for approval or changes. **If the plan has Colab clips, say so
   plainly and ask the user to run the notebook and paste its `URL` and `KEY`** (the `ai-clips` skill, Stage 2, has the
   notebook link); if they prefer no GPU session, animate each clip's moment in code instead. Do not make any
   asset or scene before an explicit go-ahead.

## Stage 2: build

1. **Voice.** The local voice, Phonon on the Mac's GPU (the pipeline's voice step). A channel video takes the
   profile's `"voice"` and `"speed"` (Hadley at 1.05 for every channel: 165 to 176 words a minute on week 45's
   scripts); any other explainer sets them in `script.json`, or reads with Hadley at 1.0.

   ```bash
   npm run -s tts <series>/<id>                     # one clip per line, timing.json, the timing table
   .venv/bin/python scripts/align.py <series>/<id>  # word times and the speech check
   ```

   Each line is read on its own and kept, so a changed line is the only one read again, and the voice costs nothing.
   Before the full run, try the hook and every name or term the voice may get wrong: `npm run -s tts -- --hear
   "<line>"` reads it to `out/voice/hear.wav` and prints what Whisper heard; `-- --phonemes <series>/<id>` prints how
   numbers and abbreviations will be read. `align.py` asks a larger Whisper model about every line the small one
   flags and knows words that sound alike ("vanes" and "veins"), so what it still flags is worth a listen: reword the
   line and run the voice step again. Then `check.py`: a channel video under 155 words a minute gets a higher
   `"speed"` (1.1) and the voice step again.
   The channels used a Google voice (Gemini TTS, `"recording"` and `"google"` in `script.json`, the pipeline's "A
   Google Cloud voice") until week 45, when its takes changed voice, whispered, hissed and dropped to silence in the
   middle of a sentence. Use it only when the user asks for it.
2. **Assets, at the same time** (start them together with the voice: they do not depend on each other). If the plan has
   clips, connect to the Colab server and load the video model first, while the pictures are drawn; draw the clips'
   start pictures early, run each clip as soon as its picture is checked, and kill the runtime once every clip is
   checked: the server stops by itself after 20 minutes with no request, so do not leave it waiting. Then: pictures (`images` in `script.json`, `.venv/bin/python scripts/art.py <series>/<id>`,
   three at a time; look at every one with the Read tool and redraw any that is wrong, has text, or is too busy), and the approved Colab
   clips (`ai-clips` skill, which starts the notebook or asks for its URL and key: `scripts/clips.py <series>/<id> jobs`, run, check every clip
   with `scripts/frames.py`, `... import`, and kill the runtime at the end).
3. **Code**, chapter by chapter: `look: EXPLAIN`, `art` imported, one component per scene, models a series shares in
   `_shared.tsx` or `_<model>.tsx`. For speed, code a long video with parallel subagents, one scene file each, as
   `references/scene-agents.md` shows: the order, the brief to give them, and a cookbook of the kit and of the
   mistakes reviewers caught, so they read less code and repeat none of them. Cue every appearance on the word that names it: `said(words, i, 'outlet')`.
   **Scenes in the three Short runs lay out for both shapes**: `const tall = useTall();` and a second set of pins,
   camera distances and picture places for the upright frame (`references/media.md`, Shapes).
4. **Check each chapter as you finish it:** `npx tsc`, `check.py`, `stills.mjs <series>/<id> <scene> ...` for its
   scenes, and look at every sheet. When all chapters are done, the full `stills.mjs` run. Its first tile is the first
   frame: what a silent preview shows, so it must already move and fill the frame. Besides text problems it reports tag
   lines that cross and numbers on screen that the scene does not say and `facts.json` does not have.
5. **Anti-slop review.** Start reviewers with no context of your work, one per two or three chapters, in parallel; give
   each only the paths of its contact sheets, `script.json`, `facts.json`, `references/review.md` and the channel's
   `review` rules if it has a channel. Fix every real
   problem; say in your report which ones you left and why. A dead stretch reported in a 3D scene whose camera stands
   still while parts move is a known blind spot of the check: confirm it by eye.
6. **Draft for the user.** Stills cannot show motion, and nobody but the user can judge whether a tone sounds right.
   Render a draft, `node scripts/render.mjs <series>/<id> --draft` (half size, about 2.4 times faster than the final
   render, a few MB a minute), send it, and ask the user to watch the moving parts and listen to the voice. Fix what
   they find, then build; build right away if they say so. A channel's week skips the draft: the user watches the
   finished files before upload.
7. **Build** with `scripts/build.sh <series>/<id>`. A 12 minute render takes about 10 to 15 minutes on mains power
   (more on battery); run it in the background.

## Shorts, when the user asks

Cut the three marked runs, in the same series, then make each one good on its own:

```bash
python3 scripts/short.py <series>/<id> 02-short-<name> "<title>" <scene> <scene> ...
.venv/bin/python scripts/align.py <series>/02-short-<name>
python3 scripts/check.py <series>/02-short-<name> && node scripts/stills.mjs <series>/02-short-<name>
scripts/build.sh <series>/02-short-<name>
```

`short.py` reuses the long video's voice and scenes under the upright look (no new narration, no new code), and its
references cut to the Short's chapters. When the long video's voice or facts change, cut the Short again with
`--again`, then align it again. The first tile of its stills is its first frame: in the Shorts feed that frame
decides whether anyone stays, so it must fill the upright frame and already move (both weak openings of the pump
Shorts were small objects in an empty frame). Fix a scene
that does not fit the upright frame in the long video with `useTall()`, never in the Short, and look at the long
video's stills again after the fix. A Short is about a minute; YouTube Shorts allow up to three. The joined file of the
series keeps only the landscape video; the Shorts are their own parts.

## Report

To get a finished video ready for YouTube (title, description with its sources, tags, thumbnail), use the
`youtube-publish` skill.


The pipeline's report, plus: which medium each scene used and why, the review's findings and what you did with them,
the GPU time, and any claim or picture you could not confirm.
