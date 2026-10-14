#!/bin/bash
# Narrates, times the words, checks, renders and stitches. Usage: scripts/build.sh <series | series/id> [...]
# A bare series means all its videos. The finished files land in videos/<series>/.
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -gt 0 ] || { echo "usage: scripts/build.sh <series | series/id> [...]" >&2; exit 1; }
series=$(printf '%s\n' "$@" | cut -d/ -f1 | sort -u)
npm run -s tts "$@"
.venv/bin/python scripts/align.py "$@"   # word times, and the clips of a recorded voice; only for the videos that use them
python3 scripts/check.py "$@"
# Type errors in the series being built stop the build. Errors in other series do not.
errors=$(npx tsc --noEmit | grep -E "^src/videos/($(echo $series | tr ' ' '|'))/" || true)
[ -z "$errors" ] || { echo "$errors" >&2; exit 1; }
node scripts/render.mjs "$@"
scripts/stitch.sh $series
