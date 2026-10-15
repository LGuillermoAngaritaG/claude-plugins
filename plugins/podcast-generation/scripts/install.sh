#!/usr/bin/env bash
# Install everything the podcast skill needs on a Mac:
#   Homebrew packages uv and ffmpeg, a Python 3.12 venv with kokoro-onnx, and the two Kokoro
#   model files (downloaded from their public release and checked against SHA-256 sums).
#   The skill itself comes with the podcast-generation plugin; nothing is copied.
#
# Usage:
#   bash scripts/install.sh               # everything
#   bash scripts/install.sh --dry-run     # print what would happen, change nothing
#
# Environment:
#   PODCAST_HOME=DIR           where the venv and models go
#                              (default ~/.local/share/two-host-podcast)
#   PODCAST_UNPINNED=1         let uv choose package versions instead of the tested pins
#                              (use on a Mac where a pinned wheel is not available)
#   PODCAST_ALLOW_UNVERIFIED=1 keep a model file whose checksum does not match; only after
#                              you have checked the file yourself
#
# Safe to run again: steps that are already done are skipped.

set -euo pipefail

PODCAST_HOME="${PODCAST_HOME:-$HOME/.local/share/two-host-podcast}"
VENV="$PODCAST_HOME/venv"
MODELS="$PODCAST_HOME/models"
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Versions tested together on Apple silicon, macOS, Python 3.12.
PY_VERSION="3.12"
PINNED=(
  "kokoro-onnx==0.5.0"
  "onnxruntime==1.30.0"
  "numpy==2.2.6"
  "soundfile==0.13.1"
  "phonemizer-fork==3.3.2"
  "espeakng-loader==0.2.4"
)
UNPINNED=("kokoro-onnx>=0.5.0" "soundfile" "numpy")

# Kokoro v1.0 model files, from the kokoro-onnx project's public release "model-files-v1.0".
RELEASE="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
MODEL_FILES=("kokoro-v1.0.onnx" "voices-v1.0.bin")
MODEL_SHA=(
  "7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5"
  "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d"
)
MODEL_BYTES=("325532387" "28214398")

DRY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    -h|--help) sed -n '2,20p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

say()  { printf '\n==> %s\n' "$*"; }
ok()   { printf '    ok: %s\n' "$*"; }
die()  { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
run()  {
  printf '    $ %s\n' "$*"
  if [ "$DRY" -eq 0 ]; then "$@"; fi
}

[ "$(uname -s)" = "Darwin" ] || die "this installer is for macOS. On Linux, install uv, ffmpeg and the packages listed in INSTALL.md by hand."

say "Homebrew"
BREW="$(command -v brew || true)"
if [ -z "$BREW" ]; then
  for cand in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    if [ -x "$cand" ]; then BREW="$cand"; break; fi
  done
fi
if [ -z "$BREW" ]; then
  die "Homebrew is not installed. Install it from https://brew.sh (one command in Terminal), open a new Terminal window, then run this script again."
fi
eval "$("$BREW" shellenv)"
ok "$BREW"

say "uv and ffmpeg"
for tool in uv ffmpeg; do
  if command -v "$tool" >/dev/null 2>&1; then
    ok "$tool already installed: $(command -v "$tool")"
  else
    run "$BREW" install "$tool"
  fi
done
if [ "$DRY" -eq 0 ]; then
  command -v ffprobe >/dev/null 2>&1 || die "ffprobe is missing although ffmpeg is installed. Try: brew reinstall ffmpeg"
fi

say "Python venv at $VENV"
run mkdir -p "$PODCAST_HOME" "$MODELS"
if [ -x "$VENV/bin/python" ]; then
  ok "venv already exists"
else
  run uv venv --python "$PY_VERSION" "$VENV"
fi

say "Python packages"
if [ "${PODCAST_UNPINNED:-0}" = "1" ]; then
  run uv pip install --python "$VENV/bin/python" "${UNPINNED[@]}"
else
  if ! run uv pip install --python "$VENV/bin/python" "${PINNED[@]}"; then
    die "the tested versions did not install on this Mac. Run again with PODCAST_UNPINNED=1 to let uv choose versions that fit."
  fi
fi

say "Kokoro model files in $MODELS"
sha_of() { shasum -a 256 "$1" | awk '{print $1}'; }
for i in 0 1; do
  f="${MODEL_FILES[$i]}"
  want="${MODEL_SHA[$i]}"
  dest="$MODELS/$f"
  if [ -f "$dest" ] && [ "$(sha_of "$dest")" = "$want" ]; then
    ok "$f present and verified"
    continue
  fi
  echo "    downloading $f (about $(( MODEL_BYTES[$i] / 1048576 )) MB)"
  run curl -L --fail --retry 3 --progress-bar -o "$dest.part" "$RELEASE/$f"
  if [ "$DRY" -eq 1 ]; then continue; fi
  got="$(sha_of "$dest.part")"
  if [ "$got" != "$want" ]; then
    if [ "${PODCAST_ALLOW_UNVERIFIED:-0}" = "1" ]; then
      echo "    WARNING: $f checksum $got does not match the tested $want; kept because PODCAST_ALLOW_UNVERIFIED=1"
    else
      rm -f "$dest.part"
      die "$f downloaded but its SHA-256 is $got, not the tested $want. The file was deleted. If the release was updated on purpose, check it yourself and run again with PODCAST_ALLOW_UNVERIFIED=1."
    fi
  fi
  mv "$dest.part" "$dest"
  ok "$f verified"
done

if [ "$DRY" -eq 1 ]; then
  say "Dry run finished; nothing was changed."
  exit 0
fi

say "Checks"
"$VENV/bin/python" "$PKG_DIR/scripts/render.py" --check --models-dir "$MODELS"
"$VENV/bin/python" "$PKG_DIR/scripts/lint.py" "$PKG_DIR/examples/sample_script.md" --minutes 3

say "Done"
cat <<EOF
    Render the sample to hear it:
      "$VENV/bin/python" "$PKG_DIR/scripts/render.py" "$PKG_DIR/examples/sample_script.md" --out ~/Desktop/sample_episode
    Or ask Claude Code for a podcast episode; the plugin's skill takes it from there.
EOF
