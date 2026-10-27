---
name: story-video
description: >
  Makes a narrated story for phones, upright 1080 x 1920: painted pictures that fill the screen
  while the camera moves slowly, captions that follow a local voice, a low bed of sound and
  a few hits on the turns. Use it for crime stories, true or fictional cases, mysteries, history
  told as a tale, "a story short", "a true-crime video", "tell the story of X". Pictures come from
  Codex (gpt-image); rendered with Remotion on this Mac. Not for explainers (math-video,
  sketch-video) or ads (ad-video).
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh *)
---

# Story video

A story video is a narrated story for phones, upright, 1080 x 1920: painted pictures that fill
the screen while the camera moves slowly, captions that follow the voice, a low bed of sound. The
first genre is the crime story. Default length: 40 to 70 seconds (one minute when the brief does
not say), for anyone.

## Rules that matter most

- The script says `"case": "fiction"` or `"case": "real"`, and the title card says it too.
- A real case uses only facts from its listed public sources. Nobody is called guilty unless a
  court said so. No living private persons, no victims who are minors, no how-to of the crime.
- No recognisable faces, no writing, no gore in pictures. Look at every picture with the Read tool.
- The first line is the hook, stated flat. A new picture every 3 to 6 seconds; the camera never stops.
- Text between y = 230 and 1300, x = 80 and 1000. The captions own 1330 to 1460.

## Before you write

1. Read `${CLAUDE_PLUGIN_ROOT}/docs/pipeline.md`: the workspace, the loop, the checks, narration
   and the report. Everything there holds here; this skill lists only what is different.
2. Run `${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh <workspace>` and fix what it reports. Pictures
   need `atelier` and the `codex-image` conduit.
   Start the video with `python3 scripts/new.py story <series>/<id> "<title>"`. Every step has a tool:
   `${CLAUDE_PLUGIN_ROOT}/docs/tools.md` lists them. Use them instead of writing your own; if one is
   missing, write it and save it in the plugin as that file says.
3. Read `src/kits/story.tsx` in the workspace and the finished example
   `${CLAUDE_PLUGIN_ROOT}/examples/crime/01-last-train/`.

## Fiction or real

- **Fiction**: invent everything, including the names of people and of small places. Do not
  borrow the name of a real person, company or case.
- **Real**: only cases with public records (court files, official reports, long-standing press
  coverage). List every source in `"sources": ["..."]` and take every fact from them: names,
  dates, places, numbers. Leave out what the sources do not agree on, or say that it is
  disputed. No guessing at motives. In your report, list the facts you could not confirm in two
  sources.

## The files

```json
{
 "title": "The last train",
 "type": "story",
 "case": "fiction",
 "voice": "Preston",
 "speed": 0.95,
 "pace": [0.25, 0.15, 0.35],
 "images": {
  "platform": "An empty railway platform at night in winter, a large station clock above, one train waiting with lit windows"
 },
 "scenes": [...]
}
```

- `voice` and `speed`: the Phonon voice of the stories, a little slower than normal. In Spanish
  use `"lang": "es"` with the Kokoro voice `"voice": "em_alex"`.
- `pace`: stories cut fast. Use these numbers.
- `images`: one picture per scene, sometimes two. An image can keep a person or a place of an
  earlier one: `{"prompt": "...", "ref": "platform"}`.

The `VideoDef` adds `look: STORY`, `art` (the imported `art.json`) and `bed`.

## The loop

The same as the sketch type: `art.py`, the voice, `align.py`, the code, `check.py`,
`stills.mjs`. An image takes about a minute. **Look at every picture with the Read tool.** Draw
it again (change its words) if it shows a face you could recognise, readable or garbled writing,
gore, a weapon aimed at someone, or simply the wrong thing.

## Images

- Describe a place and a moment, and what the eye should land on: "Inside an empty train
  carriage at night: a dark coat folded on a seat, a paper cup on the table by the window".
- The style (a moody painting, upright, no faces, no writing) is added by `art.py`. Do not
  repeat it.
- **People are far away, from behind or in silhouette.** Never a recognisable face, never a real
  person, never a child. No blood, no bodies.
- **No writing in the picture**: image models garble it. Places, dates and hours are typed on
  top with `Stamp`.
- Keep one world: the same decade, weather and time of day across the pictures, said in each
  prompt ("at night", "in winter").

## Layout

The canvas is 1080 x 1920. Text stays between y = 230 and 1300 and x = 80 and 1000. The captions
own the band from 1330 to 1460. The picture carries the scene: most scenes have no text of their
own at all.

- `Shot` fills the screen. `move` is `in`, `out`, `left`, `right`, `up` or `down`: change it from
  scene to scene, and push `in` on the thing that matters.
- `Stamp` types a case-file line: a place, a date, an hour. Near the top, y = 300 to 420, at most
  two per scene, 46 to 64 px.
- `Big` lands a few huge words in the upper half: an hour, a number, a name. At most one per
  scene and three per video. Its words should be said by the voice at that moment.
- `Photo` drops a picture in as a piece of evidence, over a `Shot`.
- Colours come from `S`: white, amber for hours and labels, red for the one thing that is wrong.
- Below y = 840 keep text left of x = 900: TikTok and Reels put their buttons on the right there
  (measured on Remotion's overlays of both feeds, October 2026; the caption band itself is clear).
  The layout check still allows text to x = 1010, so look at the right edge yourself.
- Captions of three long words can reach x = 1000 ("NIGHT IN MARCH"): prefer shorter words in a line.

## Motion

- The colour of the light and of the spoken word in the captions change from video to video
  (see Variation in the pipeline).
- The camera never stops: every `Shot` gets `p={lin(t, 0, dur)}`.
- Scenes cut; they do not fade. Inside a scene, a second `Shot` can take over with
  `o={lin(t, b[1], 0.12)}`.
- A new picture every 3 to 6 seconds. A scene longer than 7 seconds needs a second picture or a
  `Big`.
- To make a still move for real (smoke, rain, a flickering light), animate its picture with
  image-to-video in the `ai-clips` skill: describe it in `"clips"` of `script.json` and use
  `scripts/clips.py` (see the ad-video skill), then show it with `Clip` from `src/kits/ad.tsx`.
  This costs GPU time: plan it with the user first.

## Sound

- `bed: {name: 'drone', vol: 0.4}` under the whole video.
- `boom` on the turns of the story: the title, the reveal, the last line. Three in a video is
  plenty. `hit` on one or two hard cuts.
- `riser` into the one moment of highest tension: start it 3.2 s before the moment.
- `keys(at, text)` from the kit under every `Stamp`, with the same `at` and text.
- `heartbeat` under one tense scene (`len` = the scene length), `shutter` with a `Photo`.
- Silence is a sound too: let the last line land on a `boom` and nothing else.

## Narration

The rules of the pipeline hold: simple English, short sentences. And:

- 100 to 160 words. 6 to 9 scenes, one or two lines each.
- **The first line is the hook**: the strange fact, stated flat. "Nine people got on the last
  train. Only eight got off."
- One fact per line, in the order the listener needs them. Hours and numbers as words.
- End on the answer or on the open question. No moral, no "what do you think", no "follow for
  more".
- Lines of at most 14 words: the captions show two or three words at a time, and a long line
  outruns the picture.

## Report

As in the pipeline. Also say whether the case is fiction or real, and for a real case list the
sources and anything left out because it could not be confirmed.
