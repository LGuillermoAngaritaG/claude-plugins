# Programmatic narrated videos made by an AI coding agent: state of the art, October 2026

Research date: 14 October 2026. Every claim has a source number; the list is at the end.

How to read this report:

- **[n]** is a source in the list at the end.
- **[L]** is something I tested on this Mac, on your finished files, on 14 October 2026.
- **UNCONFIRMED** means I could not confirm it with a source.
- **(secondary)** means the source is a blog or a vendor, not the maker or a standard.
- Limit: the web-search budget for this session ran out near the end. A few points I wanted to check twice (Kokoro speed on Apple Silicon, the TikTok and Instagram loudness targets, the Higgs Audio v2 licence) are marked UNCONFIRMED for that reason.

---

## 1. Remotion today

### Version

- The latest release is **v4.0.535, from 12 October 2026** [1a]. You are on 4.0.487, from 9 July 2026 [1d]. That is 48 patch releases behind.
- 4.0.400 came out in early January 2026. v4.0.403 is dated 7 January [1g].
- Remotion 5.0 is **not released**. Its migration page is a partial list of planned breaking changes [11].

### What changed since 4.0.400 that matters for you

| Area | Change | Version | Source |
|---|---|---|---|
| Agent skills | Remotion Agent Skills added. `create-video` offers to install them. | 4.0.408 (22 Jan) | [1g] |
| Agent skills | Skills split into several skills, with `remotion-best-practices` as the router | 4.0.488 | [1d] |
| Agent skills | Claude Code plugin added. The Remotion MCP is deprecated. | 4.0.491 | [1d] |
| Agent skills | `/remotion-docs` (4.0.490) and `/remotion-upgrade` (4.0.494) | | [1d] |
| Agent skills | Skills now prefer Bezier easing to springs | 4.0.446 | [1e] |
| `@remotion/media` | Declared stable and recommended | 4.0.491 | [1d] |
| `@remotion/media` | ProRes support (your version) | 4.0.487 | [1d] |
| `@remotion/media` | HLS support | 4.0.454 | [1e] |
| `@remotion/media` | Direct premounting | 4.0.495 | [1d] |
| `@remotion/media` | Pitch shift with `toneFrequency` | 4.0.520 / 4.0.524 | [1b] |
| Captions | Docs for importing, generating, displaying and exporting captions | 4.0.408 | [1g] |
| Captions | Forced page breaks in captions | 4.0.518 | [1b] |
| Captions | New package `@remotion/whisper-webgpu`: local Whisper through Transformers.js and WebGPU, browser and Node | 4.0.518 | [1b], [17] |
| Captions | Node support for `@remotion/whisper-webgpu` | 4.0.528 | [1a] |
| Captions | Captions Element (4.0.523), caption Elements (4.0.531), "Generate captions" in Studio (4.0.527) | | [1a], [1b] |
| Effects, light leaks | New `@remotion/effects` with `lightLeak()` (WebGL2) | 4.0.500 | [7] |
| Effects, light leaks | `@remotion/light-leaks` and Starburst are deprecated, and will not be published in v5 | 4.0.500 | [1c], [8] |
| Effects, light leaks | Many more effects: `tear()`, roughen edges, paper, pixelation, skew, liquid contours and others | 4.0.486 to 4.0.525 | [1b], [1d] |
| Transitions | Push cut preset | 4.0.500 | [1c] |
| Transitions | `trimBefore` on `TransitionSeries.Sequence` | 4.0.497 | [1c] |
| Transitions | Connected compositions in `TransitionSeries` | 4.0.501 | [1c] |
| Transitions | `blurSlide()` | 4.0.523 | [1b] |
| Audio visualization | Faster FFT behind `visualizeAudio()` | 4.0.504 | [1c] |
| Audio visualization | Mirrored spectrum and oscilloscope Elements | 4.0.518 | [1b] |
| Audio visualization | Decibel-scale waveform in `@remotion/timeline-utils` | 4.0.531 | [1a] |
| Audio | New package `@remotion/sfx`: sound-effect files with peaks near -3 dB, MIT package, a licence per sound, no attribution needed | 4.0.429 | [12] |
| Drawing | New package `@remotion/rough-notation`, for hand-drawn annotations | 4.0.490 | [1d] |
| Drawing | `interpolatePaths()` in `@remotion/paths` | 4.0.529 | [1a] |
| Drawing | New package `@remotion/motion-blur` | 4.0.529 | [1a] |
| Safe zones | "Social Safe Zones" overlay Element for Instagram and TikTok, measured from iOS screen captures | 4.0.518 | [1b], [16] |
| Render speed | Multiple stills in one call: `--frames=0,10,20` | 4.0.502 | [1c] |
| Render speed | Rspack is the default bundler for new templates | 4.0.503 | [1c] |
| Render speed | Chromium 157 | 4.0.534 (7 Oct) | [1a] |
| Render speed | Shared memory between Chrome and FFmpeg, and more frequent parallel encoding | 4.0.534 (7 Oct) | [1a] |
| Render speed | Client-side rendering | 4.0.491 | [1d] |
| Lambda | Lambda work continues | | [1a] to [1c] |
| Lambda | Cloud Run is marked unmaintained | 4.0.500 | [1c] |
| Lambda | Lambda does not matter for a local Mac pipeline | | |

Two older facts are still useful:

- **Hardware encoding on macOS.** VideoToolbox handles H.264 and H.265 from 4.0.236 and ProRes from 4.0.228. It is off by default. Turn it on with `--hardware-acceleration if-possible` [14].
- **Benchmark.** `npx remotion benchmark` finds the best `--concurrency` [15].

### Official agent skills for Claude Code

- Install with `npx skills add remotion-dev/skills`, or as a plugin:
  - `claude plugin marketplace add remotion-dev/claude-code-plugin`
  - `claude plugin install remotion@remotion` [2], [3]
- The skills are:
  - `remotion-best-practices` (the router)
  - `-create`, `-markup`, `-studio`, `-render`, `-maps`, `-captions`, `-saas`, `-interactivity`
  - `-docs`, `-upgrade`, `-multimedia` [2]
- Warning: a community skill on another site has the same name, `remotion-best-practices`. Install from `remotion-dev` [secondary search result, claudemarketplaces.com].

### Breaking changes and deprecations that touch you

- **v4.0.530.** `durationInFrames` now applies before `playbackRate`. The release calls this "a small breaking change" [1a].
- **v4.0.491.** These changed in the same release [1d]:
  - Animated Elements must have exit animations.
  - The Remotion MCP is deprecated.
  - The FFmpeg binary is no longer built with `--enable-nonfree`.
- **v4.0.450.** The renderer needs macOS 15 or later [1e]. Your Mac runs Darwin 25 (macOS 26), so this is fine.
- **The `<Audio>` from `remotion` is now `<Html5Audio>`.** It "was previously called `<Audio>`". The docs say: "For new audio usage, prefer `<Audio>` from `@remotion/media`" [6]. Your engine imports `Audio` from `remotion` [L].
  - In `@remotion/media`, a `volume` callback like `(frame) => number` "still works but isn't recommended". Use `useCurrentFrame()` and `interpolate()` instead [5].
  - Your engine uses volume callbacks for the sound-effect fade-out and for the bed fades [L].
- **Planned for v5** [11], [1c], [1f]:
  - Node 18 or later.
  - `inputProps` is required in `selectComposition()`.
  - `visualizeAudio()` defaults to `optimizeFor: "speed"`.
  - `TransitionSeries` no longer accepts `layout="none"`.
  - Sequences are premounted automatically.
  - The renderer defaults to ANGLE.
  - Deprecated packages are no longer published.
- **Licence.** Remotion is free for individuals, for companies with up to 3 employees, and for non-profits. Larger for-profit companies need a company licence [18]. The 5.0 licence will also count contractors toward team size [11].

---

## 2. Alternatives and complements

| Tool | Status (Oct 2026) | When it beats Remotion | Source |
|---|---|---|---|
| **HyperFrames** (HeyGen) | HTML, CSS and seekable animation (GSAP, Lottie, Three.js, CSS, WAAPI) rendered to MP4 with headless Chrome and FFmpeg. Apache-2.0. Node 22 or later and FFmpeg. 21 agent skills plus a Claude Code plugin. About 63.5k stars. npm version 0.8.157. | You want no build step, plain HTML and GSAP that agents write well, a permissive licence, or one-off motion graphics. The README says Remotion's wall-clock animation patterns "need more care". That is HeyGen's own claim. | [19], [20] |
| **Motion Canvas** | Last stable release v3.17.2 on 14 Dec 2024. Last pre-release v3.18.0-alpha.0 on 16 Feb 2025. Development is slow. | Precise generator-based timelines. Revideo notes that Motion Canvas renders through a button in its editor UI. | [22], [21] |
| **Revideo** | Fork of Motion Canvas with headless rendering. Now at `midrender/revideo`, release 0.11.0 on 10 Jul 2026, 4.1k stars. Licence: UNCONFIRMED. | You like Motion Canvas's generator style but need headless and server rendering. | [21] |
| **Manim Community** | v0.22.0 on 8 Oct 2026. Needs Python 3.11 or later. Breaking changes in 0.22: the `[ffmpeg]` config section is renamed `[media]`, `--custom_folders` is removed, and new output and encoder options. Has `Typst` and `MathTypst` classes. | Equation morphing term by term (`TransformMatchingTex`), 3D math scenes, the original 3b1b look out of the box. | [23], [24], [31] |
| **ManimGL** (3b1b) | v1.7.2, dated "13 Dec" (year not shown; probably 2024, UNCONFIRMED). The Manim Community FAQ says ManimGL has "more experimental features and breaking changes between versions are not documented". | Only if you want exactly what Grant uses. | [26], [25] |

### Is Manim better for the `math` type?

Short answer: not as the main engine. It is a good tool for one clip at a time.

**Where Manim is stronger:**

- 3Blue1Brown makes almost all its animations in Manim. It renders "individual clips to be edited together later" [27].
- Its real advantages:
  - morphing one equation into the next (`TransformMatchingTex` instead of fade-out then fade-in);
  - 3D scenes [31].
- Comparison blogs call Manim the default for 3b1b-style math. They suggest Remotion for layout, captions and composition, with Manim feeding it [34] (secondary).

**Why Remotion stays the better base for you:**

- **Your checks run in the browser DOM.** They measure every text box against other text, lines and the safe area, and they find dead stretches [L, VIDEOS.md]. Manim renders with Cairo or OpenGL, so all of these checks would have to be rebuilt.
- **Your pipeline is shared.** Word-timed cues, captions, the vertical formats and one engine for three types are all already in Remotion.
- **The look matches.** Your math look already follows 3b1b: dark screen, step-by-step derivations, colour as meaning [L, VIDEOS.md].

**Suggested split:** when a video needs a real equation morph or a 3D surface, render that one clip in Manim with a transparent background. Then place it with `<Video>` from `@remotion/media`, which has ProRes support from 4.0.487 [1d], [4]. Effort: medium. Do it only when a script needs it.

### Prior art

**explainroo** (MIT, about 553 stars) runs almost the same pipeline as yours [33]:

- Kokoro voice;
- Whisper word times through Transformers.js;
- Playwright frames;
- Rough.js hand-drawn style;
- a contact sheet;
- a layout check;
- a **"speech check" that finds words the voice got wrong**;
- music generated and lowered under the voice.

It is worth reading for ideas. Its speech check is the main one you lack (see section 10).

---

## 3. Craft for math and explainer videos

### What 3Blue1Brown and the SoME criteria say

- **Visuals first, then the meaning.** "When we put the visuals first, then start to articulate the meaning, you can get a sense of ownership over it" [29].
- **Concrete before abstract.** Do not start from the general definition. Make the example concrete, for example put numbers on a graph [30] (secondary compilation of interviews).
- **Ownership.** Aim for the viewer to feel they "could have invented" the result. Rediscovery builds deep understanding [30].
- **Story.** Framing a lesson as a story holds attention [30].
- **3b1b's Summer of Math Exposition criteria** [28]:
  - **Motivation**: "It should be clear to the reader/viewer within the first 30 seconds why they should care."
  - **Clarity**: jargon is explained, the goals are clear with little background, and there is empathy for newcomers.
  - **Novelty**: an experience the viewer would not easily find elsewhere. A familiar topic explained better counts.
- **Production.** 3b1b renders clips in Manim and edits them in a normal video editor. Vincent Rubinetti writes most of the music [27].

### Evidence-based multimedia rules (Mayer)

These are summarised by university teaching centres [32]:

- **Signaling**: highlight the step being discussed. Do not show the whole process while the voice talks about one step.
- **Temporal contiguity**: the picture changes at the moment the word is said. Your cues on words do this.
- **Redundancy**: do not put the narration on screen as text.
- **Segmenting**: short parts. A series of 1 to 2 minute pieces beats one 11-minute block.
- **Coherence**: cut what is extra.
- **Pre-training**: introduce terms before the complex part.

### A practical 3b1b-style playbook

This comes from a Manim agent skill, so it is secondary [31]:

- One palette for the whole video. "Random different colors" per scene is called "an aesthetic failure".
- Colour encodes meaning (inputs one colour, results another).
- Opacity layering: main element at full opacity, context about 0.4, grids about 0.15.
- Transform instead of fade-out then fade-in, especially for equations (`TransformMatchingTex`).
- Geometry before algebra: "Show the shape first, the equation second."
- Pause after reveals. Their table: 2 s after a key equation, 3 s after the "aha" moment. "A 2-second pause after a key reveal is never wasted."

### Common mistakes (from the sources above)

- Scenes made only of formulas.
- Colours that change meaning between scenes.
- On-screen text that repeats the voice.
- No pause after the key result.
- Showing the whole derivation at once.
- Starting from a definition instead of a question or picture.

### Pacing

- E-learning practice plans for **about 140 to 160 words a minute**, slower for dense material. This is practitioner guidance, not research [88] (secondary).
- Your guide says Kokoro reads **175 to 190 words a minute** with pauses [L, VIDEOS.md]. For dense math that is at the fast end.
- UNCONFIRMED whether slowing down helps comprehension for your viewers.

### How your guide compares

Your VIDEOS.md already covers most of this:

- question first;
- a moving picture always on screen;
- step-by-step derivations with dimmed earlier steps;
- colour tied to meaning;
- "illustration" labels on plots that are not real data.

Two gaps:

1. There is no tool to **morph** one equation into the next. You dim earlier steps instead.
2. There is no explicit **silent beat after the key result**.

---

## 4. Craft for whiteboard and sketch animation

### Stroke reveal

- The standard method animates `stroke-dasharray` and `stroke-dashoffset`. Remotion's `evolvePath(progress, d)` returns both [13]. GSAP DrawSVG does the same [41].
- It only works on **stroked centrelines, not filled outlines.** VideoScribe users report that the hand "traces around" the stroke when the paths are filled outlines [38].

### Vectorizing raster art

- **Potrace and VTracer make filled outlines.**
  - Potrace needs a black-and-white input.
  - VTracer handles colour, has `pixel`, `polygon` and `spline` modes, has Python and Node bindings, and its 1.0 line is still alpha [35].
- **For a draw-on you need centrelines:**
  - AutoTrace has a `-centerline` option [36].
  - The commercial CenterLine plugin thins the drawing to a skeleton, prunes spurs, closes small gaps and fits Bézier curves. Its "Reveal Original" mode shows the source pixels only inside the extracted stroke [37].
- **Your pipeline already does the right thing** [L]:
  - `art.py` skeletonizes the ink with scikit-image and walks strokes from the line ends.
  - `sketch.tsx` reveals the original ink image through a mask built from the growing strokes, which is the same idea as "Reveal Original".
  - No change is needed here.

### Line boil

- Line boil is the wobble of hand-drawn lines from frame to frame. Sources describe it two ways [39]:
  - as a fault;
  - as a style that "makes the whole scene come alive", as in Gertie the Dinosaur and Squigglevision.
- How to make it [39]:
  - cycle 3 to 5 slightly different drawings at about 12 fps (Wiggly Paint uses 3 images);
  - or, in After Effects, use Turbulent Displace with a seed that changes about 4 times a second, at a low amplitude.
- Your kit's `wobble()` is **static**: it is seeded per element, not per frame [L].
- Changing the seed every 3 to 6 frames would give boil at almost no cost:
  - for vector marks, change the salt;
  - for the raster ink, use SVG `feTurbulence` plus `feDisplacementMap`.
- This also keeps a finished drawing from looking frozen.
- UNCONFIRMED how much render time an SVG displacement filter adds.

### How good channels do it

- **RSA Animate (Cognitive Media).** Andrew Park filmed himself drawing on paper and the footage was sped up [40]. A reviewer notes that drawings already on the board are cleverly reused as the talk goes on [40b].
- **MinutePhysics.** Henry Reich narrates over time-lapse drawings. His hands are often visible [40].
- **The lesson for you:** the real stroke order (outline, then details, then colour) and reusing elements already drawn matter more than the hand graphic itself. Your pen that follows the line already gives the hand cue.

---

## 5. Craft for narrated story videos

### Keeping images consistent across scenes

**OpenAI:**

- OpenAI's image guide, as fetched today, lists **`gpt-image-2.5-sunburst`** (precise editing) and **`gpt-image-2.5-flare`** (fast) [42].
- A secondary source dates their release to 8 September 2026 [43].
- The edit endpoint takes **several reference images** in one request [42].
- OpenAI itself warns: the model "may occasionally struggle to maintain visual consistency for recurring characters" [42].

**Other models (all secondary sources):**

- Nano Banana Pro (Google) takes up to 14 reference images [44].
- FLUX.2 takes up to 8 reference images [44].
- Flux Kontext keeps the subject while editing local areas [44].
- No independent 2026 benchmark compares character consistency across these models. UNCONFIRMED which is best.

**What this means for you:**

- Your rule of no faces and only silhouettes or people from behind removes the hardest case, which is faces.
- What remains is place, light, period and props.
- The reliable method is **anchor and edit**: generate the first key picture, then pass it as a reference ("same street, same light, now ...").
- UNCONFIRMED whether your `atelier run codex-image` step can pass reference images.

### Ken Burns versus 2.5D parallax

**Ken Burns:**

- A slow pan and zoom over a still, used when there is no footage. Simulated parallax can make it look 3D [48].
- Your `Shot` with `move` already does Ken Burns [L].

**2.5D parallax:**

- A depth model estimates distance per pixel. A virtual camera then moves near parts faster than far parts.
- **Depth Anything 3** (ByteDance, 14 Nov 2025) [45]:
  - Small (0.08B), Base (0.12B), Metric-Large and Mono-Large are **Apache-2.0**;
  - Large and Giant are **CC BY-NC 4.0**, which means non-commercial use only.
- **Apple Depth Pro:** sharp metric depth, 2.25-megapixel maps in about 0.3 s on a V100, under a custom licence [46].
- **DepthFlow** is a ready parallax renderer with seamless loops, under AGPL-3.0. Its README does not say whether it runs on Apple Silicon [47].
- **Known weak spots:** thin edges such as hair, transparent objects, and areas that the camera move reveals and that must be filled in. These come from general descriptions in search results; no benchmark source.
- **Suggestion:** use parallax only on 1 or 2 hero shots with clear depth, and keep Ken Burns for the rest.

### Image-to-video

- `mlx-video` runs LTX-2 and Wan 2.2 on Apple Silicon [49].
- Community reports give several minutes per few-second clip on M-series Macs. One report says a Wan 2.2 GGUF clip took about 82 minutes per 2-second clip on an M1 Max [49] (secondary, single report).
- On your machine the `colab-video-studio` skill offers LTX-2.5 on a Colab GPU as another route [L, skill list].

### Music and tension

**Story structure** (secondary):

- Usual shape: hook, setup, escalation, reveal, close.
- Every line should change what the viewer believes.
- Calm narration with suspense music is the genre norm [89].

**Local music options:**

- **ACE-Step 1.5**: the model card says MIT, and generated music may be used commercially. It runs on an M2 MacBook Air with 16 GB, but slowly on MPS [86].
- **Stable Audio**: under the Community License it is free to self-host and use commercially for businesses under 1 million USD revenue [87].
- **YouTube's own library**: Shorts longer than 1 minute may only use royalty-free music from the YouTube Audio Library [50].

**Your stories today** have a drone bed at a fixed volume, plus boom, riser and heartbeat [L, STORIES.md]. There is no music.

### Hook in the first seconds

- I found **no primary study** behind the popular "2-second" rule. The numbers on vendor blogs have no traceable source [vendor results, not used].
- TikTok's official ad guidance: "Introduce your content proposition in the first 3 seconds" [52].
- YouTube Studio shows a "viewed vs swiped away" metric for Shorts. YouTube publishes no official "good" threshold (secondary) [53b].
- **Your example story already opens with the hook line on the title picture** ("Nine people got on the last train. Only eight got off.") [L]. Good.

### Platform policy

- **Inauthentic content.** Since 15 July 2025 the YouTube Partner Program calls this rule "inauthentic content". It targets mass-produced, repetitive uploads. AI voice is not banned, but template-made, near-duplicate videos risk losing monetization [57]. Your seeded variation rules help here.
- **Altered or synthetic content.** YouTube requires a disclosure for realistic altered or synthetic content, for example "a realistic-looking scene that never happened". Animation is exempt [58].
- UNCONFIRMED whether your painted reconstructions of real cases count as "realistic". Ticking the label for `case: "real"` stories is the safe choice.

---

## 6. Short-form vertical craft

### Length and counting

- YouTube Shorts can be up to **3 minutes** for square or vertical uploads after 15 October 2024 [50].
- Since 31 March 2025 every play and replay counts as a Shorts view. The old count lives on as "engaged views", which is what monetization uses [51].

### Safe zones, with numbers

| Platform | Keep clear | Source |
|---|---|---|
| TikTok | Top 240 px, bottom 660 px, 120 px each side. The button column is 180 px wide inside the right margin, from y = 840 down. Values from TikTok's ads template, scaled to 1080 x 1920 by a third party. | [53] (secondary) |
| Instagram Reels (Meta) | Top 14 % (about 270 px), bottom 35 % (about 670 px), 6 % each side. Said to be Meta's figures. | [54] (secondary) |
| Remotion | The "Social Safe Zones" overlay for Instagram and TikTok, measured from iOS screen captures of full-green test videos | [16] |

Caveat: platforms publish safe zones for ads; the normal feed UI can differ [53].

**Finding about your layouts** [L, kits and guides]:

- Sketch captions are centred at **y = 1440**, in the band 1380 to 1500.
- Story captions use the band **1330 to 1460**.
- Both bands are **inside TikTok's bottom 660 px (y > 1260)** and Meta's bottom 35 % (y > 1248).
- Text may also reach x = 1000 below y = 840, which is under TikTok's button column (x > 780).
- If you post to TikTok or Reels, the description text and the buttons can cover the captions.
- UNCONFIRMED for YouTube Shorts, whose bottom overlay I could not measure from a source.

### Captions

- Remotion's `createTikTokStyleCaptions()` groups words into pages. A low `combineTokensWithinMilliseconds` gives word-by-word display [9], [10].
- Word-by-word "karaoke" captions stop the reader from looking ahead [55].
- A vendor suggests the highlight should lead the audio by 50 to 100 ms [55] (vendor, not research).
- TikTok's ad guidance suggests "5-10 words per second when using text" [52].
- Your captions show 2 or 3 words at a time and follow word times [L, STORIES.md]. That fits.

### Loop endings

- A "sentence loop" ends with words that lead back into the first line, so a replay feels like a continuation.
- It must still make sense on the first watch [56] (secondary).
- Replays now count as views [51], so a loop has a measurable payoff. UNCONFIRMED whether it helps ranking.

### Pacing

- Your own rule is a new picture every 3 to 6 s.
- TikTok recommends transitions and graphics "to retain engagement" [52].
- I found no primary data for a better number.

---

## 7. Local TTS on Apple Silicon, October 2026

### Overview

| Model | Size | Licence | Spanish | Cloning | Notes | Source |
|---|---|---|---|---|---|---|
| **Kokoro v1.0** | 82M | Apache-2.0 (secondary) | Yes: voices `ef_dora`, `em_alex`, `em_santa`, **no grade and no training hours listed** | No | Spanish phonemes come from espeak through misaki. Word timestamps are computed only for English in the official `KPipeline`. Arena Elo 1063, rank 56. | [59], [60], [71], [72] |
| **Chatterbox** (Resemble) | 500M, Turbo 350M, Nano 110M | MIT | Multilingual V3 (23+ languages) plus **Spain-Spanish and Latin-American Spanish finetunes** | Yes | Every output carries the PerTh watermark (inaudible). The code accepts the `mps` device and ships `example_for_mac.py`. Arena Elo 1026. | [61], [71] |
| **Qwen3-TTS** | 0.6B, 1.7B | Apache-2.0 | Yes (10 languages) | Yes, 3 s, needs the reference transcript | Released 22 Jan 2026. VoiceDesign from a text prompt. Examples are CUDA only. Arena Elo 933. | [62], [71] |
| **VoxCPM2** | 2B | Apache-2.0 | Yes (30 languages) | Yes | 48 kHz output. **Real-time factor 1.76 on an M4 Pro** with llama.cpp, so slower than real time. | [63] |
| **Pocket TTS** (Kyutai) | 100M | Repo MIT; weights licence not stated | Yes | Yes, from a WAV file | About 6x faster than real time on a MacBook Air M4 CPU, using 2 cores | [65] |
| **Kyutai TTS / STT** (DSM) | not stated | STT weights CC-BY 4.0; TTS weights not stated | not stated | not stated | MLX version for Mac. The STT gives word timestamps. | [66] |
| **Higgs Audio v3** | about 4B | **Research and non-commercial** | 100+ languages | Yes | | [64] |
| **Higgs Audio v2** | 3.6B LLM plus 2.2B adapter | "other": UNCONFIRMED | | | | [64b] |
| **Voxtral TTS** (Mistral) | 4B | **CC BY-NC 4.0** | Yes (9 languages) | Open weights use preset voices only (secondary) | Released 26 Mar 2026 | [70] |
| **F5-TTS** | | Code MIT, **weights CC-BY-NC** | Unclear | Yes | | [67] |
| **Dia** (Nari) | 1.6B | Apache-2.0 | **English only** | Yes | Tested on GPU only. Dia2 was released "11/19". | [68] |
| **Orpheus** | Llama-3B backbone | Code Apache-2.0; weights licence not stated | Mainly English; multilingual research preview (Apr 2025) | Yes | Runs on vLLM, or llama.cpp without a GPU | [69] |
| **Fish Audio S2 and others** | | Open weights under a research licence (secondary, conflicting) | | | The arena lists "Fish Audio Drama 3 Preview" as the best open-weight model (Elo 1243). **Licence UNCONFIRMED.** | [71] |

### Notes on the table

- **Leaderboard.** The Artificial Analysis TTS arena is led by closed models: Eleven v4 (1330), Qwen-Audio-3.1-TTS-Plus and Gemini [71]. Among open models, Kokoro ranks above Chatterbox and Qwen3-TTS there. The arena is mostly English.
- **One way to run them all.** `mlx-audio` runs Kokoro, Qwen3-TTS, Chatterbox, VoxCPM2, Higgs v2 and v3, Dia, Voxtral TTS and others natively on Apple Silicon [72].
- **Speed of Kokoro on your Mac.** Your own guide says the first voice run takes "about half a minute for a two minute video", which is roughly 4x real time with `kokoro-onnx` [L, VIDEOS.md]. I did not find a public benchmark (UNCONFIRMED).
- **Spanish quality.** No source compares Spanish quality between these models. UNCONFIRMED. Kokoro's Spanish is the least documented part of your stack: no voice grade, espeak phonemes. Chatterbox has dedicated Spanish finetunes. Only an A/B test by ear can decide.

### Word timing

- **faster-whisper:**
  - CPU or CUDA only; no Metal [73];
  - `word_timestamps=True` [73];
  - Whisper's word times are derived, not forced. A secondary source says they can drift by hundreds of ms [76].
- **WhisperX** = faster-whisper plus VAD plus wav2vec2 **forced alignment** (Interspeech 2023) [76].
- **mlx-whisper** runs on Metal, with `word_timestamps=True` [74].
- **Qwen3-ForcedAligner-0.6B** [75]:
  - Apache-2.0;
  - 11 languages, including English and Spanish;
  - audio up to 5 minutes;
  - average alignment error on MFA-labelled data: **42.9 ms, against 133.2 ms for WhisperX and 129.8 ms for NFA**;
  - on English alone: 37.5 ms against 92.1 ms for WhisperX;
  - available in `mlx-audio` [72].
- **Kokoro's own durations.** The official `KPipeline` sets `start_ts` and `end_ts` per token from predicted durations, for English only [60]. Your project uses `kokoro-onnx`; UNCONFIRMED whether that package exposes durations.
- **Your `align.py`** runs faster-whisper "small" (int8, on CPU), then matches the heard words to the script words with difflib [L]. Because the text is known, a forced aligner is the right class of tool. Switch only if captions visibly drift.

---

## 8. Audio finishing

### Loudness targets

| Where | Target | Source |
|---|---|---|
| YouTube | Normalizes toward **-14 LUFS**. It turns loud uploads down and does **not** turn quiet ones up. Measured by the community; no official YouTube document found. | [80] (secondary) |
| Spotify | **-14 LUFS** (ITU 1770). True peak below -1 dBTP, or -2 dBTP if the master is louder than -14. | [77] |
| Apple Podcasts | **-16 LKFS ±1 dB**, true peak at most -1 dBFS (BS.1770-5). A recommendation, not enforced. | [78] |
| AES TD1008 (streaming) | Speech and mixed content -18 LUFS; music at most -16 LUFS | [79] (secondary summary) |
| TikTok, Instagram | No official target found | UNCONFIRMED |

### Your files today [L]

Measured with ffmpeg `ebur128` on four finished parts:

| Part | Integrated | Loudness range | True peak |
|---|---|---|---|
| `crime/01` | -16.2 LUFS | 2.1 LU | -1.4 dBFS |
| `bayes/01` | -16.1 LUFS | 2.2 LU | -1.5 dBFS |
| `body/01` | -15.9 LUFS | 1.9 LU | -1.5 dBFS |
| `fourier/01` | -15.9 LUFS | 2.4 LU | -1.5 dBFS |

- They are on your -16 target.
- On YouTube they will play about 2 dB quieter than content mastered at -14, because YouTube does not raise quiet uploads [80].

### Single pass versus two passes

- `stitch.sh` runs **one-pass** `loudnorm=I=-16:TP=-1.5:LRA=11` [L].
- In one pass, loudnorm runs in **dynamic mode**, a level-riding compressor. In dynamic mode, "the audio stream will be upsampled to 192 kHz" [81].
- Linear mode needs `measured_I`, `measured_LRA`, `measured_TP` and `measured_thresh` from a first pass [81].
- It falls back to dynamic if the target loudness range is below the source's, or if the gain would break the true-peak limit [82].
- Your loudness range of about 2 LU and peaks pinned at -1.5 fit dynamic levelling. It probably flattens the boom and riser accents a little. UNCONFIRMED by ear.

**Two-pass procedure:**

1. Run `loudnorm=I=..:TP=..:LRA=..:print_format=json -f null -`.
2. Feed `input_i`, `input_tp`, `input_lra`, `input_thresh` and `target_offset` back as `measured_*` and `offset`, with `linear=true`.
3. Check `normalization_type` in the output [82].

### Ducking music under the voice

- **In ffmpeg:** `sidechaincompress`. In ffmpeg 8.1.2 its defaults are threshold 0.125, ratio 2, attack 20 ms, release 250 ms [81, L].
- **Mix the result with `amix`.** Note that `amix` has `normalize=true` by default, which scales the inputs down [L].
- **A simpler route for you:** you already know every word's time (`timing.json`, `words`). You can set the music volume per frame in Remotion, low while a line plays and back up in gaps and at the reveal. This is deterministic and needs no compressor.
- UNCONFIRMED: the right depth of the dip. No primary source was found. A common rule of thumb is a bed 15 to 20 dB under the voice during speech.

---

## 9. Automatic quality control of the rendered video

### Contact sheets and a vision LLM

**Claude's vision limits** [83]:

- Claude 4.7 and later downscale any image whose long edge is over **2576 px**, or that has more than 4784 visual tokens. Older models downscale above 1568 px.
- Requests with more than 20 images have a stricter limit of 2000 px per side.
- Guidance: keep text legible; resizing "might make text less legible".

**Your sheets fit** [L]:

- Your sheets are 2160 x 1920 for both shapes: 2 x 4 tiles at half size, at most 8 tiles.
- So they are **not downscaled** on Opus 5.5.
- Keep them at or under 2576 px.

**A useful pattern** from video QA research [85]:

1. Pick frames by shot detection.
2. Send them to the vision model.
3. Pull more frames around anything unclear.

You do steps 1 and 2 by narration line. A fixed rubric in the guides would make the agent's review more consistent:

- Is the main thing recognisable?
- Is any text garbled?
- Does the picture match the line?
- Is anything cut by the frame?

### OCR

- `ocrmac` wraps Apple's Vision text recognition (`VNRecognizeTextRequest`) on macOS 10.15 and later. It returns text, confidence and a box with coordinates from 0 to 1 [84].
- **The best use for you:** flag **any** text in generated sketch or story art, because your guides forbid writing in pictures and today a human-style look catches it.
- Your DOM checks already cover text overflow before rendering, so OCR adds little there.

### ffmpeg detectors

Options of the local ffmpeg 8.1.2 [L], [81]:

| Filter | Defaults |
|---|---|
| `blackdetect` | `d` = 2 s, `pic_th` = 0.98, `pix_th` = 0.1 |
| `freezedetect` | noise `n` = 0.001, `d` = 2 s |
| `silencedetect` | noise `n` = 0.001 (about -60 dB), `d` = 2 s |

**My test** [L], on `freezedetect=n=0.001:d=5,blackdetect=d=0.5` plus `silencedetect=n=-45dB:d=1.5`:

- **Run time:** 1.3 to 4.4 s per part, 25 to 40 times faster than real time.
- **Story (`crime/01`) and sketch (`body/01`):** no flags.
- **Math (`bayes/01`):**
  - `blackdetect` flagged 4 stretches. All of them were **false positives**: scene openings on the dark background and the text-only recap. With `pix_th` 0.1, the dark navy counts as black.
  - `freezedetect` at `n=0.001` flagged 2 stretches of 5.6 s and 6.5 s. Looking at the frames, only small markers moved there, such as a ring moving through a grid.
  - At `n=0.0001` it flagged nothing.
- **Conclusion:**
  - `freezedetect=n=0.0001:d=5` is a cheap pixel-level cross-check of your DOM dead-stretch rule.
  - Use `blackdetect` only on the light upright types, or with a very low `pix_th`.
  - `silencedetect` catches lost audio.

### Speech check

- explainroo checks for "words the voice got wrong" [33].
- Your `align.py` already transcribes every clip and matches it to the script. Listing the script words Whisper did not hear, per line, gives this check for almost nothing.

---

## 10. Recommendations for you, in priority order

Effort: **S** is under an hour, **M** is about half a day, **L** is a day or more. "Shared code" means the kits, the engine, the scripts and the guides. Your CLAUDE.md says video agents must not edit them, so these are owner changes.

1. **Speech check in `align.py` (S).** Print the script words Whisper did not hear, per line, and fail above a small threshold.
   - *Why:* nobody listens before publishing. Kokoro misreads names, single letters and words with two readings, and your guide lists exactly these traps. The data is already computed.
   - *Tradeoff:* Whisper also mishears some correct words, so treat a flag as "listen to this line", not as proof.

2. **A QC gate on the finished file (S).** After the render, run these on each part:
   - `ffprobe`: the audio stream exists and the length is as expected;
   - `ebur128`: integrated loudness within ±1 LU of the target and true peak at or below -1;
   - `silencedetect=n=-45dB:d=1.5`;
   - `freezedetect=n=0.0001:d=5`;
   - `blackdetect` only for upright videos.

   *Why:* your checks run before rendering. They cannot see a failed image load, lost audio or an encode problem. *Tested:* thresholds and run time as in section 9.

3. **Check the vertical safe zones (S).** Your caption bands (y 1330 to 1500) sit inside the bottom areas that TikTok's and Meta's guides tell you to keep clear.
   - Render one stills pass with Remotion's Social Safe Zones overlay (needs 4.0.518 or later), or move the caption band up to about y 1080 to 1240.
   - *Tradeoff:* captions move closer to the drawing. The numbers come from ad templates and third parties, and YouTube Shorts is unmeasured.

4. **Upgrade Remotion 4.0.487 to 4.0.535 and move to `<Audio>` from `@remotion/media` (M).** Use the `/remotion-upgrade` skill.
   - *Why:* it is the recommended media stack, it is stable since 4.0.491, and it prepares you for v5. It also brings faster encoding (4.0.534), the safe-zone overlay and `@remotion/effects`.
   - *Watch:* volume callbacks become `useCurrentFrame()` plus `interpolate()`, and the `durationInFrames` versus `playbackRate` change.
   - *Test:* rebuild one video of each type and compare length, loudness and stills.

5. **Loudness (S).**
   - Choose -14 LUFS (the YouTube reference, also Spotify's) for videos, or knowingly keep -16. Keep podcasts at -16 (Apple).
   - Switch `stitch.sh` to two-pass linear `loudnorm` so the effects keep their punch, and log `normalization_type`.
   - *Tradeoff:* -14 needs more peak control; linear may fall back to dynamic.

6. **Spanish voice A/B (M).** Render 10 Spanish lines with Kokoro `em_alex`, Chatterbox Multilingual (Spain-Spanish finetune, MIT) and Qwen3-TTS (Apache) through `mlx-audio`. Judge by ear and with the speech check from item 1.
   - *Why:* Kokoro's Spanish has no published quality grade and uses espeak phonemes.
   - *Tradeoff:* the other models are bigger and slower, and Chatterbox adds an inaudible watermark.

7. **OCR on generated art (S).** Run `ocrmac` on each new image. Any text found triggers a redraw.
   - *Why:* it turns your "no writing in pictures" rule into a check.

8. **Story music bed with ducking timed to the words (M).**
   - Music from ACE-Step 1.5 (MIT model card), Stable Audio (Community License) or a royalty-free library.
   - Volume per frame from `timing.json`.
   - *Tradeoff:* music can bury the voice and fight your "silence is a sound too" rule. Try it on one story first.

9. **Sketch line boil (S to M).** Re-seed `wobble()` every 3 to 6 frames on finished marks, and use a low-amplitude displacement on the ink.
   - *Why:* a finished drawing stays alive without adding content. This helps your 5-second rule.
   - *Tradeoff:* it can look nervous, and the render cost is UNCONFIRMED.

10. **Math: stay on Remotion, and add two small things (S, then L).**
    - (a) A silent beat of about 1.5 to 2 s after the key result, and try Kokoro speed 0.9 to 0.95 on one dense video. Script-level, S.
    - (b) Only if a series needs it: equation morphing, either as a Remotion helper or as one Manim clip imported with `@remotion/media`. L.

11. **Story parallax on hero shots (M to L).** Depth Anything 3 Small or Base (Apache-2.0) gives a depth map, then a two-layer or displacement move in Remotion. Only if Ken Burns feels flat.
    - *Tradeoff:* warping at edges and extra render time.
    - Avoid DA3 Large and Giant (non-commercial).

12. **Agent skills (S).** Install the official Remotion skills, but use them for API lookups (`/remotion-docs`) and upgrades. Your guides stay the rulebook, because some skill advice differs from them (for example Bezier easing over springs).

13. **Not recommended now:**
    - Switching to HyperFrames, Motion Canvas or Revideo: high cost, little gain for your checks.
    - WhisperX: Qwen3-ForcedAligner is more accurate if you ever need an aligner.
    - Local image-to-video on the Mac: minutes per second of video. Use the Colab skill if you want it.

**Least certain parts of this report:**

- The safe-zone numbers (third-party, made for ads).
- Spanish TTS quality (no comparison exists).
- The OpenAI image model names. I saw them on OpenAI's live docs and in secondary news, but could not cross-check them a third way after the search budget ran out.

---

## Sources

**Remotion releases** (GitHub, release pages fetched 14 Oct 2026):

- [1a] https://github.com/remotion-dev/remotion/releases (v4.0.527 to v4.0.535)
- [1b] https://github.com/remotion-dev/remotion/releases?page=2 (v4.0.516 to v4.0.525)
- [1c] https://github.com/remotion-dev/remotion/releases?page=4 (v4.0.496 to v4.0.505)
- [1d] https://github.com/remotion-dev/remotion/releases?page=5 (v4.0.486 to v4.0.495)
- [1e] https://github.com/remotion-dev/remotion/releases?page=9 (v4.0.444 to v4.0.454)
- [1f] https://github.com/remotion-dev/remotion/releases?page=11 (v4.0.423 to v4.0.432)
- [1g] https://github.com/remotion-dev/remotion/releases?page=13 (v4.0.403 to v4.0.412)

**Remotion docs:**

- [2] https://www.remotion.dev/docs/ai/skills
- [3] https://remotion.dev/docs/ai/claude-code-plugin
- [4] https://www.remotion.dev/docs/media/
- [5] https://www.remotion.dev/docs/media/video
- [6] https://www.remotion.dev/docs/audio
- [7] https://www.remotion.dev/docs/effects/light-leak
- [8] https://remotion.dev/docs/light-leaks
- [9] https://remotion.dev/docs/captions/create-tiktok-style-captions
- [10] https://www.remotion.dev/docs/captions/displaying
- [11] https://remotion.dev/docs/5-0-migration
- [12] https://www.remotion.dev/docs/sfx
- [13] https://www.remotion.dev/docs/paths/evolve-path
- [14] https://www.remotion.dev/docs/hardware-acceleration
- [15] https://www.remotion.dev/docs/performance
- [16] https://www.remotion.dev/elements/overlays/social-safe-zones/
- [17] https://www.remotion.dev/docs/whisper-webgpu
- [18] https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md

**Alternatives:**

- [19] https://github.com/heygen-com/hyperframes
- [20] https://registry.npmjs.org/hyperframes/latest
- [21] https://github.com/midrender/revideo and https://github.com/midrender/revideo/commits/main/
- [22] https://github.com/motion-canvas/motion-canvas/releases
- [23] https://pypi.org/project/manim/
- [24] https://docs.manim.community/en/latest/changelog/0.22.0-changelog.html
- [25] https://docs.manim.community/en/stable/faq/installation.html
- [26] https://github.com/3b1b/manim/releases

**Explainer craft:**

- [27] https://www.3blue1brown.com/faq/
- [28] https://3blue1brown.com/blog/some1
- [29] https://www.stanforddaily.com/2020/01/24/3blue1brown-creator-grant-sanderson-15-talks-engaging-with-math-using-stories-and-visuals
- [30] https://www.antoinebuteau.com/lessons-from-grant-sanderson.md (secondary compilation of interviews)
- [31] https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-manim-video (secondary playbook)
- [32] https://services.dartmouth.edu/TDClient/1806/Portal/KB/PrintArticle?ID=171655 and https://digitalpractice.leeds.ac.uk/media-design-principles
- [33] https://github.com/vincentsch/explainroo
- [34] https://beginnersinai.org/remotion-vs-motion-canvas-vs-manim/ (secondary)

**Sketch and whiteboard:**

- [35] https://github.com/visioncortex/vtracer
- [36] https://dyn.manpages.debian.org/testing/autotrace/autotrace.1.en.html
- [37] https://aescripts.com/centerline/
- [38] https://help.videoscribe.co/support/discussions/topics/11000005884 and https://help.videoscribe.co/support/discussions/topics/11000017482
- [39] https://www.premiumbeat.com/blog/how-to-create-line-boil-animations/ and https://www.foxrenderfarm.com/share/what-is-squigglevision/
- [40] https://en.wikipedia.org/wiki/Whiteboard_animation and https://en.wikipedia.org/wiki/MinutePhysics
- [40b] https://hickstro.org/2012/01/13/digital-mentor-text-5-changing-education-paradigms/
- [41] https://gsap.com/community/drawsvg/

**Story videos:**

- [42] https://developers.openai.com/api/docs/guides/image-generation
- [43] https://thenewstack.io/gpt-images-2-5-sunburst-flare (secondary)
- [44] https://www.tigrisdata.com/blog/flux-kontext-vs-nano-banana/ and https://ltx.studio/blog/flux-vs-nano-banana (secondary)
- [45] https://github.com/ByteDance-Seed/Depth-Anything-3
- [46] https://venturebeat.com/ai/apple-releases-depth-pro-an-ai-model-that-rewrites-the-rules-of-3d-vision/
- [47] https://github.com/BrokenSource/DepthFlow
- [48] https://en.wikipedia.org/wiki/Ken_Burns_effect
- [49] https://github.com/Blaizzy/mlx-video and https://lilting.ch/en/articles/ltx2-wan22-mac-local-video-gen (secondary)

**Short-form platforms:**

- [50] https://support.google.com/youtube/answer/15424877
- [51] https://techcrunch.com/2025/03/26/youtube-is-changing-how-youtube-shorts-views-are-counted
- [52] https://ads.tiktok.com/resources/help/article/creative-best-practices
- [53] https://www.socialync.io/tools/safe-zones/tiktok (secondary)
- [53b] https://contentstudio.io/blog/youtube-shorts-analytics-guide (secondary)
- [54] https://www.hopperhq.com/blog/instagram-reel-size/ (secondary)
- [55] https://www.disabled-world.com/disability/accessibility/karaoke-captions.php and https://www.opus.pro/blog/youtube-shorts-caption-subtitle-best-practices (vendor)
- [56] https://faceless.so/blog/seamless-loop-video-tutorial-for-short-form-content (secondary)
- [57] https://www.plagiarismtoday.com/2025/07/08/youtube-targets-inauthentic-content/
- [58] https://support.google.com/youtube/answer/14328491

**TTS and alignment:**

- [59] https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
- [60] https://raw.githubusercontent.com/hexgrad/kokoro/main/kokoro/pipeline.py
- [61] https://github.com/resemble-ai/chatterbox
- [62] https://github.com/QwenLM/Qwen3-TTS
- [63] https://github.com/OpenBMB/VoxCPM
- [64] https://github.com/boson-ai/higgs-audio
- [64b] https://huggingface.co/bosonai/higgs-audio-v2-generation-3B-base
- [65] https://github.com/kyutai-labs/pocket-tts
- [66] https://github.com/kyutai-labs/delayed-streams-modeling
- [67] https://github.com/SWivid/F5-TTS
- [68] https://github.com/nari-labs/dia
- [69] https://github.com/canopyai/Orpheus-TTS
- [70] https://the-decoder.com/mistrals-first-open-weight-tts-model-voxtral-clones-voices-from-three-seconds-of-audio-across-nine-languages/
- [71] https://artificialanalysis.ai/text-to-speech/leaderboard (fetched 14 Oct 2026)
- [72] https://github.com/Blaizzy/mlx-audio
- [73] https://github.com/SYSTRAN/faster-whisper
- [74] https://github.com/ml-explore/mlx-examples/tree/main/whisper
- [75] https://huggingface.co/Qwen/Qwen3-ForcedAligner-0.6B and https://arxiv.org/pdf/2601.21337v2
- [76] https://modal.com/blog/choosing-whisper-variants (secondary)

**Audio finishing:**

- [77] https://support.spotify.com/us/artists/article/loudness-normalization/
- [78] https://podcasters.apple.com/support/audio-requirements
- [79] https://productionadvice.co.uk/td1008/ (secondary summary of AES TD1008)
- [80] https://meterplugs.com/blog/2019/09/18/youtube-changes-loudness-reference-to-14-lufs.html and https://workflow.frame.io/guide/loudness-for-youtube (secondary)
- [81] https://ffmpeg.org/ffmpeg-filters.html (loudnorm, sidechaincompress, blackdetect, freezedetect, silencedetect)
- [82] https://animethemes.moe/wiki/encoding/audio_normalization

**Quality control:**

- [83] https://platform.claude.com/docs/en/build-with-claude/vision
- [84] https://github.com/straussmaximilian/ocrmac
- [85] https://arxiv.org/pdf/2405.08813 (CinePile)

**Music and story structure:**

- [86] https://huggingface.co/ACE-Step/acestep-v15-base/blob/main/README.md and https://en.bioerrorlog.work/entry/ace-step-15-local-m2-macbook
- [87] https://stability.ai/explainers/stable-audio-vs-competitors-licensing-export-rights-and-self-hosting-compared
- [88] https://community.articulate.com/discussions/building-better-courses/narrator-rates (secondary)
- [89] https://async.com/blog/faceless-true-crime-youtube-channel (secondary)

**Local evidence [L]:**

- `ffmpeg -h filter=...` on ffmpeg 8.1.2.
- `ebur128` on four parts in `videos/*/parts/`.
- Freeze, black and silence detection on `crime/01`, `body/01` and `bayes/01`, with frames inspected.
- Read-only look at `VIDEOS.md`, `SKETCH.md`, `STORIES.md`, `scripts/` and `src/kits/`.
- No project files were changed.
