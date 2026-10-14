#!/usr/bin/env python3
"""Word times for the narration, from a local Whisper transcription.

For each video, adds to every clip of timing.json its "words": [word, start, end], in seconds
into the clip. The words are the ones of script.json; the transcription only gives their times.
Scenes read them as `words[i]`, captions follow them, and `said(words, i, 'word')` puts a cue on one.

A script.json with "recording": "voice.wav" (a file beside it: an ElevenLabs export, your own
voice, anything ffmpeg reads) takes its voice from that file instead of Kokoro. The file is one
take of the whole script, read in order. It is cut into one clip per line, where each line starts.

Usage: .venv/bin/python scripts/align.py <series | series/id> [...]
"""
import difflib
import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

import check  # scripts/check.py: expand()

ROOT = Path(__file__).resolve().parent.parent
PAD = 0.06  # a clip of a recording starts this long before its first word
_model = None


def heard(wav: Path, lang: str) -> list[tuple[str, float, float]]:
    """Every word Whisper hears in a file, with its start and end in seconds."""
    global _model
    _model = _model or WhisperModel("small", device="cpu", compute_type="int8")
    # ffmpeg decodes, so any format works: Whisper wants 16 kHz mono samples.
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(wav), "-f", "f32le", "-ar", "16000", "-ac", "1", "-"], check=True, capture_output=True).stdout
    segments, _ = _model.transcribe(np.frombuffer(raw, np.float32), language=lang, word_timestamps=True, condition_on_previous_text=False)
    return [(w.word, float(w.start), float(w.end)) for s in segments for w in s.words]


def key(word: str) -> str:
    plain = unicodedata.normalize("NFD", word.lower())  # accents off: Whisper writes "como" for "cómo"
    return re.sub(r"[\W_]", "", "".join(c for c in plain if not unicodedata.combining(c)))


def place(tokens: list[str], found: list[tuple[str, float, float]], end: float) -> list[list]:
    """Gives every script word a start and an end. A word Whisper heard gets its time; the others share the time between their neighbours."""
    times: list = [None] * len(tokens)
    match = difflib.SequenceMatcher(None, [key(t) for t in tokens], [key(w) for w, _, _ in found], autojunk=False)
    for a, b, n in match.get_matching_blocks():
        for k in range(n):
            times[a + k] = found[b + k][1:]
    i = 0
    while i < len(tokens):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(tokens) and times[j] is None:
            j += 1
        t0 = times[i - 1][1] if i else 0.0
        t1 = times[j][0] if j < len(tokens) else end
        sizes = [len(t) + 1 for t in tokens[i:j]]
        at = t0
        for k, size in enumerate(sizes):
            step = (t1 - t0) * size / sum(sizes)
            times[i + k] = (at, at + step)
            at += step
        i = j
    return [[tok, round(a, 2), round(max(a, b), 2)] for tok, (a, b) in zip(tokens, times)]


def from_recording(vid: str, script: dict, lang: str) -> dict:
    """Cuts the recording into one clip per line and returns the timing of the video."""
    d = ROOT / "src/videos" / vid
    src = d / script["recording"]
    lines = [(s["id"], i, line) for s in script["scenes"] for i, line in enumerate(s["lines"])]
    digest = hashlib.sha1(src.read_bytes() + json.dumps(lines).encode()).hexdigest()[:8]
    out = ROOT / "public/audio" / vid
    out.mkdir(parents=True, exist_ok=True)
    old = json.loads((d / "timing.json").read_text()) if (d / "timing.json").exists() else {}
    if old and all(c["file"].endswith(f"{digest}.wav") and (out / c["file"]).exists() for clips in old.values() for c in clips):
        return old  # the same recording and the same script as last time
    total = sf.info(src).duration
    tokens = [(n, tok) for n, (_, _, line) in enumerate(lines) for tok in line.split()]
    words = place([tok for _, tok in tokens], heard(src, lang), total)
    per = [[w for (n, _), w in zip(tokens, words) if n == k] for k in range(len(lines))]
    timing: dict = {}
    for k, (scene, i, _) in enumerate(lines):
        start = max(0.0, per[k][0][1] - PAD)
        # Inside a scene the take plays on to the next line, with its own pauses. The last line of a scene ends after its last word.
        inside = k + 1 < len(lines) and lines[k + 1][0] == scene
        stop = per[k + 1][0][1] - PAD if inside else min(total, per[k][-1][2] + 0.25)
        name = f"{scene}-{i}-{digest}.wav"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ss", f"{start:.3f}", "-to", f"{stop:.3f}", "-ar", "48000", "-ac", "1", str(out / name)], check=True)
        timing.setdefault(scene, []).append(
            {"file": name, "dur": round(stop - start, 3), "gap": 0, "words": [[w, round(a - start, 2), round(b - start, 2)] for w, a, b in per[k]]}
        )
    for stale in out.glob("*.wav"):
        if not stale.name.endswith(f"{digest}.wav"):
            stale.unlink()
    return timing


def main() -> None:
    if not sys.argv[1:]:
        sys.exit(__doc__)
    for vid in check.expand(sys.argv[1:]):
        d = ROOT / "src/videos" / vid
        script = json.loads((d / "script.json").read_text())
        lang = script.get("lang", "en")
        # Only videos that use word times pay for the transcription: the upright types (captions), a recording, or a scene that reads `words`.
        if not (script.get("recording") or script.get("type", "math") != "math" or "words" in (d / "index.tsx").read_text()):
            continue
        if script.get("recording"):
            timing = from_recording(vid, script, lang)
        else:
            timing = json.loads((d / "timing.json").read_text())
        new = 0
        for scene in script["scenes"]:
            for line, clip in zip(scene["lines"], timing[scene["id"]]):
                if "words" not in clip:
                    wav = ROOT / "public/audio" / vid / clip["file"]
                    clip["words"] = place(line.split(), heard(wav, lang), clip["dur"])
                    new += 1
        # One clip per line, so the file stays readable beside the script.
        body = ",\n".join(f' {json.dumps(k)}: [\n' + ",\n".join("  " + json.dumps(c, ensure_ascii=False) for c in v) + "\n ]" for k, v in timing.items())
        (d / "timing.json").write_text("{\n" + body + "\n}\n")
        print(f"{vid}: word times for {new} new clip(s)")
        if script.get("recording"):
            check.table(vid)


if __name__ == "__main__":
    main()
