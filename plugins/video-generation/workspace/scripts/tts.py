#!/usr/bin/env python3
"""Local narration with Kokoro.

For each src/videos/<series>/<id>/script.json, writes one wav per narration line to
public/audio/<series>/<id>/ and the line durations to timing.json beside the script.
A script.json with "lang": "es" is spoken in Spanish; without it, in English. "voice" and "speed"
pick another Kokoro voice for one video. A script with "recording" is not spoken here: its voice
is a recorded file, cut into lines by scripts/align.py.
Usage: tts.py <series | series/id> [...]   (a bare series means all its videos; one video also prints its timing)
       tts.py --say "some text"         prints the phonemes, to check how a name will be said
       tts.py --say-es "un texto"       the same for the Spanish voice of the podcasts
       tts.py --phonemes <series/id>    prints the phonemes of every line of a video script
       tts.py --phonemes <episode.md> [es]   the same for every turn of a podcast script
"""
import hashlib
import json
import os
import sys
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

import check  # scripts/check.py: the timing rules

ROOT = Path(__file__).resolve().parent.parent
# The Kokoro install of the two-host-podcast skill (its scripts/install.sh), shared by videos and podcasts.
MODELS = Path.home() / ".local/share/two-host-podcast/models"
VOICE, SPEED = "af_heart", 1.0
# The "lang" of a script.json: its phonemizer and its voice. Spanish is the preset of the podcasts.
LANGS = {"en": ("en-us", VOICE), "es": ("es-419", "ef_dora")}

# The phonemizer gets these names wrong, so the phonemes are patched before synthesis.
FIX = {
    "nˈeɪviɚ": "nˈævieɪ",  # Navier
    "bˈɜːnaʊli": "bɚnˈuːli",  # Bernoulli
    "ˈoʊliz": "ˈoʊlɪs",  # Coriolis
    "stɹˈaʊhəl": "stɹˈuːhɑːl",  # Strouhal
    "vˈɑːluːt": "vəlˈuːt",  # volute
    "ɹˈeɪŋɡənz": "ɹˈaɪnɡænz",  # Rheingans
}


def load(vid: str) -> tuple[dict, str]:
    """A script and its language."""
    script = json.loads((ROOT / "src/videos" / vid / "script.json").read_text())
    lang = script.get("lang", "en")
    if lang not in LANGS:
        sys.exit(f'{vid}: "lang" is "{lang}", but the voice step only knows {", ".join(LANGS)}')
    return script, lang


def spoken(kokoro: Kokoro, line: str, lang: str) -> str:
    """The phonemes of a line. The fixes are English names, so they are for English only."""
    line = " ".join(__import__("re").sub(r"<[^<>]*>", " ", line).split())  # voice tags are for the Google voice only
    phonemes = kokoro.tokenizer.phonemize(line, LANGS[lang][0])
    for wrong, right in FIX.items() if lang == "en" else ():
        phonemes = phonemes.replace(wrong, right)
    return phonemes


def main() -> None:
    videos = ROOT / "src/videos"
    mode = sys.argv[1] if sys.argv[1:2] and sys.argv[1].startswith("--") else None
    if not sys.argv[2 if mode else 1 :] or mode not in (None, "--say", "--say-es", "--phonemes"):
        sys.exit(__doc__)
    kokoro = Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))
    if mode in ("--say", "--say-es"):
        print(kokoro.tokenizer.phonemize(" ".join(sys.argv[2:]), "en-us" if mode == "--say" else "es-419"))
        return
    if mode == "--phonemes" and sys.argv[2].endswith(".md"):  # a podcast script: one `**HOST_A:** text` per line
        lang = "es-419" if sys.argv[3:4] == ["es"] else "en-us"
        for n, line in enumerate(Path(sys.argv[2]).read_text().splitlines(), 1):
            if line.startswith("**HOST_"):
                print(f"{n}: {line}\n    {kokoro.tokenizer.phonemize(line.split(':**', 1)[1], lang)}")
        return
    if mode == "--phonemes":
        script, lang = load(sys.argv[2])
        for scene in script["scenes"]:
            for i, line in enumerate(scene["lines"]):
                print(f"{scene['id']} {i}: {line}\n    {spoken(kokoro, line, lang)}")
        return
    ids = check.expand(sys.argv[1:])
    for vid in ids:
        script, lang = load(vid)
        if script.get("recording"):
            print(f"{vid}: voice from {script['recording']}, cut by scripts/align.py")
            continue
        out = ROOT / "public/audio" / vid
        out.mkdir(parents=True, exist_ok=True)
        timing, keep = {}, set()
        voice, speed = script.get("voice", LANGS[lang][1]), script.get("speed", SPEED)
        old = videos / vid / "timing.json"
        # What scripts/align.py found in a clip (its word times, the speech check) belongs to the clip: a clip that is not spoken again keeps it.
        found = {c["file"]: {k: c[k] for k in ("words", "missed", "heard") if k in c} for clips in (json.loads(old.read_text()) if old.exists() else {}).values() for c in clips}
        for scene in script["scenes"]:
            clips = timing[scene["id"]] = []
            for i, line in enumerate(scene["lines"]):
                phonemes = spoken(kokoro, line, lang)
                digest = hashlib.sha1(f"{voice}{speed}{phonemes}".encode()).hexdigest()[:8]
                dst = out / f"{scene['id']}-{i}-{digest}.wav"
                if not dst.exists():  # the hash in the name makes this a cache
                    samples, rate = kokoro.create(phonemes, voice=voice, speed=speed, is_phonemes=True)
                    sf.write(dst, samples, rate)
                clips.append({"file": dst.name, "dur": round(sf.info(dst).duration, 3)})
                clips[-1].update(found.get(dst.name, {}))
                keep.add(dst.name)
        for stale in out.glob("*.wav"):
            if stale.name not in keep:
                stale.unlink()
        (videos / vid / "timing.json").write_text(json.dumps(timing, indent=1) + "\n")
        if len(ids) == 1:
            check.table(vid)
        else:
            total = sum(c["dur"] for clips in timing.values() for c in clips)
            print(f"{vid}: {total:.0f}s of narration")


if __name__ == "__main__":
    main()
    # The speech runtime sometimes aborts while Python shuts down, after all the work is done.
    # Leaving at once keeps that from failing the build.
    sys.stdout.flush()
    os._exit(0)
