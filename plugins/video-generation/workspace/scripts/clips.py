#!/usr/bin/env python3
"""The bridge between a video and the Colab generator of the ai-clips skill: it writes the jobs from script.json, and
brings the results back under names that do not change when a clip is made again.

script.json describes the clips and the music:
  "style": "One paragraph that fixes the look, the same words in every clip (light, lens, colour grade).",
  "clips": {"meet": {"image": "anna", "motion": "She looks up and nods once. The camera stays still.", "seconds": 5}},
  "music": {"prompt": "minimal electronic, soft piano, warm, 95 bpm, no vocals", "seconds": 30}
`image` is a picture of "images" (made first by scripts/art.py); the clip starts from it (image-to-video). Without it
the clip is made from text alone, which never keeps a face or a room the same. `motion` says only what changes.

Usage: python3 scripts/clips.py <series/id> jobs           -> out/jobs/<series>/<id>/ltx.json (and music.json)
       python3 scripts/clips.py <series/id> import <dir>   the files studio.py wrote -> public/art/<series>/<id>/clips/<name>.mp4
                                                           and public/art/<series>/<id>/music.mp3
In a scene: <Clip src="art/<series>/<id>/clips/meet.mp4" />; for the music: bed: {name: 'art/<series>/<id>/music.mp3', vol: 0.1}.
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def slug(name: str) -> str:
    """The name studio.py gives a shot in its file names."""
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def jobs(video: str, script: dict) -> list[Path]:
    d = ROOT / "src/videos" / video
    art = json.loads((d / "art.json").read_text()) if (d / "art.json").exists() else {}
    upright = script.get("type", "math") != "math"
    shots, missing = [], []
    bad = [n for n in script.get("clips", {}) if not re.fullmatch(r"[a-z0-9-]+", n)]
    if bad:
        sys.exit(f'{video}: clip names are lower case letters, digits and dashes, like "meet-anna": {", ".join(bad)}')
    for name, c in script.get("clips", {}).items():
        shot = {"name": name, "prompt": " ".join(x for x in (script.get("style", ""), c["motion"], "No dialogue.") if x), "seconds": c.get("seconds", 5), "aspect": "9:16" if upright else "16:9"}
        if c.get("image"):
            if c["image"] not in art:
                missing.append(c["image"])
                continue
            shot["image"] = str(ROOT / "public" / art[c["image"]]["src"])
        shots.append(shot)
    if missing:
        sys.exit(f'{video}: no picture yet for {", ".join(missing)}: list them in "images" and run scripts/art.py first')
    out = ROOT / "out/jobs" / video
    out.mkdir(parents=True, exist_ok=True)
    written = []
    if shots:
        (out / "ltx.json").write_text(json.dumps({"model": "ltx", "shots": shots}, indent=1) + "\n")
        written.append(out / "ltx.json")
    if script.get("music"):
        m = script["music"]
        (out / "music.json").write_text(json.dumps({"model": "music", "shots": [{"name": "music", "prompt": m["prompt"], "seconds": m.get("seconds", 30)}]}, indent=1) + "\n")
        written.append(out / "music.json")
    return written


def bring(video: str, script: dict, src: Path) -> list[str]:
    """Copies the newest result of every clip, and the music, to their fixed names. Returns what is still missing."""
    dst = ROOT / "public/art" / video
    (dst / "clips").mkdir(parents=True, exist_ok=True)
    missing = []
    newest = lambda pattern: max(src.glob(pattern), key=lambda p: p.stat().st_mtime, default=None)
    for name in script.get("clips", {}):
        f = newest(f"*_{slug(name)}_seed*.mp4")
        if f is None:
            missing.append(name)
            continue
        shutil.copyfile(f, dst / "clips" / f"{name}.mp4")
        print(f"{video}: {f.name} -> {(dst / 'clips' / f'{name}.mp4').relative_to(ROOT)}")
    if script.get("music"):
        f = newest("*_music_seed*.*")
        if f is None:
            missing.append("music")
        else:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(f), "-b:a", "192k", str(dst / "music.mp3")], check=True)
            print(f"{video}: {f.name} -> {(dst / 'music.mp3').relative_to(ROOT)}")
    return missing


def main() -> None:
    args = sys.argv[1:]
    if len(args) < 2 or "/" not in args[0] or args[1] not in ("jobs", "import") or (args[1] == "import") != (len(args) == 3):
        sys.exit(__doc__)
    video = args[0]
    script = json.loads((ROOT / "src/videos" / video / "script.json").read_text())
    if not script.get("clips") and not script.get("music"):
        sys.exit(f'{video}: script.json has no "clips" and no "music" (see the usage: python3 scripts/clips.py)')
    if args[1] == "jobs":
        for f in jobs(video, script):
            print(f"{video}: {f.relative_to(ROOT)}  -> studio.py run {f.relative_to(ROOT)} out/clips/{video}")
        return
    missing = bring(video, script, Path(args[2]).resolve())
    if missing:
        sys.exit(f"{video}: nothing found yet for {', '.join(missing)} in {args[2]}")


if __name__ == "__main__":
    main()
