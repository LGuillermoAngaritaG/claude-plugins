#!/bin/bash
# One round of a scene agent's checks in one step: the type check of its file, check.py, then the contact sheets of
# its scenes (and any moments) with their layout problems. It prints only what is wrong and the sheets to look at:
# read all of them in one message. Every step of an agent re-sends its whole context, and this loop is where the
# context is largest.
# Usage, from the workspace: scripts/scenes.sh <series/id> <file.tsx> <scene | scene:seconds ...>
set -uo pipefail
video=${1:?usage: scripts/scenes.sh <series/id> <file.tsx> <scene | scene:seconds ...>}
file=${2:?usage: scripts/scenes.sh <series/id> <file.tsx> <scene | scene:seconds ...>}
shift 2
errors=$(npx tsc --noEmit 2>&1 | grep -F "src/videos/$video/$file" | head -20)
if [ -n "$errors" ]; then
  echo "type errors in $file (no sheets until it compiles):"
  echo "$errors"
  exit 1
fi
python3 scripts/check.py "$video" 2>&1 | tail -20
# Remotion echoes the page's failed loads (a voice file not made yet); they say nothing about the scenes.
node scripts/stills.mjs "$video" "$@" 2>&1 | grep -v -e '^\[http' -e 'Failed to load resource'
