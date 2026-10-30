#!/bin/bash
# Creates or updates a video workspace: a folder where videos are written, voiced and rendered.
# It copies this plugin's workspace/ into it (the engine, the look files, the scripts, the sound
# effects and the fonts), then checks the tools. Your own files (src/videos/, videos/, public/art/,
# public/audio/, out/) are never touched.
# Usage: workspace.sh <folder>           lists what would change, and what is missing
#        workspace.sh <folder> --apply   copies it, runs npm install and makes the Python venv
set -euo pipefail
src="$(cd "$(dirname "$0")/../workspace" && pwd)"
dst="${1:?usage: workspace.sh <folder> [--apply]}"
apply=$([ "${2:-}" = --apply ] && echo 1 || true)
[ -n "$apply" ] && mkdir -p "$dst"

n=0
while read -r f; do
  if [ ! -e "$dst/$f" ]; then echo "new      $f"
  elif ! cmp -s "$src/$f" "$dst/$f"; then echo "changed  $f"
  else continue; fi
  n=$((n + 1))
  case "$f" in .claude/agents/*) agents=1 ;; esac
  if [ -n "$apply" ]; then mkdir -p "$dst/$(dirname "$f")"; cp "$src/$f" "$dst/$f"; fi
done < <(cd "$src" && find . -type f ! -name .DS_Store ! -path '*/__pycache__/*' | sed 's|^\./||' | sort)
echo "$n file(s) $([ -n "$apply" ] && echo copied || echo 'would change; run again with --apply to copy them')"
# Claude Code loads the helper agents when a session starts: one already open keeps the old ones, or none.
[ -n "${agents:-}" ] && echo "helper agents new or changed: start a new Claude session in the workspace before building"

if [ -n "$apply" ]; then
  cd "$dst"
  # A new package list (an upgrade of Remotion, say) needs its packages installed.
  if [ ! -d node_modules ] || [ package.json -nt node_modules ] || [ package-lock.json -nt node_modules ]; then npm install --no-audit --no-fund && touch node_modules; fi
  [ -x .venv/bin/python ] || uv venv -q --python 3.12 .venv
  .venv/bin/python -c "import faster_whisper, skimage, scipy, PIL, soundfile, ptts, kokoro_onnx" 2>/dev/null || uv pip install -q --python .venv/bin/python faster-whisper scikit-image scipy pillow numpy soundfile ptts kokoro-onnx
  # On an Apple Silicon Mac, align.py runs Whisper on the GPU: about four times faster than on the CPU.
  if [ "$(uname -sm)" = "Darwin arm64" ] && ! .venv/bin/python -c "import mlx_whisper" 2>/dev/null; then uv pip install -q --python .venv/bin/python mlx-whisper; fi
fi

# What the scripts need outside the workspace. Each missing item says how to get it.
missing=0
need() { if ! eval "$1" >/dev/null 2>&1; then echo "missing: $2"; missing=1; fi; }
need "command -v ffmpeg" "ffmpeg (brew install ffmpeg)"
need "command -v uv" "uv (brew install uv)"
need "test -f $HOME/.local/share/two-host-podcast/models/kokoro-v1.0.onnx" "the Kokoro voice files (Spanish): run the installer of the two-host-podcast skill, scripts/install.sh --no-skill"
need "test -x '$dst/.venv/bin/python'" "the Python venv of the workspace: run this script with --apply"
need "command -v atelier" "atelier, for the pictures of sketch, story, ad and explainer videos (Flow Atelier CLI)"
need "command -v gcloud" "gcloud, for the Google voice of explainer videos (brew install --cask google-cloud-sdk, then gcloud auth login)"
need "test -f $HOME/.atelier/conduits/codex-image/conduit.yaml" "the codex-image conduit: mkdir -p ~/.atelier/conduits/codex-image && cp '$(dirname "$src")/conduits/codex-image/conduit.yaml' ~/.atelier/conduits/codex-image/"
[ "$missing" = 0 ] && echo "tools: all present"
exit 0
