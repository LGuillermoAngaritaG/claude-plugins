#!/usr/bin/env python3
"""A Google Cloud voice for a video: Gemini TTS (a style you describe in words) or Chirp 3 HD. It reads the whole script as
one take and saves it as voice.wav beside script.json; scripts/align.py then cuts the take into one clip per line, as for
any "recording". Each take is kept in out/voice/<series>/<id>/: only a take whose text, voice or style changed is
made again. A take with a fault (a word blurred, an extra sound at its end) is read again by deleting its file there.

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

Usage: python3 scripts/voice.py <series/id> [...]       takes for the videos that have "google"; the others are skipped
       python3 scripts/voice.py --try "A line." [--voice Kore] [--model chirp3-hd] [--style "..."]
                                                         one line to out/voice/try-<voice>-<model>.wav, to compare voices
"""
import base64
import hashlib
import io
import json
import os
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
LIMIT = 3800  # bytes of text per request: Gemini takes 4000, Chirp 5000; a longer script is read in several takes
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


def cached(req: dict, proj: str, store: Path) -> bytes:
    """One take, kept in `store` by the hash of its request: a changed line only makes its own take again. Delete a
    take's file (or the folder) to read it again."""
    f = store / (hashlib.sha1(json.dumps(req, sort_keys=True).encode()).hexdigest()[:12] + ".wav")
    if not f.exists():
        store.mkdir(parents=True, exist_ok=True)
        f.write_bytes(speak(req, proj))
    return f.read_bytes()


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
    if (d / "voice.wav").exists() and mark.exists() and mark.read_text() == key:
        print(f"{vid}: voice.wav is up to date")
        return
    proj = project(g)
    audio = join([cached(body(t, g, lang, tone), proj, ROOT / "out/voice" / vid) for t, tone in texts])
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
