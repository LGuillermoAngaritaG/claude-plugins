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
LOOKS = {"sketch": "SKETCH", "story": "STORY", "ad": "AD", "explainer": "EXPLAIN"}  # the "type" of a script.json and the look its VideoDef must name
# Words that state a number. In an explainer each one must appear in a claim of facts.json, which says where it comes from.
NUMBER_WORDS = {"eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety", "hundred", "thousand", "million", "billion", "percent", "quarter", "third"}


def plain(line: str) -> str:
    """A line without its voice tags (<short pause>, <gasp>, <sigh> ...): what is said and shown. The Google voice
    performs the tags; every tool that turns lines into words reads them through this."""
    return re.sub(r"\s+", " ", re.sub(r"<[^<>]*>", " ", line)).strip()


def numbers(line: str) -> set[str]:
    """The numbers a line of narration states: digits, and number words from twelve up, percent, a quarter, a third."""
    words = re.findall(r"[a-z]+|\d[\d.,]*", plain(line).lower())
    return {w for w in words if w[0].isdigit() or w in NUMBER_WORDS or w.rstrip("s") in NUMBER_WORDS}


def facts(vid: str, script: dict) -> int:
    """An explainer lists every claim and its source in facts.json; every number of the narration must be in a claim."""
    f = ROOT / "src/videos" / vid / "facts.json"
    if not f.exists():
        print(f'{vid}: an explainer needs facts.json: {{"claims": [{{"says": "...", "source": "https://..."}}]}}')
        return 1
    claims = json.loads(f.read_text()).get("claims", [])
    bad = 0
    for c in claims:
        if not c.get("says") or not c.get("source"):
            print(f'{vid}: every claim in facts.json has "says" and "source": {json.dumps(c)[:80]}')
            bad += 1
    said = " ".join(c.get("says", "") for c in claims).lower()
    for s in script["scenes"]:
        for i, line in enumerate(s["lines"]):
            missing = sorted(n for n in numbers(line) if n not in said)
            if missing:
                print(f'{vid}/{s["id"]} {i}: says {", ".join(missing)}, which no claim of facts.json covers')
                bad += 1
    # The sources, readable, for the video's description; a Short (short.py) carries only its chapters' part of them.
    refs = ROOT / "src/videos" / vid / "references.md"
    if not refs.exists():
        print(f"{vid}: an explainer lists its sources for the description in references.md (explainer-video skill, Stage 1)")
        return bad + 1
    if not script.get("from"):
        listed = refs.read_text()
        for url in sorted({u.rstrip(";,") for c in claims for u in re.findall(r"https?://\S+", c.get("source", ""))}):
            if url not in listed:
                print(f"{vid}: the source {url} of facts.json is not in references.md")
                bad += 1
    return bad


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
    words = sum(len(plain(line).split()) for s in script["scenes"] for line in s["lines"])
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
    def scenes_in(code: str) -> dict:
        parts = re.split(r"\nconst (\w+): React\.FC<SceneProps>", code.split("\nexport const")[0])  # what follows is not part of the last scene
        return {parts[i]: parts[i + 1] for i in range(1, len(parts) - 1, 2)}

    bodies = scenes_in(src)
    # A long video coded in several scene files maps `hook: A.scenes.hook`: read each scene in the file it is written in.
    for comp in mapping.values():
        ref = re.fullmatch(r"(\w+)\.scenes\.(\w+)", comp)
        imp = ref and re.search(rf"import \* as {ref.group(1)} from '\./([\w-]+)'", src)
        if imp and (d / f"{imp.group(1)}.tsx").exists():
            code = (d / f"{imp.group(1)}.tsx").read_text()
            local = re.search(r"export const scenes[^=]*= \{([^}]*)\}", code)
            names = dict(p.strip().split(": ") for p in local.group(1).split(",") if p.strip()) if local else {}
            bodies[comp] = scenes_in(code).get(names.get(ref.group(2), ""), "")
    bad = 0
    if f"id: '{vid.split('/')[1]}'" not in src:
        print(f"{vid}: the VideoDef `id` must be the folder name")
        bad += 1
    if re.search(r'tex="[^"\n]*\\\\[A-Za-z]', src):
        print(f'{vid}: a tex="..." attribute has a doubled backslash; inside quotes write one, as in tex="\\frac{{a}}{{b}}"')
        bad += 1
    kind = script.get("type", "math")
    look = LOOKS.get(kind, "?") + ("_V" if kind == "explainer" and script.get("shape") == "upright" else "")
    if kind != "math" and (kind not in LOOKS or not re.search(rf"look: {look}\b", src)):
        print(f'{vid}: "type": "{kind}" needs `look: {look}` in its VideoDef (types: math, {", ".join(LOOKS)})')
        bad += 1
    if kind == "explainer":
        bad += facts(vid, script)
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
        # A cue on a word the line does not say stops the whole scene from rendering (said() throws): catch it here.
        key = lambda w: re.sub(r"[\W_]", "", w.lower())
        for i, word in re.findall(r"said\(words, (\d+), '([^']+)'\)", bodies.get(mapping.get(sid, ""), "")):
            clip = timing[sid][int(i)] if int(i) < len(timing[sid]) else {}
            if "words" in clip and not any(key(str(w[0])).startswith(key(word)) for w in clip["words"]):
                print(f'{vid}/{sid}: cues on "{word}", which line {i} does not say')
                bad += 1
    words = sum(len(plain(line).split()) for s in script["scenes"] for line in s["lines"])
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
