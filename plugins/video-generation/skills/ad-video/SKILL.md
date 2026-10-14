---
name: ad-video
description: >
  Makes a short upright (1080 x 1920) marketing video for a product, app or service: a hook in
  the first three seconds, the real product shown (screen recordings or product screens drawn in
  code), footage of people from photo stills or AI clips, burned-in captions that follow a local
  Kokoro voice, music, and an end card with one call to action, all inside the safe zones of
  TikTok, Reels and Shorts. Use it for "an ad", "a promo", "a product video", "a launch short",
  "a video to sell X", hook variants and platform cut-downs. Rendered with Remotion on this Mac.
  AI clips and music come from the ai-clips skill.
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh *)
---

# Ad video

An ad sells one thing to one viewer in 15 to 30 seconds. Default: a 20 second vertical ad in
English, a 15 second cut, and three hooks. The look file is `src/kits/ad.tsx`; the finished
example is `${CLAUDE_PLUGIN_ROOT}/examples/acme/01-notes/`.

## Rules that matter most

- **The real product is the hero.** Show it as a screen recording or as a screen drawn in code
  that copies the real one. AI footage of people is context only. Never let a video model draw a
  screen, a logo or text.
- **The offer is clear in three seconds with the sound off**: the hook is spoken and on screen.
- **Every claim is true and backed by data the user has**: numbers, "fastest", "98 % accurate".
  If there is no evidence on file, cut the claim. Invented names and numbers inside a drawn demo
  screen are fine; say in the report that they are invented.
- **No AI person as a customer.** No testimonial, review or "I use it every day" spoken by someone
  who does not exist (FTC rule on fake reviews). Real testimonials only, with permission.
- **Label AI.** A scene with a realistic AI person or an AI-made picture of the product shows
  `<AiMark />`, and the report tells the user to switch on the platform's AI disclosure (TikTok
  has a toggle; Meta shows "AI info"). The EU AI Act (Article 50) has required this since
  2 August 2026, and the LTX licence asks for it. This is a reading of the rules, not legal advice.
- **All text inside the safe box** x 120 to 888, y 288 to 1248: the app covers the rest.
- One call to action, verb first, the same words as the platform button and the landing page.

## Before you write

1. Read `${CLAUDE_PLUGIN_ROOT}/docs/pipeline.md`: the workspace, the loop, the checks, narration
   and the report. Everything there holds here; this skill lists only what is different.
2. Run `${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh <workspace>` and fix what it reports.
3. Read `src/kits/ad.tsx` in the workspace and the example
   `${CLAUDE_PLUGIN_ROOT}/examples/acme/01-notes/`. For AI clips, read the `ai-clips` skill and
   its `references/assembling.md`.
4. Look for the product's own look before inventing one: its repository, website, screenshots,
   brand colours, fonts, logo file. Ask the user for a screen recording if none exists.

## The brief

Write one line each, and ask the user only for what you cannot find:

- the viewer (who, and how much they know about the problem);
- one pain, one promised outcome, one proof (a real feature, or a number with evidence);
- one call to action and where it leads;
- the platforms (they set lengths and safe zones) and the language.

Then pick a format and say why: a product demo (the default for software), before and after, a
problem-solution skit, a listicle ("3 things your notes app cannot do"), or a founder talking to
camera (the user records it; never an AI founder). Lengths: a 15 s master fits every Meta
placement; 20 to 30 s for TikTok and LinkedIn; 15 s or less for X; a 6 s bumper for YouTube.

## The script

```json
{
 "title": "Never lose a meeting note",
 "type": "ad",
 "pace": [0.2, 0.15, 0.35],
 "images": {
  "anna": "A woman in her thirties at a desk in a bright home office, laptop seen from the side, looking worried",
  "notebook": {"prompt": "The same woman turning a page of a paper notebook, laptop closed beside her", "ref": "anna"}
 },
 "scenes": [
  {"id": "hook", "lines": ["The client asks for a number from three meetings ago."]},
  ...
  {"id": "end", "lines": ["Try Acme Notes free, right in your browser."]}
 ]
}
```

- **Words.** The voice says about three words a second with these pauses: 15 s holds 35 to 40
  words, 20 s about 50, 30 s about 80. The voice step prints the real length.
- **Shape of 15 s**: hook 0 to 3 s, one or two product moments 3 to 11 s, outcome and call to
  action 11 to 15 s. **30 s**: hook, the problem (to 8 s), two or three product moments (to 24 s),
  proof or offer and the call to action.
- **The hook** states the proposition and picks the viewer: a pain ("Still writing notes during
  calls?"), the result first, a contrast, an if-then ("If you run five meetings a day..."). No
  "Hi, I'm", no logo first.
- One scene per beat, one line per scene, at most 14 words a line (the captions show three words
  at a time). A scene with a clip lasts at most as long as the clip (5 s for LTX): split a long
  line into two scenes.
- The last scene is the end card. Its line needs about 2.5 s (seven or eight words).
- **Variants.** Write three to five hooks of different types for one body, and later one other
  concept. Each variant is its own video, `01-notes-a`, `01-notes-b`, ..., sharing the scenes of
  the body through `src/videos/<series>/_shared.tsx`. A cut-down (15 s from 30 s) is its own
  video too. Name them so the name says concept, hook and length.

## Footage

Three sources, cheapest first. Mix them; most ads need all three.

1. **The real product.** A screen recording (ask the user for one at 2x scale with clean demo
   data, no real customer names) as a file under `public/art/<series>/<id>/`, shown with
   `<Clip src=...>`. Or a screen drawn in code inside a `Panel`, copying the real product's
   colours, borders, fonts and labels; animate it (typing, a list filling, a number counting).
2. **Photo stills of people and places**, made free by Codex: list them in `images` and run
   `.venv/bin/python scripts/art.py <series>/<id>` (the photographic style and 9:16 are added).
   Show a still with `<Shot art={art.anna} p={lin(t, 0, dur)} move="in" />` and the `VideoDef`'s
   `art`. A recurring person gets one reference image, and every later image names it with
   `"ref"`. **Look at every picture with the Read tool**: faces, hands, a visible screen, text.
3. **AI clips** animate those stills: plan them with the `ai-clips` skill (it costs GPU time,
   so it needs the user's approval and a cost estimate first). Image-to-video from the stills,
   one small slow action per clip, locked-off camera, mouth closed under narration, "No dialogue."
   Save the clips under `public/art/<series>/<id>/clips/` and show them with `<Clip>`. Look at six
   large frames of every clip before using it.

People should leave room for what is drawn over them: in a scene with a `Panel` (y 330 to about
1040) the face sits below it or the shot shows hands; in a scene with a `Headline` the face sits
in the middle. Laptops and phones are seen from behind or the side.

## Layout

The canvas is 1080 x 1920. The safe box is the strictest of TikTok In-Feed, Reels ads (top 14 %,
bottom 35 %, sides 6 %) and Shorts (right 192 px): **x 120 to 888, y 288 to 1248**. Footage runs
under the rest; text never does. Below y = 840 TikTok's buttons sit on the right: keep anything
important left of x = 780 there when TikTok matters. Check the platform templates before launch.

- `Headline` (y 420): the hook or a claim, two short lines at most, 80 px.
- `Panel` (from y 330, `h` up to 700): the product screen drawn in code. One panel at a time.
- The captions (y 1100) follow the voice by themselves, three words at a time, the spoken one in
  the accent colour. Put nothing else there.
- `AiMark` (y 1212, bottom left) where it is needed (see the rules).
- `EndCard`: name, one line, the call to action as a button (brand colour in `color`), the
  address. Dark by default so the captions read; a logo file in `logo`.
- Nothing smaller than 40 px. Brand colours and fonts come from the product.
- The product or its name is on screen within five seconds, ideally on the product itself.

## Motion and pacing

- Something new every 1.5 to 3 seconds: a cut, a panel, a number, a headline. Several shots in the
  first five seconds.
- Scenes cut; they do not fade. Every still moves: `p={lin(t, 0, dur)}`.
- A panel rises in 0.45 s; what is inside it moves on cues that the voice names
  (`said(words, 0, 'word')`).

## Sound

- The voice: Kokoro (a fixed brand voice: set `"voice"` and keep it for every ad of the brand),
  or a recording (`"recording"`, see the pipeline), never a clone of someone without consent.
- Music: a track made with the `ai-clips` skill (ACE-Step: MIT, usable in ads) or from a
  commercial library, saved as `public/art/<series>/<id>/music.mp3` and played with
  `bed: {name: 'art/<series>/<id>/music.mp3', vol: 0.1}`. It belongs about 20 dB under the voice:
  measure a gap between lines against a line with `ffmpeg -af ebur128` and say the numbers.
- Effects: a `whoosh` into a hard cut, a `pop` when a panel lands, at most one per scene. The
  clips' own sound stays off (`Clip` is muted unless you give `vol`).
- The build evens the loudness to -16 LUFS.

## Review before you hand it over

Look at the sheets of `stills.mjs` and at six frames of every clip, then answer each line:

- With the sound off, is the offer clear from the first three seconds?
- With the eyes closed, does the voice alone make sense? Is the brand name said right?
- Exactly one call to action, the same on the end card, the button and the landing page?
- Every claim backed? No fake testimonial, no AI customer?
- Hands, faces, eyes and teeth stable in every clip? No garbled text or screens inside footage?
- Light and colour match across shots?
- `AiMark` where a realistic AI person or product picture appears?
- The first frame is not black (some placements use it as the thumbnail)?

## Report

As in the pipeline, plus: the claims and where their evidence is (or that you cut them), which
scenes use AI footage and the disclosure the user must switch on at upload, the music's source
and licence, the variants made, and what the user should measure (the share of viewers still
watching at 3 s and 15 s, click rate, then real sign-ups, not cost per lead).
