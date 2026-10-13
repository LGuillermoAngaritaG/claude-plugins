# Models and prompting

## Models

| | `ltx` | `tts` | `sfx` | `music` |
|---|---|---|---|---|
| Model | LTX-2.5, 22B distilled, INT8 | Chatterbox Turbo (English) and Chatterbox Multilingual (23 languages) | Stable Audio 3 Small SFX | ACE-Step 1.5 XL turbo |
| Download | ~40 GB, gated: needs `HF_TOKEN` | Small; fetched by the nodes on first run | ~3.5 GB | ~20 GB |
| Output | mp4 with sound | flac | flac | flac |
| Licence | LTX-2.x Community License | MIT (reported) | Stability AI Community License: commercial use under $1M yearly revenue | MIT |
| Tested on an L4 | Text-to-video: yes. Image-to-video: no | No | No | No |

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
- `voice`: a local audio file, 5 to 10 seconds of clean speech, to clone. Without it the model's default voice speaks. Only clone a voice the user has the right to use.

### Sound effects (`sfx`)

- `seconds`: default 5. Describe one sound, its material and its space: "a heavy wooden door slams in a stone hallway, short echo".

### Music (`music`)

- `prompt` is a list of style tags: genre, tempo feel, instruments, mood.
- `lyrics`: default `[Instrumental]`. For vocals, write lyrics with `[Verse]` and `[Chorus]` markers and set `language`.
- `seconds`: default 30. `bpm` default 120, `keyscale` default `C major`.

## Estimating time and cost

Measured once on an L4 (October 2026): ComfyUI install plus the LTX download took 3.5 minutes; a 5 second 9:16 clip at 0.9 megapixels took 2.0 to 3.1 minutes, the first one slowest. The other models are unmeasured: say so when quoting.

Before quoting, look at `result.json` files from earlier jobs and use their real per-shot minutes instead. Say which basis the estimate uses.

Cost: an L4 uses about 1.7 compute units per hour; 100 units cost about $10. Quote total minutes and units, e.g. "~20 min, ~0.6 units (~$0.06)". The GPU bills while the server is up, including idle time, until it is killed.

## Video prompt pattern

Write one flowing paragraph in present tense that follows the action in time order: opening framing, what moves, how the camera moves, the final frame. End with the sound. Put the style anchor first and keep its wording identical across shots.

```
<Style anchor.> A close-up of <subject>, <detail>, <small action>. The camera slowly <move>, revealing <setting>. <Final framing>. <Sound: ambience, effects.>
```

Lessons from the first real batch:
- One action per 5 second clip. Prompts with three or four beats dropped or mangled some of them.
- A text description does not keep a face, a room or the colour the same between clips. Use `image` when clips must match.
- The model ignores some framing words ("over the shoulder" came out as a side view). A first frame fixes the framing.
- Name the light the same way in every prompt, or the colour drifts between clips.
- For image-to-video, describe only what changes from the picture: the motion and the camera.
