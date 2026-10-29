#!/usr/bin/env python3
"""The bridge between a video and the Colab generator of the ai-clips skill: it writes the jobs from script.json, and
brings the results back under names that do not change when a clip is made again.

script.json describes the clips, the music and the sound effects:
  "style": "One paragraph that fixes the look, the same words in every clip (light, lens, colour grade).",
  "clips": {"meet": {"image": "anna", "motion": "She looks up and nods once. The camera stays still.", "seconds": 7}},
  "music": {"prompt": "minimal electronic, soft piano, warm, 95 bpm, no vocals", "seconds": 30},
  "sfx": {"hum": {"prompt": "the steady low hum of an airplane cabin in flight", "seconds": 10}}
`image` is a picture of "images" (made first by scripts/art.py); the clip starts from it (image-to-video). Without it
the clip is made from text alone, which never keeps a face or a room the same. `motion` says only what changes.
A clip is upright (9:16) in an upright video and wide (16:9) in a math video, unless it says "aspect": "1:1" (any LTX
aspect). A transparent picture (the drawings of a sketch video) starts the clip on white: show such a clip over the
paper with mix-blend-mode multiply, and the white disappears.

Usage: python3 scripts/clips.py <series/id> jobs           -> out/jobs/<series>/<id>/ltx.json, music.json, sfx.json
       python3 scripts/clips.py <series/id> import <dir>   the files studio.py wrote -> public/art/<series>/<id>/clips/<name>.mp4,
                                                           music.mp3 and sfx/<name>.wav
In a scene: <Clip src="art/<series>/<id>/clips/meet.mp4" />; the music: bed: {name: 'art/<series>/<id>/music.mp3', vol: 0.03}
(scripts/mix.py says the right vol); an effect: {at: b[1], name: 'art/<series>/<id>/sfx/hum.wav', vol: 0.2}.
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


def start_frame(video: str, name: str, art: dict) -> str:
    """The picture a clip starts from. A transparent one is laid on white first: the video model cannot see through it."""
    src = ROOT / "public" / art["src"]
    fmt = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=pix_fmt", "-of", "csv=p=0", str(src)], capture_output=True, text=True).stdout
    if "a" not in fmt.replace("gray", ""):  # rgba, ya8, ... have an alpha channel
        return str(src)
    out = ROOT / "out/jobs" / video / "frames" / f"{name}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=white:s={art['w']}x{art['h']}", "-i", str(src), "-filter_complex", "[0][1]overlay=shortest=1,format=rgb24", "-frames:v", "1", str(out)], check=True)
    return str(out)


def jobs(video: str, script: dict) -> list[Path]:
    d = ROOT / "src/videos" / video
    art = json.loads((d / "art.json").read_text()) if (d / "art.json").exists() else {}
    kind = script.get("type", "math")
    upright = script.get("shape") == "upright" if kind == "explainer" else kind != "math"
    shots, missing = [], []
    bad = [n for n in [*script.get("clips", {}), *script.get("sfx", {})] if not re.fullmatch(r"[a-z0-9-]+", n)]
    if bad:
        sys.exit(f'{video}: clip and effect names are lower case letters, digits and dashes, like "meet-anna": {", ".join(bad)}')
    for name, c in script.get("clips", {}).items():
        shot = {"name": name, "prompt": " ".join(x for x in (script.get("style", ""), c["motion"], "No dialogue.") if x), "seconds": c.get("seconds", 7), "aspect": c.get("aspect", "9:16" if upright else "16:9")}
        if c.get("image"):
            if c["image"] not in art:
                missing.append(c["image"])
                continue
            shot["image"] = start_frame(video, c["image"], art[c["image"]])
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
    if script.get("sfx"):
        (out / "sfx.json").write_text(json.dumps({"model": "sfx", "shots": [{"name": n, "prompt": s["prompt"], "seconds": s.get("seconds", 5)} for n, s in script["sfx"].items()]}, indent=1) + "\n")
        written.append(out / "sfx.json")
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
    for name in script.get("sfx", {}):
        f = newest(f"*_{slug(name)}_seed*.*")
        if f is None:
            missing.append(name)
            continue
        (dst / "sfx").mkdir(exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(f), "-ar", "48000", str(dst / "sfx" / f"{name}.wav")], check=True)
        print(f"{video}: {f.name} -> {(dst / 'sfx' / f'{name}.wav').relative_to(ROOT)}")
    return missing


def main() -> None:
    args = sys.argv[1:]
    if len(args) < 2 or "/" not in args[0] or args[1] not in ("jobs", "import") or (args[1] == "import") != (len(args) == 3):
        sys.exit(__doc__)
    video = args[0]
    script = json.loads((ROOT / "src/videos" / video / "script.json").read_text())
    if not any(script.get(k) for k in ("clips", "music", "sfx")):
        sys.exit(f'{video}: script.json has no "clips", "music" or "sfx" (see the usage: python3 scripts/clips.py)')
    if args[1] == "jobs":
        for f in jobs(video, script):
            print(f"{video}: {f.relative_to(ROOT)}  -> studio.py run {f.relative_to(ROOT)} out/clips/{video}")
        return
    missing = bring(video, script, Path(args[2]).resolve())
    if missing:
        sys.exit(f"{video}: nothing found yet for {', '.join(missing)} in {args[2]}")


if __name__ == "__main__":
    main()
