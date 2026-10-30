# Builder brief (fill the angle brackets; one per video of a channel's week)

This brief worked for the first channel week (five videos and fifteen Shorts in one night). Give each video to two
builders in turn (`subagent_type: "video-builder"`), both with this brief and the video's lines at
the end: the writer does steps 1 to 6 and ends with a handoff note; the finisher starts fresh with that note and does
steps 7 to 10. In the second channel week one builder per video grew to 600k to 700k tokens, paid for all of it on
every step, and paid again after each wait of over five minutes (align, scene agents), when its cache had expired.
The builders work alone: they do not ask the user anything; they decide and report.

```markdown
# Brief: build one video of <channel>'s week

You own ONE video and its Shorts, up to (not including) the render: you are its <writer (steps 1 to 6) | finisher
(steps 7 to 10)>. Other builders work on other videos on this Mac at the same time. The user approved your outline;
there is no other stop for the user.

The writer ends with <scratchpad>/<series>/handoff.md: what is done, the decisions and why, open review points, the
clip paths, what the finisher must not change. The finisher reads it first.

Workspace: <workspace> (run every command from there). Plugin (read only): <plugin>. Your working files (briefs for
your scene agents, notes): <scratchpad>/<series>/ only.

## Read first
The writer reads all of this. The finisher reads pipeline.md, tools.md, SKILL.md from Stage 2 on, scene-agents.md,
media.md, review.md, the profile, handoff.md and the video's plan.md, script.json and facts.json.
- <plugin>/docs/pipeline.md and <plugin>/docs/tools.md
- <plugin>/skills/explainer-video/SKILL.md and its references/ (channels.md, media.md, review.md, script-review.md, claim-review.md,
  scene-agents.md, plan.md, outline.md); for a news briefing, <plugin>/skills/news-video/SKILL.md instead of Stage 1
- the channel profile src/channels/<channel>.json: its length, Shorts, voice, closing line, sources, fact reviewers
  and review rules bind you
- your outline (src/videos/<series>/outlines.md) and what research already put in your folder
- a finished example of the same kind: <a series of an earlier week, or examples/everyday/01-ballpoint-pen>

## Steps (SKILL.md Stage 1 and 2, channel-week mode: no plan stop, no draft stop)
1. Research what the script needs beyond the outline: facts.json, references.md.
2. Script in script.json. Keep "channel", "voice", "speed", and any "images", "clips", "style" already there.
   The Short runs: 150 to 190 words each, counted.
3. Blind script review (`video-reviewer` with script-review.md plus the channel's review rules), and at the same
   time the claim review (`video-reviewer` with only script.json, facts.json and claim-review.md); the
   second blind fact reviewer if the profile says "fact_reviewers": 2. Fix what they find before the voice.
4. plan.md, for the record.
5. Voice (npm run -s tts), align.py, the speech-check flags, and the pace check of check.py (SKILL.md Stage 2, step 1).
   align.py is slow on a busy Mac: get the script right before the first take, so it runs as few times as possible.
6. Pictures (art.py; about 12 or fewer: Codex is shared). Look at each one.
7. Scenes: one `scene-coder` per chapter, at most three at once (scene-agents.md). The channel's
   colours: useTheme() in 2D, the profile JSON in 3D.
8. check.py, stills.mjs (look at every sheet), then the blind anti-slop reviewers (`video-reviewer`
   with review.md plus the channel's review rules). Fix every real problem through fresh scene-coders, one per file.
9. Shorts: short.py, align, check, stills; upright layouts are fixed in the long video's scenes with useTall().
10. Stop before rendering: never run build.sh or render.mjs. Leave check.py at 0 problems and clean stills for the long
    video and each Short.
<clips, if any: "The main session made your clips: <names and paths>. Use them with <Clip src=...>; if one is
missing, animate that moment in code and say so.">

## Rules
- Touch only src/videos/<series>/, public/art/<series>/ and public/audio/<series>/. Never the plugin, the engine,
  another series or the profiles; a part the kit lacks goes in your series' _shared.tsx, and you say so.
- No commits, no emojis.
- Log each step's start and end clock time in src/videos/<series>/pilot-log.md.

## Report (short, plain)
The writer: the path of handoff.md and what is still open. The finisher: ids and lengths; one line per scene (what is on screen, why); what the reviewers found, what you fixed and what you
left (and why); claims you could not confirm; speech-check lines kept; the time log; the two or three moments you are
least sure of (motion and tone nobody has seen or heard yet).
```

Then, per video, add what only that video needs: its folder and outline, its rules (health, money, psychology,
news), its clips, and any number the main session already recomputed.
