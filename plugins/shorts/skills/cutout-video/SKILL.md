---
name: cutout-video
description: >
  Makes an upright (1080 x 1920) cut-out cartoon Short: a flat cartoon cast (Codex pictures with clear grounds, one
  picture per pose) acted out by code with a 2.5D camera, poses swapped on the words, objects with faces, and only the
  background motion that explains the line. The house look of the Dollar Mechanics and Inner Mechanics Shorts (their
  profiles say "short_look": "cutout"), with new characters in every video; also for any everyday question told by a character ("why do onions make you
  cry", "why we put things off"). For several Shorts, or a channel's Shorts, start with short-video.
---

# Cut-out video

A character acts out the narration in a small flat cartoon set: a desk, a kitchen, a room. Every pose and every prop
is its own Codex picture on a clear ground; the motion, camera, faces on objects and effects are code. 45 seconds to
2.5 minutes, as long as the idea needs (`check.py` holds a Short to it).

The finished example is `${CLAUDE_PLUGIN_ROOT}/examples/cutout/01-procrastination/` (Inner Mechanics, 68 s, five
rounds with the user): read its `index.tsx` before you write yours. Its pictures are not in the plugin; the code shows
every part. The user's verdict on it: lively characters, quiet background.

## Rules that matter most

- **The characters carry the energy.** A pose change about every two seconds, each on a word (the example has 29 in
  68 s from about 18 pictures), plus body language in code between swaps.
- **The background moves only when it explains the line.** A ringing phone, a calendar turning its days, a lens on a
  chart: yes. A swaying plant, steam, confetti, sparkle bursts, rain, a sticky note: no. The user cut 17 such effects
  from the example as "too crowded".
- **Never fade one drawing into another.** Poses swap inside a squash (`swapAt`), on a word.
- **Look at every overlay at the real camera zoom**: nothing over her face, nothing cut by the frame edge, nothing in
  front of the hands while they do the gesture the line is about.
- Real facts only in the voice. Cartoon exaggeration is for what the characters do.

## Before you write

1. Run `${CLAUDE_PLUGIN_ROOT}/scripts/video-plugin.sh` (it prints `<video plugin>`), read
   `<video plugin>/docs/pipeline.md` and `<video plugin>/docs/tools.md`, and run
   `<video plugin>/scripts/workspace.sh <workspace>`. Pictures need `atelier` and the `codex-image` conduit.
2. `python3 scripts/new.py cutout <series>/<id> "<title>" [--channel <channel>]`: one continuous scene, `all`.
3. Read `src/kits/cutout.tsx` (camera, layers, `Pose`, `swapAt`, `Eyes`, `Mouth`, `Puffs`, `Tears`, `Drop`) and the
   example.

## The cast

**Every video has its own characters** (the user, 2026-10-31): never reuse a character from another video, and vary
them across a channel's Shorts (age, gender, build, hair, clothes, a different setting). For a channel, dress them in its
colours (`art_style` and `accent` of the profile: Inner Mechanics indigo and amber, Dollar Mechanics forest green and
brass), so the Shorts still look like one channel. Look at the channel's earlier cutout Shorts (`src/videos/<channel>-*/
*/character.txt`) and pick someone clearly different. Original characters only: never a copy of an existing cartoon.

1. Write `character.txt` in the video folder: who the character is, the look, and the line style, the words every picture
   of the cast repeats. Use the example's `character.txt` as the pattern (big round head, thick even outlines, flat
   colours with one soft shade, no text). A second character (a friend, a boss, a mouse) gets its own lines in the same
   file, and each prompt says which one.
2. Draw `hero` first (`cutout_draw.sh <series>/<id> hero 4:5 char "<waist-up, front view, calm smile>"`), look at it,
   and redraw until it is right. Every later `char` picture takes it as the reference by itself.

## The loop

```bash
npm run -s tts <series>/<id> && .venv/bin/python scripts/align.py <series>/<id>        # voice and word times first
scripts/cutout_draw.sh <series>/<id> <name> 4:5 char "<pose>"                           # about a minute each
.venv/bin/python scripts/cutout_prep.py <series>/<id>        # clear grounds, trim, measure heads -> sprites.json, qa.png
python3 scripts/check.py <series>/<id>
node scripts/stills.mjs <series>/<id> @<sec> @<sec> ...       # every beat
scripts/build.sh <series>/<id>
```

Draw in three parallel lanes (`( a; b ) & ( c; d ) & wait`); Codex makes about 3 at a time. Look at `qa.png` (every
cut-out on pink) before you use any picture.

## Pictures

- **Plan them from the beats.** Write the line-by-line plan first: each line, its words, the pose on each key word, the
  prop that moves, the one thing in the background that explains it. Then draw only what the plan needs.
- **Poses**, waist-up behind a desk or counter (the furniture hides the waist; legs are never drawn): 15 to 20 per
  minute of video. Useful set: neutral, working, a reaction (surprised, shocked with hands on cheeks), a feeling
  (bored, guilty, laughing, kind to herself), thinking, pointing at the viewer, thumbs up, facepalm, cheer, stretch.
  The prompt is the framing ("Waist-up, front view facing the viewer, centred; the body is cut off at the waist") plus
  the expression plus exact hands: "the hand on the RIGHT side of the image raises ...", never "her left".
- Codex sometimes mirrors a pose (the object in the wrong hand). Draw a pose pair (knife up and knife down) as an edit
  of its partner: pass the first as the ref and ask for "this exact picture ... everything else identical".
- **Props** alone (`obj`): the laptop, the phone, a pile of papers. A thing that moves on its own is its own picture.
  Faces on objects are drawn in code (`Eyes`, `Mouth`), never in the picture.
- **Heads.** `cutout_prep.py` measures each pose's head so swaps keep its size and place. Hands on the face or arms
  over the head fool it (the circle grows or lands on the body): measure those from the hair top and the hair width,
  and set the head in `index.tsx` (`S.bored = {...S.bored, head: [x, y, r]}`), since prep rewrites sprites.json.

## Motion

- **Camera.** Keys `[time, x, y, zoom]` hung on words (`camAt`), zoom eased in log space, a slow drift on top so a
  hold never freezes. Close on the face for feelings, wide for actions, toward a prop when it acts. Blur the layers
  behind a study card.
- **Body language** (example: `body` in `All`): a nod of 10 px on each key word, a slow sway, a lean per pose, a jiggle
  while typing, a shiver when shocked or guilty, a hop on the cheer, breathing on holds.
- **Object characters**: blink every few seconds, look at what happens (the phone, then her, then the viewer), react
  (a gasp, a grin, an angry shake), peek out of where they were put away.
- **What sits in front hides what is behind.** The laptop in front of the example hid the phone in her hands, so its
  lid closes whenever she is not working; a tall pile in front hid her pointing finger, so that pose moved to after
  the pile shrank.
- **Study cards** (`Card` in the example): a card pops over the scene for a study, its numbers drawn to scale from the
  source, the scene blurred behind; one card per study, shut before the next line.

## Layout

The canvas is 1080 x 1920; the captions sit at y = 1465 and own that band; text stays between y = 220 and 1520. Rest
positions that worked: head at (540, 760), head radius 230, desk top at y = 1300, props on the desk. Check every frame
the camera zooms into: an overlay that fits the wide shot can leave the frame in a close-up.

## Sound

The engine plays the channel music (`BED` in `src/engine.tsx`, about 18 dB under the voice) unless the video sets its
own `bed`. Effects: the library in `public/sfx/` (key, pop, whoosh, paper, chime, tick) and Colab Stable Audio for the
rest (`colab-video-studio`, model `sfx`; wait until `status` says ready before `load`). Before an effect goes in,
check it with earshot (`~/Documents/repos/earshot`, `api.match(file, "<what it should be>", alts=[...])`): the forced
choice against named alternatives caught a "phone buzz" that sounded like a box lid. Effects stay quiet (vol 0.08 to
0.3) and sit on their word.

## Narration

The pipeline's rules and the channel profile's. 140 to 200 words for about a minute; the first line names what the
first frame shows; every claim in `references.md` (and `facts.json` for a channel), worded no stronger than the source
("in one study", "a review found", "some researchers argue").

## Checks before the render

- `check.py` at 0 problems; stills at every beat, read one by one.
- An SVG `scale(0)` breaks the layout check of `stills.mjs`: a part that pops in returns null at size 0.
- After the render, list the ten biggest frame-to-frame jumps (the example's report shows how): each must be a planned
  pose swap, cut or card. `qc.py` at 0 problems, and `mix.py` for the music.

## Report

As in the pipeline. Also: the poses drawn and any redrawn (why), head fixes, the effects checked with earshot and
their verdict, and the moments you are least sure of (busy stretches, small overlays).
