#!/usr/bin/env python3
"""Joins voice files made one line at a time (Chatterbox lines from the ai-clips skill, an ElevenLabs export per line)
into one take, voice.wav beside the script, and names it in script.json as its "recording". scripts/align.py then cuts it
into lines, so the cues and captions work as with Kokoro. The take is brought to -20 LUFS, the level of the Kokoro voice,
so the effects and the music keep their balance with it.

The files are given in the order of the lines of the script, one file per line, all scenes in a row.
Usage: python3 scripts/take.py <series/id> <line1.wav> <line2.flac> ...
       python3 scripts/take.py <series/id> <folder>      every audio file of the folder, in name order
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GAP = 0.35  # seconds of silence between two lines in the take; align.py cuts in it


def main() -> None:
    if len(sys.argv) < 3 or "/" not in sys.argv[1]:
        sys.exit(__doc__)
    video, given = sys.argv[1], [Path(a).resolve() for a in sys.argv[2:]]
    files = sorted(f for f in given[0].iterdir() if f.suffix.lower() in (".wav", ".flac", ".mp3", ".m4a")) if len(given) == 1 and given[0].is_dir() else given
    d = ROOT / "src/videos" / video
    script = json.loads((d / "script.json").read_text())
    lines = sum(len(s["lines"]) for s in script["scenes"])
    if len(files) != lines:
        sys.exit(f"{video}: the script has {lines} lines but {len(files)} files were given")
    with tempfile.TemporaryDirectory() as tmp:
        silence = Path(tmp) / "gap.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", str(GAP), str(silence)], check=True)
        parts = []
        for i, f in enumerate(files):
            part = Path(tmp) / f"{i:03d}.wav"
            subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-ar", "48000", "-ac", "1", str(part)], check=True)
            parts += [part, silence]
        listing = Path(tmp) / "list.txt"
        listing.write_text("".join(f"file '{p}'\n" for p in parts))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(listing), "-af", "loudnorm=I=-20:TP=-2:LRA=11", "-ar", "48000", "-ac", "1", str(d / "voice.wav")], check=True)
    script["recording"] = "voice.wav"
    (d / "script.json").write_text(json.dumps(script, indent=1, ensure_ascii=False) + "\n")
    print(f'{video}: {len(files)} lines -> {(d / "voice.wav").relative_to(ROOT)}, named as "recording" in script.json. Next: .venv/bin/python scripts/align.py {video}')


if __name__ == "__main__":
    main()
