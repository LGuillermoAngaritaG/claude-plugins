#!/bin/sh
# Close the council worker chats. Only when the user moves to a different topic.
# A settled worker is released; one still open (e.g. it skipped worker_done) is stopped.
# Also tries the earlier IDs in DISPATCHES_FILE.all (follow-ups do not own the chat; the first start does).
# Chats Orca still reports as retained must be closed by hand in Orca.
# Usage: close.sh DISPATCHES_FILE
ids="$1"
[ -f "$ids" ] || { echo "usage: close.sh DISPATCHES_FILE" >&2; exit 2; }
while read -r name id; do
  echo "== $name ($id)"
  out=$(orca orchestration worker-release --environment local --dispatch "$id" --json 2>&1)
  case "$out" in
    *dispatch_inactive*) orca orchestration worker-stop --environment local --dispatch "$id" --json ;;
    *) echo "$out" ;;
  esac
  echo
done <<LIST
$(cat "$ids.all" 2>/dev/null; cat "$ids")
LIST
