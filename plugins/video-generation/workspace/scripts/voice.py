#!/usr/bin/env python3
"""A Google Cloud voice for a video: Gemini TTS (a style you describe in words) or Chirp 3 HD. It reads the script in
takes of about a minute and joins them as voice.wav beside script.json; scripts/align.py then cuts it into one clip per
line, as for any "recording". Each take is kept in out/voice/<series>/<id>/: only a take whose text, voice or style
changed is made again. A take with a fault (a word blurred, an extra sound at its end) is read again by deleting its
file there.

Takes are short because Gemini drifts in a long one: in the first channel week, takes of two to four minutes got up to
16 dB quieter toward their end, breathy like a whisper, and moved in pitch by half. Each take is also a new performance
(Gemini has no seed), so every new take is measured: one whose quietest stretch sits FADE dB under its loudest, or whose
pitch is PITCH off the rest of the video, is read again, up to TRIES readings, and the steadiest is kept.

script.json names the voice and the take:
  "recording": "voice.wav",
  "google": {"voice": "Charon", "model": "gemini-3.1-flash-tts-preview", "style": "A calm, clear, friendly teacher."}
"model" is a Gemini TTS model (the default) or "chirp3-hd". "style" only works with Gemini; it is the instruction for
how to read (pace, warmth, energy), not the text.

Emotion where the script needs it (Gemini only): a scene can add its own "tone", which is added to the style for that
scene ("tone": "quiet wonder, slower"); scenes with another tone are read as separate takes. Inside a line, voice tags
in angle brackets are performed, not read: <short pause>, <long pause>, <breath>, <sigh>, <gasp>, <chuckle>, <whispers>.
Commas, dashes and "..." make natural hesitations. The tags never reach the captions or the word times (check.plain).
Use them where a person would: one or two per scene at most. "voice" is one of the 30 Google voices (Charon, Kore, Puck, Aoede,
Fenrir, Leda, Orus, Zephyr, ...). "lang": "es" in the script reads Spanish.

Credentials come from gcloud (`gcloud auth login`). The Cloud project that pays (it needs the Text-to-Speech API on) is,
in this order: "project" in "google", the env var TTS_PROJECT, "google_project" in settings.json at the workspace root
(a file of yours that updates never touch), or the default project of gcloud.

Usage: .venv/bin/python scripts/voice.py <series/id> [...]   takes for the videos that have "google"; the others are skipped
       .venv/bin/python scripts/voice.py --try "A line." [--voice Kore] [--model chirp3-hd] [--style "..."]
                                                         one line to out/voice/try-<voice>-<model>.wav, to compare voices
"""
import base64
import hashlib
import io
import json
import os
import statistics
import subprocess
import sys
import urllib.error
import urllib.request
import wave
from pathlib import Path

import check  # scripts/check.py: expand()

ROOT = Path(__file__).resolve().parent.parent
GEMINI = "gemini-3.1-flash-tts-preview"
STYLE = "Read like a calm, clear, friendly teacher, at a steady, natural pace. Pause briefly between sentences, and a little longer between paragraphs."
LIMIT = 1000  # bytes of text per take, about a minute of speech (Gemini takes 4000, but drifts in a long take)
FADE, PITCH, TRIES = 5.0, 0.12, 3  # a take drifted: a stretch this many dB under its loudest, or pitch this far off
LANG = {"en": "en-US", "es": "es-US"}


def body(text: str, g: dict, lang: str = "en", tone: str = "") -> dict:
    """The request for one take; `tone` is added to the style for this take."""
    code = LANG.get(lang, lang)
    model = g.get("model", GEMINI)
    voice = {"languageCode": code, "name": g.get("voice", "Charon")}
    out = {"input": {"text": text}, "voice": voice, "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": 24000}}
    if model == "chirp3-hd":
        voice["name"] = f"{code}-Chirp3-HD-{voice['name']}"
    else:
        voice["modelName"] = model
        out["input"]["prompt"] = (g.get("style", STYLE) + (" " + tone if tone else "")).strip()
    return out


def chunks(scenes: list[tuple[list[str], str]], limit: int = LIMIT) -> list[tuple[str, str]]:
    """The script as takes (text, tone): neighbouring scenes of one tone share a take of at most `limit` bytes; a scene
    too long alone splits between lines."""
    paras = []
    for lines, tone in scenes:
        text = "\n".join(lines)
        paras += [(text, tone)] if len(text.encode()) <= limit else [(line, tone) for line in lines]
    out: list[tuple[str, str]] = []
    for p, tone in paras:
        if out and out[-1][1] == tone and len((out[-1][0] + "\n\n" + p).encode()) <= limit:
            out[-1] = (out[-1][0] + "\n\n" + p, tone)
        else:
            out.append((p, tone))
    return out


def project(g: dict) -> str:
    settings = ROOT / "settings.json"
    found = g.get("project") or os.environ.get("TTS_PROJECT") or (json.loads(settings.read_text()).get("google_project") if settings.exists() else None)
    if not found:
        found = subprocess.run(["gcloud", "config", "get-value", "project"], capture_output=True, text=True).stdout.strip()
    if not found or found == "(unset)":
        sys.exit('no Cloud project to bill the voice to: put {"google_project": "<id>"} in settings.json, or set TTS_PROJECT')
    return found


def speak(req: dict, proj: str) -> bytes:
    """One request; the WAV it returns."""
    token = subprocess.run(["gcloud", "auth", "print-access-token"], capture_output=True, text=True, check=True).stdout.strip()
    r = urllib.request.Request(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        data=json.dumps(req).encode(),
        headers={"Authorization": f"Bearer {token}", "x-goog-user-project": proj, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(r, timeout=600) as res:
            return base64.b64decode(json.load(res)["audioContent"])
    except urllib.error.HTTPError as e:
        sys.exit(f"Text-to-Speech said {e.code}: {e.read().decode()[:400]}")


def take_file(req: dict, store: Path) -> Path:
    """Where the take of one request is kept: named by the hash of the request."""
    return store / (hashlib.sha1(json.dumps(req, sort_keys=True).encode()).hexdigest()[:12] + ".wav")


def cached(req: dict, proj: str, store: Path) -> bytes:
    """One take, kept in `store` by the hash of its request: a changed line only makes its own take again. Delete a
    take's file (or the folder) to read it again."""
    f = take_file(req, store)
    if not f.exists():
        store.mkdir(parents=True, exist_ok=True)
        f.write_bytes(speak(req, proj))
    return f.read_bytes()


def sound(data: bytes) -> tuple[float, float]:
    """How a take sounds, to catch one that drifted: how many dB its quietest 20 s stretch of speech sits under its
    loudest, and its median pitch in Hz (0 when nothing in it is voiced)."""
    import numpy as np  # the workspace's .venv

    with wave.open(io.BytesIO(data)) as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    n = int(sr * 0.04)
    f = a[: len(a) // n * n].reshape(-1, n)
    power = np.mean(f**2, axis=1)
    speech = power > 1e-5  # -50 dBFS: speech, even whispered, but not the pauses
    per = 500  # frames of 40 ms in a stretch of 20 s
    stretches = [10 * np.log10(np.mean(power[i : i + per][speech[i : i + per]])) for i in range(0, len(f), per) if speech[i : i + per].sum() >= 100]
    fade = max(stretches) - min(stretches) if stretches else 0.0
    x = f[speech] - f[speech].mean(axis=1, keepdims=True)
    r = np.fft.irfft(np.abs(np.fft.rfft(x, 2 * n)) ** 2)[:, :n]  # autocorrelation of each frame
    r /= r[:, :1] + 1e-12
    lo, hi = sr // 400, sr // 60
    lag = lo + np.argmax(r[:, lo:hi], axis=1)
    voiced = r[np.arange(len(r)), lag] > 0.5
    return float(fade), float(np.median(sr / lag[voiced])) if voiced.any() else 0.0


def off(s: tuple[float, float], ref: float) -> float:
    """How far a take drifted, 1 or more when it should be read again: its fade against FADE, its pitch against `ref`."""
    fade, pitch = s
    return max(fade / FADE, abs(pitch / ref - 1) / PITCH if ref and pitch else 0.0)


def steady(vid: str, reqs: list[dict], takes: list[bytes], fresh: list[int], proj: str, store: Path) -> None:
    """Reads each new take that drifted again, up to TRIES readings, and keeps the steadiest (in `takes` and in its
    file). Takes read before are not judged again."""
    if not fresh:
        return
    heard = [sound(t) for t in takes]
    ref = statistics.median([p for _, p in heard if p] or [0.0])
    for i in fresh:
        best, tries = heard[i], 1
        while off(best, ref) >= 1 and tries < TRIES:
            data, tries = speak(reqs[i], proj), tries + 1
            if off(s := sound(data), ref) < off(best, ref):
                best, takes[i] = s, data
                take_file(reqs[i], store).write_bytes(data)
        if tries > 1:
            fade, pitch = best
            note = "; still off, listen to it" if off(best, ref) >= 1 else ""
            print(f"{vid}: take {i + 1} of {len(reqs)} drifted, read {tries} times; kept: quietest stretch {fade:.1f} dB under its loudest, pitch {pitch / ref - 1:+.0%} from the video's{note}")


def join(wavs: list[bytes], gap: float = 0.5) -> bytes:
    """Takes end to end, with `gap` seconds of silence between them."""
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        for i, data in enumerate(wavs):
            with wave.open(io.BytesIO(data)) as r:
                if i == 0:
                    w.setparams(r.getparams())
                else:
                    w.writeframes(b"\0" * int(r.getframerate() * gap) * r.getsampwidth() * r.getnchannels())
                w.writeframes(r.readframes(r.getnframes()))
    return out.getvalue()


def take(vid: str) -> None:
    d = ROOT / "src/videos" / vid
    script = json.loads((d / "script.json").read_text())
    g = script.get("google")
    if not g:
        return
    if script.get("recording") != "voice.wav":
        sys.exit(f'{vid}: a "google" voice needs "recording": "voice.wav" in script.json')
    lang = script.get("lang", "en")
    texts = chunks([(s["lines"], s.get("tone", "")) for s in script["scenes"]])
    key = hashlib.sha1(json.dumps([texts, {k: v for k, v in g.items() if k != "project"}, lang]).encode()).hexdigest()[:12]
    mark = ROOT / "out/voice" / f"{vid}.key"
    reqs = [body(t, g, lang, tone) for t, tone in texts]
    store = ROOT / "out/voice" / vid
    # Up to date unless the text, the voice or the style changed, or a take was deleted to be read again.
    if (d / "voice.wav").exists() and mark.exists() and mark.read_text() == key and all(take_file(r, store).exists() for r in reqs):
        print(f"{vid}: voice.wav is up to date")
        return
    proj = project(g)
    fresh = [i for i, r in enumerate(reqs) if not take_file(r, store).exists()]
    takes = [cached(r, proj, store) for r in reqs]
    steady(vid, reqs, takes, fresh, proj, store)
    audio = join(takes)
    (d / "voice.wav").write_bytes(audio)
    mark.parent.mkdir(parents=True, exist_ok=True)
    mark.write_text(key)
    with wave.open(io.BytesIO(audio)) as w:
        print(f"{vid}: {g.get('model', GEMINI)} {g.get('voice', 'Charon')}, {sum(len(t) for t, _ in texts)} characters in {len(texts)} take(s) -> voice.wav, {w.getnframes() / w.getframerate():.1f} s")


def main() -> None:
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    if args[0] == "--try":
        opts = dict(zip(args[2::2], args[3::2]))
        g = {k.lstrip("-"): v for k, v in opts.items()}
        out = ROOT / "out/voice" / f"try-{g.get('voice', 'Charon')}-{g.get('model', GEMINI)}.wav"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(speak(body(args[1], g), project(g)))
        print(out)
        return
    for vid in check.expand(args):
        take(vid)


if __name__ == "__main__":
    main()
