#!/usr/bin/env python3
"""Local narration: Phonon in English, Kokoro in Spanish.

For each src/videos/<series>/<id>/script.json, writes one wav per narration line to
public/audio/<series>/<id>/ and the line durations to timing.json beside the script.
English is read by Phonon 31M (Gradium, Apache 2.0), on the GPU of the Mac. A script.json with "lang": "es" is
read by Kokoro: the Spanish Phonon models may not be used commercially. "voice" picks another voice for one video:
a Phonon voice name ("Preston"), our own Phonon voice (voices/<Name>.safetensors, a Gradium Studio "Download for
Phonon" file, used as "<Name>"), a Kokoro voice ("am_fenrir"), which keeps that video on Kokoro, or a Speechify
voice ("speechify:<id>", English or Spanish, read by the Speechify API with the key in the env var SPEECHIFY_API_KEY;
the ids are listed by GET https://api.speechify.ai/v1/voices). "speed" sets the pace (0.95 is a little slower).
A script with "recording" is not spoken here: its voice is a recorded file, cut into lines by scripts/align.py.
Usage: tts.py <series | series/id> [...]   (a bare series means all its videos; one video also prints its timing)
       tts.py --hear "some text" [voice]   reads it with Phonon (or the voice) to out/voice/hear.wav and prints what Whisper heard
       tts.py --say "some text"         prints the Kokoro phonemes (the podcasts), to check how a name will be said
       tts.py --say-es "un texto"       the same for the Spanish voice
       tts.py --phonemes <series/id>    what the voice reads, line by line: the text Phonon reads (numbers as words),
                                        or the phonemes of a Kokoro video
       tts.py --phonemes <episode.md> [es]   the Kokoro phonemes of every turn of a podcast script
"""
import functools
import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

import check  # scripts/check.py: the timing rules

ROOT = Path(__file__).resolve().parent.parent
# The Kokoro install of the two-host-podcast skill (its scripts/install.sh), shared by videos and podcasts.
MODELS = Path.home() / ".local/share/two-host-podcast/models"
PHONON = "hf://gradium/phonon-31m-en"  # downloaded on first use; its voices are listed at huggingface.co/gradium/phonon-voices
SPEECHIFY = "https://api.speechify.ai/v1/audio/speech"
VOICE, SPEED = "Hadley", 1.0
# The "lang" of a script.json: its Kokoro phonemizer and its voice. Spanish is the preset of the podcasts.
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


@functools.cache
def kokoro():
    from kokoro_onnx import Kokoro

    return Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))


@functools.cache
def phonon():
    import ptts

    # The GPU (Metal) runs only the unquantized weights; a Mac without it runs them on the CPU.
    tts = ptts.TTS(PHONON, quant="f32", lang="en")
    # ponytail: the line cache keys on the voice's name, so a voice file replaced under the same name needs a new name.
    for f in sorted((ROOT / "voices").glob("*.safetensors")):
        tts.add_voice(f.stem, str(f))
    return tts


def on_kokoro(voice: str, lang: str) -> bool:
    """Kokoro voices are named like af_heart; Phonon voice names have no underscore. Speechify reads both languages."""
    return not voice.startswith("speechify:") and (lang != "en" or "_" in voice)


def read(text: str, voice: str, speed: float, lang: str = "en") -> tuple[np.ndarray, int]:
    """One line by Phonon or Speechify, with the silence around it cut to Kokoro's (0.05 s before, 0.1 s after), so
    the pace of a video does not change with the voice."""
    if voice.startswith("speechify:"):
        a, sr = speechify(text, voice.removeprefix("speechify:"), speed, lang)
        return trim(a, sr), sr
    tts = phonon()
    # ponytail: "duration_delta" is the model's own pace condition, not documented; this mapping was fitted on three
    # lines (0.95 reads about 6% longer, 1.1 about 10% shorter, each line within 5%).
    tts.set_conditions({"duration_delta": round(1.3 * (1 / speed - 1), 3)})
    return trim(tts.synth(text, voice=voice), tts.sample_rate), tts.sample_rate


def speechify(text: str, voice: str, speed: float, lang: str) -> tuple[np.ndarray, int]:
    """One line by the Speechify API. It has no speed field, so the pace is an SSML prosody rate."""
    import base64
    import io
    import urllib.error
    import urllib.request
    from xml.sax.saxutils import escape

    key = os.environ.get("SPEECHIFY_API_KEY") or sys.exit("a speechify: voice needs the env var SPEECHIFY_API_KEY")
    ssml = f'<speak><prosody rate="{round((speed - 1) * 100):+d}%">{escape(text)}</prosody></speak>'
    body = {"input": ssml, "voice_id": voice, "audio_format": "wav", "model": "simba-3.5"}
    if lang != "en":
        body["language"] = "es-MX"
    r = urllib.request.Request(
        SPEECHIFY, json.dumps(body).encode(), {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(r, timeout=120) as res:
            audio = base64.b64decode(json.load(res)["audio_data"])
    except urllib.error.HTTPError as e:
        sys.exit(f"Speechify said {e.code}: {e.read().decode()[:400]}")
    return sf.read(io.BytesIO(audio), dtype="float32")


def trim(a: np.ndarray, sr: int) -> np.ndarray:
    loud = np.flatnonzero(np.abs(a) > 0.005)
    return a[max(0, loud[0] - int(0.05 * sr)) : loud[-1] + int(0.1 * sr)] if len(loud) else a


def spoken(kokoro, line: str, lang: str) -> str:
    """The phonemes of a line. The fixes are English names, so they are for English only."""
    line = " ".join(__import__("re").sub(r"<[^<>]*>", " ", line).split())  # voice tags are for the Google voice only
    phonemes = kokoro.tokenizer.phonemize(line, LANGS[lang][0])
    for wrong, right in FIX.items() if lang == "en" else ():
        phonemes = phonemes.replace(wrong, right)
    return phonemes


def phonon_text(line: str) -> str:
    """What Phonon reads: the line without voice tags, numbers and abbreviations written out."""
    import ptts

    return ptts.normalize(check.plain(line), lang="en")


def main() -> None:
    videos = ROOT / "src/videos"
    mode = sys.argv[1] if sys.argv[1:2] and sys.argv[1].startswith("--") else None
    if not sys.argv[2 if mode else 1 :] or mode not in (None, "--hear", "--say", "--say-es", "--phonemes"):
        sys.exit(__doc__)
    if mode == "--hear":
        import align  # scripts/align.py: Whisper

        dst = ROOT / "out/voice/hear.wav"
        dst.parent.mkdir(parents=True, exist_ok=True)
        sf.write(dst, *read(check.plain(sys.argv[2]), (sys.argv[3:4] or [VOICE])[0], SPEED))
        print(f"reads: {phonon_text(sys.argv[2])}\nheard: {' '.join(w for w, _, _ in align.heard(dst, 'en', big=True)).strip()}\n{dst}")
        return
    if mode in ("--say", "--say-es"):
        print(kokoro().tokenizer.phonemize(" ".join(sys.argv[2:]), "en-us" if mode == "--say" else "es-419"))
        return
    if mode == "--phonemes" and sys.argv[2].endswith(".md"):  # a podcast script: one `**HOST_A:** text` per line
        lang = "es-419" if sys.argv[3:4] == ["es"] else "en-us"
        for n, line in enumerate(Path(sys.argv[2]).read_text().splitlines(), 1):
            if line.startswith("**HOST_"):
                print(f"{n}: {line}\n    {kokoro().tokenizer.phonemize(line.split(':**', 1)[1], lang)}")
        return
    if mode == "--phonemes":
        script, lang = load(sys.argv[2])
        k = on_kokoro(script.get("voice", LANGS[lang][1]), lang)
        for scene in script["scenes"]:
            for i, line in enumerate(scene["lines"]):
                print(f"{scene['id']} {i}: {line}\n    {spoken(kokoro(), line, lang) if k else phonon_text(line)}")
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
        k = on_kokoro(voice, lang)
        old = videos / vid / "timing.json"
        # What scripts/align.py found in a clip (its word times, the speech check) belongs to the clip: a clip that is not spoken again keeps it.
        found = {c["file"]: {k: c[k] for k in ("words", "missed", "heard") if k in c} for clips in (json.loads(old.read_text()) if old.exists() else {}).values() for c in clips}
        for scene in script["scenes"]:
            clips = timing[scene["id"]] = []
            for i, line in enumerate(scene["lines"]):
                said = spoken(kokoro(), line, lang) if k else PHONON + check.plain(line)
                digest = hashlib.sha1(f"{voice}{speed}{said}".encode()).hexdigest()[:8]
                dst = out / f"{scene['id']}-{i}-{digest}.wav"
                if not dst.exists():  # the hash in the name makes this a cache
                    if k:
                        sf.write(dst, *kokoro().create(said, voice=voice, speed=speed, is_phonemes=True))
                    else:
                        sf.write(dst, *read(check.plain(line), voice, speed, lang))
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
