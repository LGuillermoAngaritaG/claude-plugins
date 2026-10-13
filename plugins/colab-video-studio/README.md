# Colab Video Studio

Plan, approve, and render AI video clips on Google Colab GPUs with MiniMax H3 or LTX-2.5. Clips save to Google Drive and come back into the chat. The GPU shuts itself down when the batch ends.

## Flow

1. Ask for a video. Claude asks which model if you didn't say.
2. Claude proposes the look and feel and a shot list with full prompts and a cost estimate.
3. You edit until you approve. Nothing runs before approval.
4. Claude connects to Colab, renders every shot on an L4, and saves them to `My Drive/claude_videos/<batch>/`.
5. The runtime unassigns itself when the batch finishes, fails, or runs past its time limit. Claude confirms it is gone.
6. Claude downloads the clips from Drive and shows them.

## Components

| Component | Purpose |
|---|---|
| Skill `generate-video-clips` | The plan-approve-render-deliver workflow |
| `references/runner.py` | Colab-side code: installs ComfyUI, downloads weights, renders in the background, writes status to Drive, unassigns the runtime |
| `references/models-and-prompting.md` | Model limits, defaults, cost estimates, prompt patterns |
| MCP `colab-mcp` | Google's official Colab MCP server; lets Claude add and run cells in a Colab tab |

## Requirements

- `uv` installed on your computer (`pip install uv`); the Colab MCP server runs through `uvx`.
- A Claude client that runs local MCP servers (Claude desktop app or Claude Code).
- Google account signed into Colab in your default browser, with Colab compute units or a paid plan for L4 access.
- Google Drive connector enabled in Claude, so it can fetch the finished clips.
- For LTX-2.5: accept the license at https://huggingface.co/Lightricks/LTX-2.5 and save a Hugging Face read token in Colab Secrets as `HF_TOKEN`.

## Licenses

- MiniMax H3: MiniMax H3 Community License. Its territory excludes the EU, UK, South Korea and the US. Colab servers usually run in the US. Read the license before use.
- LTX-2.5: LTX-2.x Community License.

## Known limits

- Not yet tested on a real Colab GPU. The workflows pass ComfyUI validation and `tests/test_runner.py` checks the runner's control flow with Colab stubbed out, but render times and memory use on an L4 are unmeasured.
- The background shutdown flushes Drive and calls `google.colab.runtime.unassign()` from a worker thread. If Colab ignores calls from threads, Claude's explicit `stop()` and the manual "Disconnect and delete runtime" remain as backups.
- Each batch re-downloads ~40 GB of weights (~5-10 min of GPU time).
