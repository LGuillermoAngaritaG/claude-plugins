# Video generation

Narrated videos made on your Mac by Claude Code: the script, a local voice, the animation, the
checks and the finished file. Plus AI clips, speech, sound effects and music on a Google Colab GPU.

## Skills

| Skill | Makes | Shape | Default |
|---|---|---|---|
| `math-video` | Explainers in the look of 3Blue1Brown: curves, diagrams and KaTeX equations that build step by step | 1920 x 1080 | 3 minutes |
| `sketch-video` | Hand-drawn shorts: ink drawings that draw themselves on paper, for everyday topics | 1080 x 1920 | 45 seconds |
| `story-video` | Story shorts: painted pictures with a slow camera, captions, a sound bed; crime stories first | 1080 x 1920 | 1 minute |
| `ad-video` | Product ads: AI clips or photo stills, a hook, product screens drawn in code, captions, an end card | 1080 x 1920 | 20 seconds |
| `explainer-video` | Long explainers that pick, for each moment, the medium that explains it best: 3D cutaways (three.js), Codex pictures, Colab AI clips, 2D animation; a Google voice; sourced facts; script and plan approved first; an anti-slop review; one-minute Shorts cut from them on request | 1920 x 1080, Shorts 1080 x 1920 | 10 to 12 minutes, Shorts about 1 |
| `news-video` | A daily news briefing: stories in fixed segments, each on its real web page (a screenshot with its site, date and the spoken words marked), dated and sourced claims, a Google voice, one stop a day for the story list | 1920 x 1080 | 5 to 8 minutes |
| `youtube-publish` | Everything to upload finished videos: titles, descriptions with chapters and every source, tags, thumbnails with their words drawn in code, Shorts descriptions; checks YouTube's limits; does not upload | any | |
| `ai-clips` | AI video (LTX-2.5), speech (Chatterbox), sound effects and music on a Colab GPU, behind an approval and cost gate | any | 5 s clips |
| `guided-video` | Any of the above step by step, with the user checking each stage in a review page: what we make, script and plan, pictures and motion, voice, music and clips, final cut | any | as the type |

Ask in plain words: "make a three minute video about the Fourier transform", "a 45 second sketch
short on how a vaccine works", "a 20 second ad for my app". The skill that fits takes over.

## How it works

The four narrated types share one pipeline (`docs/pipeline.md`): `script.json` with the
narration, a Kokoro voice, word times from a local Whisper, scenes written as React components
that are a pure function of time, Remotion renders, contact sheets with automatic layout and
dead-screen checks, ffmpeg for loudness and stitching, a speech check (the script words Whisper
did not hear) and a check of the finished files (sound, loudness, silences, frozen or black picture).

Videos live in a **workspace**, a folder of yours. `scripts/workspace.sh <folder>` lists what it
would copy there from `workspace/` (the engine, the look files, the scripts, sound effects and
fonts) and what tools are missing; `--apply` copies it and installs the Node and Python parts.
The plugin folder itself is never written to. Your videos (`src/videos/`, `videos/`,
`public/art/`, `public/audio/`) are never touched by an update.

`examples/` holds one finished video per type, as code: read them before writing a new one.

Every step has a tool, listed in `docs/tools.md`: starting a video, pictures, voice, word times and
the speech check, Colab jobs and their import, frame sheets, the music level, stills, the build,
subtitles, the finished-file check and the TikTok and Reels overlays. Agents use them instead of
writing scripts. When an agent writes a script while making a video, a hook (`hooks/new-tool.py`,
after each Write) reminds it to save the script in the plugin source if a later video could use it.

## Needs

- macOS with Node.js, Homebrew `ffmpeg` and `uv`.
- The Kokoro voice in `~/.local/share/two-host-podcast/` (the installer of the `two-host-podcast`
  skill, `scripts/install.sh --no-skill`).
- For pictures (sketch, story, ad): `atelier` with a logged-in Codex, and the conduit in
  `conduits/codex-image/` copied to `~/.atelier/conduits/codex-image/`.
- For `explainer-video`: `gcloud` logged in with a Cloud project that has the Text-to-Speech API (the Google voice;
  put its id in the workspace's `settings.json` as `{"google_project": "<id>"}`). It also uses pictures (above)
  and, when a clip is worth GPU time, `ai-clips`.
- For `ai-clips`: a Google account with Colab compute units, and for LTX-2.5 a Hugging Face token
  with the model licence accepted. You run `notebook.ipynb` once per session.

## Develop

```bash
claude plugin validate plugins/video-generation
python3 plugins/video-generation/tests/test_studio.py      # the Colab client and server, against a fake ComfyUI
<workspace>/.venv/bin/python plugins/video-generation/tests/test_speech_check.py   # the speech check, on lines Whisper really heard
python3 plugins/video-generation/tests/test_hook.py         # when the save-your-tool hook speaks
python3 plugins/video-generation/tests/test_review.py       # the review server: answers, the to-do list, the folders it may read
python3 plugins/video-generation/tests/test_explainer.py    # the explainer tools: facts check, voice requests and takes, new.py
python3 plugins/video-generation/scripts/compare.py <old.mp4> <new.mp4>   # two renders of one video, before and after a change
plugins/video-generation/scripts/workspace.sh /tmp/ws --apply   # a fresh workspace; then build an example in it
```

The engine is the source of truth here, in `workspace/`. Change it here, then run
`workspace.sh <folder> --apply` in each workspace; it reinstalls the packages when
`package.json` or `package-lock.json` changed.

To upgrade Remotion: set the new version of every `remotion` and `@remotion/*` package in
`workspace/package.json`, run `workspace.sh` on a scratch folder, run `npm install` there, copy
its `package-lock.json` back into `workspace/`, then render one video of each type before and
after and compare length, loudness and frames. Remotion 4.0.535 (October 2026) plays audio and
video through `@remotion/media`; it plays mono files 3 dB louder than the old `<Audio>`, which
the engine balances by raising the stereo bed by the same amount.

## Licences of the generated media

LTX-2.5: LTX-2.x Community License. Stable Audio 3: Stability AI Community License (commercial use
under $1M yearly revenue). ACE-Step 1.5 and Chatterbox: MIT. Kokoro: Apache 2.0. Read each licence
before commercial use. Sound effects: see `workspace/public/sfx/SOURCES.md`.
