#!/usr/bin/env python3
"""Subtitle files from the word times: videos/<series>/parts/<id>.srt beside each part, for the platforms that take one
(YouTube, LinkedIn: captions that viewers can turn on, and that search can read). The build writes them.

A cue is one line of at most 42 characters, broken where a sentence or a clause ends, and shown while its words are said.
Usage: python3 scripts/srt.py <series | series/id> [...]
"""
import json
import sys
from pathlib import Path

import check  # scripts/check.py: expand(), cues()

ROOT = Path(__file__).resolve().parent.parent
FPS, MAX = 30, 42


def chunks(words: list[tuple[str, float, float]]) -> list[tuple[str, float, float]]:
    """Groups words into cues: a new cue after a sentence or clause ends, or when the line would pass MAX characters."""
    out: list[list] = []
    for w, a, b in words:
        if out and not out[-1][0].endswith((".", "?", "!", ",", ";", ":")) and len(out[-1][0]) + 1 + len(w) <= MAX:
            out[-1] = [f"{out[-1][0]} {w}", out[-1][1], b]
        else:
            out.append([w, a, b])
    return [tuple(c) for c in out]


def stamp(s: float) -> str:
    ms = round(s * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def srt(video: str) -> None:
    d = ROOT / "src/videos" / video
    script = json.loads((d / "script.json").read_text())
    timing = json.loads((d / "timing.json").read_text())
    words, start = [], 0.0
    for s in script["scenes"]:
        b, dur = check.cues(timing[s["id"]], script.get("pace", check.PACE))
        for at, clip in zip(b, timing[s["id"]]):
            if "words" not in clip:
                sys.exit(f"{video}: no word times yet: run .venv/bin/python scripts/align.py {video}")
            words += [(str(w), start + at + float(x), start + at + float(y)) for w, x, y in clip["words"]]
        start += round(dur * FPS) / FPS  # scenes last a whole number of frames, as in src/engine.tsx
    cues = chunks(words)
    series, vid_id = video.split("/")
    out = ROOT / "videos" / series / "parts" / f"{vid_id}.srt"
    out.parent.mkdir(parents=True, exist_ok=True)
    # A cue stays until the next one starts, if that is soon, so the text does not blink between phrases.
    body = [f"{i}\n{stamp(a)} --> {stamp(min(cues[i][1], b + 0.6) if i < len(cues) else b + 0.6)}\n{text}\n" for i, (text, a, b) in enumerate(cues, 1)]
    out.write_text("\n".join(body))
    print(f"{video}: {len(cues)} subtitles -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    assert chunks([("Nine", 0, 0.3), ("people", 0.3, 0.6), ("got", 0.6, 0.8), ("on.", 0.8, 1), ("Eight", 1.2, 1.5), ("left.", 1.5, 1.9)]) == [("Nine people got on.", 0, 1), ("Eight left.", 1.2, 1.9)]
    for v in check.expand(sys.argv[1:]):
        srt(v)
