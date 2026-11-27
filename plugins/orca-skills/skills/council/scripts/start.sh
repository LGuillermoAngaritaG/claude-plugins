#!/bin/sh
# Start one Orca orchestration worker per council member, all in parallel.
# Usage: start.sh SPEC_FILE SLUG [COUNCIL_FILE]
# COUNCIL_FILE defaults to ~/.claude/orca-skills/council.conf if it exists, else the bundled council.conf.
# Tabs are titled "<slug>-<name>". Any {{member}} in SPEC_FILE is replaced by the member name. Dispatch IDs are saved to dispatches.txt next to SPEC_FILE.
spec="$1"; slug="$2"; user_conf="$HOME/.claude/orca-skills/council.conf"
[ -f "$user_conf" ] || user_conf="$(dirname "$0")/../council.conf"
conf="${3:-$user_conf}"
[ -f "$spec" ] && [ -n "$slug" ] && [ -f "$conf" ] || { echo "usage: start.sh SPEC_FILE SLUG [COUNCIL_FILE]" >&2; exit 2; }
d=$(mktemp -d)
names=""
while read -r name agent model effort; do
  case "$name" in ''|\#*) continue ;; esac
  set -- --model "$model"
  [ -n "$effort" ] && [ "$effort" != "-" ] && set -- "$@" --effort "$effort"
  member_spec="$spec"
  if grep -q '{{member}}' "$spec"; then
    member_spec="$d/$name.spec.md"; sed "s/{{member}}/$name/g" "$spec" >"$member_spec"
  fi
  orca orchestration worker-start --environment local --spec-file "$member_spec" --worktree current \
    --keep-open --task-title "$slug-$name" --agent "$agent" "$@" --json >"$d/$name.out" 2>"$d/$name.err" &
  echo $! >"$d/$name.pid"
  names="$names $name"
done <"$conf"
[ -n "$names" ] || { echo "no members in $conf" >&2; exit 2; }
for n in $names; do s=0; wait "$(cat "$d/$n.pid")" || s=$?; echo "$n exit $s"; done
ids="$(dirname "$spec")/dispatches.txt"; : >"$ids"
for n in $names; do
  echo "== $n"; cat "$d/$n.out" "$d/$n.err"; echo
  id=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["result"]["dispatchId"])' "$d/$n.out" 2>/dev/null)
  [ -n "$id" ] && echo "$n $id" >>"$ids"
done
echo "dispatch IDs saved to $ids"; cat "$ids"
