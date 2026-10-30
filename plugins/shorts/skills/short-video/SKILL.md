---
name: short-video
description: >
  Makes YouTube Shorts from scratch: upright 1080 x 1920, 45 seconds to 2.5 minutes as each idea needs, one idea each,
  for one of the user's channels (its voice, sources and review rules) or for any topic. For each idea it picks the
  look that explains it best: explainer (3D cutaways, Codex pictures, Colab AI clips, 2D animation), sketch (ink
  drawings that draw themselves) or story (painted pictures, a case). One stop: the user approves the list of ideas;
  then every Short is built and checked with no other stop, gets its title, description and sources, and goes up to
  YouTube as private. Use it for "make Shorts about X", "five Shorts for Cell to Cure", "a week of Shorts", "a Short
  on X". Not for Shorts cut from a long video (video-generation explainer-video) or for long videos.
---

# Shorts

A Short is one idea that a person gets in a minute or two, on a phone, with their thumb ready to swipe. It wins or
loses in its first second and must pay off before it ends. The video-generation plugin holds the engine (voice,
looks, checks, render, publish); this skill decides what each Short says and shows, and runs a batch of them.

## Rules that matter most

These come from the first three channel weeks and the user's notes on them.

1. **45 seconds to 2.5 minutes, as long as the idea needs**, measured on the voice. The user wants each thing
   explained as well as possible: never pad a small idea, never squeeze a big one. A rough guide:
   - 45 to 60 s: one fact and its reason, one tip, one surprising answer;
   - 60 to 90 s: a mechanism of two or three steps, or a myth and then the truth;
   - 90 s to 2.5 min: a process with several parts, three things compared, three tips each with its reason.

   Each idea's length is planned in ideas.md and approved with it. Over a minute, the hook is followed early by what
   the viewer will get (the three steps, the three tips), so they know why to stay. `check.py` refuses a Short
   outside 45 to 150 s once it is voiced (`"seconds": [min, max]` in script.json only when the user asks for another
   range). Plan about 150 words a minute: about 110 words for 45 s, 150 for one minute, 300 for two, 375 for 2.5.
   Then trust `check.py`, not the count, and fix the length in the script and voice it again before any scene is
   coded: a voice take is cheap, a scene is not.

   YouTube blocks a Short over one minute that has any Content ID claim ("Understand three-minute YouTube Shorts",
   YouTube Help): a Short with someone else's footage (a trailer, gameplay, a YouTube excerpt) stays at 60 s or less.
2. **One idea, one payoff.** The first line is the hook: a question to the viewer ("Did you know ...?", "What happens
   if you ...?") or a plain surprising fact, never "in this video". **The first frame decides whether anyone stays**:
   it fills the upright frame and already moves (the weak openings so far were small objects in an empty frame).
   End on the payoff. A channel's explainer Short then asks a question for the comments (`check.py` checks the hook
   and the ending); a story ends on the answer or the open question. Never "follow for more".
3. **Explain every term** the voice uses, in plain words, in the line itself, and introduce every person in one line.
   A minute has room for one or two terms, a longer Short for a few more: never more than its length can explain.
4. **Show, do not write.** What the voice names is on screen at that moment. Words on screen are tags of one to four
   words: no lists, no paragraphs, no label pointing at what the viewer already sees.
5. **Motion all the time.** Something moves every second. A still picture for over 3 seconds is a fault (`stills.mjs`
   reports it); a slow camera push on a picture does not count as motion.
6. **Sourced and safe.** Every claim has a source (`facts.json` in the explainer look, `references.md` in every
   look). Health and money: only what is well established, no personal advice, and a second blind fact reviewer when
   the profile says `"fact_reviewers": 2`. Never state a number you are not sure of.
7. **Talk to one friend**: B1 English, short sentences, "you" and "we", at least 155 words a minute.

## Set up

1. Run `${CLAUDE_PLUGIN_ROOT}/scripts/video-plugin.sh`. It prints the folder of the video-generation plugin;
   `<video plugin>` below is that folder.
2. Run `<video plugin>/scripts/workspace.sh <workspace>` (the user's is `~/Documents/explanations`) and fix what it
   reports. Pictures need `atelier` and the `codex-image` conduit; a Speechify channel voice needs the env var
   `SPEECHIFY_API_KEY`; stock footage needs `PEXELS_API_KEY` or `PIXABAY_API_KEY` (free keys).
   The helpers (`scene-coder`, `video-builder`, `video-reviewer`) come with the workspace and load only when a session
   starts: if they are not among the agent types you can start, stop and ask the user to start a new session in
   the workspace. Never run their prompts as `general-purpose` agents (about 62k tokens each at the start, not 13k).
3. Read `<video plugin>/docs/pipeline.md` and `<video plugin>/docs/tools.md`. Then, for each look you will use:
   - **explainer**: `<video plugin>/skills/explainer-video/references/` media.md, scene-agents.md, script-review.md, claim-review.md
     and review.md, and channels.md for a channel. Not that skill's SKILL.md: it is for long videos.
   - **sketch**: `${CLAUDE_PLUGIN_ROOT}/skills/sketch-video/SKILL.md`.
   - **story**: `${CLAUDE_PLUGIN_ROOT}/skills/story-video/SKILL.md`.

## The brief

How many Shorts, for which channel or topic, in which language. Defaults: five Shorts, English. A channel's Shorts
follow its profile (`src/channels/<channel>.json`); a topic without a channel is for a curious adult, with the default
voice. Say what you chose.

A channel's batch is one series, `<channel>-shorts-<yyyy>-w<nn>` (ISO week); Shorts on a topic go in a short
lowercase series of their own. Ids are `01-<name>`, `02-<name>`, and so on.

## The ideas, the one stop

1. **Pick the ideas.** The channel's topic list `src/channels/<channel>.topics.md` first, then your own, none the
   channel has made already (look in `src/videos/<channel>-*`). An idea is one question with a surprising, true
   answer that 45 seconds to 2.5 minutes can give; pick its length (rule 1).
2. **Pick the look of each**:

   | Look | Best for | Starts with |
   |---|---|---|
   | explainer | a machine, a process, a number that needs 3D, real footage or a moving diagram; news about a game, a film or a product | `new.py explainer-short` |
   | sketch | the body, a habit, an everyday thing told simply in drawings | `new.py sketch` |
   | story | a case, a person, a moment in history | `new.py story` |

   Mix looks across a batch when the ideas ask for it; do not force one look on every idea.
3. **Research** each idea enough to source its riskiest claim.
4. **Write `src/videos/<series>/ideas.md`** as `references/ideas.md` shows, send it with a short message (the
   titles, their looks and lengths, the clips and GPU time if any) and stop. If any idea needs Colab clips, say so; start the
   notebook yourself when you can (video-generation `ai-clips` skill, Stage 2), else ask for its URL and key now,
   once for the batch.
5. The user answers by number: approved, changed or replaced. Apply each change, send again only what changed, until
   every idea is approved. Nothing is built before that. **The approval is also the go-ahead to upload those Shorts
   as private videos** at the end; never public, unlisted or scheduled unless the user asks.

## Each Short, with no other stop

```bash
python3 scripts/new.py <explainer-short | sketch | story> <series>/<id> "<title>" [--channel <channel>]
```

With `--channel` the script takes the channel and its voice and speed; the sketch and story looks keep their own
paper and pictures. Then:

1. **Script** in script.json, and the sources: `facts.json` (explainer) and `references.md` (every look; a fiction
   story has none). Keep `"channel"`, `"voice"` and `"speed"` as new.py wrote them.
2. **Blind script review**: a `video-reviewer` with only script.json, facts.json, script-review.md and the profile's
   `review` rules; at the same time the claim review (a `video-reviewer` with only script.json, facts.json and
   claim-review.md); the second fact reviewer when the profile asks. Fix what they find before the voice.
3. **Voice and length**: `npm run -s tts <series>/<id>`, `.venv/bin/python scripts/align.py <series>/<id>`, then
   `python3 scripts/check.py <series>/<id>`. Do not go on until the length (and, for a channel explainer, the hook,
   the ending and the pace) passes.
4. **Pictures and motion** as the look's guide says: `art.py` (look at every picture), Colab clips from the batch's GPU
   session (about 7 seconds each), 3D in three.js, and real footage through `scripts/footage.py`: stock, an official
   trailer, gameplay or a YouTube excerpt, always without its own sound (media.md, "Real footage"; sketch and story
   import `Clip` from `src/kits/ad.tsx`). Someone else's footage only in a Short about that work, 8 seconds a piece at
   most, and only in a Short of 60 s or less (rule 1). The first scene is the strongest moving picture of the Short.
5. **Scenes**: in the explainer look one `scene-coder` writes them (scene-agents.md); sketch and story scenes follow
   their skill.
6. **Check and look**: `check.py` at 0 problems, `node scripts/stills.mjs <series>/<id>`, and read every sheet; the
   first tile is the first frame. Then a blind anti-slop review: a `video-reviewer` with the sheets, review.md and the
   profile's `review` rules. Fix every real problem with a fresh scene agent, and look again.
7. **Render**: `scripts/build.sh <series>/<id>`, one render at a time, in the background. It ends with `qc.py`, the
   check of the finished file: fix what it finds, or explain it in the report.

**A batch.** For two or more Shorts, give each one to a `video-builder` agent (never a `general-purpose` agent with
its prompt: step 2) with `references/builder-brief.md`
filled in. Start at most three at once: the speech check of `align.py` is what the Mac runs slowest. You run the
batch's clips in one GPU session right after the approval, and the renders yourself, one at a time, as each builder
reports ready; look at its first sheet and its report before you render.

## Publish and upload

1. Each Short has `publish.json` beside its script: `{"title": "...", "intro": "One or two plain sentences.",
   "tags": [...]}` (title at most 100 characters; `"synthetic": true` only when a realistic AI person, place or event
   is shown). No thumbnail: YouTube shows a frame of a Short; the user sets it in Studio if they want another.
2. `python3 scripts/publish.py <series>` writes `videos/<series>/publish.md` (description: the intro, every source,
   the channel's note, #Shorts). Fix every problem it reports.
3. A channel's Shorts go up private: `python3 scripts/upload.py <series>` (a dry run of every file), then
   `python3 scripts/upload.py <series> --execute` in the background. It writes the YouTube IDs to
   `videos/<series>/upload/ids.json` and skips what is up already. A Short without a channel stops at publish.md: there
   is no channel to upload to. More on both: `<video plugin>/skills/youtube-publish/SKILL.md`.

## Report

For each Short: the file and its length read from the file (`ffprobe`), its private YouTube link, its look and why,
what the reviewers found and what you fixed or left, any claim or picture you could not confirm, and the two or three
moments you are least sure of (motion and tone nobody has seen or heard yet). Then the GPU time and anything the
guides got wrong or made you guess.
