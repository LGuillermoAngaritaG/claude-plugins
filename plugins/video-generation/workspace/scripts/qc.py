#!/usr/bin/env python3
"""Checks the finished files: what the checks before the render cannot see (a lost sound track, a picture that failed
to load, a broken encode).

Each part, videos/<series>/parts/<id>.mp4, must have sound at the loudness that scripts/stitch.sh sets (-16 LUFS
within 1 LU, true peak at most -1 dBTP), no silence of 1.5 s or more, no picture frozen for 5 s or more (outside the
recap of a math video, which is a list by design), no flicker and, when it is upright, no black half second. Each
problem names its scene and its second in the part. For each flicker it writes the frames, out/flicker/<id>-<second>.jpg. The build runs this last: the files are written even when it finds a problem.
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


# Flicker: a patch that jumps and comes back (A, B, A) again and again. A cut, a move or a pop jumps once, so it does
# not count. Seen in 3D: striped or toothed parts turning too fast per frame (they strobe), ghosted layers and
# shadows that change from frame to frame. Calibrated 2026-11-02 on the 3D videos (real flicker 0.9 to 15 % of the
# picture) and a cutout Short (at most 0.5 %).
BLOCK, JUMP, TIMES, WINDOW, SHARE = 20, 10, 3, 8, 0.006


def flicker(path: Path, w: int, h: int, fps: float) -> list[tuple[int, int, int, float, tuple[int, int, int, int]]]:
    """(first frame, last frame, worst frame, its share, its box x0 y0 x1 y1 in pixels) of each stretch where more than SHARE of the
    picture flickers: a block of BLOCK px that jumps by JUMP or more and comes back at least TIMES in WINDOW frames."""
    bw, bh = w // BLOCK, h // BLOCK
    size, top = bw * bh, (1 << WINDOW) - 1
    feed = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"scale={bw}:{bh}:flags=area,format=gray", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    a = b = None
    n, hits, seen = 0, {}, [0] * size  # seen: bit i set when the block jumped and came back i frames ago
    while len(c := feed.stdout.read(size)) == size:
        if a is not None:
            if b == a or b == c:
                seen = [(v << 1) & top for v in seen]
            else:
                seen = [((v << 1) | (abs(z - x) < JUMP // 2 and ((y - x > JUMP and y - z > JUMP) or (x - y > JUMP and z - y > JUMP)))) & top for v, x, y, z in zip(seen, a, b, c)]
            bad = [i for i, v in enumerate(seen) if v.bit_count() >= TIMES]
            if len(bad) > SHARE * size:
                xs, ys = [i % bw for i in bad], [i // bw for i in bad]
                hits[n - 1] = (len(bad) / size, (min(xs) * BLOCK, min(ys) * BLOCK, (max(xs) + 1) * BLOCK, (max(ys) + 1) * BLOCK))
        a, b, n = b, c, n + 1
    feed.wait()
    runs = []
    for f in sorted(hits):
        if runs and f - runs[-1][1] <= fps / 5:
            runs[-1][1] = f
        else:
            runs.append([f, f])
    worst = [max(range(f0, f1 + 1), key=lambda f: hits.get(f, (0,))[0]) for f0, f1 in runs]
    return [(f0, f1, m, *hits[m]) for (f0, f1), m in zip(runs, worst)]


def frames(path: Path, at: int, box: tuple[int, int, int, int], out: Path) -> None:
    """Four frames side by side from frame `at` - 2, cut to the box that flickers: what to look at."""
    x0, y0, x1, y1 = box
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-vf", f"select='between(n,{at - 2},{at + 1})',crop={x1 - x0}:{y1 - y0}:{x0}:{y0},scale=-2:480,tile=4x1", "-frames:v", "1", str(out)], check=True)


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

    probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", str(part)], capture_output=True, text=True, check=True).stdout)
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
    num, den = picture["r_frame_rate"].split("/")
    fps = int(num) / int(den)
    for f0, f1, m, share, box in flicker(part, picture["width"], picture["height"], fps):
        a = f0 / fps
        out = ROOT / "out" / "flicker" / series / f"{vid_id}-{a:.1f}.jpg"
        frames(part, m, box, out)
        problems.append(f"flicker from {a:.1f} s to {f1 / fps + 0.03:.1f} s ({share:.1%} of the picture), in scene {scene(a)}: see {out.relative_to(ROOT)}")

    print(f"{vid}: qc: {len(problems)} problem(s)  ({length:.1f} s{level})")
    for p in problems:
        print(f"  {p}")
    return len(problems)


if __name__ == "__main__":
    bad = sum(qc(v) for v in check.expand(sys.argv[1:]))
    if bad:
        print("The files are written. Fix the problems and build again, or explain each one in your report.")
        print("Flicker: look at its frames; for the causes and fixes see 'Flicker' in the explainer-video media.md.")
    sys.exit(1 if bad else 0)
