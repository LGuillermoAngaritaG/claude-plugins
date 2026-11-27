#!/bin/sh
# Start one Orca orchestration worker for a director role.
# Usage: start.sh ROLE SPEC_FILE TITLE [CONF_FILE] -- <extra worker-start args, e.g. --worktree new-child --name x>
# Reads agent, model and effort for ROLE from CONF_FILE (default: ~/.claude/orca-skills/director.conf if it exists, else the bundled director.conf).
role="$1"; spec="$2"; title="$3"; shift 3
conf="$HOME/.claude/orca-skills/director.conf"
[ -f "$conf" ] || conf="$(dirname "$0")/../director.conf"
if [ "$1" != "--" ] && [ -n "$1" ]; then conf="$1"; shift; fi
[ "$1" = "--" ] && shift
[ -f "$spec" ] && [ -n "$title" ] && [ -f "$conf" ] || { echo "usage: start.sh ROLE SPEC_FILE TITLE [CONF_FILE] -- <worker-start args>" >&2; exit 2; }
line=$(awk -v r="$role" '$1==r {print; exit}' "$conf")
[ -n "$line" ] || { echo "role $role not found in $conf" >&2; exit 2; }
set -- $line "$@"
agent="$2"; model="$3"; effort="$4"; shift 4
[ -n "$effort" ] && [ "$effort" != "-" ] && set -- --effort "$effort" "$@"
exec orca orchestration worker-start --environment local --spec-file "$spec" --keep-open \
  --task-title "$title" --agent "$agent" --model "$model" "$@" --json
