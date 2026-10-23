#!/bin/bash
# For each series: evens out the loudness of every rendered part (out/<series>/*.mp4 ->
# videos/<series>/parts/), then joins the parts into videos/<series>/<series>-full.mp4 with a
# chapter per part. A part named NN-name that has deep dives (NNa-name, NNb-name, ...) also
# gets videos/<series>/section-NN-name.mp4.
# Usage: scripts/stitch.sh [series ...]   (default: every series in out/)
set -euo pipefail
cd "$(dirname "$0")/.."

# join <series> <output> <part.mp4> ...
join() {
  local series=$1 out=$2 list meta start=0 part id ms title
  shift 2
  list=$(mktemp)
  meta=$(mktemp)
  echo ";FFMETADATA1" > "$meta"
  for part in "$@"; do
    id=$(basename "$part" .mp4)
    ms=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$part" | awk '{printf "%d", $1 * 1000}')
    title=$(python3 -c "import json, sys; print(json.load(open(sys.argv[1]))['title'])" "src/videos/$series/$id/script.json")
    printf "file '%s'\n" "$PWD/$part" >> "$list"
    printf "[CHAPTER]\nTIMEBASE=1/1000\nSTART=%d\nEND=%d\ntitle=%s\n" "$start" "$((start + ms))" "$title" >> "$meta"
    start=$((start + ms))
  done
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$list" -i "$meta" -map 0 -map_metadata 1 -c copy "$out"
  rm "$list" "$meta"
  echo "$out: $# parts, $((start / 60000)) min $((start / 1000 % 60)) s"
}

if [ $# -eq 0 ]; then
  set -- $(ls -d out/*/[0-9][0-9]*.mp4 | cut -d/ -f2 | sort -u)
fi
for series in "$@"; do
  dst="videos/$series"
  mkdir -p "$dst/parts"
  for src in out/"$series"/[0-9][0-9]*.mp4; do
    part="$dst/parts/$(basename "$src")"
    # The picture is copied as is. Only the audio is re-encoded, at -16 LUFS. Skipped when already done.
    # It is written under a hidden name first, so a run that is killed half way leaves nothing that looks done.
    if [ ! "$part" -nt "$src" ]; then
      tmp="$dst/parts/.$(basename "$src")"
      ffmpeg -y -loglevel error -i "$src" -c:v copy -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k "$tmp"
      mv "$tmp" "$part"
    fi
  done
  for overview in "$dst"/parts/[0-9][0-9]-*.mp4; do
    n=$(basename "$overview" | cut -c1-2)
    dives=("$dst"/parts/"$n"[a-z]-*.mp4)
    if [ -e "${dives[0]}" ]; then
      join "$series" "$dst/section-$(basename "$overview")" "$overview" "${dives[@]}"
    fi
  done
  join "$series" "$dst/$series-full.mp4" "$dst"/parts/*.mp4
done
