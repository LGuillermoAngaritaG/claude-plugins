#!/usr/bin/env python3
"""Cuts an upright Short out of a long explainer: a run of its scenes, with the long video's own voice. No new voice and
no new scene code: the Short plays the long video's scenes under the upright look, so those scenes must lay out for
both shapes (useTall() of the explainer kit). Plan the runs a Short may come from when you plan the long video: about
a minute each (150 to 190 words), starting on a line that works as a hook and ending on a payoff.

It writes src/videos/<series>/<short-id>/:
  script.json  those scenes and lines, upright, "recording": "voice.wav"
  voice.wav    the long video's clips of those lines, end to end (align.py cuts it again and times the words)
  facts.json   copied from the long video, so the facts check passes
  references.md  the long video's sources, cut to the chapters of these scenes (for the Short's description)
  index.tsx    the long video's scenes, sounds and pictures under the look EXPLAIN_V
Then run the loop as for any video: align.py, check.py, stills.mjs (fix in the long video any scene that does not fit
the upright frame), build.sh.

Usage: python3 scripts/short.py <series/long-id> <short-id> "<title>" <scene> [<scene> ...] [--again]
  --again  cut an existing Short again, after the long video's voice or facts changed (then align.py again)
"""
import io
import json
import re
import shutil
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCENE_GAP = 0.6  # seconds of silence between scenes; between lines the long video's own gap


def camel(vid_id: str) -> str:
    words = re.sub(r"^\d+[a-z]?-", "", vid_id).split("-")
    return words[0] + "".join(w.title() for w in words[1:])


def join(clips: list[tuple[Path, float]]) -> bytes:
    """WAV clips end to end, each followed by its silence in seconds."""
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        for i, (path, after) in enumerate(clips):
            with wave.open(str(path)) as r:
                if i == 0:
                    w.setparams(r.getparams())
                    params = (r.getframerate(), r.getsampwidth(), r.getnchannels())
                elif (r.getframerate(), r.getsampwidth(), r.getnchannels()) != params:
                    sys.exit(f"{path.name} has another format than the first clip")
                w.writeframes(r.readframes(r.getnframes()))
                w.writeframes(b"\0" * int(params[0] * after) * params[1] * params[2])
    return out.getvalue()


def references(text: str, scenes: list[str]) -> str:
    """The long video's references.md cut to the chapters these scenes belong to. Each chapter section lists its scenes
    in a `<!-- scenes: a b -->` comment; the text before the chapters and sections without that comment are kept."""
    parts = re.split(r"(?m)^(?=## )", text)
    return "".join(p for p in parts if not (m := re.search(r"<!-- scenes: ([^>]*?) -->", p)) or set(m.group(1).split()) & set(scenes))


def main() -> None:
    again = "--again" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--again"]
    if len(args) < 4 or args[0].count("/") != 1:
        sys.exit(__doc__)
    long_vid, short_id, title, scenes = args[0], args[1], args[2], args[3:]
    series, long_id = long_vid.split("/")
    src = ROOT / "src/videos" / long_vid
    dst = ROOT / "src/videos" / series / short_id
    if not re.fullmatch(r"\d\d[a-z]?-[a-z0-9-]+", short_id):
        sys.exit(f'the id "{short_id}" must start with two digits and use lower case and dashes, like 04-short-rope')
    if (dst / "script.json").exists() and not again:
        sys.exit(f"{dst.relative_to(ROOT)} already has a video; add --again to cut it again from the long video")
    script = json.loads((src / "script.json").read_text())
    timing = json.loads((src / "timing.json").read_text())
    known = [s["id"] for s in script["scenes"]]
    missing = [s for s in scenes if s not in known]
    if missing:
        sys.exit(f"{long_vid} has no scene {', '.join(missing)} (its scenes: {', '.join(known)})")
    m = re.search(r"export const (\w+): VideoDef", (src / "index.tsx").read_text())
    if not m:
        sys.exit(f"{long_vid}/index.tsx exports no VideoDef")
    gap = script.get("pace", [0.4, 0.3, 0.7])[1]
    clips, picked = [], []
    for sid in scenes:
        scene = next(s for s in script["scenes"] if s["id"] == sid)
        if len(timing.get(sid, [])) != len(scene["lines"]):
            sys.exit(f"{long_vid}/{sid}: timing.json is stale, run the voice step of the long video first")
        for i, c in enumerate(timing[sid]):
            last = i == len(timing[sid]) - 1
            clips.append((ROOT / "public/audio" / long_vid / c["file"], SCENE_GAP if last else c.get("gap", gap)))
        picked.append(scene)
    dst.mkdir(parents=True, exist_ok=True)
    keep = {k: script[k] for k in ("lang", "pace") if k in script}
    short = {"title": title, "type": "explainer", "shape": "upright", **keep, "recording": "voice.wav", "from": long_vid, "scenes": picked}
    (dst / "script.json").write_text(json.dumps(short, indent=1, ensure_ascii=False) + "\n")
    (dst / "timing.json").write_text("{}\n")
    audio = join(clips)
    (dst / "voice.wav").write_bytes(audio)
    if (src / "facts.json").exists():
        shutil.copy(src / "facts.json", dst / "facts.json")
    if (src / "references.md").exists():
        (dst / "references.md").write_text(references((src / "references.md").read_text(), scenes))
    name, long_name = camel(short_id), m.group(1)
    table = ", ".join(f"{sid}: S.{sid}" if re.fullmatch(r"[A-Za-z_]\w*", sid) else f"'{sid}': S['{sid}']" for sid in scenes)
    (dst / "index.tsx").write_text(f"""// A Short cut from {long_vid} by scripts/short.py: its scenes, sounds and pictures, under the upright look.
// Fix a scene that does not fit the upright frame in the long video, with useTall(), not here.
import {{VideoDef}} from '../../../engine';
import {{EXPLAIN_V}} from '../../../kits/explainer';
import {{{long_name}}} from '../{long_id}';
import script from './script.json';
import timing from './timing.json';

const S = {long_name}.scenes;
export const {name}: VideoDef = {{
  id: '{short_id}',
  look: EXPLAIN_V,
  art: {long_name}.art,
  script,
  timing,
  scenes: {{{table}}},
  sounds: {long_name}.sounds,
}};
""")
    with wave.open(io.BytesIO(audio)) as w:
        seconds = w.getnframes() / w.getframerate()
    words = sum(len(line.split()) for s in picked for line in s["lines"])
    note = "" if 40 <= seconds <= 75 else "  (a Short of about a minute is 150 to 190 words: pick more or fewer scenes)"
    print(f"{dst.relative_to(ROOT)}: {len(picked)} scenes, {words} words, voice {seconds:.1f} s{note}")
    print(f"next: .venv/bin/python scripts/align.py {series}/{short_id}, then check.py and stills.mjs")


if __name__ == "__main__":
    main()
