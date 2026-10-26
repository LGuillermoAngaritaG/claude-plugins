#!/bin/bash
# Narrates, times the words, checks, renders, stitches, writes subtitles and checks the finished files.
# Usage: scripts/build.sh <series | series/id> [...]   (docs/tools.md of the plugin lists every tool)
# A bare series means all its videos. The finished files land in videos/<series>/.
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -gt 0 ] || { echo "usage: scripts/build.sh <series | series/id> [...]" >&2; exit 1; }
series=$(printf '%s\n' "$@" | cut -d/ -f1 | sort -u)
python3 scripts/voice.py "$@"   # a Google voice ("google" in script.json) as voice.wav; the others are skipped
npm run -s tts "$@"
.venv/bin/python scripts/align.py "$@"   # word times, the speech check, and the clips of a recorded voice
python3 scripts/check.py "$@"
python3 scripts/mix.py "$@" || true   # where the music bed sits under the voice; a warning, not a stop
# Type errors in the series being built stop the build. Errors in other series do not.
errors=$(npx tsc --noEmit | grep -E "^src/videos/($(echo $series | tr ' ' '|'))/" || true)
[ -z "$errors" ] || { echo "$errors" >&2; exit 1; }
node scripts/render.mjs "$@"
scripts/stitch.sh $series
python3 scripts/srt.py "$@"   # subtitles beside each part
python3 scripts/qc.py "$@"   # sound, loudness, silences, frozen or black picture in videos/<series>/parts/
