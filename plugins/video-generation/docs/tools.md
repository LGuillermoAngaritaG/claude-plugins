# Tools

Every step of making a video has a tool. Use them before writing a script of your own. All workspace tools run from the
workspace folder; each prints its usage when run without arguments.

## In the workspace (`scripts/`)

| Tool | Does | When |
|---|---|---|
| `python3 scripts/new.py <type> <series/id> "<title>" [--channel <name>]` | Starts a video folder: `script.json`, an `index.tsx` with the right look and placeholder scenes, empty `timing.json` and `art.json` (and `facts.json` for an explainer); types `math`, `sketch`, `story`, `ad`, `explainer`, `explainer-short`, `news`; `--channel` makes it for a channel of `src/channels/` | First step of every new video |
| `node scripts/shots.mjs <series/id> [name ...] [--again]` | Screenshots of the real web pages a news briefing shows (`"shots"` in `script.json`), with the box of the words to mark, into `public/art/<series>/<id>/shots/` and `shots.json`; reports a page that blocks it or lacks the words | After the story list is approved |
| `npm run -s tts <series/id>` | The local voice (Phonon in English on the GPU, Kokoro in Spanish), one clip per line, `timing.json`, the timing table. `-- --phonemes` shows what every line reads, `-- --hear "..."` what Whisper hears in one phrase, `-- --say-es "..."` the Spanish phonemes | After the script, and after every script change |
| `.venv/bin/python scripts/art.py <series/id>` | Pictures from Codex for sketch, story, ad and explainer videos, three at a time; `"ref"` keeps a person or a place from an earlier picture | After `images` are written |
| `.venv/bin/python scripts/voice.py <series/id>` | A Google Cloud voice (Gemini TTS with a style in words, or Chirp 3 HD) as `voice.wav`, read in takes of about a minute, for scripts with `"google"`; only when the text or style changed. A new take that fades or moves in pitch is read again (up to three readings, the steadiest kept). `--try "a line" --voice Kore --style "..."` compares voices | Before `align.py`; the build runs it |
| `.venv/bin/python scripts/align.py <series/id>` | Word times for captions and `said()`, cuts a `"recording"` into lines, and the speech check (words Whisper did not hear; a larger model gets a second listen to every flagged line) | After the voice |
| `python3 scripts/take.py <series/id> <files or folder>` | Joins voice lines made one at a time (Chatterbox, ElevenLabs) into `voice.wav` at the level of the local voice, and names it as the `"recording"` | When the voice is not the local one |
| `python3 scripts/clips.py <series/id> jobs` | Writes the Colab jobs for the clips, the music and the sound effects listed in `script.json` (`"style"`, `"clips"`, `"music"`, `"sfx"`); a transparent drawing becomes a start frame on white | Before a GPU session with the `ai-clips` skill |
| `python3 scripts/clips.py <series/id> import <dir>` | Brings the clips, music and effects from `studio.py run` into `public/art/<series>/<id>/` under fixed names (`clips/<name>.mp4`, `music.mp3`, `sfx/<name>.wav`) | After each GPU run, and after redos |
| `python3 scripts/frames.py <file.mp4> ...` | A row of six large frames per file, `out/frames/<name>.png` | To check every AI clip, or any finished file |
| `python3 scripts/short.py <series/long-id> <short-id> "<title>" <scene> ... [--again]` | Cuts (or with `--again` cuts again) an upright Short out of a long explainer: those scenes, the long video's own voice joined as `voice.wav`, its facts, its references cut to those scenes' chapters, an `index.tsx` that plays its scenes under `EXPLAIN_V` | When the user asks for Shorts from a long explainer; then `align.py`, the checks and the build |
| `python3 scripts/check.py <series/id>` | Scenes match the script (also when they are coded in several scene files), cues land in time and land on words their line says, the look matches the type; for an explainer, every number of the narration is in a claim of `facts.json` with a source, and every source is listed in `references.md` | After writing `index.tsx` |
| `node scripts/stills.mjs <series/id> [scene | scene:sec | @sec]` | Contact sheets, first frame first, with the layout checks (text, crossing tag lines, numbers on screen the narration does not say) and the dead-screen check | After every change to the scenes |
| `python3 scripts/mix.py <series/id>` | How many dB the music bed sits under the voice, and the `vol` to use (aim: about 20 dB) | Any video with a `bed` |
| `scripts/build.sh <series/id> ...` | Voice, word times, checks, mix, render, stitch, subtitles, finished-file check | When the stills are clean |
| `node scripts/render.mjs <series/id> [--draft]` | Only the render, to `out/<series>/<id>.mp4`; `--draft` makes a half-size quick version, `<id>-draft.mp4`, for the user to watch before the final render | The draft before the build; the full render rarely: the build does it |
| `scripts/stitch.sh <series>` | Loudness to -16 LUFS (measured first, then set: one pass left quiet Shorts up to 3.5 dB off), parts and the joined file with chapters | Rarely: the build does it |
| `python3 scripts/srt.py <series/id>` | Subtitles `videos/<series>/parts/<id>.srt` from the word times | The build does it; upload them to YouTube and LinkedIn |
| `python3 scripts/qc.py <series/id>` | The finished file: sound, loudness, silences, frozen or black picture | The build does it; run it alone after a repair |
| `python3 scripts/safezones.py <series/id> [seconds ...]` | The TikTok and Reels buttons and text laid over frames of the finished file, `out/safezones/` | Upright videos, before publishing |
| `python3 scripts/publish.py <series>` | Titles, descriptions (intro, chapters, every source, the channel's note and about line), tags and file list for every video of the series with a `publish.json`, into `videos/<series>/publish.md`; checks YouTube's limits | When the videos are built (youtube-publish skill) |
| `python3 scripts/upload.py <series> [--execute]` | The series to YouTube as private videos with the user's own uploader: long videos first, then each Short with its long video's link; the uploader's dry run without `--execute`; IDs in `videos/<series>/upload/ids.json` | When the user asks to upload (youtube-publish skill) |
| `.venv/bin/python scripts/thumbnail.py <series/id>` | A 1280 x 720 thumbnail: a Codex picture (or one you give) with the title's words drawn in code on its empty third, `videos/<series>/parts/<id>.jpg` | With publish.py |
| `npm run studio` | Remotion's preview of every video in the browser | To watch a video while you work |
| `python3 scripts/review.py serve` and `start / stage / wait / read` | The review page of the `guided-video` skill: the user approves each stage or asks for changes; `wait` prints them as a to-do list | When the user reviews the steps |

## In the plugin (`<plugin>/scripts/`)

| Tool | Does | When |
|---|---|---|
| `<plugin>/scripts/workspace.sh <folder> [--apply]` | Lists or copies the engine into a workspace, installs packages, lists missing tools | Start of every task |
| `python3 <plugin>/scripts/compare.py <old.mp4> <new.mp4>` | Length, loudness, sound and frames of two renders of one video | Before and after an engine change or a Remotion upgrade |

## In the `ai-clips` skill

`python3 <ai-clips skill>/references/studio.py connect | status | load | run | unload | kill`: the Colab GPU server
(video, speech, sound effects, music). Its skill says how; `clips.py` writes its jobs and imports its results.

## A tool you need is missing

Write it, and save it in the plugin so the next agent does not write it again. The installed plugin folder is replaced
by every update, so never write there. The source is the git clone of `LGuillermoAngaritaG/claude-plugins` (on the
owner's Mac: `~/Documents/repos/personal/claude-plugins`; clone it there if it is missing):

1. Put a tool that runs inside a workspace in `plugins/video-generation/workspace/scripts/`, one for the plugin itself
   in `plugins/video-generation/scripts/`. Follow the style of the tools beside it: a docstring with what it does and
   its usage, the standard library where possible, and a small `assert` check or a test in `tests/` when it has logic.
2. Add a row to this file, and a line in the skill that should use it.
3. Commit on a branch (no pushing without the user), then run `<clone>/plugins/video-generation/scripts/workspace.sh
   <workspace> --apply` so the workspace gets it.
4. Say in your report that a tool was added, so the user can review and push it.

A script that only one video will ever need stays in that video's folder.
