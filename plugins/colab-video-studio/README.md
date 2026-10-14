# Colab Video Studio

Generate AI video, speech, sound effects and music on a Google Colab GPU, driven by Claude from your terminal. You run one notebook; it starts a key-protected server. Claude plans with you, renders, downloads the results to your computer and shuts the GPU down.

| Model | Makes |
|---|---|
| LTX-2.5 | Video from text, or from a first-frame picture |
| Chatterbox | Speech, with voice cloning. Turbo for English, multilingual for 23 languages |
| Stable Audio 3 Small SFX | Sound effects |
| ACE-Step 1.5 XL turbo | Music |

## Flow

1. Ask for a clip, a voice line, a sound or a track. Claude proposes prompts and a cost estimate.
2. You approve. Nothing renders before approval.
3. You open `notebook.ipynb` in Colab, run its cell on an L4 and give Claude the `URL` and `KEY` it prints.
4. Claude loads one model at a time, renders, and downloads the files.
5. Claude kills the runtime when you are done. It also stops by itself after 20 idle minutes, and always after 5 hours.

## Components

| Component | Purpose |
|---|---|
| Skill `generate-video-clips` | The plan, approve, render, kill workflow |
| `notebook.ipynb` | One cell that starts the server on Colab |
| `references/server.py` | Colab side: installs ComfyUI and serves `/status`, `/load`, `/unload`, `/kill` and a pass-through to ComfyUI, all behind the key |
| `references/studio.py` | Your side: `connect`, `status`, `load`, `run`, `unload`, `kill` |
| `references/workflows/` | One ComfyUI workflow per kind of output |
| `references/assembling.md` | Lessons for turning clips into a finished video: draw screens in code, keep a person the same, pacing, sound |

## Requirements

- Python 3 on your computer. The client uses only the standard library.
- A Google account with Colab compute units or a paid plan for L4 access.
- For LTX-2.5: accept the license at https://huggingface.co/Lightricks/LTX-2.5 and save a Hugging Face read token in Colab Secrets as `HF_TOKEN`, with notebook access on.

## Known limits

- The URL comes from a free Cloudflare quick tunnel. It changes every session.
- Every generator has run once on a real L4 (October 2026). Quality is not tuned: one test item each.
- `unload` frees the memory a moment after it answers, not at once.
- `tests/test_studio.py` runs the server and the client against a fake ComfyUI on localhost. It checks the control flow, not the models.
- The weights are downloaded again in every Colab session (LTX: about 3.5 minutes).
- Anyone who has both the URL and the key can use the GPU until the runtime stops.

## Licenses

- LTX-2.5: LTX-2.x Community License.
- Stable Audio 3: Stability AI Community License. Commercial use is allowed under $1M yearly revenue.
- ACE-Step 1.5 and Chatterbox: MIT.
- Read each license before commercial use.
