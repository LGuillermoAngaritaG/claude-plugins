#!/usr/bin/env python3
"""Word times for the narration, and a check that the voice said every word, from a local Whisper transcription.

For each video, adds to every clip of timing.json its "words": [word, start, end], in seconds
into the clip. The words are the ones of script.json; the transcription only gives their times.
Scenes read them as `words[i]`, captions follow them, and `said(words, i, 'word')` puts a cue on one.

A script.json with "recording": "voice.wav" (a file beside it: an ElevenLabs export, your own
voice, anything ffmpeg reads) takes its voice from that file instead of Kokoro. The file is one
take of the whole script, read in order. It is cut into one clip per line, where each line starts.

The speech check lists, per line, the words of the script that Whisper did not hear, and keeps them
in timing.json as "missed" (with what it did hear as "heard"). Nobody listens before a video is
published: a flagged line is one to listen to. Whisper also mishears correct words, mostly names it
does not know, so a flag is not proof. Numbers said as words but heard as digits, and spellings that
differ a little ("neighbour", "neighbor"), are not flagged.

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
_models: dict = {}


def heard(wav: Path, lang: str, big: bool = False) -> list[tuple[str, float, float]]:
    """Every word Whisper hears in a file, with its start and end in seconds. `big` uses the larger model, for a second
    opinion on a line the small one flagged."""
    name = ("medium.en" if lang == "en" else "medium") if big else "small"
    if name not in _models:
        _models[name] = WhisperModel(name, device="cpu", compute_type="int8")
    model = _models[name]
    # ffmpeg decodes, so any format works: Whisper wants 16 kHz mono samples.
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(wav), "-f", "f32le", "-ar", "16000", "-ac", "1", "-"], check=True, capture_output=True).stdout
    segments, _ = model.transcribe(np.frombuffer(raw, np.float32), language=lang, word_timestamps=True, condition_on_previous_text=False)
    return [(w.word, float(w.start), float(w.end)) for s in segments for w in s.words]


def key(word: str) -> str:
    plain = unicodedata.normalize("NFD", word.lower())  # accents off: Whisper writes "como" for "cómo"
    return re.sub(r"[\W_]", "", "".join(c for c in plain if not unicodedata.combining(c)))


# Number words, English and Spanish. The voice says them; Whisper often writes digits instead.
NUMBERS = set(
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen "
    "eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion point half "
    "percent cero uno una un dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis "
    "diecisiete dieciocho diecinueve veinte veintiuno veintidos treinta cuarenta cincuenta sesenta setenta ochenta noventa "
    "cien ciento cientos doscientos trescientos cuatrocientos quinientos mil millon millones coma".split()
)


# Words Whisper writes as another word that sounds the same: hearing the second is hearing the first.
SOUNDALIKE = {"vanes": {"veins"}, "vane": {"vein"}, "tonne": {"ton"}, "tonnes": {"tons"}, "mount": {"mt"}, "metres": {"meters"}, "metre": {"meter"}, "litres": {"liters"}, "litre": {"liter"}}


def missed(line: str, found: list[tuple[str, float, float]]) -> list[str]:
    """The words of a line that Whisper did not hear, written plain (lower case, no accents)."""
    split = lambda words: [k for w in words for k in map(key, re.split(r"[-\u2013]", w)) if k]
    said, got = split(check.plain(line).split()), split(w for w, _, _ in found)
    match = difflib.SequenceMatcher(None, said, got, autojunk=False)
    hit = {a + k for a, _, n in match.get_matching_blocks() for k in range(n)}
    digits = any(c.isdigit() for w in got for c in w)
    return [
        w
        for k, w in enumerate(said)
        if k not in hit and not (digits and w in NUMBERS) and not SOUNDALIKE.get(w, set()) & set(got) and not any(difflib.SequenceMatcher(None, w, g).ratio() >= 0.8 for g in got)
    ]


def report(vid: str, script: dict, timing: dict) -> None:
    """Prints the lines to listen to."""
    flags = [(s["id"], i, c) for s in script["scenes"] for i, c in enumerate(timing[s["id"]]) if c.get("missed")]
    lines = sum(len(s["lines"]) for s in script["scenes"])
    if not flags:
        print(f"{vid}: speech check: Whisper heard every word of the {lines} lines")
        return
    print(f"{vid}: speech check: listen to {len(flags)} of {lines} lines; Whisper did not hear the words on the left")
    for scene, i, c in flags:
        print(f"  {scene} {i}: {', '.join(c['missed'])}  | heard: {c.get('heard', '')[:90]}  | public/audio/{vid}/{c['file']}")


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
    tokens = [(n, tok) for n, (_, _, line) in enumerate(lines) for tok in check.plain(line).split()]
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
        # Every line is transcribed once: for the speech check, and for the word times of the captions and of `said`.
        if script.get("recording"):
            timing = from_recording(vid, script, lang)
        else:
            timing = json.loads((d / "timing.json").read_text())
        new = 0
        for scene in script["scenes"]:
            for line, clip in zip(scene["lines"], timing[scene["id"]]):
                if "words" in clip and "missed" in clip:
                    continue
                found = heard(ROOT / "public/audio" / vid / clip["file"], lang)
                clip.setdefault("words", place(check.plain(line).split(), found, clip["dur"]))
                clip["missed"] = missed(line, found)
                if clip["missed"]:  # the small model often mishears; a larger one rules out most of these
                    again = heard(ROOT / "public/audio" / vid / clip["file"], lang, big=True)
                    if len(missed(line, again)) < len(clip["missed"]):
                        found, clip["missed"] = again, missed(line, again)
                clip.pop("heard", None)
                if clip["missed"]:
                    clip["heard"] = " ".join(w.strip() for w, _, _ in found)
                new += 1
        # One clip per line, so the file stays readable beside the script.
        body = ",\n".join(f' {json.dumps(k)}: [\n' + ",\n".join("  " + json.dumps(c, ensure_ascii=False) for c in v) + "\n ]" for k, v in timing.items())
        (d / "timing.json").write_text("{\n" + body + "\n}\n")
        print(f"{vid}: {new} line(s) transcribed")
        if script.get("recording"):
            check.table(vid)
        report(vid, script, timing)


if __name__ == "__main__":
    main()
