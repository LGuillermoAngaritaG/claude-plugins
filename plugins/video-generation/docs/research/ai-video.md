# Generative AI video: state of the art, October 2026

Research date: 2026-10-14. Written for a Mac (Apple Silicon) + Google Colab GPU setup that today runs
LTX-2.5 (22B distilled, INT8, on an L4), Chatterbox (Turbo + Multilingual), Stable Audio 3 Small SFX,
ACE-Step 1.5 XL turbo, Codex/gpt-image for pictures and Kokoro for narration [82].

How to read this:

- Numbers in brackets like [23] point to the source list at the end. Each source has a URL and a date when one was found.
- **UNCONFIRMED** means I could not check the number or fact against a primary or reliable source.
- "via search summary" in the source list means I only saw the page through a search-engine summary, not the full page. Treat those facts as weaker.
- Leaderboards move every few weeks. The Artificial Analysis (AA) numbers below were read on 2026-10-14.
- Limits of this report: the shared web-search budget ran out near the end. I could not do a second pass on
  open music models other than ACE-Step and Stable Audio (YuE, DiffRhythm, SongBloom and others), on Orpheus,
  IndexTTS2 and CosyVoice for Spanish, on Runway's own Gen-4.5 spec page (its help center returned 403), or on
  Luma and Pika official pricing.

---

## 1. Which video models lead today

### 1.1 The leaderboards disagree, but the same names come back

- **AA text-to-video (with audio), read 2026-10-14** [1]: 1 Wan 3.0 (Alibaba, closed, Elo 1173), 2 Utopai X (1166, no API),
  3 Seedance 2.5 (ByteDance, 1159), 4 MiniMax H3 768p (**open weights**, 1158), 5 MiniMax H3 Max (1156),
  6 FLUX 3 (Black Forest Labs, 1145), 7 Seedance 2.0 (1138), 8 Gemini Omni Flash 1.1 (Google, 1132) ...
  16-17 Kling 3.0 (1000-1020), 20-22 Veo 3.1 / Fast / Lite (952-968), 23-24 **LTX-2.5 Fast / Pro (open weights, 951 / 948)**.
- **AA image-to-video, read 2026-10-14** [2]: 1 **MiniMax H3 768p (open, 1141)**, 2 Seedance 2.5 (1139), 3 Gemini Omni Flash 1.1 (1134),
  4 Wan 3.0 (1127) ... 10 **MAGI-2 Preview (open, 1046)** ... 20 **LTX-2.5 Fast (985)**, 22 LTX-2.5 Pro (957), 23-24 LTX-2.3 (889-903).
- **AA silent image-to-video** (FAQ only) lists NVIDIA Cosmos3-Super-Image2Video as an open-weights entry (Elo 1253-1275) [2].
- **LLM Stats** (blind votes, page says updated 2026-10-14) puts Kling v3 first (1934), Happy Horse 1.0 second, Seedance 2.0 Fast third [3].
  Different voters and prompts give a different order. Use the boards as a shortlist, not a verdict.
- Note: AA ranks the **hosted** LTX-2.5 Fast/Pro API. Whether the open checkpoints match the hosted quality is UNCONFIRMED.

### 1.2 Closed models

Price per second is the AA "1 minute of 1080p on the creator's API, default settings" figure divided by 60 [1],
unless a different source is named. Runway's API sells most of these models with one key at $0.01 per credit [9].

| Model (maker) | Released | Max clip | Max resolution | Native audio | Image-to-video / control | API price per second | Notes |
|---|---|---|---|---|---|---|---|
| **Gemini Omni Flash 1.1** (Google), `gemini-omni-1.1-flash` | Aug 2026 [1] | 3-10 s (third-party; official page shows extension of +3-10 s up to 40 s total) [7] | 360p, 720p, 1080p and 4K (the last two upscaled) [7] | Yes [7] | Image, first+last frame, multi-turn editing, extension [7] | about $0.10/s at 720p (token price $17.50 per 1M, 5,792 tokens/s) [5]; Runway: 10 / 15 / 30 credits per s for 720p / 1080p / 4K [9] | Google calls it the default video model; Veo stays for extension and last-frame control [84]. Editing of **uploaded** video is not available in the EEA, Switzerland or UK [7]. |
| **Veo 3.1 / Fast / Lite** (Google) | Jan 2026, Lite Mar 2026 [6] | 4, 6 or 8 s; extension +7 s up to 20 times, 148 s total (720p only) [6] | 4K (Standard, Fast); 1080p (Lite) [6] | Always on [6] | Image, first+last frame, up to 3 reference images (not Lite) [6] | Standard $0.40 (720p/1080p), $0.60 (4K); Fast $0.10 / $0.12 / $0.30; Lite $0.05 / $0.08 [5] | No free tier [5]. 1080p, 4K, references and extension need 8 s clips [6]. |
| **Sora 2 / Sora 2 Pro** (OpenAI) | - | - | - | - | - | **API removed 2026-09-24, no replacement** [8] | Do not build on it. |
| **Kling 3.0 / Kling O3** (Kuaishou) | Feb 2026 [1] | 3-15 s [10][11] | Native 4K [11] | Optional [10] | Image, multi-shot prompts (up to 6 shots per fal) [10][12]; O3 adds image and video references [10] | Via Runway: 3.0 Pro 12 credits/s silent, 17 with audio ($0.12 / $0.17); 4K 43 ($0.43) [9]. Kuaishou direct: 12 credits/s at 1080p with audio; dollar rate UNCONFIRMED [11] | First on LLM Stats [3], mid-table on AA [1]. |
| **Seedance 2.5** (ByteDance) | Jul 2026 [1] | Up to 30 s [10] | 1080p [10] | Yes [10] | Text, image, video, large reference budget [10] | AA: about $0.57/s at 1080p [1]; Runway: 20 / 30 / 68 credits per s for 480p / 720p / 1080p [9] | Seedance 2.0 (Mar 2026) still sold; up to 4K [9]. BytePlus own token pricing UNCONFIRMED. |
| **Wan 3.0** (Alibaba, closed) | Public beta 2026-08-06, wide launch about 2026-08-24 [14] | 2-30 s [10] | 1080p [10] | Native [10] | Image, video and audio references [10] | AA: $0.20/s at 1080p [1]; Runway: 5 / 10 / 20 credits per s (480p / 720p / 1080p) [9] | **No open weights.** Open Wan stops at 2.2 [37][40]. |
| **MiniMax H3 / Hailuo 3.0** (MiniMax) | 2026-07-31 [20] | 4-15 s [18] | 2K via API; the open release is 768p short side [18] | Stereo, 32 kHz [18] | 0, 1 or 2 images (first/last frame); Ref2VA up to 9 images plus video and audio refs [18] | AA: about $0.08/s (768p) [1]; Runway: 10 / 15 credits per s (768p / 2K), +2 per reference [9] | Open weights, but see license (section 7). |
| **FLUX 3 video** (Black Forest Labs) | Announced 2026-07-23 [13] | Up to 20 s [13] | 720p at launch; 1080p claims conflict (UNCONFIRMED) [13] | Yes, same pass [13] | Image, keyframes, continuation, multi-scene [13] | AA: about $0.29/s [1] | Open weights "to follow" (not released as far as I found) [13]. |
| **HappyHorse 1.0 / 1.1** (Alibaba-ATH) | Apr / Jun 2026 [1] | 3-15 s [10] | 1080p [9] | Native [10] | - | AA 1.1: about $0.18/s [1]; Runway 15 / 30 credits per s (720p / 1080p) [9] | |
| **Grok Imagine Video 1.5** (listed as SpaceXAI) | May 2026 [1] | 15 s (third-party) [4] | 1080p [9] | Yes [10] | Image references, audio-driven performance [10] | AA: $0.25/s [1]; Runway 10 / 16 / 29 credits per s [9] | Lite version: 2 / 3 / 14 credits per s [9]. |
| **Runway Gen-4.5** (Runway) | - | 2-10 s (third-party, UNCONFIRMED) [17] | 720p (third-party, UNCONFIRMED) [17] | No (third-party, UNCONFIRMED) [17] | Text, image [10] | 12 credits/s = $0.12/s [9] | Runway's value today is the API that bundles many vendors [9][10]. |
| **Luma Ray3.2** (Luma) | - | 5 or 10 s steps | 1080p, HDR at extra cost | - | - | UNCONFIRMED: 720p 5 s $0.30, 1080p 5 s $1.20 (third-party) [15] | Luma's own public page still showed Ray2 prices [15]. |
| **Pika 2.2** (Pika) | - | - | - | - | - | UNCONFIRMED | No "Pika 3" found. In Aug 2026 Pika launched a low-markup multi-model API [16]. Not in AA top 25 [1]. |
| Others in AA top 25 | | | | | | AA $/s at 1080p [1] | Utopai X (no API), SkyReels V4 ($0.35), Agnes-Video-2.5 ($0.04), PixVerse V6 ($0.115), Vidu Q3 Pro ($0.12) [1] |

### 1.3 Open-weight models

Colab GPU facts used below (Chris McCormick's measured table, updated 2026-03-10) [46]:
T4 = 15 GB usable, no bf16, 1.19 units/h (about $0.12/h); L4 = 22.5 GB, 1.71 units/h (about $0.17/h);
A100 40 GB = 5.40 units/h (about $0.54/h); A100 80 GB = 7.52 units/h (about $0.75/h);
G4 = RTX PRO 6000 Blackwell, about 96 GB, 8.71 units/h (about $0.87/h); H100 80 GB = rate not measured [46].

| Model | Released | Size | Max clip | Resolution | Audio | I2V and control | License (short) | VRAM evidence | Colab fit | Mac fit |
|---|---|---|---|---|---|---|---|---|---|---|
| **LTX-2.5** dev + distilled (Lightricks) | 2026-08-11 [27] | 22B, text encoder Gemma 4 12B [27] | No limit stated for open weights; examples 121 frames (about 5 s at 24 fps); optional duration predictor [23][26]. Hosted Fast: 2-20 s; Pro: 2-10 s [26] | Native 4K via 2x spatial upscaler; up to 50 fps [26][25] | Yes, joint audio + video [23] | T2V, I2V (images at any frame index), first/last frame template, keyframe interpolation, audio-to-video, retake, video-to-video, multi-shot [25][26][27] | LTX-2 Community License, free under $10M yearly revenue [23] | bf16 transformer about 42 GB; int8 distilled about 21.5 GB; 22.67 GiB total measured on a 24 GB RTX 4090 for 5 s clips; 10 s clips can fail at VAE decode on 24 GB (all second-hand) [31]. NVFP4 needs Blackwell [23]. Full download about 66 GiB [25] | **Yes.** L4 works for 5 s with int8 (your own test: 2.0-3.1 min per 5 s clip) [82]. A100 80 GB, H100 or G4 give room for bf16 and longer clips. T4: not practical (15 GB, no bf16) [46] (my inference) | MLX port exists (dgrauet/ltx-2.5-mlx, about 35 GB per transformer file); speed UNCONFIRMED [36] |
| **LTX-2.3** (Lightricks) | Mar 2026 [1] | 22B | - | - | Yes | Many IC-LoRAs [24] | Same as LTX-2.5 | - | Yes | - |
| **MiniMax H3** (MiniMax) | Weights 2026-08 (license dated 2026-08-02) [19] | 33B dense, of which about 13B in AdaLN branches skippable for inference [18] | 4-15 s [18] | 768p short side (2K stage not open) [18] | Stereo 32 kHz [18] | First/last frame (FL2VA), up to 9 reference images (Ref2VA) [18] | Community License, **not valid in EU, UK, South Korea, USA** [19] | Card: no figure, example uses 4 GPUs [18]. Comfy-Org int8 build about 42.5 GB (second-hand) [21]. "FreeVideo" claims 8 GB, but runs a different derivative checkpoint (VDN-H3) [22] | A100 80 GB / H100 / G4 likely (UNCONFIRMED) | Not checked |
| **Wan 2.2** T2V-A14B, I2V-A14B, TI2V-5B, S2V-14B, Animate-14B (Alibaba) | Jul-Sep 2025; Animate-2-14B Jul 2026 [37] | 14B MoE (A14B), 5B dense [38] | TI2V-5B: 5 s at 720p 24 fps [38] | 480p / 720p [38] | No (S2V turns speech into video) [38] | I2V, first/last frame workflow [81], Animate (character replace) [38] | Apache 2.0 [38] | A14B: "at least 80 GB" on one GPU (official); TI2V-5B: about 24 GB with offload [38] | TI2V-5B on L4; A14B on A100 80 GB / H100. 4-step distill LoRAs exist (Apache) [39] | MLX port (mlx-video); one M1 Max GGUF test: 82 min for a 2 s clip [47] |
| **Wan 2.5 / 2.6 / 2.7 / 3.0** | 2026 | - | - | - | - | - | **API only, no weights.** Hugging Face Wan-AI org has only 2.1 and 2.2 [37][40] | - | - | - |
| **HunyuanVideo 1.5** (Tencent) | 2025-11-18 [42] | - | - | - | No | I2V | Tencent license, **not valid in EU, UK, South Korea** [43] | Claims conflict: 14 GB with FP8 + offload vs 80 GB+ (UNCONFIRMED) [30] | - | - |
| **MAGI-2 Preview** (Sand.ai) | 2026-08-05 [44] | 114B MoE [44] | 10 s only [44] | 512x896, refiner to 1088x1920 [44] | Yes [44] | I2V [44] | Apache 2.0 [44] | 8 Hopper GPUs; about 307 GB repo [44] | **No** | No |
| **Cosmos3-Super-Image2Video** (NVIDIA) | 2026-05-31 [45] | 64B [45] | 5-400 frames, default 189 [45] | 256p-720p [45] | Unclear for this variant [45] | I2V [45] | OpenMDW 1.1, "ready for commercial use" [45] | 8x H100 / A100 recommended; offload suggested for smaller GPUs [45] | Not practical on one GPU (my inference) | No |
| CogVideoX 1.5, Mochi, Open-Sora | 2024-2025 | - | - | - | No | - | Apache 2.0 (CogVideoX, Open-Sora per LTX blog) [30] | CogVideoX-1.5 40 GB+ [30] | Old; not on current boards [1] | - |

**Short answer for Q1:** quality leaders today are Wan 3.0, Seedance 2.5, MiniMax H3, FLUX 3 and Gemini Omni Flash
[1][2]. Veo 3.1 and Kling 3.0 are no longer on top of AA but are mature and well documented [1]. Sora's API is gone [8].
In open weights, MiniMax H3 is clearly ahead on quality, then MAGI-2 (too big for Colab), then LTX-2.5 [1][2].

---

## 2. Best open-weight choice for your Colab setup

**Keep LTX-2.5. Do not switch to Wan 2.x. Improve how you use it.**

Why:

1. It is still the best open model you can legally use in most places **and** that fits one Colab GPU **and** makes
   sound in the same pass [1][23][26]. Its own maker says no other open model in its comparison does joint audio or
   multi-shot [30] (vendor claim).
2. MiniMax H3 is better on both AA boards (T2V 1158 vs 951; I2V 1141 vs 985) [1][2], but its license does not apply
   in the EU, UK, South Korea or USA [19]. If you work from Spain or anywhere in the EU, you cannot use the weights.
   I do not know your location: please confirm. Its full stack is also about twice as heavy (about 42.5 GB int8) [21].
3. Wan 2.2 is Apache 2.0 (clean license) but it is from 2025, has no sound, and is not in the AA top 25 [1][38].
   Newer Wan versions are closed [37][40].
4. MAGI-2 and Cosmos3 need 8 data-center GPUs [44][45].

What to change inside LTX-2.5 (exact names from the model card and README):

| Item | Today [82] | Suggested | Why / source |
|---|---|---|---|
| Checkpoint | `ltx-2.5-22b-distilled` INT8 (ComfyUI) on L4 | Test `ltx-2.5-22b-distilled-transformer-bf16` on A100 80 GB or G4 (96 GB); test NVFP4 distilled on G4 (Blackwell only) | int8 nearly fills 24 GB (22.67 GiB measured on a 4090) [31]; NVFP4 needs Blackwell [23]; G4 is Blackwell with 96 GB [46] |
| GPU cost check | L4, 1.71 units/h | G4 costs about 5x L4 per hour (8.71 vs 1.71 units/h) [46], so it is only cheaper per clip if it is more than 5x faster. **UNCONFIRMED: measure one 5 s shot on each.** | [46] |
| Clip length | 5 s, longer untested | Try 8-10 s on a bigger GPU; keep 5 s on L4. One RTX 5090 test: 10 s at 720p worked with int8, 15 s ran out of memory (second-hand) [32] | [31][32] |
| Image-to-video | Untested on L4 | Test it; make it the default for shots that must match | Your lesson: text does not hold a face or a room [82] |
| First/last frame | Not wired | Add the official LTX-2.5 FLF2V ComfyUI template | [26] |
| Consistency | None | Try IC-LoRA `LTX-2.5-22b-IC-LoRA-Ingredients` (reference sheet) | [34] |
| Clean-up passes | 2x latent upscaler | Try IC-LoRAs `Refine-Details`, `Restore`, `Pixel-Spatial-Upscaler`, `Deblur` (all Sept 2026) | [24] |
| Old LTX-2.3 LoRAs | - | They do **not** work on 2.5: files are not interchangeable | [25] |
| Text encoder | Gemma 4 12B | An int8 "convrot" version exists if memory is tight | [27] |

---

## 3. Prompting technique for video models

### 3.1 Official guides

| Model | Guide | Date |
|---|---|---|
| LTX-2 / 2.5 | https://ltx.io/blog/prompting-guide-for-ltx-2 [29] | 2026-08-04 |
| Veo 3.1 | https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1 [48]; API notes in [6] | 2025-10-15 |
| Gemini Omni Flash | Prompt tips inside https://ai.google.dev/gemini-api/docs/omni [7] | read 2026-10-14 |
| Wan (2.2 to 3.0) | https://www.alibabacloud.com/help/en/model-studio/text-to-video-prompt [41] | updated 2026-10-11 |
| Runway Gen-4 | https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide [49] (I could not open it: HTTP 403) | - |
| Kling 3.0 | No official kling.ai guide found; best available is fal's guide https://blog.fal.ai/kling-3-0-prompting-guide/ [12] | 2026-02-05 |

### 3.2 A structure that works across models

The guides agree on the parts, not on the order:

- Veo: **[Cinematography] + [Subject] + [Action] + [Context] + [Style and ambiance]** [48].
- Wan: basic **Entity + Scene + Motion**; advanced adds **Aesthetic control + Stylization**; image-to-video is only
  **Motion + Camera movement** because the picture already gives subject, scene and style [41].
- LTX: one flowing paragraph of **4 to 8 sentences**, present tense, style named early, covering shot, setting and light,
  action, characters, camera move, and audio. Say how the frame looks **after** the camera move [29].

A merged template (fits LTX and your existing pattern [82]):

```
<Style anchor, same words in every shot.> <Shot size and lens>, <subject with 2-3 visible details>
<one action, present tense>. <Setting and named light source>. The camera <one move> and ends on <final framing>.
Audio: <ambience>. SFX: <one or two sounds>. <Dialogue in quotes, with language and tone, or "No dialogue.">
```

### 3.3 Camera and motion words

- Camera moves: dolly, tracking, crane, aerial, slow pan, POV [48]; push in, pull out, pan, tilt up, orbit
  (keep arcs under 45 degrees), fixed camera [41]; "slow dolly in", "handheld tracking", "over-the-shoulder" [29].
- Shot size and angle: wide, close-up, extreme close-up, low angle, two-shot [48]; eye-level, high, top-down,
  over-the-shoulder, aerial [41].
- Lens and light words (Wan list): soft / hard / side / rim / back light; dawn, sunset, night; long-focus,
  wide-angle, fisheye, tilt-shift; warm / cool tones, low saturation, high contrast [41].
- Pace: slow motion, time-lapse, freeze-frame, sudden stop [29].
- Multi-shot: Veo accepts timestamped segments like `[00:00-00:02] ...` in one prompt [48]; Wan wants
  "Shot 1 [0-3 s]" plus an overall description first [41]; Kling 3.0 wants each shot labeled with framing,
  subject and motion [12]; Omni accepts timecodes like "[0-3s]" and "single continuous shot", "No scene cuts" [7].
- Dialogue: put words in quotes; name language or accent; describe ambience, SFX and speech separately [29][48].
  Kling: use fixed character labels, describe the action before the line, give each speaker a tone label, and
  use linking words like "immediately" between turns [12].
- Image-to-video: describe only the change (motion and camera), not the picture again [41][82].

### 3.4 Negative prompts

- Google: describe what you want instead of "no X" ("a desolate landscape with no buildings" rather than
  "no man-made structures") [48].
- The LTX and Wan guides have no negative-prompt section [29][41]. Wan 3.0/2.7 support "No dialogue." and
  "No background music." inside the prompt [41].
- LTX IC-LoRA card suggests: "worst quality, inconsistent motion, blurry, jittery, distorted" [34].
- The LTX-2.5 **distilled** model runs with a fixed CFG of 1 [23]. With CFG 1, a classic negative prompt normally
  has no effect. **My inference, UNCONFIRMED for LTX's pipeline:** do not spend time tuning negatives on the
  distilled model; fix the positive prompt instead.

### 3.5 What fails

- More than one action per 5 s clip: beats get dropped (your own first batch) [82]; overloaded scenes and
  too many instructions [29].
- Readable text, signs and logos [29][41].
- Fast twisting or chaotic motion (jumping, juggling), complex physics [29].
- Inner states without visible cues ("sad", "confused") [29].
- Conflicting light sources [29]; light named differently between shots causes color drift [82].
- Rapid scene changes inside one clip; exact lip-sync to precise words (Wan) [41].
- Framing words that the model ignores ("over the shoulder" came out as a side view): use a first frame [82].
- Real people by name [41].

---

## 4. Consistency across clips

From most to least reliable, for your stack:

1. **Image-to-video from a keyframe for every shot.** The picture fixes face, room, palette and framing. This is the
   advice of the Wan and Runway-style guides [41] and your own finding [82].
2. **First + last frame.** Draw both ends with gpt-image, then let the video model fill the middle.
   Available in LTX-2.5 (official FLF2V template) [26], Veo 3.1 (`image` + `lastFrame`) [6], Gemini Omni [7],
   MiniMax H3 (FL2VA) [18], Wan 2.2 (FLF2V workflow) [81]. Both frames must match in color, or the jump shows [81].
3. **Reference images ("ingredients").** Veo 3.1: up to 3 images of one subject, 8 s only, not on Lite [6].
   MiniMax H3 Ref2VA: up to 9 images [18]. Wan 3.0/2.7: refer to uploads as "Image 1", "Video 1" [41].
   LTX-2.5: the **Ingredients IC-LoRA** takes one reference sheet (faces, body turnarounds, props, one location
   panel on black), trained at 768x448, 121 frames, 24 fps; it drifts when panels are small or crowded [34].
4. **LoRAs.** LTX-2.5 dev is fully trainable with `ltx-trainer` (LoRA, IC-LoRA, full fine-tune) [23][25].
   A character LoRA needs a training run on a big GPU; I found no official minimum dataset size (UNCONFIRMED).
5. **Text discipline.** Keep the style anchor and character description word-for-word identical across shots
   [12][82]; name the light the same way [82].

Keyframe and edit models (AA image editing board, read 2026-10-14) [50]:

| Model | Rank / Elo | Released | Open | Notes |
|---|---|---|---|---|
| GPT Image 2.5 "Sunburst" / "Flare" (max) | 1 / 1198, 2 / 1178 | Sep 2026 | No | Top of the board [50] |
| MAI-Image-2.6 (Microsoft) | 3 / 1151 | Aug 2026 | No | [50] |
| Nano Banana 2.1 (Google) | 4 / 1150 | Oct 2026 | No | GA 2026-10-06; up to 14 reference images; $0.0336 per 1K image (via search summary) [51] |
| GPT Image 2 (high) | 6 / 1131 | Apr 2026 | No | `gpt-image-2`, launched about 2026-04-21; edit endpoint takes several reference images (max differs by source: 5 to 16, UNCONFIRMED) [54] |
| Qwen-Image-2.1 (Alibaba) | 19 / 1079, best open | Sep 2026 | Yes | Up to 10 reference images; **Qwen Research License** (commercial terms not stated, treat as UNCONFIRMED) [53] |
| Qwen-Image-Edit-2511 | not in top 40 shown | Dec 2025 | Yes | Apache 2.0 [53] |
| FLUX.2 [klein] 4B / 9B | 9B rank 38 / 1011 | Jan 2026 | Yes | 4B Apache 2.0, 9B non-commercial for local use; up to 4 references; about 13 GB (4B) and 24 GB (9B) (via search summary) [52] |

Takeaway: your Codex/gpt-image path is already on the top model family for edits [50]. Use it to make one
**reference sheet** per character/product and then **edit** that sheet into each keyframe, instead of drawing each
keyframe from text. Flux Kontext was not re-checked; Black Forest Labs' current open image family is FLUX.2 [52].

---

## 5. Finishing

### 5.1 Upscaling and restoration

| Tool | Type | Facts | Source |
|---|---|---|---|
| LTX-2.5 latent upscalers | Open, same stack | Spatial 2x and temporal 2x latent upscalers ship with LTX-2.5; you already use the spatial one | [27][82] |
| LTX-2.5 IC-LoRAs | Open | Pixel-Spatial-Upscaler, Refine-Details, Restore, Deblur, Decompression, SDR-To-HDR (Aug-Sep 2026) | [24] |
| **SeedVR2** 3B / 7B (ByteDance) | Open, Apache 2.0 | ComfyUI node v2.5.24 (2025-12-24): FP16 at 24 GB+, FP8 at 12-16 GB, GGUF Q4 at 8 GB or less with BlockSwap; BlockSwap not on macOS; Comfy-Org repack 2026-06-06 | [55] |
| SeedVR2 caveat | - | A vendor says it can over-sharpen lightly degraded 720p AI clips; 1080p+ needs much more GPU (vendor estimate) | [56] |
| FlashVSR | Open | One-step streaming 4x; about 17 fps at 768x1408 on one A100 (paper claim, via vendor) | [56] |
| Topaz Video (Starlight) / Astra | Closed | Starlight = local diffusion upscaler; Astra = cloud creative upscaler; prices conflict ($299/yr Video Personal in one source), UNCONFIRMED | [57] |
| Magnific Video Upscaler (via Runway) | Closed | $0.007 / $0.009 / $0.012 per output frame at 720p-1K / 2K / 4K | [9] |

### 5.2 Frame interpolation

- LTX-2.5 open weights go up to 50 fps natively and ship a temporal 2x upscaler [26][27], so you may not need
  interpolation for LTX clips.
- ComfyUI-Frame-Interpolation 1.0.11 (2026-03-22) has RIFE, FILM and others [58].
- RIFE 4.25/4.26: default, fastest. FILM: better on large motion. GIMM-VFI (separate kijai node): holds fast or
  cluttered motion better, but about 3-6x slower in one community test [58].
- Community tip: interpolate before upscaling [58].

### 5.3 Lip sync and talking avatars

Open:

| Model | Facts | Source |
|---|---|---|
| LTX-2.5 own pipelines | `A2VidPipelineTwoStage` makes video from an input audio file; `DubItPipeline` re-says lines with lip matching | [25] |
| **InfiniteTalk** (MeiGen) | Apache 2.0; built on Wan2.1-I2V-14B-480P; 480p/720p; dubbing (video-to-video) and image-to-video; quality holds about 1 min before color shift; fp8 and low-VRAM mode; released 2025-08-19 | [59] |
| **LongCat-Video-Avatar 1.5** (Meituan) | MIT; released 2026-05-21; audio+text(+image) to video, continuation, multi-person; 480p/720p; int8 and 8-step distill options; examples use 2 GPUs | [59][60] |
| Wan2.2-S2V-14B / Animate | Apache 2.0; 80 GB class on one GPU | [38] |
| MuseTalk / LatentSync | Edit only the mouth on existing footage; MuseTalk fast (256x256 face, 30+ fps); LatentSync sharper, slower | [61] |

Closed:

| Service | Price | Source |
|---|---|---|
| sync.so | lipsync-2 $0.04-0.05/s; lipsync-2-pro $0.067-0.083/s; sync-3 $0.107-0.133/s; react-1 $0.133-0.167/s | [62] |
| Runway Act-Two | 5 credits/s ($0.05/s) | [9] |
| HeyGen | Creator $29/month; separate API wallet from $5; per-minute API cost UNCONFIRMED | [63] |
| Hedra | $15-75/month API plans; a Sept 2026 increase to $100 is reported but conflicting (UNCONFIRMED) | [63] |
| OmniHuman 1.5 (ByteDance) | Reseller prices only, $0.045-0.25/s (UNCONFIRMED) | [63] |

Also: models with native audio (Veo, Kling, Seedance, Omni, LTX, MiniMax H3) already make characters speak
in the same pass [6][7][10][18][23]. For your narrated (voice-over) videos you may not need any lip sync.

### 5.4 Extending clips

- Veo 3.1: +7 s per step, up to 20 steps, 148 s total, 720p only; voice may stop if absent from the last second [6].
- Gemini Omni: extend generated or uploaded clips by 3-10 s, up to 40 s total; extension only appends [7].
- Single long shots without extension: Wan 3.0 up to 30 s, Seedance 2.5 up to 30 s, FLUX 3 up to 20 s,
  LTX-2.5 Fast (hosted) up to 20 s [10][13][26].
- LTX-2.5 open: `KeyframeInterpolationPipeline` (in-between keyframes), `RetakePipeline` (redo a time region of
  an existing video), multi-shot in one generation [25][27].

### 5.5 Stitching without jumps

Sourced:

- LTX Studio's "extend" conditions the next segment on the last frame of the previous one [81].
- End each clip on a readable pose, not mid-action; using 2-5 frames from the last second as references reduces
  flicker and identity drift; text-only continuation drifts in style and light (third-party guide) [81].
- First/last-frame models treat both end frames as fixed, so any color mismatch between them shows [81].

Practice (my suggestions, not sourced):

- Plan cuts, not one long take. A hard cut between two shots that share a keyframe style looks normal; a forced
  continuous move across 4 clips usually drifts.
- When you must continue a shot, export the exact last frame, use it as the next first frame, and drop the duplicated
  frame at the join.
- Color-match each new segment to the previous one (histogram match or one shared LUT) before the edit.
- Let ambience audio cross the cut (crossfade 0.3-0.5 s) to hide small visual jumps.

---

## 6. Generative audio for video

### 6.1 Text-to-speech and voice cloning

AA TTS arena, read 2026-10-14 [64]: closed models lead (Eleven v4 / v4 Turbo 1328-1330, Qwen-Audio-3.1-TTS-Plus 1300,
Cartesia Sonic 3.6, Gemini 3.8 Flash TTS). Open-weight positions: Fish Audio Drama 3 Preview #10 (1243),
Breeze TTS 2 #11 (1221), Fish Audio S2 Pro #35, Voxtral TTS #45, **Kokoro 82M v1.0 #56 (1063)**, Higgs Audio V3 #69,
**Chatterbox #76 (1026)** [64]. The arena is mostly English; it says nothing about Spanish.

| Model | Released | License | Spanish | Cloning | Size / VRAM | Notes | Source |
|---|---|---|---|---|---|---|---|
| **Kokoro 82M v1.0** | 2025-01-27 | Apache 2.0 | 3 voices: ef_dora, em_alex, em_santa | No | 82M, runs on Mac | Own docs: non-English "may be absent or thin" | [68] |
| **Chatterbox Multilingual V3** (Resemble AI) | 2025-2026 | MIT | Yes, 23 languages | Yes, zero-shot | 0.5B | **PerTh watermark on every file**; reference clip should match the language or the accent leaks | [65] |
| **Chatterbox es-ES and es-MX/LatAm fine-tunes** | 2026-04-22 | MIT | Spain and Latin America | Yes | about 2.14 GB checkpoint | Single-language fine-tunes "for tighter quality control"; no metrics published | [65] |
| Chatterbox Turbo / Flash | 2025-12 / 2026-05 | MIT | Flash: English only | Yes | Flash: about 9x real-time; RTF 0.78 on an M4 Mac with MLX | Flash is a block-diffusion speed-up | [65] |
| **Qwen3-TTS** 0.6B / 1.7B (Base, CustomVoice, VoiceDesign) | 2026-01-21 | Apache 2.0 | Yes (10 languages) | Yes, from about 3 s (needs transcript) | 1.7B | Self-reported: best speaker similarity in Spanish, slightly worse word error than MiniMax and ElevenLabs in Spanish | [67] |
| **VoxCPM2** (OpenBMB) | 2026-04 | Apache 2.0 | Yes (30 languages) | Yes, plus voice design from text | 2B, about 8 GB VRAM; RTF 0.30 on RTX 4090 | 48 kHz output | [66] |
| Higgs Audio v3 (Boson AI) | 2026-06-04 | **Non-commercial** weights | Yes (about 100 languages, claim) | Yes | 4B | Commercial needs separate license | [71] |
| Fish Audio S2 Pro | 2026 | **Fish Audio Research License (non-commercial)** | Yes (80+ languages, claim) | Yes | - | Commercial use needs a deal | [69][74] |
| Fish Audio Drama 3 Preview | Oct 2026 | UNCONFIRMED (probably same research license) | - | - | - | #10 on AA with HF icon | [64] |
| Voxtral TTS (Mistral) | Mar 2026 | **CC BY-NC 4.0** | Yes (9 languages) | Hosted API yes; open weights may be fixed voices only | 4B, one 16 GB GPU (claim) | | [70][74] |
| F5-TTS | 2024-2025 | **CC-BY-NC** weights (Emilia data); code MIT | - | Yes | - | Fine-tuning does not remove the NC limit (maintainer, second-hand) | [72] |
| Breeze TTS 2 | Aug 2026 | Non-commercial (one blog, UNCONFIRMED) | - | Yes | - | #11 on AA | [64][74] |
| Dia2 1B / 2B (Nari Labs) | 2025-2026 | Apache 2.0 (secondary) | Not confirmed; Dia 1.6B was English only | - | - | | [73] |
| Orpheus, IndexTTS2, CosyVoice 3 | - | Not checked (search budget) | - | - | - | - | - |

**Spanish verdict:** no independent Spanish benchmark covers these models. The commercial-safe candidates with
Spanish are Chatterbox Multilingual (plus the es-ES / es-MX fine-tunes), Qwen3-TTS and VoxCPM2 [65][66][67].
Kokoro's Spanish is thin by its own docs [68]. Run your own A/B on three Spanish lines.

### 6.2 Sound effects and video-to-audio

| Model | Facts | License for ads | Source |
|---|---|---|---|
| LTX-2.5 native audio | Video and sound in one pass; you already get it on every clip | LTX license | [23][82] |
| **Stable Audio 3 Small SFX** (Stability) | Released May 2026; 0.6B on the card; "less than a few seconds" on an M4 MacBook Pro (claim); Small and Medium are open, Large (2.7B) is API-only | Community License: commercial use only under $1M yearly revenue; you own outputs | [77][78] |
| **MMAudio** | Video-to-audio; about 6 GB VRAM; 8 s default | **Weights CC-BY-NC 4.0: not for ads** | [75] |
| **HunyuanVideo-Foley** (Tencent) | 48 kHz; XL model 2025-09-29 with offload; self-reported ahead of MMAudio and ThinkSound; independent comparison is mixed | Tencent Hunyuan Community License (check territory; other Tencent licenses exclude EU/UK/KR) | [76][43] |
| LTX-2.3 Foley V2A LoRA | Freezes your video and adds SFX; clips up to about 7 s; seed-sensitive; LTX-2.3 only (not 2.5) | Part of training data CC BY-NC-SA: be careful for ads | [35][25] |
| ThinkSound | Public release weaker than its paper in third-party tests | - | [76] |

### 6.3 Music

| Model | Facts | License | Source |
|---|---|---|---|
| **ACE-Step 1.5** (Jan 2026) and **1.5 XL** base / sft / turbo (Apr 2026; diffusers Jun 2026) | XL = 4B DiT; VRAM tiers: 12 GB (offload + int8), 16 GB (offload), 20 GB (no offload), 24 GB (full XL + 4B LM); card rates XL sft and turbo "Very High" quality, base "High"; vocals in 50+ languages (developer claim, Spanish untested); no ACE-Step 2 found | MIT; card: "Generated music can be used for commercial purposes"; trained on licensed / royalty-free / synthetic data (claim) | [79] |
| Stable Audio 3 Medium | 1.4B; up to 6:20; no vocals or lyrics (review) | Stability Community License (under $1M revenue) | [77][78] |
| Others (YuE, DiffRhythm, SongBloom...) | Not checked (search budget) | - | - |

You already run ACE-Step 1.5 XL turbo and Stable Audio 3 Small SFX [82]: both are current.

---

## 7. Licensing and commercial use (can we use the output in ads?)

Not legal advice. Read the license file of the exact checkpoint you download.

| Model | License | Ads OK? | Catches | Source |
|---|---|---|---|---|
| **LTX-2.5 / 2.3** | LTX-2 Community License (text dated 2026-01-05) | **Yes**, if your whole company group earns under $10M a year | Outputs: "Licensor claims no rights in the Output" (s.5). Attachment A para 5: do not place machine-generated content in any context "without expressly and intelligibly disclaiming" that it is machine generated, so **label ads as AI-generated**. Para 7: no deepfakes of people without consent. Para 20: no use in a product that "directly competes" with Lightricks. Over $10M: paid license; breach = double fees. Restrictions must flow down to your users. | [33][23] |
| **Wan 2.2** (and InfiniteTalk, built on Wan 2.1) | Apache 2.0 | **Yes** | Authors claim no rights over generated content; usual "no illegal or harmful content" list | [38][59] |
| **MiniMax H3** | MiniMax H3 Community License (2026-08-02) | **Only outside EU, UK, South Korea and USA** | Over $20M revenue needs written OK; commercial products must show the "MiniMax H3" name in the UI; AUP requires disclosure of machine-generated public content; no training other models on outputs; Hong Kong law | [19] |
| HunyuanVideo 1.5 | Tencent Hunyuan Community License | **Not in EU, UK, South Korea** | Third-party summaries mention a 100M MAU cap and no training on outputs (UNCONFIRMED) | [43] |
| MAGI-2 Preview | Apache 2.0 | Yes | Too big for Colab anyway | [44] |
| Cosmos3-Super-I2V | OpenMDW 1.1 | Card says "ready for commercial" use | Too big for Colab | [45] |
| Qwen-Image-Edit-2511 / FLUX.2 klein 4B | Apache 2.0 | Yes | klein 9B and FLUX.2 dev: non-commercial for local use | [53][52] |
| Qwen-Image-2.1 | Qwen Research License | **Treat as no** until you read it (UNCONFIRMED) | | [53] |
| SeedVR2 | Apache 2.0 | Yes | | [55] |
| LongCat-Video-Avatar 1.5 | MIT | Yes | | [60] |
| Kokoro | Apache 2.0 | Yes | | [68] |
| Chatterbox (all) | MIT | Yes | Inaudible PerTh watermark in every file; only clone voices you have rights to | [65][82] |
| Qwen3-TTS / VoxCPM2 | Apache 2.0 | Yes | Voice-clone consent still applies | [67][66] |
| ACE-Step 1.5 / XL | MIT | Yes (card says so explicitly) | | [79] |
| Stable Audio 3 Small / Medium | Stability AI Community License | **Yes under $1M yearly revenue**; above that, Enterprise license | You own outputs; AUP applies | [78][77] |
| MMAudio, F5-TTS, Voxtral TTS, Higgs v3, Fish S2 Pro | Non-commercial | **No** | | [75][72][70][71][69] |
| LTX-2.3 Foley V2A LoRA | LTX license, but part of data CC BY-NC-SA | Risky | | [35] |

Law, not license: since **2026-08-02** the EU AI Act Article 50 requires a visible or audible disclosure on
deepfakes (realistic content that falsely looks authentic), at first exposure; machine-readable marking by
providers has a grace period to 2026-12-02 for systems already on the market [80]. If you publish in the EU,
an "AI-generated" label on realistic ads covers both this and LTX para 5.

Closed APIs: each vendor's terms apply; I did not review them for this report.

---

## 8. Recommendations, in priority order

1. **Keep LTX-2.5 as the default video model.** Reason: best open model that makes sound, fits one Colab GPU, and
   is free for companies under $10M [1][23][33]. MiniMax H3 is better but its license excludes the EU/UK/US/KR [19];
   Wan 2.2 is older and silent; newer Wan is closed [37][38]. Revisit if MiniMax changes the territory clause.

2. **Run one GPU cost test.** Same 5 s shot on L4 (int8, today), A100 80 GB (bf16 distilled) and G4 96 GB (bf16 or
   NVFP4 distilled). Keep the cheapest per finished clip. Reason: on 24 GB the int8 model barely fits and 10 s clips
   can fail [31]; G4 costs about 5x the L4 per hour, so it must be more than 5x faster to win [46] (speed UNCONFIRMED).

3. **Make keyframe-first the default for any shot that must match another.** gpt-image draws one reference sheet per
   character or product, then edits it into start (and end) frames; LTX-2.5 runs I2V or the FLF2V template.
   Then test the Ingredients IC-LoRA [34]. Reason: text alone does not hold identity [82]; GPT Image 2.x leads
   image editing [50]. Test I2V on your notebook first: it is still untested on L4 [82].

4. **Spanish voices: load the Chatterbox es-ES and es-MX fine-tunes** (same `chatterbox-tts` package, MIT) and
   A/B them against Qwen3-TTS 1.7B Base and VoxCPM2 on three Spanish lines. Keep Kokoro for English. Reason:
   Kokoro's Spanish is thin by its own docs [68]; the fine-tunes are small and free [65]; Qwen3-TTS and VoxCPM2 are
   Apache 2.0 with Spanish [66][67].

5. **Add a finishing pass, cheapest first:** LTX IC-LoRA Refine-Details / Pixel-Spatial-Upscaler (same stack) [24],
   then SeedVR2 3B FP8 (Apache) [55] if you need sharper 1080p/4K. Skip frame interpolation unless you need 50/60 fps;
   LTX can render 48-50 fps itself [26].

6. **Prompt changes (free):** one action per 5 s; style anchor and light names identical across shots; describe only
   motion and camera in I2V; dialogue in quotes with language; "No dialogue." when you will add narration;
   do not tune negative prompts on the distilled model (CFG 1) [23][29][41][82].

7. **Keep Stable Audio 3 Small SFX and ACE-Step 1.5 XL turbo.** Both are the newest versions I found [77][79].
   Optionally try XL **sft** for higher music quality [79]. Do **not** add MMAudio for client or ad work (NC weights) [75].
   Watch the Stability $1M revenue cap [78].

8. **Use closed APIs only for hero shots,** through one key (Runway API) or direct: Gemini Omni Flash 1.1 (about $0.10/s
   at 720p) or Veo 3.1 Fast ($0.10-0.12/s) for cheap tests; Wan 3.0 or Seedance 2.5 for single 30 s shots [5][9][10].
   Never build on Sora: its API ended on 2026-09-24 [8].

9. **Lip sync only if you need on-screen speakers:** try LTX-2.5's audio-to-video pipeline first (same model) [25],
   InfiniteTalk (Apache) second [59], sync.so (from $0.04/s) for quick paid fixes [62].

10. **Compliance for ads:** add a visible "AI-generated" label (LTX para 5, EU AI Act Art. 50) and keep a small table of
    which model and license made each asset [33][80].

11. **Mac:** keep video generation on Colab. Local video on Apple Silicon is still slow (one M1 Max needed 82 min for
    a 2 s Wan clip; LTX MLX ports exist but have no published speed) [36][47]. Audio can run locally: Kokoro,
    Chatterbox Flash (English, MLX) and Stable Audio 3 Small [65][68][77].

---

## Sources

All read on 2026-10-14 unless another date is given. "via search summary" = seen only through a search engine summary.

1. Artificial Analysis, Text-to-Video leaderboard (with audio). https://artificialanalysis.ai/video/leaderboard/text-to-video
2. Artificial Analysis, Image-to-Video leaderboard. https://artificialanalysis.ai/video/leaderboard/image-to-video
3. LLM Stats, Best AI for video creation (page says updated 2026-10-14). https://llm-stats.com/leaderboards/best-ai-for-video-creation
4. VideoGen, Best AI video models (data retrieved Aug 2026). https://videogen.io/best-ai-video-models
5. Google, Gemini API pricing (last updated 2026-10-14). https://ai.google.dev/gemini-api/docs/pricing
6. Google, Veo 3.1 in the Gemini API. https://ai.google.dev/gemini-api/docs/veo
7. Google, Gemini Omni Flash docs. https://ai.google.dev/gemini-api/docs/omni
8. OpenAI, Deprecations, entry "2026-03-24: Sora 2 video generation models and Videos API" (shutdown 2026-09-24). https://developers.openai.com/api/docs/deprecations
9. Runway API, Pricing. https://docs.dev.runwayml.com/guides/pricing/
10. Runway API, Models. https://docs.dev.runwayml.com/guides/models/
11. Kling, Kling 3.0 credit cost guide (2026-07-28). https://kling.ai/blog/kling-video-3-0-credit-cost-guide
12. fal, Kling 3.0 Prompting Guide (2026-02-05). https://blog.fal.ai/kling-3-0-prompting-guide/
13. The Decoder, FLUX 3 video GA; getimg FLUX 3 explainer (Jul-Aug 2026, via search summary). https://the-decoder.com/black-forest-labs-makes-flux-3-video-generally-available-and-claims-it-beats-seedance-2-0/ ; https://getimg.ai/blog/flux-3-all-you-need-to-know-black-forest-labs-video-ai-model
14. The Next Web, Alibaba launches Wan3.0 (Aug 2026, via search summary). https://thenextweb.com/news/alibaba-wan3-video-model-after-share-sale
15. WaveSpeed, Luma AI pricing 2026 (via search summary). https://wavespeed.ai/blog/cost-and-billing/luma-ai-pricing/
16. Las Vegas Sun, Pika API (2026-08-04, via search summary). https://lasvegassun.com/news/2026/aug/04/pika-cuts-ais-3x-markup-to-nearly-zero-with-a-10-a/
17. Krea, Runway Gen-4.5 page (via search summary). https://www.krea.ai/models/runway/prompt-gallery
18. MiniMax, MiniMax-H3 model card. https://huggingface.co/MiniMaxAI/MiniMax-H3
19. MiniMax H3 Community License Agreement (2026-08-02). https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE
20. Hugging Face community blog, MiniMax H3 (Hailuo 3.0) explained (Aug 2026). https://huggingface.co/blog/ResterChed/minimax-h3-hailuo-3-0
21. Atlas Cloud, MiniMax H3 open weights 42.5 GB (via search summary). https://www.atlascloud.ai/blog/tips/minimax-h3-open-source-weights
22. ComfyUI Wiki, FreeVideo: MiniMax H3 on 8 GB (Sep-Oct 2026). https://comfyui-wiki.com/en/news/2026-10-04-freevideo-h3
23. Lightricks, LTX-2.5 model card. https://huggingface.co/Lightricks/LTX-2.5
24. Hugging Face API, Lightricks models by date (IC-LoRAs Jun-Sep 2026). https://huggingface.co/api/models?author=Lightricks&sort=createdAt&direction=-1&limit=30
25. Lightricks, LTX-2 GitHub README. https://github.com/Lightricks/LTX-2
26. Comfy blog, LTX-2.5 Day-0 support (2026-08-12). https://blog.comfy.org/p/ltx-25-day-0-support-in-comfyui
27. ComfyUI Wiki, LTX-2.5 release (2026-08-11). https://comfyui-wiki.com/es/news/2026-08-11-ltx-2-5-open-weights-release
28. LTX, LTX-2.5 model page. https://ltx.io/model/ltx-2-5
29. LTX, Prompting guide for LTX-2 (2026-08-04). https://ltx.io/blog/prompting-guide-for-ltx-2
30. LTX, Open source video generation models guide (2026-08-12, vendor-written). https://ltx.io/blog/open-source-video-generation-models-guide
31. RunAIHome, LTX-2.5 local hardware guide (2026-08-19; numbers second-hand). https://runaihome.com/blog/ltx-2-5-local-ai-video-hardware-guide-2026/
32. TrueNorthAI (note.com), RTX 5090 hands-on with LTX-2.5 (via search summary). https://note.com/truenorthai/n/nf600b6190507
33. LTX-2 Community License Agreement text (dated 2026-01-05; mirror) and official copy. https://scancode-licensedb.aboutcode.org/ltx-2-cla-2026.LICENSE ; https://huggingface.co/Lightricks/LTX-2.3/blob/main/LICENSE
34. Lightricks, LTX-2.5-22b-IC-LoRA-Ingredients card (Sep 2026). https://huggingface.co/Lightricks/LTX-2.5-22b-IC-LoRA-Ingredients
35. Lightricks, LTX-2.3-22b-LoRA-Foley-V2A card (Jul 2026). https://huggingface.co/Lightricks/LTX-2.3-22b-LoRA-Foley-V2A
36. dgrauet, ltx-2.5-mlx. https://huggingface.co/dgrauet/ltx-2.5-mlx
37. Hugging Face API, Wan-AI models by date. https://huggingface.co/api/models?author=Wan-AI&sort=createdAt&direction=-1&limit=30
38. Wan-Video, Wan2.2 GitHub README. https://github.com/Wan-Video/Wan2.2
39. Hugging Face API, lightx2v Wan2.2 distill / Lightning models. https://huggingface.co/api/models?author=lightx2v&search=Wan2.2
40. HowAIWorks, The newest Wan you can download is still Wan 2.2 (2026, via search summary). https://howaiworks.ai/blog/alibaba-wan-open-weights-stopped-at-2-2
41. Alibaba Cloud Model Studio, Wan text-to-video prompt guide (updated 2026-10-11). https://www.alibabacloud.com/help/en/model-studio/text-to-video-prompt
42. Hugging Face API, Tencent HunyuanVideo models. https://huggingface.co/api/models?search=hunyuanvideo&author=tencent&sort=createdAt&direction=-1&limit=20
43. HunyuanVideo-1.5 license copy (2025-11-21, third-party mirror, via search summary). https://gitserver.onethingai.com/ai-models/HunyuanVideo-1.5/commit/b4a1193832a4730c6a393a2a9a80541b63680df0
44. Sand.ai, MAGI-2-preview card; ComfyUI Wiki news (2026-08-05). https://huggingface.co/sand-ai/MAGI-2-preview ; https://comfyui-wiki.com/en/news/2026-08-05-magi-2-preview
45. NVIDIA, Cosmos3-Super-Image2Video card (2026-05-31). https://huggingface.co/nvidia/Cosmos3-Super-Image2Video
46. Chris McCormick, Colab GPUs features and pricing (table updated 2026-03-10). https://mccormickml.com/2024/04/23/colab-gpus-features-and-pricing/
47. Lilting, LTX-2 vs Wan 2.2 on M1 Max 64GB (via search summary). https://lilting.ch/en/articles/ltx2-wan22-mac-local-video-gen
48. Google Cloud blog, The ultimate prompting guide for Veo 3.1 (2025-10-15). https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1
49. Runway, Gen-4 Video Prompting Guide (could not open, HTTP 403). https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide
50. Artificial Analysis, Image Editing leaderboard. https://artificialanalysis.ai/image/leaderboard/editing
51. AI Weekly and Origami, Nano Banana 2.1 (Oct 2026, via search summary). https://aiweekly.co/alerts/googles-nano-banana-21-halves-image-prices-on-gemini-36-flash ; https://origami.sa/en/blog/nano-banana-2-1-price-per-image/
52. BFL help, FLUX.2 [klein] guide; VentureBeat (Jan 2026, via search summary). https://help.bfl.ai/articles/8642316687-flux-2-klein-fast-generation-guide ; https://venturebeat.com/technology/black-forest-labs-launches-open-source-flux-2-klein-to-generate-ai-images-in
53. Hugging Face API, Qwen-Image models; Qwen-Image-2.1 card. https://huggingface.co/api/models?author=Qwen&search=Qwen-Image&sort=createdAt&direction=-1&limit=15 ; https://huggingface.co/Qwen/Qwen-Image-2.1
54. fal, gpt-image-2 edit; APIYI launch note (Apr 2026, via search summary). https://fal.ai/models/openai/gpt-image-2/edit ; https://docs.apiyi.com/en/news/gpt-image-2-launch.md
55. Hugging Face API, SeedVR models; numz ComfyUI-SeedVR2 node README. https://huggingface.co/api/models?search=SeedVR&sort=downloads&direction=-1&limit=10 ; https://github.com/numz/ComfyUI-SeedVR2_VideoUpscaler
56. Upsampler, SeedVR vs FlashVSR (2026, vendor, via search summary). https://upsampler.com/blog/seedvr-vs-flashvsr-ai-video-super-resolution-2026
57. MyArchitectAI, Topaz pricing; Creative AI News, Topaz April 2026 models (via search summary). https://www.myarchitectai.com/blog/topaz-ai-pricing ; https://www.creativeainews.com/blog/topaz-labs-next-gen-six-ai-models-april-2026/
58. ComfyUI-Frame-Interpolation; Comfy Cloud node list; kijai GIMM-VFI; comfy.icu GIMM node (via search summary). https://github.com/Fannovel16/ComfyUI-Frame-Interpolation ; https://comfy.org/cloud/supported-nodes/comfyui-frame-interpolation.md ; https://github.com/kijai/ComfyUI-GIMM-VFI ; https://comfy.icu/node/GIMMVFI_interpolate
59. MeiGen-AI, InfiniteTalk GitHub. https://github.com/MeiGen-AI/InfiniteTalk
60. Meituan, LongCat-Video-Avatar-1.5 card. https://huggingface.co/meituan-longcat/LongCat-Video-Avatar-1.5
61. MuseTalk paper; Pixazo open lip-sync roundup (via search summary). https://arxiv.org/abs/2410.10122v2 ; https://www.pixazo.ai/blog/best-open-source-ai-lip-sync-models
62. sync.so, Billing docs. https://sync.so/docs/product/billing
63. Arcade (HeyGen pricing), CostBench (Hedra change, Sep 2026), muapi (OmniHuman 1.5) (via search summary). https://www.arcade.software/post/heygen-pricing ; https://costbench.com/changelog/hedra-api-price-increase-2026-09/ ; https://muapi.ai/ko/playground/omnihuman-1-5
64. Artificial Analysis, Text-to-Speech leaderboard. https://artificialanalysis.ai/text-to-speech/leaderboard
65. Resemble AI on Hugging Face: model list, Chatterbox card, es-ES fine-tune, chatterbox-flash. https://huggingface.co/api/models?author=ResembleAI&sort=createdAt&direction=-1&limit=20 ; https://huggingface.co/ResembleAI/chatterbox ; https://huggingface.co/ResembleAI/Chatterbox-Multilingual-es-es ; https://huggingface.co/ResembleAI/chatterbox-flash
66. OpenBMB, VoxCPM2 card. https://huggingface.co/openbmb/VoxCPM2
67. Qwen, Qwen3-TTS-12Hz-1.7B-Base card (created 2026-01-21). https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base
68. hexgrad, Kokoro-82M card and VOICES.md. https://huggingface.co/hexgrad/Kokoro-82M ; https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
69. Fish Audio, S2 Pro card; "What we mean by open source for S2" (via search summary). https://huggingface.co/fishaudio/s2-pro ; https://fish.audio/blog/what-we-mean-by-open-source-for-s2/
70. The Decoder and Slator, Voxtral TTS (Mar 2026, via search summary). https://the-decoder.com/mistrals-first-open-weight-tts-model-voxtral-clones-voices-from-three-seconds-of-audio-across-nine-languages/ ; https://slator.com/mistral-text-to-speech-model/
71. Boson AI, Higgs Audio README; Creative AI News (Jun 2026, via search summary). https://cdn.jsdelivr.net/gh/boson-ai/higgs-audio@main/README.md ; https://www.creativeainews.com/articles/higgs-audio-v3-tts-4b-100-languages-voice-chat-2026/
72. SWivid, F5-TTS model card (via search summary). https://huggingface.co/SWivid/F5-TTS
73. PyTorch Korea, Dia2 (via search summary). https://discuss.pytorch.kr/t/dia2-nari-labs-tts-1b-2b/8349
74. Pinggy, Best open source self-hosted TTS 2026 (Aug 2026, via search summary). https://pinggy.io/blog/best_open_source_self_hosted_text_to_speech_models/
75. hkchengrex, MMAudio GitHub. https://github.com/hkchengrex/MMAudio
76. Tencent, HunyuanVideo-Foley card; paper and Stability "Foley Control" comparison (these two via search summary). https://huggingface.co/tencent/HunyuanVideo-Foley ; https://arxiv.org/pdf/2508.16930 ; https://stability-ai.github.io/foleycontrol.github.io/
77. Stability AI, stable-audio-3-small-sfx card (May 2026); The Decoder and Dubspot review on Stable Audio 3 (via search summary). https://huggingface.co/stabilityai/stable-audio-3-small-sfx ; https://the-decoder.com/stability-ai-launches-stable-audio-3-0-with-up-to-six-minute-tracks-and-open-weights/ ; https://blog.dubspot.com/stable-audio-3-review
78. Stability AI, License page. https://stability.ai/license
79. ACE-Step on Hugging Face: model list; 1.5 XL base card; GIGAZINE (2026-02-04). https://huggingface.co/api/models?author=ACE-Step&sort=createdAt&direction=-1&limit=20 ; https://huggingface.co/ACE-Step/acestep-v15-xl-base ; https://gigazine.net/gsc_news/en/20260204-ace-step-music-generation
80. Baker McKenzie and Greenberg Traurig on EU AI Act Article 50 (Jun-Aug 2026, via search summary). https://connectontech.bakermckenzie.com/new-eu-guidance-on-ai-transparency-what-should-companies-be-doing-from-2-august-2026 ; https://www.gtlaw.com/en/insights/2026/6/deepfakes-chatbots-ai-generated-text-european-commission-details-transparency-obligations-under-the-ai-act
81. Extending and first/last frame: Magic Hour, LTX blog, Comfy Wan 2.2 FLF2V workflow (via search summary). https://magichour.ai/blog/how-to-extend-a-video-with-ai ; https://ltx.io/blog/how-to-extend-ai-videos ; https://comfy.org/workflows/video_wan2_2_14B_flf2v-7016f027bcf1/
82. Your own Colab Video Studio notes (L4 measurements, Oct 2026). /Users/guille/.claude/plugins/cache/guille-plugins/colab-video-studio/0.2.0/skills/generate-video-clips/references/models-and-prompting.md
84. Google, Video generation overview (updated 2026-06-30). https://ai.google.dev/gemini-api/docs/video
