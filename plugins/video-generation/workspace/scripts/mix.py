#!/usr/bin/env python3
"""How far the bed sits under the voice, measured on the files rather than guessed. Music belongs about 20 dB under the
voice: closer than 15 dB it fights the words, further than 26 dB it is lost on a phone speaker. An ambience of
public/sfx/ (the drone of the stories) has no melody to fight the words and may sit closer: 10 to 20 dB.

It reads the voice clips of the video, the bed and its `vol` from index.tsx, and prints the difference as the render
plays them: a mono file comes out 3 dB above its measured level, and the engine raises the bed by 3 dB (see the bed in
src/engine.tsx).
Usage: python3 scripts/mix.py <series | series/id> [...]
"""
import json
import math
import re
import subprocess
import sys
from pathlib import Path

import check  # scripts/check.py: expand()

ROOT = Path(__file__).resolve().parent.parent
MUSIC, AMBIENCE = (15, 26), (10, 20)  # dB under the voice: (closest, furthest)


def loudness(f: Path) -> float:
    """The loudness of a file as the render plays it: a mono file is played on both sides, 3 dB above its own measure."""
    log = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", "-i", str(f), "-af", "ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
    channels = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout.strip())
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", log)[-1]) + (3.01 if channels == 1 else 0)


def under(voice: float, bed: float, vol: float) -> float:
    """dB between the voice and the bed as the engine plays it: at `vol`, raised by the square root of two."""
    return voice - (bed + 20 * math.log10(vol * math.sqrt(2)))


def mix(video: str) -> int:
    d = ROOT / "src/videos" / video
    src = (d / "index.tsx").read_text()
    m = re.search(r"bed:\s*\{\s*name:\s*'([^']+)'(?:,\s*vol:\s*([\d.]+))?", src)
    if not m:
        print(f"{video}: mix: no bed")
        return 0
    name, vol = m.group(1), float(m.group(2) or 0.12)
    bed = ROOT / "public" / (name if "." in name else f"sfx/{name}.wav")
    script = json.loads((d / "script.json").read_text())
    timing = json.loads((d / "timing.json").read_text())
    clips = [ROOT / "public/audio" / video / c["file"] for s in script["scenes"] for c in timing[s["id"]]]
    voice = sorted(loudness(c) for c in clips)[len(clips) // 2]  # the median line
    gap = under(voice, loudness(bed), vol)
    low, high = AMBIENCE if "." not in name else MUSIC
    aim = (low + high) / 2
    to = vol * 10 ** ((gap - aim) / 20)
    verdict = "fine" if low <= gap <= high else f"too loud: lower vol to about {to:.2f}" if gap < low else f"too quiet: raise vol to about {min(1, to):.2f}"
    print(f"{video}: mix: the bed {name} at vol {vol} sits {gap:.1f} dB under the voice ({verdict}; {low} to {high} dB fits)")
    return 0 if low <= gap <= high else 1


if __name__ == "__main__":
    assert abs(under(-17, -12.6, 0.1) - 12.6) < 0.05  # a Kokoro line (mono, -20 measured) over the Dictaria bed at 0.1: 12.6 dB, too loud
    sys.exit(1 if sum(mix(v) for v in check.expand(sys.argv[1:])) else 0)
