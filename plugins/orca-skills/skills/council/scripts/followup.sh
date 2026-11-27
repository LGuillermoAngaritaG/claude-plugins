#!/bin/sh
# Send a follow-up to the same council workers, keeping their chats and prompt caches.
# Each follow-up gets a new dispatch ID; the file is updated so the next round targets it.
# Usage: followup.sh DISPATCHES_FILE BODY_FILE SUBJECT [ONLY]
# ONLY: comma-separated member names to send to (default: every member); the others keep their IDs.
ids="$1"; body="$2"; subject="$3"; only="$4"
[ -f "$ids" ] && [ -f "$body" ] && [ -n "$subject" ] || { echo "usage: followup.sh DISPATCHES_FILE BODY_FILE SUBJECT" >&2; exit 2; }
new="$ids.new"; : >"$new"
while read -r name id; do
  case ",$only," in ",,"|*",$name,"*) ;; *) echo "$name $id" >>"$new"; continue ;; esac
  echo "== $name ($id)"
  out=$(orca orchestration send --environment local --to "dispatch:$id" --subject "$subject" --body-file "$body" --json)
  echo "$out"; echo
  nid=$(printf '%s' "$out" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["dispatchId"])' 2>/dev/null)
  echo "$name ${nid:-$id}" >>"$new"
done <"$ids"
cat "$ids" >>"$ids.all"
mv "$new" "$ids"
echo "dispatch IDs now:"; cat "$ids"
