# Tools

Every step of making a video has a tool. Use them before writing a script of your own. All workspace tools run from the
workspace folder; each prints its usage when run without arguments.

## In the workspace (`scripts/`)

| Tool | Does | When |
|---|---|---|
| `python3 scripts/new.py <type> <series/id> "<title>"` | Starts a video folder: `script.json`, an `index.tsx` with the right look and placeholder scenes, empty `timing.json` and `art.json` | First step of every new video |
| `npm run -s tts <series/id>` | Kokoro voice, one clip per line, `timing.json`, the timing table. `-- --phonemes`, `-- --say "..."`, `-- --say-es "..."` show how words will be said | After the script, and after every script change |
| `.venv/bin/python scripts/art.py <series/id>` | Pictures from Codex for sketch, story and ad videos; `"ref"` keeps a person or a place from an earlier picture | After `images` are written |
| `.venv/bin/python scripts/align.py <series/id>` | Word times for captions and `said()`, cuts a `"recording"` into lines, and the speech check (words Whisper did not hear) | After the voice |
| `python3 scripts/take.py <series/id> <files or folder>` | Joins voice lines made one at a time (Chatterbox, ElevenLabs) into `voice.wav` at the Kokoro level, and names it as the `"recording"` | When the voice is not Kokoro |
| `python3 scripts/clips.py <series/id> jobs` | Writes the Colab jobs for the clips and the music listed in `script.json` (`"style"`, `"clips"`, `"music"`) | Before a GPU session with the `ai-clips` skill |
| `python3 scripts/clips.py <series/id> import <dir>` | Brings the clips and music from `studio.py run` into `public/art/<series>/<id>/` under fixed names (`clips/<name>.mp4`, `music.mp3`) | After each GPU run, and after redos |
| `python3 scripts/frames.py <file.mp4> ...` | A row of six large frames per file, `out/frames/<name>.png` | To check every AI clip, or any finished file |
| `python3 scripts/check.py <series/id>` | Scenes match the script, cues land in time, the look matches the type | After writing `index.tsx` |
| `node scripts/stills.mjs <series/id> [scene | scene:sec | @sec]` | Contact sheets with the layout and dead-screen checks | After every change to the scenes |
| `python3 scripts/mix.py <series/id>` | How many dB the music bed sits under the voice, and the `vol` to use (aim: about 20 dB) | Any video with a `bed` |
| `scripts/build.sh <series/id> ...` | Voice, word times, checks, mix, render, stitch, subtitles, finished-file check | When the stills are clean |
| `node scripts/render.mjs <series/id>` | Only the render, to `out/<series>/<id>.mp4` | Rarely: the build does it |
| `scripts/stitch.sh <series>` | Loudness to -16 LUFS, parts and the joined file with chapters | Rarely: the build does it |
| `python3 scripts/srt.py <series/id>` | Subtitles `videos/<series>/parts/<id>.srt` from the word times | The build does it; upload them to YouTube and LinkedIn |
| `python3 scripts/qc.py <series/id>` | The finished file: sound, loudness, silences, frozen or black picture | The build does it; run it alone after a repair |
| `python3 scripts/safezones.py <series/id> [seconds ...]` | The TikTok and Reels buttons and text laid over frames of the finished file, `out/safezones/` | Upright videos, before publishing |
| `npm run studio` | Remotion's preview of every video in the browser | To watch a video while you work |

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
