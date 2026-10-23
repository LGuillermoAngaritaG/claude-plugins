#!/usr/bin/env python3
"""Large frames from video files, to look at with the Read tool: six frames per file, spread from the first frame to the
last, 300 px wide, in one row. Use it on every AI clip before you use it (melted objects, odd faces and moving lips hide
in small thumbnails), and on any finished file. For a video of the engine, scripts/stills.mjs is better: it knows the scenes.

Usage: python3 scripts/frames.py <file.mp4> [...] [--n 6] [--width 300]   -> out/frames/<name>.png, one sheet per file
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def frames(src: Path, n: int, width: int) -> Path:
    count = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", str(src)], capture_output=True, text=True, check=True).stdout.strip().rstrip(","))
    picks = sorted({min(count - 1, round(i * (count - 1) / max(1, n - 1))) for i in range(n)})
    out = ROOT / "out/frames" / f"{src.stem}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    pick = "+".join(f"eq(n,{k})" for k in picks)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", f"select='{pick}',scale={width}:-1,tile={len(picks)}x1:padding=4", "-frames:v", "1", "-update", "1", str(out)], check=True)
    return out


def main() -> None:
    args, n, width = sys.argv[1:], 6, 300
    for flag in ("--n", "--width"):
        if flag in args:
            k = args.index(flag)
            n, width = (int(args[k + 1]), width) if flag == "--n" else (n, int(args[k + 1]))
            del args[k : k + 2]
    if not args:
        sys.exit(__doc__)
    for a in args:
        print(frames(Path(a).resolve(), n, width).relative_to(ROOT))


if __name__ == "__main__":
    main()
