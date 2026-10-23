"""Compares two renders of the same video: length, loudness, the sound second by second, and the picture frame by frame.
For engine changes and Remotion upgrades: render one video of each type before and after, then compare.
Usage: python3 scripts/compare.py <old.mp4> <new.mp4>"""
import re
import subprocess
import sys


def ff(*args: str) -> str:
    r = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", *args], capture_output=True, text=True)
    return r.stderr + r.stdout


def length(f: str) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout)


def loud(f: str) -> tuple[float, float]:
    log = ff("-i", f, "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-")
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", log)[-1]), float(re.findall(r"LRA:\s+(-?[\d.]+) LU", log)[-1])


def rms(f: str) -> list[float]:
    out = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", "-i", f, "-af", "aresample=48000,asetnsamples=4800,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-"], capture_output=True, text=True).stdout
    return [max(-90.0, float(v)) if v not in ("-inf", "inf") else -90.0 for v in re.findall(r"RMS_level=(\S+)", out)]


old, new = sys.argv[1:3]
print(f"length  {length(old):.3f} s -> {length(new):.3f} s")
(i0, r0), (i1, r1) = loud(old), loud(new)
print(f"loudness {i0:.1f} LUFS (range {r0:.1f}) -> {i1:.1f} LUFS (range {r1:.1f})")
a, b = rms(old), rms(new)
diffs = [(abs(x - y), k / 10) for k, (x, y) in enumerate(zip(a, b)) if max(x, y) > -50]
worst = sorted(diffs, reverse=True)[:3]
print(f"sound, per 0.1 s: {len(a)} vs {len(b)} windows, median difference {sorted(d for d, _ in diffs)[len(diffs) // 2]:.2f} dB, worst " + ", ".join(f"{d:.1f} dB at {t:.1f} s" for d, t in worst))
log = ff("-i", old, "-i", new, "-lavfi", "[0:v][1:v]ssim=stats_file=-", "-f", "null", "-")
frames = [(float(m.group(2)), int(m.group(1))) for m in re.finditer(r"n:(\d+) .*?All:([\d.]+)", log)]
print(f"picture: mean SSIM {sum(s for s, _ in frames) / len(frames):.4f}, worst " + ", ".join(f"{s:.3f} at {n / 30:.1f} s" for s, n in sorted(frames)[:3]))
