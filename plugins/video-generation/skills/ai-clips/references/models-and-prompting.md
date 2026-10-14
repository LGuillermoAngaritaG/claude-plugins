# Models and prompting

## Models

| | `ltx` | `tts` | `sfx` | `music` |
|---|---|---|---|---|
| Model | LTX-2.5, 22B distilled, INT8 | Chatterbox Turbo (English) and Chatterbox Multilingual (23 languages) | Stable Audio 3 Small SFX | ACE-Step 1.5 XL turbo |
| Download | ~40 GB, gated: needs `HF_TOKEN` | Small; fetched by the nodes on first run | ~3.5 GB | ~20 GB |
| Output | mp4 with sound | flac | flac | flac |
| Licence | LTX-2.x Community License | MIT (reported) | Stability AI Community License: commercial use under $1M yearly revenue | MIT |
| Tested on an L4 | Yes, both modes | Yes, English and Spanish | Yes | Yes |

Only one model should be loaded at a time. Run `studio.py unload` before loading another.

### Video (`ltx`)

- `seconds`: default 5; longer is untested.
- `megapixels`: default 0.9 (1280x736 at 16:9, 704x1280 at 9:16). It renders at half size, then a 2x latent upscaler.
- `aspect`: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9`, `21:9`.
- `image`: a local picture used as the first frame. It is cropped to the shot's aspect, so make it in that aspect.
- `enhance_prompt`: a small Gemma model rewrites the prompt. Needs `studio.py load ltx --enhance` (~10 GB more).
- Every clip has generated sound. Mute it in the edit if it is not wanted.

### Speech (`tts`)

- `language`: `en` uses Turbo, which performs tags typed into the text: `[laugh]`, `[chuckle]`, `[cough]`. Any other code uses the multilingual model (`es` for Spanish).
- The output is quiet (mean about -28 dB). Raise it before mixing.
- The model is unloaded after every line so that `unload` really frees the memory. A line then takes about 15 seconds.
- End lines on a full sentence. A one-word last sentence is read oddly.
- `voice`: a local audio file, 5 to 10 seconds of clean speech, to clone. Without it the model's default voice speaks. Only clone a voice the user has the right to use.

### Sound effects (`sfx`)

- `seconds`: default 5. Describe one sound, its material and its space: "a heavy wooden door slams in a stone hallway, short echo".

### Music (`music`)

- `prompt` is a list of style tags: genre, tempo feel, instruments, mood.
- `lyrics`: default `[Instrumental]`. For vocals, write lyrics with `[Verse]` and `[Chorus]` markers and set `language`.
- `seconds`: default 30. `bpm` default 120, `keyscale` default `C major`.

## Estimating time and cost

Measured once on an L4 (October 2026): ComfyUI install plus the LTX download took 3.5 minutes; a 5 second 9:16 clip at 0.9 megapixels took 2.0 to 3.1 minutes, the first one slowest. Single runs of the other models, downloads not included: a 4 second sound effect under 1 minute, a speech line about 1 minute, 20 seconds of music 0.5 minutes, an image-to-video clip 2.7 minutes.

Before quoting, look at `result.json` files from earlier jobs and use their real per-shot minutes instead. Say which basis the estimate uses.

Cost: an L4 uses about 1.7 compute units per hour; 100 units cost about $10. Quote total minutes and units, e.g. "~20 min, ~0.6 units (~$0.06)". The GPU bills while the server is up, including idle time, until it is killed.

## Video prompt pattern

Write one flowing paragraph in present tense that follows the action in time order: opening framing, what moves, how the camera moves, the final frame. End with the sound. Put the style anchor first and keep its wording identical across shots.

```
<Style anchor.> A close-up of <subject>, <detail>, <small action>. The camera slowly <move>, revealing <setting>. <Final framing>. <Sound: ambience, effects.>
```

Lessons from real batches (more in `assembling.md`):
- One small, slow action per 5 second clip. Prompts with three or four beats dropped or mangled some of them, and fast hand movement melts objects.
- A text description does not keep a face, a room or the colour the same between clips. Use `image` when clips must match.
- The model ignores some framing words ("over the shoulder" came out as a side view). A first frame fixes the framing.
- Name the light the same way in every prompt, or the colour drifts between clips.
- For image-to-video, describe only what changes from the picture. Ask for a locked-off camera and never for a push-in: the model drifts in by itself and overdoes any zoom it is asked for.
- Keep mouths closed under a narrator. Do not ask for screens, text or a product on screen: draw those in code over the clip.

Image-to-video prompt that gave clean clips:

```
Locked-off static tripod shot: the camera does not move and does not zoom. Very subtle, slow, natural motion only. Her mouth stays closed. <One small action.> Sound: quiet room tone, no speech, no music.
```

## Update from research, October 2026

Sources are in `docs/research/ai-video.md` at the root of this plugin (2026-10-14). Unconfirmed items are marked.

- **Keep LTX-2.5.** It is still the best open model that makes sound and fits one Colab GPU, and it is free for
  companies under $10M yearly revenue. Its licence asks you to say that the content is machine-generated: in an ad,
  that is the `AiMark` of the ad kit. MiniMax H3 is better but its licence excludes the EU, the UK, the USA and South
  Korea; open Wan stops at 2.2 (silent). The Sora API was shut down on 2026-09-24.
- **Memory.** The INT8 model nearly fills the L4's 24 GB (about 22.7 GB reported, second-hand). Keep clips at 5 s on
  an L4; a 10 s clip can run out of memory. Try an A100 for longer clips.
- **Keyframe first** for every shot that must match another: one reference picture per person or product, edited
  into each start frame (the `"ref"` field of `art.py`), then image-to-video. LTX-2.5 also has an official
  first-and-last-frame template and an "Ingredients" reference-sheet add-on; neither is wired into `server.py` yet.
- **Prompt template** (LTX's own guide asks for one paragraph of 4 to 8 sentences, present tense):
  `<style anchor> <shot size and lens>, <subject with 2-3 visible details> <one action>. <setting and named light>.
  The camera <one move or "stays still"> and ends on <final framing>. Audio: <ambience>. No dialogue.`
  Say what the frame looks like after the move. Put spoken words in quotes, with the language.
- **Negative prompts** probably do nothing on the distilled model: it runs at a fixed CFG of 1 (inference,
  unconfirmed). Fix the positive prompt instead, and describe what you want rather than "no X".
- **What fails**: more than one action in 5 s, readable text, signs and logos, fast or twisting motion, inner
  states without a visible cue ("confused"), two light sources that disagree, real people by name.
- **Finishing**, if needed: LTX's own detail and upscale add-ons first, then SeedVR2 (Apache 2.0). Skip frame
  interpolation unless 50/60 fps is needed.
- **Spanish speech**: Chatterbox has Spain and Latin American Spanish fine-tunes (MIT, April 2026); Qwen3-TTS and
  VoxCPM2 (Apache 2.0) also speak Spanish. No independent comparison exists: test three lines by ear.
- **Not for ads** (non-commercial weights): MMAudio, F5-TTS, Voxtral TTS, Higgs Audio, Fish S2.
