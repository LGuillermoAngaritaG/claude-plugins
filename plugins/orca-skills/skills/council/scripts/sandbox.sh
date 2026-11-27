#!/bin/sh
# Opt-in test sandboxes for council members: one detached git worktree per member.
# Usage: sandbox.sh create COUNCIL_DIR REPO NAME...   -> COUNCIL_DIR/sandbox/<name>
#        sandbox.sh remove COUNCIL_DIR REPO           -> removes every sandbox and its folder
cmd="$1"; dir="$2"; repo="$3"; shift 3 2>/dev/null
[ -n "$cmd" ] && [ -n "$dir" ] && [ -d "$repo" ] || { echo "usage: sandbox.sh create|remove COUNCIL_DIR REPO [NAME...]" >&2; exit 2; }
case "$cmd" in
  create)
    mkdir -p "$dir/sandbox"
    for n in "$@"; do
      git -C "$repo" worktree add --detach "$dir/sandbox/$n" HEAD >/dev/null && echo "$n $dir/sandbox/$n"
    done ;;
  remove)
    for p in "$dir"/sandbox/*; do
      [ -d "$p" ] || continue
      git -C "$repo" worktree remove --force "$p" 2>/dev/null || rm -rf "$p"
      echo "removed $p"
    done
    git -C "$repo" worktree prune
    rmdir "$dir/sandbox" 2>/dev/null ;;
  *) echo "unknown command $cmd" >&2; exit 2 ;;
esac
