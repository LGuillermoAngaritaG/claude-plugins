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
  if [ -n "$apply" ]; then mkdir -p "$dst/$(dirname "$f")"; cp "$src/$f" "$dst/$f"; fi
done < <(cd "$src" && find . -type f ! -name .DS_Store | sed 's|^\./||' | sort)
echo "$n file(s) $([ -n "$apply" ] && echo copied || echo 'would change; run again with --apply to copy them')"

if [ -n "$apply" ]; then
  cd "$dst"
  [ -d node_modules ] || npm install --no-audit --no-fund
  [ -x .venv/bin/python ] || { uv venv -q --python 3.12 .venv && uv pip install -q --python .venv/bin/python faster-whisper scikit-image scipy pillow numpy soundfile; }
fi

# What the scripts need outside the workspace. Each missing item says how to get it.
missing=0
need() { if ! eval "$1" >/dev/null 2>&1; then echo "missing: $2"; missing=1; fi; }
need "command -v ffmpeg" "ffmpeg (brew install ffmpeg)"
need "command -v uv" "uv (brew install uv)"
need "test -f $HOME/.local/share/two-host-podcast/models/kokoro-v1.0.onnx" "the Kokoro voice: run the installer of the two-host-podcast skill, scripts/install.sh --no-skill"
need "test -x '$dst/.venv/bin/python'" "the Python venv of the workspace: run this script with --apply"
need "command -v atelier" "atelier, for the pictures of sketch, story and ad videos (Flow Atelier CLI)"
need "test -f $HOME/.atelier/conduits/codex-image/conduit.yaml" "the codex-image conduit: mkdir -p ~/.atelier/conduits/codex-image && cp '$(dirname "$src")/conduits/codex-image/conduit.yaml' ~/.atelier/conduits/codex-image/"
[ "$missing" = 0 ] && echo "tools: all present"
exit 0
