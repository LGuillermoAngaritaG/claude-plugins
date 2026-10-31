#!/bin/bash
# One cut-out picture from Codex on a flat blue ground; scripts/cutout_prep.py removes the ground afterwards.
# Usage: scripts/cutout_draw.sh <series/id> <name> <ar> <char|obj|animal> "<what is different in this picture>" [ref.png ...]
#   char    the video's own character: character.txt in the video folder (each video has its own cast). Draw "hero"
#           first; every later char picture with no ref given takes that hero as its reference, so the face stays the same
#   obj     a prop or a set piece, no face (faces on objects are drawn in code)
#   animal  one animal character, in the same flat style
# Writes out/art/<series/id>/raw/<name>.png (about a minute). Draw two pictures that must line up (with and without an
# object) as an edit: pass the first as the ref and say "edit this exact picture ... everything else identical".
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
vid=$1 name=$2 ar=$3 kind=$4 what=$5; shift 5
d="$ROOT/src/videos/$vid"
hero="$ROOT/out/art/$vid/raw/hero.png"
OBJ="Flat 2D cartoon object: thick smooth black outlines of even weight, flat colours with one very soft shade, clean vector-like linework, no texture, no gradients, no text, no border, no characters, no face."
GROUND="Isolated on a plain flat solid light-blue background (#9BCFFD) and nothing else: no floor, no shadow, no other objects. The whole subject is in frame with a wide margin on every side."
refs=("$@")
case $kind in
  char)
    [ -f "$d/character.txt" ] || { echo "no character.txt in $d: write one (who the character is, its look and the line style)" >&2; exit 1; }
    style=$(cat "$d/character.txt")
    [ ${#refs[@]} -eq 0 ] && [ "$name" != hero ] && [ -f "$hero" ] && refs=("$hero") ;;
  obj) style=$OBJ ;;
  animal) style="${OBJ/no characters, no face/one animal character}" ;;
  *) echo "kind is char, obj or animal" >&2; exit 1 ;;
esac
keep=""; for r in "${refs[@]+"${refs[@]}"}"; do keep="$keep Open the picture $r and draw in exactly the same character design and drawing style (same head, hair, face, clothes, colours and outline weight)."; done
dest="$ROOT/out/art/$vid/raw/$name.png"; mkdir -p "$(dirname "$dest")"
atelier run codex-image --hide-steps -i "prompt=$what.$keep $style $GROUND" -i "dest=$dest" -i "ar=$ar" > /dev/null
[ -f "$dest" ] && echo "made $dest" || { echo "Codex did not make $dest" >&2; exit 1; }
