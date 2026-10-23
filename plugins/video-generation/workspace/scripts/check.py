#!/usr/bin/env python3
"""Checks a video before rendering: scenes match the script, and every timed cue lands inside its scene.

Usage: check.py <series | series/id> [...]   Exits 1 if anything is wrong.
It only sees cues written as `b[i]` or `b[i] + number`, so write them that way.
"""
import json
import re
import sys
from pathlib import Path

PACE = [0.4, 0.3, 0.7]  # same as src/engine.tsx: the pause before, between and after the lines of a scene
ROOT = Path(__file__).resolve().parent.parent
LOOKS = {"sketch": "SKETCH", "story": "STORY", "ad": "AD"}  # the "type" of a script.json and the look its VideoDef must name


def cues(clips: list, pace: list = PACE) -> tuple[list[float], float]:
    """When each narration line of a scene starts, and how long the scene lasts, in seconds."""
    lead, gap, tail = pace
    b, t, last = [], lead, 0.0
    for clip in clips:
        b.append(t)
        last = clip.get("gap", gap)
        t += clip["dur"] + last
    return b, t - last + tail


def table(vid: str) -> None:
    """Prints the timing of a video: what a scene needs to place its cues. Called by the voice step."""
    d = ROOT / "src/videos" / vid
    script = json.loads((d / "script.json").read_text())
    timing = json.loads((d / "timing.json").read_text())
    words = sum(len(line.split()) for s in script["scenes"] for line in s["lines"])
    start, rows = 0.0, []
    for scene in script["scenes"]:
        b, dur = cues(timing[scene["id"]], script.get("pace", PACE))
        rows.append(f"  {scene['id']:<12} {int(start // 60)}:{start % 60:04.1f}  {dur:5.1f}   " + "  ".join(f"{x:.1f}" for x in b))
        start += dur
    print(f"{vid}: {words} words, {int(start // 60)}:{int(start % 60):02d} with pauses")
    print("  scene        starts  lasts   b[0], b[1], ... = when each line starts, in seconds into the scene")
    print("\n".join(rows))


def check(vid: str) -> int:
    d = ROOT / "src/videos" / vid
    src = (d / "index.tsx").read_text()
    script = json.loads((d / "script.json").read_text())
    timing = json.loads((d / "timing.json").read_text())
    m = re.search(r"scenes: \{([^}]*)\}", src)
    if not m:
        print(f"{vid}: no `scenes: {{id: Component, ...}}` map found")
        return 1
    mapping = dict(p.strip().split(": ") for p in m.group(1).split(",") if p.strip())
    parts = re.split(r"\nconst (\w+): React\.FC<SceneProps>", src.split("\nexport const")[0])  # the VideoDef is not part of the last scene
    bodies = {parts[i]: parts[i + 1] for i in range(1, len(parts) - 1, 2)}
    bad = 0
    if f"id: '{vid.split('/')[1]}'" not in src:
        print(f"{vid}: the VideoDef `id` must be the folder name")
        bad += 1
    if re.search(r'tex="[^"\n]*\\\\[A-Za-z]', src):
        print(f'{vid}: a tex="..." attribute has a doubled backslash; inside quotes write one, as in tex="\\frac{{a}}{{b}}"')
        bad += 1
    kind = script.get("type", "math")
    if kind != "math" and (kind not in LOOKS or f"look: {LOOKS[kind]}" not in src):
        print(f'{vid}: "type": "{kind}" needs `look: {LOOKS.get(kind, "?")}` in its VideoDef (types: math, {", ".join(LOOKS)})')
        bad += 1
    if kind == "story" and script.get("case") not in ("fiction", "real"):
        print(f'{vid}: a story says what it is: "case": "fiction" or "case": "real"')
        bad += 1
    if script.get("case") == "real" and not script.get("sources"):
        print(f'{vid}: a real case lists where every fact comes from, in "sources"')
        bad += 1
    for name in set(re.findall(r"name: '([\w-]+)'", src)):
        if not (ROOT / "public/sfx" / f"{name}.wav").exists():
            print(f"{vid}: no sound named {name} in public/sfx")
            bad += 1
    for name in script.get("images", {}):
        if not list((ROOT / "public/art" / vid).glob(f"{name}.*")):
            print(f"{vid}: image {name} is not made yet, run scripts/art.py")
            bad += 1
    ids = [s["id"] for s in script["scenes"]]
    for sid in ids:
        if sid not in mapping:
            print(f"{vid}/{sid}: in the script but not in the scenes map")
            bad += 1
    total = 0.0
    for scene in script["scenes"]:
        sid = scene["id"]
        if len(timing.get(sid, [])) != len(scene["lines"]):
            print(f"{vid}/{sid}: timing.json is stale, run the tts step again")
            bad += 1
            continue
        b, dur = cues(timing[sid], script.get("pace", PACE))
        total += dur
        for i, plus in re.findall(r"(?<![\w.])b\[(\d+)\](?: \+ ([\d.]+))?", bodies.get(mapping.get(sid, ""), "")):
            i, plus = int(i), float(plus or 0)
            if i >= len(b):
                print(f"{vid}/{sid}: uses b[{i}] but the scene has {len(b)} lines")
                bad += 1
            elif b[i] + plus > dur - 1.2:
                print(f"{vid}/{sid}: b[{i}] + {plus:g} = {b[i] + plus:.1f}s, but the scene ends at {dur:.1f}s")
                bad += 1
    words = sum(len(line.split()) for s in script["scenes"] for line in s["lines"])
    print(f"{vid}: {len(ids)} scenes, {words} words, {int(total // 60)}:{int(total % 60):02d}, {bad} problem(s)")
    return bad


def expand(args: list[str]) -> list[str]:
    """`series/id` stays as it is; a bare `series` becomes all its videos."""
    out = []
    for a in args:
        found = [a] if "/" in a else sorted(f"{a}/{p.parent.name}" for p in (ROOT / "src/videos" / a).glob("*/script.json"))
        if not found or not (ROOT / "src/videos" / found[0] / "script.json").exists():
            sys.exit(f"no video or series named {a} in src/videos")
        out += found
    return out


if __name__ == "__main__":
    sys.exit(1 if sum(check(v) for v in expand(sys.argv[1:])) else 0)
