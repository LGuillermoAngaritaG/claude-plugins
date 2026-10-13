# Models and prompting

## Specs and runner defaults

| | MiniMax H3 (`h3`) | LTX-2.5 (`ltx`) |
|---|---|---|
| Size | 33B, pruned INT8 transformer | 22B distilled, INT8 transformer |
| Audio | Native stereo: voice, SFX, music | Native, synchronized |
| `seconds` | Default 5. Trained range ~5-15 s. Snapped up to a 17k+5 frame grid at 24 fps | Default 5 (template default; longer is untested here) |
| `megapixels` | Default 0.4 (864x480 at 16:9). Native max ~0.98 (1344x768) | Default 0.9 (1280x736 at 16:9). Renders at half size, then a 2x latent upscaler |
| Steps | 20, or 8 with `turbo=True` | Fixed: 8 + 3 (distilled, two stages) |
| Extras | `turbo`: ~2.5x faster, some quality loss | `enhance_prompt`: a small Gemma model rewrites the prompt; downloads ~10 GB extra and adds ~1-2 min |
| License | MiniMax H3 Community License. Territory excludes EU, UK, South Korea, US. Revenue over $20M/yr needs written permission; products must show "MiniMax H3" | LTX-2.x Community License, gated on Hugging Face |

Aspect values: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9`, `21:9`.

Megapixels to 16:9 size: 0.4 → 864x480, 0.6 → 1056x608, 0.9 → 1280x736, 1.0 → 1376x768 (ltx) or 1344x768 (h3 max).

## Estimating time and cost

Setup per batch: ~5-10 min to install ComfyUI and download ~40 GB of weights. Every batch pays it again because Colab runtimes start empty.

Render time on an L4 is not yet measured. Starting guesses for a 5 s clip at default resolution:
- h3: ~10-20 min (20 steps), ~4-8 min with turbo
- ltx: ~3-8 min

Before quoting, look for `status.json` files from earlier batches in `My Drive/claude_videos/` and use their real per-shot minutes instead. Say which basis the estimate uses.

Cost: an L4 uses about 1.7 compute units per hour; 100 units cost about $10. Quote total minutes and units, e.g. "~45 min, ~1.3 units (~$0.13)".

## Prompt patterns

Both models read long, concrete prompts well. Name the subject, action, setting, lighting, lens or camera move, mood, and audio. Put the style anchor first and keep its wording identical across shots.

### MiniMax H3

Write one block that covers picture and sound. The official template uses a storyboard with timed beats:

```
<Style anchor: look, film stock or render style, palette, lighting, lens.>

Scene overview: <who, where, what is happening, and why it matters.>

Storyboard:
[0s-2s] Shot 1: <framing and camera move>, <action>.
[2s-4s] Shot 2: <framing>, <action>.
[4s-5s] Shot 3: <closing beat>.

Camera: <cutting style, movement, stability>.

Audio: <ambience, SFX on key beats, music cues, any spoken line in quotes>.

No text, subtitles, logos or watermarks. <Other exclusions.>
```

Use timed beats only when the user wants cuts inside one clip. For a single continuous shot, drop the storyboard and describe the action in order.

### LTX-2.5

Write one flowing paragraph in present tense that follows the action in time order: opening framing, what moves, how the camera moves, what is revealed, the final frame. End with the sound. The built-in negative prompt already excludes game and cartoon looks. LTX-2.5 can also hold several connected shots in one clip when the prompt describes the cuts.

Example structure:

```
<Style anchor.> A close-up of <subject>, <detail>, <small action>. The camera slowly <move>, revealing <setting and second subject>. <Mid-shot event>. <Final framing>. <Sound: ambience, effects, music, dialogue in quotes.>
```

## Consistency across clips

- Repeat the style anchor and character descriptions verbatim.
- Keep aspect ratio and resolution the same for every shot in a sequence.
- To keep a shot the user liked while tweaking its prompt, reuse its `seed` from `shots.json`.
