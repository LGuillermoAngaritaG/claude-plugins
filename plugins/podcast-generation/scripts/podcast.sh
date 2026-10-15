#!/bin/bash
# Lints a podcast script and, if it passes, renders it to an .m4a beside the script.
# Usage: podcast.sh <script.md> <minutes> [es]
# The voice speed is 1.18 for English (about 200 words a minute) and 1.0 for Spanish (about 195).
# To change it: SPEED=1.1 podcast.sh ...     To lint without rendering: LINT_ONLY=1 podcast.sh ...
set -euo pipefail
[ $# -ge 2 ] || { echo "usage: podcast.sh <script.md> <minutes> [es]" >&2; exit 1; }
PY="${PODCAST_HOME:-$HOME/.local/share/two-host-podcast}/venv/bin/python"
SK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script=$1 minutes=$2 lang=${3:-en}
speed=${SPEED:-$([ "$lang" = es ] && echo 1.0 || echo 1.18)}
"$PY" "$SK/lint.py" "$script" --lang "$lang" --minutes "$minutes" --wpm "$([ "$lang" = es ] && echo 195 || echo 200)"
[ -z "${LINT_ONLY:-}" ] || exit 0
"$PY" "$SK/render.py" "$script" --lang "$lang" --speed "$speed" --no-wav
secs=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "${script%.md}.m4a")
awk -v s="$secs" -v m="$minutes" -v v="$speed" 'BEGIN {
  r = s / (m * 60)
  if (r < 0.9 || r > 1.1) {
    # Measured: the pace follows the speed only by about its power 0.6, so the speed has to move further than the length.
    printf "length is %.2f min, target %s. The file was written, but it is off by more than ten percent.\n", s / 60, m
    printf "Best: %s about %.0f percent of the words. Or run again with SPEED=%.2f\n", (r > 1 ? "cut" : "add"), (r > 1 ? 1 - 1 / r : 1 / r - 1) * 100, v * r ^ 1.67
    exit 1
  }
  printf "length is %.2f min, inside ten percent of the target %s\n", s / 60, m
}'
