# The pipeline of a narrated video

Every narrated video type of this plugin (`math-video`, `ad-video`, `explainer-video`) and of the shorts plugin (`short-video`,
`sketch-video`, `story-video`)
shares one pipeline: `script.json`, the voice, `timing.json`, scenes that are a pure function of
time, the checks, the stills, the build. This file explains it. The skill of each type adds only
what is different. Read this file first, then the skill of the type, then the files it names.

## The workspace

Videos are made in a workspace: a folder with the Remotion project (engine, look files, scripts,
sound effects, fonts) copied from this plugin, plus your videos. Every command below runs from the
workspace folder.

- The current folder is a workspace when it has `src/engine.tsx` and `scripts/build.sh`.
- Otherwise ask the user where the videos should live (default: the current folder), then run
  `<plugin>/scripts/workspace.sh <folder>` to see what it would copy and `... --apply` to copy it.
  `<plugin>` is the folder two levels above this file.
- Run the same command (without `--apply`) at the start of every task: it lists engine files that
  differ from the plugin. Files that differ mean either a newer plugin (apply it) or a local change
  someone made to the engine (ask before overwriting it).
- The script also lists missing tools (ffmpeg, the Kokoro voice files, the Python venv, atelier and its
  `codex-image` conduit for pictures), each with the command that installs it.

| | you write | finished file |
|---|---|---|
| video | `src/videos/<series>/<id>/` | `videos/<series>/<series>-full.mp4`, each video in `videos/<series>/parts/` |

`out/` and `public/audio/` are caches that the scripts fill. Pictures from Codex land in
`public/art/<series>/<id>/`. Sound effects are in `public/sfx/` (`SOURCES.md` there lists them).

## Tools

Every step has a tool: `docs/tools.md` (beside this file) lists them all, with when to use each.
Start a video with `python3 scripts/new.py <type> <series>/<id> "<title>"`. Do not write a script
for a step a tool already does. If you need one that is missing, write it and save it in the
plugin, as `docs/tools.md` says at its end: the next agent then has it.

## The brief

You need the topic, the viewer, the length, the language and the type. If one is missing, choose
it and say what you chose. The topic picks the type: equations mean `math`, an everyday thing
means `sketch`, a tale or a case means `story`, selling a product means `ad`, and a topic that needs several media
(3D, pictures, clips, 2D) to be understood, landscape or as Shorts, means `explainer`, and the day's news as a briefing
means `news` (the `news-video` skill). A request written in
Spanish means a video in Spanish (see Narration).

Add to an existing series if the topic belongs there. Otherwise start a new one with a short
lowercase name, such as `fourier`.

## What a video is

Videos are grouped in series. A series is one topic: a folder `src/videos/<series>/`.
A video is a folder `src/videos/<series>/<id>/`, and its name in every command is
`<series>/<id>`, for example `vortex-rope/06b-swirl-number`.

The id starts with a two-digit number, which sets the order in the series: `01-intro`,
`02-sampling`. A deep dive under video `06-...` adds a letter: `06a-...`, `06b-...`.
A topic that needs only one video is a series with one video, `01-<name>`.

The folder has three files:

- `script.json`: `{"title": "...", "scenes": [{"id": "...", "lines": ["...", "..."]}]}`.
  The lines are the narration. One line is one or two spoken sentences. A video of a type other
  than math says so after the title: `"type": "sketch"`, `"story"`, `"ad"` or `"explainer"` (an upright explainer
  adds `"shape": "upright"`).
- `timing.json`: written by the voice step. Never edit it by hand.
- `index.tsx`: one React component per scene, and one exported `VideoDef` (the skill of each
  type shows one). Its `look` names the type: `look: SKETCH`, `STORY`, `AD`, `EXPLAIN` or `EXPLAIN_V`. A math video
  has none.

Nothing needs registering: any `src/videos/<series>/<id>/index.tsx` that exports a `VideoDef` is
found, under any export name.

A scene component gets `{t, b, dur, words}`. `t` is seconds since the scene started, `b[i]`
is the second at which narration line `i` starts, `dur` is the scene length, and `words[i]`
holds the words of line `i` with their times (see Words). The picture
must be a pure function of `t`: no `Math.random`, no `Date`, no state, no hooks. Use
`rnd(i, salt)`.

Parts that several videos of one series share (its title card, its main drawing) go in
`src/videos/<series>/_shared.tsx`.

## The loop

Work in this order: script, voice, code, stills.

```bash
npm run -s tts -- --phonemes <series>/<id>       # how the voice will say every line (see Narration)
npm run -s tts <series>/<id>                     # voice, writes timing.json, prints the timing table
.venv/bin/python scripts/align.py <series>/<id>  # word times and the speech check (see Words)
npx tsc --noEmit 2>&1 | grep "<series>/<id>"     # type errors in your video only; no output means none
python3 scripts/check.py <series>/<id>           # scenes match the script, cues land in time
node scripts/stills.mjs <series>/<id>            # contact sheets -> out/stills/<series>/<id>-N.png
```

1. **Script.** Write `script.json`. Check how the voice will say it (see Narration).
2. **Voice.** The voice step prints the real length and, for every scene, the second at
   which each line starts. These are the `b[i]` you place cues on. If the length is off,
   change the script and run it again: only changed lines are spoken again, so it takes
   seconds (the first run takes about half a minute for a two minute video, more on a
   busy machine). Then run `align.py`: it prints the lines to listen to (see Words).
3. **Code.** Write `index.tsx` against that table.
4. **Stills.** `stills.mjs` takes one frame per narration line, just before the next
   line starts, so each tile shows a finished step. Each tile has its scene and second
   in the corner. Look at every sheet with the Read tool. Then read what the command
   printed under the sheets:
   - **layout problems**: text on text, text too close to text, a line running through
     text, text cut by the canvas or outside the safe area, text under the smallest size of
     the type, text dimmed too far;
   - **dead stretches**: only the heading on screen for 1.5 s or more, nothing changing
     for 5 s or more, or 10 s where things only fade in and nothing moves.

   Fix them and run the loop again until the sheets are clean, the last line reads
   `0 layout problem(s), 0 dead stretch(es)` and `check.py` reports 0 problems. If you
   leave one in on purpose, say which and why in your report.

To look closer:

```bash
node scripts/stills.mjs <series>/<id> scan            # eight frames spread over the scene `scan`: how it moves
node scripts/stills.mjs <series>/<id> scan:12.5       # one moment, 12.5 s into the scene `scan`, at full size
node scripts/stills.mjs <series>/<id> @70             # one moment, 70 s into the video
node scripts/stills.mjs <series>/<id> scan grid growth:7   # several at once, with one start-up
```

These write `<id>-<what you asked>-N.png` (the command prints the exact path) and leave
the main sheets alone. Tiles are half size; one moment asked for alone comes at full size,
to judge small text.

The dead-stretch check only proves that something changes. Decoration that never stops
(drifting flow marks, a spinning rotor, a marker that hops for the whole scene) would
make every scene pass: wrap it in `<g data-ambient="">` and the check leaves it out.
Then look at the eight frames of a scene to judge the rest yourself.

When everything is clean, build the finished file:

```bash
scripts/build.sh <series>/<id>       # voice, word times, check, render, stitch
```

It renders `out/<series>/<id>.mp4` (about as long as the video lasts; allow ten minutes
on a busy machine; it prints its progress) and then writes the series folder
`videos/<series>/`: every video in `parts/` with its loudness evened out, and
`<series>-full.mp4`, all the parts joined with one chapter each.

Then `scripts/srt.py` writes a subtitle file beside each part, and last, `scripts/qc.py` checks each finished part for what the checks before the render cannot
see: a missing sound track, loudness off -16 LUFS by more than 1 or a true peak above -1 dBTP,
a silence of 1.5 s or more, a picture frozen for 5 s or more (the recap of a math video may
hold), and a black half second in an upright video. Each problem names its scene and second.
The files are written even when it finds one, and the build then exits with an error: fix it
and build again, or explain it in your report. Run it alone with `python3 scripts/qc.py <series>/<id>`. If you are one of several
agents writing videos at the same time and you were told not to render, stop after the loop;
the renders then run later in one queue. `npm run studio` previews every video in the browser.

## Variation

Two videos of one type must not look like copies. Each look file keeps short lists of
choices that all fit the look (papers, accent colours, pens, the colour of the light,
the caption colour), and every video gets one of each, picked from its name
`<series>/<id>`. So a video always renders the same way, and two videos rarely match.

- To deal a video another hand, add `"seed": "anything"` to its `script.json` and look at
  the stills again. Do this when a video comes out too close to the one before it in its
  series, or when a pick clashes with its pictures.
- The lists cover the frame around the content. The content is yours: do not reuse the
  scene layouts, the order of camera moves or the sound pattern of the last video. Read it
  first, then do something else.

## Sound effects

Any video can have sound effects, and a story or an ad can have a quiet bed under it. They are
part of the `VideoDef`, next to the scenes, so a sound sits on the same cue as the thing it
belongs to:

```tsx
sounds: {
  first: (b, dur, words) => [{at: b[1], name: 'tick'}, {at: b[2] + 0.4, name: 'sweep', vol: 0.2}],
},
bed: {name: 'drone', vol: 0.4},
```

`name` is a file of `public/sfx/` without `.wav`. An effect or a `bed` can also be a file of your own under
`public/`, named with its extension (`bed: {name: 'art/acme/01-notes/music.mp3', vol: 0.03}`);
`python3 scripts/mix.py <series>/<id>` says how far under the voice it sits. `at` is
seconds into the scene. `vol` is 0 to 1 (0.3 when left out; the voice is 1). `len` plays only
that many seconds, and `skip` starts that far into the file.

Sound is easy to overdo. The rules:

- **A sound belongs to something the viewer sees** at that moment: a line drawing itself, a
  step landing, a cut. No sound for a line of narration that has no visual event.
- **Few.** At most one sound per scene on average, and many scenes have none. Never the
  same sound three times in a row.
- **Low.** Effects stay between 0.15 and 0.5. If you notice the sound more than the voice,
  it is too loud. Nothing loud while a word is being said, unless the word is the point.
- **Know the file.** `sweep`, `whoosh` and `riser` swell: the loud part is at 0.36 s, 0.27 s
  and at the very end (3.2 s). Start them that much before the moment. `paper` snaps at
  0.65 s. The others start at once.
- The skill of each type says which sounds fit it.
- You cannot hear the result. If a sound may be wrong, say so in your report.

## Words

`scripts/align.py` transcribes the narration with a local Whisper model and writes, for every
clip in `timing.json`, the time of each word of the script. Each line is transcribed once (a
three minute video takes about a minute) and kept until the line changes.

**The speech check.** The same transcription shows which words of the script Whisper did not
hear. `align.py` prints those lines with what Whisper heard instead:

```
courant/01-speed-limit: speech check: listen to 6 of 31 lines; Whisper did not hear the words on the left
  title 1: courant  | heard: The limit has a name, the carot number.  | public/audio/courant/...wav
```

Nobody listens before a video is published, so treat each flag as "listen to this line": play
the file (`afplay <file>`) or hear the word alone (`npm run -s tts -- --hear "..."`). Whisper does
not know rare names, and it cannot tell words that sound the same ("dye", "die"), so a flag is
not proof; numbers said as words and small spelling differences are already left out. Respell
a word the voice gets wrong (see Narration). In your report, list the flags you kept and why.

- `said(words, i, 'knife')` (from the engine) is the second at which line `i` first says a
  word that starts with "knife". Use it to put a cue on a word inside a line:
  `ramp(t, said(words, 2, 'knife'))`. It throws if the line never says it.
- `words[i][k].at` and `.end` are the times of word `k` of line `i`.
- The captions of the upright types follow these times by themselves.
- `check.py` does not see these cues. A word is always inside its scene, but a cue on one of
  the last words still needs its 1.2 s: look at the stills.

## The voice

The voice is local. English is Phonon 31M on the Mac's GPU, voice `Hadley`; Spanish is Kokoro,
voice `ef_dora` (the Spanish Phonon models may not be used commercially). A script can pick
another voice for itself with `"voice": "Preston"` and `"speed": 0.95`. The Phonon voices, with a
line on how each sounds, are at huggingface.co/gradium/phonon-voices (the `en` ones). A Kokoro voice
such as `"am_fenrir"` keeps that video on Kokoro.

A Google Cloud voice (Gemini TTS, whose style you describe in words, or Chirp 3 HD) is a recording made by
`scripts/voice.py`: `"recording": "voice.wav"` and `"google": {"voice": "Charon", "style": "..."}` in `script.json`
(its docstring has the rest). It reads takes of about a minute, because Gemini drifts in a long one (quieter, breathy, higher
or lower), and reads a new take again when it drifted; `align.py` cuts in the pauses and brings every line to one level.
The build makes the takes before the other steps, only when the text or the style
changed, or a take's file was deleted to be read again. It needs `gcloud` logged in and a Cloud project with the Text-to-Speech API; about 3 US cents a minute.

To use a recording instead (an ElevenLabs export, a Chatterbox take from the `ai-clips` skill,
your own voice), put the file beside the script and name it in `script.json`:
`"recording": "voice.wav"`. It must be one take of the whole script, read in order.
`scripts/align.py` finds where each line starts and cuts the take into one clip per line, so
`b[i]`, `words` and every cue work the same as with the voice step. Inside a scene the take keeps its
own pauses. The voice step then leaves that video alone. Run
`.venv/bin/python scripts/align.py <series>/<id>` in place of the voice step: it prints the same
timing table. Only use a cloned voice the user has the right to use.

## Narration

- Simple English, B1 level, unless another language is asked for. Short sentences. Common
  words. One idea per sentence. No emojis anywhere.
- The voice reads 175 to 190 words a minute, pauses included; the voice step prints the real
  length. The skill of each type gives its word count.
- **One line, one visual event.** A cue can only start with a line, so split a long line
  where the picture must change. Inside a line the voice says a little over three words
  a second.
- **The first line is the hook**: the picture or the plain surprising fact, never "in this
  video". Viewers decide in the first two seconds.
- It is read by a voice model. Write symbols as words ("k omega S S T", "n q", "one half
  rho v squared"). Spell letter names with spaces: "C F D", "L E S", "B E P".
- **Check how it will be said.** `npm run -s tts -- --phonemes <series>/<id>` prints
  every line as the voice reads it (numbers and abbreviations written out).
  `npm run -s tts -- --hear "Joukowsky"` reads one phrase to a file and prints what Whisper
  heard: a name Whisper hears right is said right. Look for three traps:
  - hard names: respell them in `script.json` ("Zhoo-koff-skee");
  - a single letter: "A star" is read "uh star". Write "A-star", or "A, and B";
  - words with two readings ("use", "read", "close", "live", "lead", "wind"): reword the
    line if the wrong one comes out.

  The on-screen text is separate, so it stays correct. Do not edit `scripts/tts.py`.
- **Another language.** Put `"lang": "es"` in `script.json`: the voice step then reads it with
  the Spanish voice (Kokoro), and `--phonemes` prints the Spanish phonemes (`--say-es "..."`
  does one phrase). Write numbers and units as words ("ciento diez voltios"), spell letter names
  ("pe ese i") and respell foreign words the way they sound ("bréiker"). The on-screen
  text is in the same language. The voice step knows `en` and `es`.
- Do not state a number or a fact you are not sure of. Leave it out, or call it a rule of thumb.

## Adding a video to a series

- Read the last video of the series first. Its recap may promise what comes next: keep that
  promise with your title, or say in your report that the old recap now needs a repair.
- Parts you want to reuse from an earlier video: if they live in a `_shared.tsx`, import
  them. If they are private to that video, copy what you need and say so in your report.
- The `title` in `script.json` is the name of the chapter in the joined file.
- The build renders only your video. The other parts are not rendered or encoded again;
  only the joined files are rewritten.
- If the workspace has a `README.md` with a table of series, add a row for a new series or
  update the row of yours: the count and a few words per video.

## Repairing a finished video

1. Write down the length of the part and of the joined file as they are now:
   `ffprobe -v error -show_entries format=duration -of csv=p=0 videos/<series>/parts/<id>.mp4`.
2. Run `stills.mjs`: its report is the work list. Run it again after every round of
   fixes, because fixing one problem can uncover another. `npm run -s tts <series>/<id>`
   prints the timing table and changes nothing when the script is unchanged.
3. Change only `index.tsx`. Leave `script.json` alone: the voice step then reuses every
   clip, so the audio and `timing.json` stay as they are and the length does not change.
   (If a spoken line itself is wrong, change only that line: only its clip is spoken
   again, and the length moves by a fraction of a second.)
4. For a dead stretch, first try moving a cue that already exists to the moment the
   voice says it. Otherwise add motion that shows what the line already says. Do not add new
   statements, and do not add decoration to satisfy the check. Look at one frame in the middle
   of every motion you add: the main sheets show only finished steps.
5. Build, several videos in one command if you have them
   (`scripts/build.sh <series>/<a> <series>/<b>` stitches once), and compare the lengths.

Only one agent at a time may build in a series, because the build rewrites the joined files.

## Rules that are checked

`check.py` reads the source as text, so write it the way it expects:

- **Scenes.** Declare each scene at the start of a line as
  `const Name: React.FC<SceneProps> = ...`. Code between two scenes counts as part of
  the earlier one.
- **Cues.** Write every timed cue as `b[i]` or `b[i] + number`, for example
  `ramp(t, b[2] + 1.5)`. Do not put the offsets in arrays, and do not subtract: `b[3] - 0.3`
  is read as `b[3]`. A cue must land at least 1.2 s before its scene ends, or the viewer
  never sees it. A cue computed from a variable (`t0 + k * 0.5`) is not checked: keep
  those well inside the scene.
- **Line count.** A scene that reads `b[5]` when its script has five lines throws.
- **The `scenes` map** must list every scene id of the script, on one line, as `id: Component`.
- **The `id`** of the `VideoDef` must be the folder name.

`stills.mjs` measures the page: every `Txt`, `Tex` and SVG `<text>`, against other text,
against the canvas and against drawn lines. If you put text in a `div` of your own, give
it `data-box=""` so it is measured too. The tool does not see text on a filled shape, a
label far from its thing, or a screen that is mostly empty: those are for your eyes.

## What not to touch

The engine files of the workspace (`src/engine.tsx`, `src/kit.tsx`, `src/kits/`, `src/Root.tsx`,
`src/index.ts`, `scripts/`, `public/sfx/`, `public/fonts/`, `package.json`) are copies from this
plugin. The next `workspace.sh --apply` overwrites them, and every video depends on them. Do not
edit them, and do not edit any series or video folder that is not yours. If the kit lacks a part
that any series could use, write it in your `_shared.tsx` and say so in your report.

## Done, and the report

A video is done when you have looked at every sheet from `stills.mjs`, it reports no problem you
cannot explain, every line of the speech check is listened to or explained, and
`scripts/build.sh` has written the finished file with `qc.py` reporting 0 problems (or each one
explained).

Report: the path of the finished file, its length as read from the file (`ffprobe`), what you
checked and what you only assumed. Nobody has watched or listened yet: name the two or three
moments you are least sure of. If a step of a skill was wrong or made you guess, say which one.
