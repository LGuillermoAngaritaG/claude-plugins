#!/usr/bin/env python3
"""The shared sound effect library: real recordings and generated sounds that every video can use.

The library lives outside the repos, in ~/Documents/sfx-library (or $SFX_LIBRARY), because some recordings may be used
in videos but not shared as files. Each sound is <group>/<name>.wav with a row in catalog.json; workspace.sh copies the
library into public/sfx/ of a workspace, so a video plays it as `{name: 'impact/door-slam'}`.

Usage: python3 scripts/sfx.py find <word> [...]     sounds whose name, description or tags hold every word
       python3 scripts/sfx.py missing <series | series/id> [...]   sounds the video plays that are not in public/sfx/ yet, and its
                                                    sounds-wanted.json (the sounds a builder asked for); run before a render
       python3 scripts/sfx.py takes <file>          the separate sounds in a recording: start, length, peak
       python3 scripts/sfx.py add <file> <group/name> "<what it is>" --source "<where from>" --licence "<licence>"
                [--start S] [--len L] [--tags a,b] [--generated] [--bed]
           cuts [start, start + len] out of the file, writes 48 kHz 16-bit wav (mono unless the source is stereo),
           sets the peak (-6 dBFS, or -12 for a --bed: ambiences and drones), adds short fades, and adds the row.
           It writes the sound into the library and into public/sfx/ of this workspace.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIB = Path(os.environ.get("SFX_LIBRARY", Path.home() / "Documents/sfx-library"))
CATALOG = LIB / "catalog.json"


def catalog() -> dict:
    return json.loads(CATALOG.read_text()) if CATALOG.exists() else {}


def ff(*args: str) -> str:
    return subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *args], capture_output=True, text=True, check=True).stderr


def peak(f: Path) -> float:
    return float(re.search(r"max_volume: (-?[\d.]+) dB", ff("-i", str(f), "-af", "volumedetect", "-f", "null", "-"))[1])


def find(words: list[str]) -> None:
    hits = [(k, v) for k, v in catalog().items() if all(w.lower() in f"{k} {v['what']} {' '.join(v['tags'])}".lower() for w in words)]
    for k, v in sorted(hits):
        print(f"{k:28} {v['seconds']:6.2f} s  {v['what']}")
    print(f"{len(hits)} sound(s)" + ("" if hits else ": none. Make it (ai-clips, model sfx), check it with earshot and add it."))


def missing(video: str) -> int:
    d = ROOT / "src/videos" / video
    names = {n for f in d.glob("*.tsx") for n in re.findall(r"name:\s*'([a-z]+/[a-z0-9-]+)'", f.read_text())}
    gone = sorted(n for n in names if not (ROOT / "public/sfx" / f"{n}.wav").exists())
    wanted = d / "sounds-wanted.json"
    for n in gone:
        print(f"missing: {n}")
    if wanted.exists():
        print(f"{wanted.relative_to(ROOT)}: {wanted.read_text().strip()}")
    print(f"{video}: {len(gone)} sound(s) missing" + (": make them (pipeline.md, Sound effects, the library) before the render" if gone else ""))
    return len(gone)


def takes(f: Path) -> list[tuple[float, float]]:
    """(start, length) of each sound in a recording, split on 0.25 s of silence 40 dB under the loudest point."""
    top = peak(f)
    log = ff("-i", str(f), "-af", f"silencedetect=n={top - 40}dB:d=0.25", "-f", "null", "-")
    total = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout)
    starts = [0.0] + [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)] + [total]
    return [(s, e - s) for s, e in zip(starts, ends) if e - s > 0.03]


def add(a: argparse.Namespace) -> None:
    group, name = a.name.split("/")
    out = LIB / group / f"{name}.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    stereo = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels", "-of", "csv=p=0", str(a.file)], capture_output=True, text=True).stdout.split()[0]) >= 2
    cut = ["-ss", str(a.start)] + (["-t", str(a.len)] if a.len else [])
    tmp = out.with_suffix(".tmp.wav")
    # a source with more than two channels is folded down; fades stop clicks at the cut points
    ff("-y", *cut, "-i", str(a.file), "-ac", "2" if stereo else "1", "-ar", "48000", "-af", "afade=t=in:d=0.005,areverse,afade=t=in:d=0.03,areverse", "-c:a", "pcm_s16le", str(tmp))
    gain = (-12 if a.bed else -6) - peak(tmp)
    ff("-y", "-i", str(tmp), "-af", f"volume={gain}dB", "-c:a", "pcm_s16le", str(out))
    tmp.unlink()
    seconds = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)], capture_output=True, text=True).stdout)
    rows = catalog()
    rows[a.name] = {"what": a.what, "tags": [t for t in a.tags.split(",") if t], "seconds": round(seconds, 2), "stereo": stereo, "bed": a.bed,
                    "made": "generated" if a.generated else "recorded", "source": a.source, "licence": a.licence}
    CATALOG.write_text(json.dumps(dict(sorted(rows.items())), indent=1, ensure_ascii=False) + "\n")
    here = ROOT / "public/sfx" / group / f"{name}.wav"
    here.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(out, here)
    shutil.copy(CATALOG, ROOT / "public/sfx/catalog.json")
    print(f"{a.name}: {seconds:.2f} s, {'stereo' if stereo else 'mono'}, gain {gain:+.1f} dB -> {out}")


def main() -> None:
    if len(sys.argv) < 3 or sys.argv[1] not in ("find", "missing", "takes", "add"):
        sys.exit(__doc__)
    if sys.argv[1] == "find":
        return find(sys.argv[2:])
    if sys.argv[1] == "missing":
        import check  # scripts/check.py: expand()
        sys.exit(1 if sum(missing(v) for v in check.expand(sys.argv[2:])) else 0)
    if sys.argv[1] == "takes":
        for s, n in takes(Path(sys.argv[2])):
            print(f"start {s:8.3f}  len {n:7.3f}")
        return
    p = argparse.ArgumentParser()
    p.add_argument("file", type=Path)
    p.add_argument("name")
    p.add_argument("what")
    p.add_argument("--source", required=True)
    p.add_argument("--licence", required=True)
    p.add_argument("--start", type=float, default=0)
    p.add_argument("--len", type=float)
    p.add_argument("--tags", default="")
    p.add_argument("--generated", action="store_true")
    p.add_argument("--bed", action="store_true")
    a = p.parse_args(sys.argv[2:])
    if not re.fullmatch(r"[a-z]+/[a-z0-9-]+", a.name):
        sys.exit("name must be group/name in lowercase, such as impact/door-slam")
    add(a)


if __name__ == "__main__":
    main()
