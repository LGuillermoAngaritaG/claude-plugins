---
name: math-video
description: >
  Makes a narrated explainer video in the look of 3Blue1Brown: a dark screen, 1920 x 1080, curves,
  diagrams and KaTeX equations that build step by step while a local Kokoro voice explains. Use it
  when the user asks for a video about math, physics, engineering, an algorithm or anything with
  equations, or asks for an "explainer video" without naming another type. Rendered with Remotion
  on this Mac; no paid API. Not for upright phone videos (sketch-video, story-video, ad-video).
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh *)
---

# Math video

The model is 3Blue1Brown: a dark screen, one idea at a time, a picture that moves while the voice
explains it, and the equation arriving as a summary of the picture. Defaults: three minutes, for
a curious engineer new to the topic, in English.

## Rules that matter most

- Something moves on screen at all times. A scene of formulas only is a failure.
- The first thing of a scene is on screen within half a second; a picture within two seconds.
- Every step appears when the voice says it, and earlier steps stay on screen, dimmed.
- Nothing smaller than 28 px. Everything between x = 90 and 1830, y = 170 and 1040.
- Plots that are not real data say so on screen ("illustration", "typical shape").
- Do not state a number or a fact you are not sure of.
- Done means: every sheet of `stills.mjs` looked at, `0 layout problem(s), 0 dead stretch(es)`,
  `check.py` reports 0 problems, every flag of the speech check listened to or explained, and
  `scripts/build.sh` wrote the file with `qc.py` reporting 0 problems.
- Names are where the voice goes wrong ("Courant" came out as "carot"): read the speech check.

## Before you write

1. Read `${CLAUDE_PLUGIN_ROOT}/docs/pipeline.md`: the workspace, the loop, the checks, narration
   and the report. Everything there holds here.
2. Run `${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh <workspace>` (see "The workspace" in the
   pipeline) and fix what it reports.
3. Read `src/kit.tsx` and `src/engine.tsx` in the workspace, then two finished videos:
   `${CLAUDE_PLUGIN_ROOT}/examples/courant/01-speed-limit/` (a derivation built step by step
   beside its picture) and `${CLAUDE_PLUGIN_ROOT}/examples/pathfinding/01-a-star/` (a diagram that
   grows, with the series' `_shared.tsx` one folder up). Both pass every check.

## A video file

```tsx
import React from 'react';
import {SceneProps, VideoDef} from '../../../engine';
import {C, Draw, Head, Recap, Svg, TitleCard, Txt, axes, ramp} from '../../../kit';
import script from './script.json';
import timing from './timing.json';

// The title card takes a moving picture of the subject, on the right. Here, a travelling wave.
const WAVE = axes({x: 1250, y: 300, w: 560, h: 400, xr: [0, 12], yr: [-1.5, 1.5]});
const Title: React.FC<SceneProps> = ({t}) => (
  <TitleCard t={t} kicker="Fourier · Part 1 of 3" title="Hidden waves" sub="Why any wiggle is a sum of sines">
    <Svg>
      <Draw d={WAVE.path((x) => Math.sin(x - 2 * t))} p={ramp(t, 0.2, 1.8)} color={C.blue} />
    </Svg>
  </TitleCard>
);

// A scene opens with its picture, moving. Text and formulas then arrive on cues.
const SIG = axes({x: 200, y: 280, w: 1520, h: 440, xr: [0, 20], yr: [-2, 2]});
const First: React.FC<SceneProps> = ({t, b}) => (
  <>
    <Head t={t}>A noisy signal</Head>
    <Svg>
      <Draw d={SIG.path((x) => Math.sin(x - t) + 0.5 * Math.sin(3.7 * x + 2 * t))} p={ramp(t, 0.2, 1.5)} />
    </Svg>
    <Txt x={960} y={900} size={44} o={ramp(t, b[1])}>appears when line 1 starts</Txt>
  </>
);

const Sum: React.FC<SceneProps> = ({t, b}) => <Recap t={t} b={b} items={[[C.blue, 'First point'], [C.gold, 'Second point']]} next="Sampling" />;

export const waves: VideoDef = {
  id: '01-waves',        // same as the folder name
  script,
  timing,
  scenes: {title: Title, first: First, recap: Sum},   // keep this on one line, as `id: Component`
};
```

## Length

| length | words | scenes |
|---|---|---|
| 2 minutes | 350 to 380 | 5 to 6 |
| 3 minutes (the default) | 520 to 570 | 7 to 9 |

## Structure

- First scene: `TitleCard` with a moving picture of the subject. The `kicker` names the series
  and the part ("Fourier · Part 2 of 5"), with no total unless the plan of the series is fixed;
  for a series that has only one video so far, a readable name of the series ("PID control").
  Last scene: `Recap` with 3 to 5 items of plain text, and `next` only if a next video exists.
  In Spanish, give the recap its heading: `<Recap heading="En resumen" ...>`.
- Start from a question or a picture, not from a definition.
- Show derivations step by step. Each step appears when the voice says it, and the earlier steps
  stay on screen, dimmed: `o={step(t, b[1], b[2])}` from the kit does both. Do not dim text
  further than that, and do not dim grey notes at all. The same floor holds for list items not
  reached yet: show them at 0.45, never lower.

## Motion

- **Something to watch, always.** Outside the recap the picture does not stand still for more
  than five seconds, and that includes the title card: a flow, a curve drawing itself, a vector
  growing, a marker sliding, a number counting.
- A thing that leaves starts to fade when the next line starts, not before it, and a thing that
  arrives starts at least 0.9 s before the next line (a `ramp` takes 0.7 s, and the still is
  taken 0.15 s before the line): the still would catch either one half faded.
- Keep a hidden part still until it is shown: the 10 s fades-only check counts things that move
  while they are invisible, so a hidden moving part can hide a real dead stretch.
- Use `ramp` for things that appear and `lin` for sweeps and counters. `Draw` draws a path as
  `p` goes from 0 to 1; with `dash` it only fades in.
- Reuse the kit (`axes`/`Axes`, `Draw`, `Arrow`, `Spin`, `Recap`) and the shared parts of your
  series. An object that returns in several videos is one shared component, so it looks the same
  every time. Before you draw one, search the series for it.

## Layout

The canvas is 1920 x 1080. `x`, `y` of `Txt` and `Tex` are the centre of the text, unless you
pass `align="left"` or `"right"`.

- `Head` sits at the top left (y = 95). Keep everything else between y = 170 and 1040, and
  x = 90 and 1830 (the tool allows 10 px more). The whole text must be inside, not only its
  centre: near an edge use `align="right"` or `align="left"`.
- Text is about 0.45 x size wide per character. A 44 px line of 50 characters is about 1000 px
  wide. Monospace (`mono`) is 0.525 x size per character.
- A formula draws 1.21 times larger than its `size`. Count 0.6 x size per symbol, and 0.9 when
  it is full of `=`, `+` and `-`. A row with a `\dfrac` is about 2.6 x size tall, and an
  `\underbrace` adds about 1.4 x size below. `y` is the centre of the whole box, so a brace
  under a formula moves its main line up.
- The title of a `TitleCard` is 108 px: keep it to 18 characters, and start the picture beside
  it at x = 1200 or more.
- Sizes that work: headings 56, main formulas 60 to 90, labels 36 to 46, small notes 30 to 34.
  Nothing is smaller than 28: not code, not file names, not axis numbers, not the
  "illustration" note. A `\frac` in a formula under 50 px becomes tiny: use `\dfrac` or `a/b`.
- **Use the whole canvas.** A picture and its formulas take the left and the right half. A
  formula on its own is centred and at least 90 px. Do not stack a scene in the top left quarter.
- **Keep text clear** of other text, of curves and of drawings, by a quarter of its height or
  more. A caption under a formula goes below its real bottom (fraction bars and subscripts
  included). Nothing that moves may pass under a label. The last frame of a scene is the
  fullest: look at it first.
- **A label sits next to its thing**, within about 60 px, or is joined to it by a line. It never
  appears before the thing it names.
- Colours come from `C` in the kit. Use colour to tie a symbol in a formula to the thing it means
  in the drawing. To colour part of a `Txt`, put a `<span style={{color: C.gold}}>` inside it. A
  `Txt` joins runs of spaces into one, also with `mono`. Straight double quotes come out as
  closing curly quotes in this font: reword, or do without quotes.
- A frame drawn around a formula needs the formula's real size: take one full-size still first.
  A tall formula is measured as one rectangle, so a caption beside its tall part can be reported
  as too close without touching: look, and if it is clear, say so in your report.

## KaTeX

- `Tex` takes a LaTeX string. In JSX attributes write `tex="\frac{a}{b}"`; in template or quoted
  JS strings double the backslashes.
- Use `col(C.red, '...')` to colour a part and `op(opacity, '...')` to fade a part in.
- Inside `\text{}` use plain letters only. The middle dot `·`, `°`, `→` and other symbols fail
  there. Put them in a `Txt` instead, or use LaTeX (`\cdot`, `^\circ`, `\rightarrow`). In
  Spanish, write decimals with a comma and keep accents out of `\text{}`.
- Text inside an `<Svg>` is a plain SVG `<text>` with `fontFamily="KaTeX_Main"`. The fonts are
  loaded.

## Sound

`tick` when a step of a derivation lands, `sweep` when a long curve draws, `chime` once, on the
result. At most one sound per scene on average; many scenes have none.

## Report

As in the pipeline. Also name any plot that is an illustration rather than data, and any number
you left out because you could not confirm it.
