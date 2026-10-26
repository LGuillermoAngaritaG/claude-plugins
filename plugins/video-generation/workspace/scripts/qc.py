#!/usr/bin/env python3
"""Checks the finished files: what the checks before the render cannot see (a lost sound track, a picture that failed
to load, a broken encode).

Each part, videos/<series>/parts/<id>.mp4, must have sound at the loudness that scripts/stitch.sh sets (-16 LUFS
within 1 LU, true peak at most -1 dBTP), no silence of 1.5 s or more, no picture frozen for 5 s or more (outside the
recap of a math video, which is a list by design) and, when it is upright, no black half second. Each problem names
its scene and its second in the part. The build runs this last: the files are written even when it finds a problem.
Usage: python3 scripts/qc.py <series | series/id> [...]
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import check  # scripts/check.py: expand(), cues()

ROOT = Path(__file__).resolve().parent.parent
TARGET, PEAK = -16.0, -1.0


def spans(log: str, start: str, end: str, length: float) -> list[tuple[float, float]]:
    """(from, to) of every stretch a detector reports. A stretch still open when the file ends runs to its end."""
    starts = [float(x) for x in re.findall(start + r"\s*(-?[\d.]+)", log)]
    ends = [float(x) for x in re.findall(end + r"\s*(-?[\d.]+)", log)]
    return [(max(0.0, a), ends[i] if i < len(ends) else length) for i, a in enumerate(starts)]


def qc(vid: str) -> int:
    series, vid_id = vid.split("/")
    part = ROOT / "videos" / series / "parts" / f"{vid_id}.mp4"
    if not part.exists():
        print(f"{vid}: qc: {part.relative_to(ROOT)} is missing: build the video first")
        return 1
    d = ROOT / "src/videos" / vid
    script = json.loads((d / "script.json").read_text())
    timing = json.loads((d / "timing.json").read_text())
    scenes, t = [], 0.0
    for s in script["scenes"]:
        dur = check.cues(timing[s["id"]], script.get("pace", check.PACE))[1]
        scenes.append((s["id"], t))
        t += dur
    scene = lambda at: next(name for name, start in reversed(scenes) if at >= start - 0.05)

    probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration", "-of", "json", str(part)], capture_output=True, text=True, check=True).stdout)
    length = float(probe["format"]["duration"])
    picture = next(s for s in probe["streams"] if s["codec_type"] == "video")
    sound = any(s["codec_type"] == "audio" for s in probe["streams"])
    upright = picture["height"] > picture["width"]
    # Black means black: pix_th 0.03 still finds a black frame but not a channel's near-black ground (#0d0e12).
    cmd = ["ffmpeg", "-nostats", "-hide_banner", "-i", str(part), "-vf", "freezedetect=n=0.0001:d=5" + (",blackdetect=d=0.5:pix_th=0.03" if upright else "")]
    cmd += ["-af", "ebur128=peak=true:framelog=quiet,silencedetect=n=-45dB:d=1.5"] if sound else ["-an"]
    log = subprocess.run(cmd + ["-f", "null", "-"], capture_output=True, text=True).stderr

    problems, level = [], ""
    if not sound:
        problems.append("no sound track")
    else:
        loud = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", log)[-1])
        peak = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", log)[-1])
        level = f", {loud:.1f} LUFS, true peak {peak:.1f} dBTP"
        if abs(loud - TARGET) > 1:
            problems.append(f"loudness {loud:.1f} LUFS, not {TARGET:.0f} within 1")
        if peak > PEAK:
            problems.append(f"true peak {peak:.1f} dBTP, above {PEAK:.0f}")
        for a, b in spans(log, "silence_start:", "silence_end:", length):
            problems.append(f"silence from {a:.1f} s to {b:.1f} s, in scene {scene(a)}")
    math = script.get("type", "math") == "math"
    for a, b in spans(log, "freeze_start:", "freeze_end:", length):
        if not (math and scene(a) == scenes[-1][0]):
            problems.append(f"picture frozen from {a:.1f} s to {b:.1f} s, in scene {scene(a)}")
    for a, b in spans(log, "black_start:", "black_end:", length):
        problems.append(f"black picture from {a:.1f} s to {b:.1f} s, in scene {scene(a)}")

    print(f"{vid}: qc: {len(problems)} problem(s)  ({length:.1f} s{level})")
    for p in problems:
        print(f"  {p}")
    return len(problems)


if __name__ == "__main__":
    bad = sum(qc(v) for v in check.expand(sys.argv[1:]))
    if bad:
        print("The files are written. Fix the problems and build again, or explain each one in your report.")
    sys.exit(1 if bad else 0)
