#!/usr/bin/env python3
"""Lays the buttons and text of the TikTok and Instagram Reels feeds over frames of a finished upright video, to see what
the apps cover before you publish. The overlays are Remotion's measured captures of both feeds (October 2026); live apps
differ by phone and app version, so treat them as a guide. The right-hand buttons start near x = 922 to 956.

The two overlay pictures are not part of the plugin. They live in ~/.cache/video-generation/safezones/; if they are
missing, the script says where to get them (ask the user before you download anything).
Usage: python3 scripts/safezones.py <series/id> [<seconds> ...]   (default: the middle of every scene)
       -> out/safezones/<id>-<seconds>.png: the frame under TikTok, then under Reels
"""
import json
import subprocess
import sys
from pathlib import Path

import check  # scripts/check.py: cues()

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path.home() / ".cache/video-generation/safezones"
OVERLAYS = ["tiktok-interface.png", "instagram-reels-interface-v3.png"]
URL = "https://remotion.media/elements/social-safe-zones/"


def main() -> None:
    if len(sys.argv) < 2 or "/" not in sys.argv[1]:
        sys.exit(__doc__)
    video = sys.argv[1]
    series, vid_id = video.split("/")
    part = ROOT / "videos" / series / "parts" / f"{vid_id}.mp4"
    if not part.exists():
        sys.exit(f"{video}: build it first: {part.relative_to(ROOT)} is missing")
    missing = [f for f in OVERLAYS if not (CACHE / f).exists()]
    if missing:
        sys.exit(f"missing overlays in {CACHE}: " + ", ".join(URL + f for f in missing) + " (about 100 KB each; ask the user before downloading)")
    times = [float(a) for a in sys.argv[2:]]
    if not times:
        d = ROOT / "src/videos" / video
        script, timing = (json.loads((d / f).read_text()) for f in ("script.json", "timing.json"))
        start = 0.0
        for s in script["scenes"]:
            dur = round(check.cues(timing[s["id"]], script.get("pace", check.PACE))[1] * 30) / 30
            times.append(round(start + dur / 2, 1))
            start += dur
    out = ROOT / "out/safezones"
    out.mkdir(parents=True, exist_ok=True)
    for t in times:
        dest = out / f"{vid_id}-{t:g}.png"
        graph = "[0:v]split[a][b];[a][1:v]overlay,scale=540:960[t];[b][2:v]overlay,scale=540:960[r];[t][r]hstack"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t}", "-i", str(part), "-i", str(CACHE / OVERLAYS[0]), "-i", str(CACHE / OVERLAYS[1]), "-filter_complex", graph, "-frames:v", "1", "-update", "1", str(dest)], check=True)
        print(dest.relative_to(ROOT))


if __name__ == "__main__":
    main()
