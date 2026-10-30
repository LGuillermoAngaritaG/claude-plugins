# Coding a long video with parallel scene agents

A 10 to 12 minute explainer has 30 or more scenes. Coded by one agent it takes hours; split over four agents, each
owning one file, it took about 40 minutes for the pump video, and a blind review plus one fix round each made it good.
Most of each agent's time went into reading code: give them this cookbook and the brief below, so they read less.

Size the jobs by chapter. An agent re-sends its whole context on every step, so its cost grows with the square of its
job. In the second channel week, agents that each coded a quarter of a video grew to 400k to 600k tokens and used more
than half of the week's tokens; waking one after a review cost a full re-send, because a helper's cache lasts five
minutes. One chapter per agent, and a fresh agent for each fix round, keeps every context small; the model and the
checks stay the same.

## The order

1. The voice is final (the voice step, `align.py`, every speech-check flag looked at), the pictures and clips are made.
   Agents cue on words: a narration change after they start means re-cueing.
2. You write `common.tsx` in the video folder: camera poses for both shapes, lamps, the timeline (`timeline()` of the
   kit: `START`, `when`, `turn`) and anything that runs across scenes (a wheel's angle), shared pictures, clip paths, a
   panel. You write `index.tsx` with a literal scene map, `scenes: {hook: A.scenes.hook, ...}` (`check.py` follows it into each scene file),
   and one placeholder file per chapter (`a.tsx`, `b.tsx`, ...) so the project compiles from the start.
3. If Shorts are planned, cut them now (`short.py`) so the agents can check their upright layouts.
4. Write the brief (below) to a file, and start one agent per chapter (`subagent_type: "scene-coder"`),
   at most three at once, each with its file, its scenes, which of them are in a Short, and short notes per scene (what
   the plan says plus anything you already know is tricky). When one reports, start the next chapter's agent.
5. When they report: `npx tsc`, `check.py` (it also refuses a `said(...)` cue on a word its line does not say, and a
   `b[i]` past the scene's lines), then the stills and the blind reviewers (`video-reviewer`). Group
   the review points by file and give each file's points to a fresh scene-coder with the same brief, the points and
   the paths of their sheets. Do not send them to the agent that wrote the file: its cache has expired, and waking it
   re-sends its whole context.

## The brief (fill the angle brackets)

```markdown
# Brief: code the scenes of one part of "<title>"

Workspace: <workspace>. Video: src/videos/<series>/<id>/ (VID), <length>, landscape 1920 x 1080 (look EXPLAIN).
Script, voice, plan and pictures are approved and made. One agent codes each chapter, each in its own file. You own
ONE file, named in your task. For a fix round, your task also lists the review points and their sheets: read and change
only the scenes they name.

Hard limits: edit only your file. Not common.tsx, index.tsx, other scene files, script.json, timing.json, art.json,
facts.json, plan.md, the shared models or src/kits, src/engine.tsx: define helpers inside your file. Your file must
always compile (the others render from the same project). No commits, no full render, no emojis.

Read first: VID/plan.md (your scenes and "How it keeps attention"), VID/script.json, VID/timing.json, VID/facts.json,
VID/common.tsx, the parts of <the series' models and an earlier video with similar scenes> your scenes use, then the cookbook:
<plugin>/skills/explainer-video/references/scene-agents.md (section "Cookbook"), and review.md beside it (what the
reviewer will check).

Checks, until clean, one command a round: `scripts/scenes.sh <series>/<id> <file> <your scenes> <scene:seconds ...>`
(the type check of your file, check.py, the sheets and their layout problems), with one moment in the middle of each
camera move. Read every sheet it lists in one message (several Read calls at once), not one per step. After a fix,
run it again for the scenes you changed only. Short scenes also in the Short (`<series>/<short-id>`).

Report: per scene what is on screen, the medium, the camera; what you checked; what you could not fix; what you
changed from the plan and why.
```

## Cookbook

**A scene** is `React.FC<SceneProps>` with `{t, b, dur, words}`: `t` seconds into the scene, `b[i]` when line `i`
starts, `dur` the scene length. `said(words, i, 'word')` is the second a word of line `i` starts (prefix match, case
and punctuation ignored); it throws when the line does not say it, which breaks the whole scene, so after any
narration change re-check every cue word. A scene is a pure function of `t`: no state, no `Math.random` (`hash(k,
salt)`).

**Time:** `ease(t, at, len)` 0 to 1 (an S-curve: fades, things that start and stop); `easeOut(t, at, len)` fast then
settling (a thing that arrives or slides into place); `pop(t, at, len)` a scale that overshoots a little and settles
(a thing that appears), `settle(o)` the same for a value you already have; `span(t, on, off, len)` on then off;
`flash(t, at)` a short glow for a named part; `glide(t, startPose, [[at, len, pose], ...])` camera moves: a move
that starts when the one before ends carries its speed on, so a chain of moves is one flowing move (leave a gap only
where the camera should stop); `drift(pose, t, degPerSec)` a slow turn; `timeline()` for what carries across scenes.
Pills, cards, pictures and insets of the kit already pop in from their `o`.

**Parts of the kit** (`src/kits/explainer.tsx`): `Stage pose sky lamps size` (3D), `Tags pose items` (the tags of a
moment, placed by the kit: each item `{text, o, at}` for a 3D point or `{text, o, to: [x, y]}` for a point on screen,
optional `side`; list every tag of the scene, each with its own `o`; give each its `side` when the camera moves),
`Tag pose at pin o dot` (one pill placed by hand: only where Tags cannot do it), `Picture art={art.name} x y size o label` (crops to a square), `Clip src at o` (a video
file, full frame unless a box is given; lasts its own length), `Label`, `Counter p to digits unit`, `Bar`, `Card`,
`Svg2D`, `Measure a b p label`, `Legend what`, `Inset` (a round 3D window), `screen(pose, point, frame)` (where a 3D
point lands), `useTall()` (true in an upright frame), `K` colours (blue low or cold, red high or wrong, green right),
`ACCENT`, `SANS`.

**Props** (`src/kits/props.tsx`), everyday objects drawn with detail, tested in both shapes, each placed by its centre
`x y`, height `s` and `o`, moved by its own values: `Person color skin hair walk wave slump dir`, `Phone lift buzz`
(its `children` on the screen, `phoneScreen(s)` the screen's size), `Coin spin label`, `Clock hours numbers`,
`Calendar month day flips color`, `Arrow pts p bow color w dash` (draws itself), `Bars values labels colors p show`,
`Panel x y w h` (opaque, top left). Use them before drawing your own; an object the library lacks goes in your file.

**Parts** (`src/kits/parts.tsx`), whole scenes for the explaining moves that come back in every topic. When the plan
names one, the scene is a few lines: the part does the layout in both shapes, the motion and the safe areas. Each
takes `t`, optional `o` and a box `x y w h`; a thing is `{label, art}` (a picture) or `{label, draw}` (a prop drawn
at 0, 0, `s={200}`), each with its `at` from `said(...)`:
`Compare items={[{label, draw, at, value, show}]} win={{i, at}}` (side by side, bars, a winner), `Process steps
loop active` (steps on a path, dots that keep flowing, a cycle with `loop`), `Timeline events={[{when, label, draw,
at}]} now` (an axis that draws, a marker that glides), `BigNumber at show label then={{at, thing, label}}` (a count,
then a grid of everyday things), `VideoMap chapters current` (the map of the video), `Ask at question` (the closing
question). A hero scene the plan marks as hand-made stays hand-made.

**Layout:** landscape text inside x 90 to 1830, y 50 to 1050 (the long video has no captions). Upright text inside x 70 to
1010, y 220 to 1360 (captions own 1380 to 1500); upright scenes need their own poses, further back, and pictures above
the object.

**What the reviewers caught in the pump video (do not repeat):**
- A number on screen that is not the narration's: "3.9 kW" while the voice says "about four kilowatts". A counter
  must finish fast and then hold for at least 2.5 s, or a frame catches it halfway ("+28 %").
- A tag that shows the thing the voice says is missing (a "No guide vanes" tag on a ring of guide vanes).
- One word for two things: "outlet" first for where the water comes in, then for where it leaves.
- Tags were the most common finding of the reviewers (about three in ten): lines that cross, pills under 110 px
  apart, pills outside the safe area or over the captions, pills placed by hand. `Tags` places them so none of that
  happens; you still choose what to tag and the exact point (at a blade, not into the channel beside it). Two tags
  on parts that turn (a vane and the channel beside it) swap order as the wheel turns: tag one and make the other
  glow on its word. `stills.mjs` reports every crossing it sees.
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
