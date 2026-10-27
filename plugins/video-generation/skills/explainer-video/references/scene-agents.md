# Coding a long video with parallel scene agents

A 10 to 12 minute explainer has 30 or more scenes. Coded by one agent it takes hours; split over four agents, each
owning one file, it took about 40 minutes for the pump video, and a blind review plus one fix round each made it good.
Most of each agent's time went into reading code: give them this cookbook and the brief below, so they read less.

## The order

1. The voice is final (the voice step, `align.py`, every speech-check flag looked at), the pictures and clips are made.
   Agents cue on words: a narration change after they start means re-cueing.
2. You write `common.tsx` in the video folder: camera poses for both shapes, lamps, the timeline (`timeline()` of the
   kit: `START`, `when`, `turn`) and anything that runs across scenes (a wheel's angle), shared pictures, clip paths, a
   panel. You write `index.tsx` with a literal scene map, `scenes: {hook: A.scenes.hook, ...}` (`check.py` follows it into each scene file),
   and one placeholder file per agent (`a.tsx` to `d.tsx`) so the project compiles from the start.
3. If Shorts are planned, cut them now (`short.py`) so the agents can check their upright layouts.
4. Write the brief (below) to a file, and start the agents in one message, each with its file, its scenes, which of
   them are in a Short, and short notes per scene (what the plan says plus anything you already know is tricky).
5. When they report: `npx tsc`, `check.py` (it also refuses a `said(...)` cue on a word its line does not say, and a
   `b[i]` past the scene's lines), then the stills and the blind reviewers. Send each review point to the agent that wrote the scene: it
   knows the code, so its fix round is short.

## The brief (fill the angle brackets)

```markdown
# Brief: code the scenes of one part of "<title>"

Workspace: <workspace>. Video: src/videos/<series>/<id>/ (VID), <length>, landscape 1920 x 1080 (look EXPLAIN).
Script, voice, plan and pictures are approved and made. <n> agents code the scenes at the same time, each in its own
file. You own ONE file, named in your task.

Hard limits: edit only your file. Not common.tsx, index.tsx, other scene files, script.json, timing.json, art.json,
facts.json, plan.md, the shared models or src/kits, src/engine.tsx: define helpers inside your file. Your file must
always compile (the others render from the same project). No commits, no full render, no emojis.

Read first: VID/plan.md (your scenes and "How it keeps attention"), VID/script.json, VID/timing.json, VID/facts.json,
VID/common.tsx, <the series' models and any earlier video with similar scenes>, then the cookbook:
<plugin>/skills/explainer-video/references/scene-agents.md (section "Cookbook"), and review.md beside it (what the
reviewer will check).

Checks, until clean: `npx tsc --noEmit 2>&1 | grep <id>/<file>`; `python3 scripts/check.py <series>/<id>` (your
scenes' lines); `node scripts/stills.mjs <series>/<id> <your scenes>` and look at every sheet, plus one frame in the
middle of each camera move (`scene:seconds`); Short scenes also in the Short (`<series>/<short-id>`).

Report: per scene what is on screen, the medium, the camera; what you checked; what you could not fix; what you
changed from the plan and why.
```

## Cookbook

**A scene** is `React.FC<SceneProps>` with `{t, b, dur, words}`: `t` seconds into the scene, `b[i]` when line `i`
starts, `dur` the scene length. `said(words, i, 'word')` is the second a word of line `i` starts (prefix match, case
and punctuation ignored); it throws when the line does not say it, which breaks the whole scene, so after any
narration change re-check every cue word. A scene is a pure function of `t`: no state, no `Math.random` (`hash(k,
salt)`).

**Time:** `ease(t, at, len)` 0 to 1; `span(t, on, off, len)` on then off; `flash(t, at)` a short glow for a named part;
`glide(t, startPose, [[at, len, pose], ...])` camera moves; `drift(pose, t, degPerSec)` a slow turn; `timeline()`
for what carries across scenes.

**Parts of the kit** (`src/kits/explainer.tsx`): `Stage pose sky lamps size` (3D), `Tag pose at pin o dot` (a pill
with a line to a 3D point), `Picture art={art.name} x y size o label` (crops to a square), `Clip src at o` (a video
file, full frame unless a box is given; lasts its own length), `Label`, `Counter p to digits unit`, `Bar`, `Card`,
`Svg2D`, `Measure a b p label`, `Legend what`, `Inset` (a round 3D window), `screen(pose, point, frame)` (where a 3D
point lands), `useTall()` (true in an upright frame), `K` colours (blue low or cold, red high or wrong, green right),
`ACCENT`, `SANS`.

**Layout:** landscape text inside x 90 to 1830, y 50 to 1050 (the long video has no captions). Upright text inside x 70 to
1010, y 220 to 1360 (captions own 1380 to 1500); upright scenes need their own poses, further back, and pictures above
the object.

**What the reviewers caught in the pump video (do not repeat):**
- A number on screen that is not the narration's: "3.9 kW" while the voice says "about four kilowatts". A counter
  must finish fast and then hold for at least 2.5 s, or a frame catches it halfway ("+28 %").
- A tag that shows the thing the voice says is missing (a "No guide vanes" tag on a ring of guide vanes).
- One word for two things: "outlet" first for where the water comes in, then for where it leaves.
- Tag lines that cross; tags under 110 px apart; a tag pointing at the wrong part (into a channel, not at a blade).
  The tag that points lower on the object takes the lower pin. Two tags on parts that turn (a vane and the channel
  beside it) swap order as the wheel turns, so no pins keep them apart: tag one and make the other glow on its word.
  Two pills on the same side with texts of different length start their lines at different places and cross easily;
  put them on opposite sides. `stills.mjs` reports every crossing it sees.
- A see-through panel (rgba background) with 3D parts showing through it: panels are opaque.
- Text dimmed below 0.6 opacity: it reads as a mistake. Dim to 0.6 or fade it out.
- A blank stretch: an empty frame for two seconds between two things. Keep the last picture until the next one is in.
- A slideshow (the user's complaint after the first week): a picture or a page held with only a slow camera. Within
  3 seconds something moves over it or beside it: an arrow that draws, a path, a highlight that travels, a 2D or 3D
  view, or the clip it starts. `stills.mjs` reports "only a still picture" for each such stretch.
- Tags on what the viewer can already see (a "Tooth" pill on a tooth). Tag only new terms the picture does not make
  clear, three at most at once; a named part the viewer sees glows or moves on its word.
- Words in place of pictures: a list of words, or a long label. A small picture says it better; `stills.mjs` reports
  more than 12 words on screen.
- An unnamed object that catches the eye (a cable or pipe that reads as a rod): hide what the voice does not name.
- A weak first frame. The first frame of the video and of each Short is already moving and fills the frame: the
  silent preview decides whether anyone watches.
- A wide picture shown in `Picture` (cropped badly): wide pictures are clip start frames, shown full frame.
- Small 2D cards at the top of an upright frame with empty space below: scale them up in the upright layout.
- Stills cannot show motion: wheels speeding up, drops, shaking. Check one frame in the middle of every move, and
  say in your report what you could only assume.
