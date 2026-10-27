---
name: sketch-video
description: >
  Makes a short upright (1080 x 1920) hand-drawn explainer: ink drawings on cream paper that draw
  themselves line by line while a local voice explains, with handwritten notes and captions.
  Use it for everyday topics told simply: the body, medicine, a job, how a machine or a habit works,
  "a whiteboard video", "a hand-drawn short", "explain X in 45 seconds". Drawings come from Codex
  (gpt-image) and are traced into pen strokes; rendered with Remotion on this Mac. Not for
  equations (math-video), stories (story-video) or ads (ad-video).
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh *)
---

# Sketch video

A sketch video explains an everyday thing: the body, medicine, a job, how a machine works. It is
upright, 1080 x 1920, for phones. Ink drawings on cream paper draw themselves while the voice
explains them, with a few handwritten words. Default length: 40 to 60 seconds (45 seconds when
the brief does not say), for anyone.

## Rules that matter most

- One thing per image, never text in an image. Words on screen are `Note`s.
- Look at every picture with the Read tool before you use it. A drawing is a statement: if you
  cannot confirm it is right (an organ's shape, a part's place), redraw it or leave it out.
- Text between y = 230 and 1340, x = 80 and 1000. The captions own 1380 to 1500.
- Every drawing draws itself, with the pen sound; nothing freezes for more than five seconds.
- Medicine and health: only what is well established, no advice about treatment, no number you
  are not sure of.

## Before you write

1. Read `${CLAUDE_PLUGIN_ROOT}/docs/pipeline.md`: the workspace, the loop, the checks, narration
   and the report. Everything there holds here; this skill lists only what is different.
2. Run `${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh <workspace>` and fix what it reports. Pictures
   need `atelier` and the `codex-image` conduit.
   Start the video with `python3 scripts/new.py sketch <series>/<id> "<title>"`. Every step has a tool:
   `${CLAUDE_PLUGIN_ROOT}/docs/tools.md` lists them. Use them instead of writing your own; if one is
   missing, write it and save it in the plugin as that file says.
3. Read `src/kits/sketch.tsx` in the workspace and the finished example
   `${CLAUDE_PLUGIN_ROOT}/examples/body/01-heartbeat/`. The example shows the parts, not a
   template: lay your scenes out your own way.

## The files

`script.json` has three more fields:

```json
{
 "title": "How your heart beats",
 "type": "sketch",
 "pace": [0.3, 0.2, 0.5],
 "images": {
  "heart": "A human heart with its main blood vessels, simplified but correct",
  "fist": "A closed human fist seen from the side"
 },
 "scenes": [...]
}
```

- `pace` is the pause before, between and after the lines of a scene. Shorts move faster than
  the math videos: use these numbers.
- `images` names every drawing and says what it shows. Codex draws them.

The `VideoDef` adds `look: SKETCH` and `art` (the imported `art.json`).

## The loop

Script, images and voice, code, stills.

```bash
.venv/bin/python scripts/art.py <series>/<id>    # Codex draws what is new: about a minute per image
npm run -s tts <series>/<id>                     # voice
.venv/bin/python scripts/align.py <series>/<id>  # word times, for the captions and for cues on words
python3 scripts/check.py <series>/<id>
node scripts/stills.mjs <series>/<id>
```

`art.py` writes the pictures to `public/art/<series>/<id>/` and `art.json` beside the script.
**Look at every picture with the Read tool before you use it** (they show on black there,
because the paper is transparent). Codex is not exact: a drawing can come out with text in it,
with the wrong thing, too busy, or wrong as a fact. To get another one, change its words in
`images` and run `art.py` again; only that image is drawn again. Run the voice and the images
at the same time: they do not depend on each other.

## Images

- **One thing per image**, named plainly, with nothing around it. "A stethoscope", not "a
  doctor examining a patient in a clinic". Things that belong together in the picture but appear
  at different moments are separate images.
- The style (black ink, a few colour washes, white ground, no text) is added by `art.py`. Do not
  repeat it. You may name the colours when they mean something: "the right side tinted blue".
- Never ask for text or labels in an image.
- Images are square unless you ask: `{"prompt": "...", "ar": "3:4"}`.
- 4 to 7 images for a 45 second video. Reuse one across scenes: the viewer knows it by then.
- Real objects are drawn with their parts: fills, threads, screws, seams. A bare outline reads
  as a placeholder.

## Layout

The canvas is 1080 x 1920. Phone apps cover the top, the bottom and the right edge, so text
stays between y = 230 and 1340 and x = 80 and 1000. The captions own the band from 1380 to 1500:
put nothing there.

- `Sketch` takes the centre `x`, `y` and the width `w` of the drawing, inside an `<Svg>`. The
  main drawing of a scene is 600 to 780 wide. A side drawing is 340 to 420.
- `Note` is handwritten text: `x`, `y` is its centre. Sizes: a title 110 to 130, a label 64 to
  92, nothing under 44. The handwriting is narrow: about 0.36 x size wide per character.
- One main drawing per scene, in the middle. A scene with three small drawings and three labels
  is the limit.
- Below y = 840 keep text left of x = 900: TikTok and Reels put their buttons on the right there
  (measured on Remotion's overlays of both feeds, October 2026; the caption band itself is clear).
  The layout check still allows text to x = 1010, so look at the right edge yourself.
- Colours come from `K`. Ink for most words; one colour per idea, the same in the drawing, its
  arrow and its label.

## Motion

- A pen follows the line while a `Sketch` draws, and leaves when the colour comes in. Two
  drawings at the same moment mean two pens: stagger them, or give the smaller one `pen={false}`.
- The paper, the pen and the accent colour change from video to video (see Variation in the
  pipeline). `useAccent()` gives the accent of this video: use it for the main point of a scene,
  so its text and its underline match. Colours that carry meaning (blue for blood without
  oxygen) stay fixed from `K`.
- Every drawing draws itself: `p={lin(t, at, seconds)}`. A main drawing takes 1.5 to 2.5 s, a
  small one about 1 s. A drawing seen before can come back faster (0.8 s).
- A `Note` writes itself in 0.5 to 1 s. `Underline`, `Ring`, `Highlight` and `Arrow` draw in
  0.4 to 0.8 s.
- A thing appears when the voice names it. Use `said(words, i, 'word')` for a thing named in the
  middle of a line.
- After a drawing is done, the scene must not freeze for more than five seconds: draw the next
  thing, add a mark, or make the subject move (the heart of the example beats).

## Sound

The pen is heard whenever it draws: pair every `Sketch`, and every long `Note`, with
`scratch(at, seconds)` from the kit, using the same start and length. Marks and short labels do
not need it. A `paper` at `at: 0` turns the page between scenes (not on the first one). A `pop`
can mark one or two key moments. That is all: no whooshes, no music.

## Narration

The rules of the pipeline hold. For a short: 100 to 150 words, 4 to 6 scenes, one to three lines
per scene. The first line is the hook: a plain surprising fact or a question, not "in this
video". End on the payoff, not on "follow for more".

## Report

As in the pipeline. Also say which images you had drawn again and why, and name any drawing that
you could not confirm is correct.
