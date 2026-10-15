#!/usr/bin/env python3
"""Render a podcast script to a multi-voice episode with Kokoro v1.0 ONNX, fully local.

Usage:
    python render.py SCRIPT.md --out episode            # writes episode.wav and episode.m4a
    python render.py --check                            # checks models, voices and ffmpeg only

The script format is one turn per line, `**HOST_A:** text` up to `**HOST_E:** text`, with an
optional first line `<!-- YYYY-MM-DD [type] -->`. Each speaker letter has its own voice;
Spanish has only three voices, so a Spanish script uses HOST_A to HOST_C. Any other non-blank line would be dropped, so the
renderer refuses to start until the script is clean (run lint.py first, or pass --force).

Per turn: synthesize with that host's voice, trim the leading and trailing padding Kokoro
adds (otherwise every short gap silently becomes a long one and the quick turn-taking that
makes two hosts sound like a conversation is lost), then concatenate.

Gap policy, from a measured two-host reference (median of about 200 ms between turns):
  normal handoff        220 ms with light jitter, so it does not sound metronomic
  co-constructed latch   90 ms, when the previous turn ended mid-sentence (no final . ? !)
  section seam          380 ms, after a turn that moves to a new section ("let's", "leads us to")
  same speaker again    450 ms, a paragraph break inside one voice (professor, story narrator)

Finally loudness is normalised with ffmpeg loudnorm I=-16 LUFS, TP=-1.5, LRA=11, and the
duration is read back from the finished file with ffprobe, because only the file settles
how long the episode really is.
"""
from __future__ import annotations   # so the stock macOS Python reaches the friendly errors

import argparse
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

DEFAULT_MODELS_DIR = Path.home() / ".local" / "share" / "two-host-podcast" / "models"
MODEL_FILE = "kokoro-v1.0.onnx"
VOICES_FILE = "voices-v1.0.bin"

# Language presets: (Kokoro language code, voices for HOST_A, HOST_B, ...).
# Spanish uses the Latin American phonemizer: plain "es" gives peninsular sounds for
# words such as "decir" and "gracias"; "es-419" gives the Latin American ones.
# Kokoro v1.0 has only three Spanish voices, so Spanish scripts stop at HOST_C.
LANGS = {
    "en": ("en-us", ["af_bella", "am_michael", "bf_emma", "am_fenrir", "bm_george"]),
    "es": ("es-419", ["ef_dora", "em_alex", "em_santa"]),
}
LETTERS = "ABCDE"

SR_OUT = 24000
TRIM_DB = -45.0          # anything under this, relative to the turn's peak, is padding
TRIM_KEEP = 0.015        # 15 ms of air kept either side
CHUNK_CHARS = 320        # Kokoro has a phoneme cap; long turns are split on sentence ends
BREATH = 0.09            # silence between the sentence chunks of one turn
SEAM = re.compile(r"\b(let'?s|now let'?s|last piece|leads us to)\b", re.I)   # English only

TURN = re.compile(r"^\*\*HOST_([A-E]):\*\*\s*(.+)$")
DATELINE = re.compile(r"^<!--.*-->$")


class SetupError(Exception):
    """A missing dependency, reported as one plain sentence plus the fix."""


def fail(msg: str) -> int:
    print(f"[render] ERROR: {msg}", file=sys.stderr)
    return 2


def find_tool(name: str) -> str:
    """ffmpeg or ffprobe from PATH, then the two Homebrew prefixes (Apple silicon, Intel)."""
    for cand in (shutil.which(name), f"/opt/homebrew/bin/{name}", f"/usr/local/bin/{name}"):
        if cand and os.access(cand, os.X_OK):
            return cand
    raise SetupError(f"{name} was not found on PATH, in /opt/homebrew/bin or in /usr/local/bin. "
                     f"Install it with: brew install ffmpeg")


def models_dir(arg: str | None) -> Path:
    if arg:
        return Path(arg).expanduser()
    env = os.environ.get("PODCAST_MODELS_DIR")
    return Path(env).expanduser() if env else DEFAULT_MODELS_DIR


def check_models(kdir: Path) -> tuple[Path, Path]:
    model, voices = kdir / MODEL_FILE, kdir / VOICES_FILE
    missing = [p.name for p in (model, voices) if not p.is_file()]
    if missing:
        raise SetupError(
            f"model file(s) missing in {kdir}: {', '.join(missing)}. Run scripts/install.sh to "
            f"download them, or point at a folder that has them with --models-dir or the "
            f"PODCAST_MODELS_DIR environment variable.")
    return model, voices


def load_kokoro(model: Path, voices: Path):
    try:
        from kokoro_onnx import Kokoro
    except ImportError:
        raise SetupError(
            "the kokoro_onnx package is not importable by this Python "
            f"({sys.executable}). Run this script with the venv that scripts/install.sh made, "
            "for example ~/.local/share/two-host-podcast/venv/bin/python render.py ...")
    return Kokoro(str(model), str(voices))


def parse(md: Path):
    """Turns as (host index, text, line number), and every line the renderer would drop."""
    turns, dropped = [], []
    for n, line in enumerate(md.read_text(encoding="utf-8").splitlines(), 1):
        s = line.strip()
        if not s:
            continue
        m = TURN.match(s)
        if m:
            turns.append((m.group(1), m.group(2).strip(), n))
        elif not (n == 1 and DATELINE.match(s)):
            dropped.append(n)
    return turns, dropped


def trim(x, sr: int):
    import numpy as np
    if len(x) == 0:
        return x
    thr = (10 ** (TRIM_DB / 20)) * np.abs(x).max()
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    k = int(TRIM_KEEP * sr)
    return x[max(0, idx[0] - k): min(len(x), idx[-1] + k)]


def synth(k, text: str, voice: str, speed: float, lang: str):
    """Split long turns on sentence boundaries, synthesize each chunk, trim, join."""
    import numpy as np
    parts, cur = [], ""
    for sent in re.split(r"(?<=[.?!])\s+", text):
        if len(cur) + len(sent) < CHUNK_CHARS:
            cur = (cur + " " + sent).strip()
        else:
            if cur:
                parts.append(cur)
            cur = sent
    if cur:
        parts.append(cur)

    chunks, sr = [], SR_OUT
    for p in parts:
        s, sr = k.create(p, voice=voice, speed=speed, lang=lang)
        chunks.append(trim(np.asarray(s, dtype=np.float32), sr))
        chunks.append(np.zeros(int(BREATH * sr), dtype=np.float32))
    if chunks:
        chunks.pop()
    return np.concatenate(chunks), sr


def probe_seconds(ffprobe: str, path: Path) -> float:
    out = subprocess.run([ffprobe, "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
                         check=True, capture_output=True, text=True).stdout.strip()
    return float(out)


def out_paths(spec: str) -> tuple[Path, Path, Path]:
    p = Path(spec).expanduser()
    if p.suffix.lower() in (".m4a", ".wav"):
        p = p.with_suffix("")
    if not p.is_absolute():
        p = Path.cwd() / p
    if not p.parent.is_dir():
        raise SetupError(f"the output folder does not exist: {p.parent}")
    return p.with_name(p.name + "_raw.wav"), p.with_suffix(".wav"), p.with_suffix(".m4a")


def run_check(args) -> int:
    """Everything a render needs, checked without rendering."""
    try:
        kdir = models_dir(args.models_dir)
        model, voices = check_models(kdir)
        ffmpeg, ffprobe = find_tool("ffmpeg"), find_tool("ffprobe")
        k = load_kokoro(model, voices)
    except SetupError as e:
        return fail(str(e))
    lang, voice = LANGS[args.lang][0], voices_for(args)
    have = set(k.get_voices())
    missing = [v for v in voice.values() if v not in have]
    if missing:
        return fail(f"voice(s) not in {VOICES_FILE}: {', '.join(missing)}")
    print(f"[render] OK: models in {kdir}, {len(have)} voices, ffmpeg {ffmpeg}, ffprobe {ffprobe}")
    print(f"[render] OK: language {lang}, " + ", ".join(f"HOST_{s} {v}" for s, v in voice.items()))
    return 0


def voices_for(args) -> dict:
    """Speaker letter to voice: the language preset, then any --voice X=name override."""
    voice = dict(zip(LETTERS, LANGS[args.lang][1]))
    for spec in args.voice:
        s, _, name = spec.partition("=")
        voice[s.strip().upper().replace("HOST_", "")] = name.strip()
    return voice


def main() -> int:
    ap = argparse.ArgumentParser(description="Render a podcast script with local Kokoro voices.")
    ap.add_argument("script", nargs="?", help="the script file (markdown, one turn per line)")
    ap.add_argument("--out", help="output path without extension; writes .wav and .m4a "
                                  "(default: the script's name, beside it)")
    ap.add_argument("--models-dir", help=f"folder holding {MODEL_FILE} and {VOICES_FILE} "
                                         f"(default: $PODCAST_MODELS_DIR or {DEFAULT_MODELS_DIR})")
    ap.add_argument("--speed", type=float, default=1.18,
                    help="Kokoro speed, 0.5 to 2.0 (default 1.18, about 180 words a minute "
                         "for conversational English)")
    ap.add_argument("--lang", choices=sorted(LANGS), default="en",
                    help="en (American English) or es (Latin American Spanish)")
    ap.add_argument("--voice", action="append", default=[], metavar="A=NAME",
                    help="override one speaker's voice, for example --voice C=bf_alice (repeatable)")
    ap.add_argument("--no-wav", action="store_true", help="keep only the .m4a")
    ap.add_argument("--force", action="store_true",
                    help="render even if some lines are not turns (they are skipped)")
    ap.add_argument("--check", action="store_true",
                    help="check models, voices and ffmpeg, then exit without rendering")
    a = ap.parse_args()

    if a.check:
        return run_check(a)
    if not a.script:
        ap.error("give a script file, or --check")
    if not (0.5 <= a.speed <= 2.0):
        return fail("--speed must be between 0.5 and 2.0")

    script = Path(a.script).expanduser()
    if not script.is_file():
        return fail(f"script not found: {script}")
    turns, dropped = parse(script)
    if not turns:
        return fail("no turns found. Each turn is one line, such as **HOST_A:** text")
    if dropped and not a.force:
        return fail(f"{len(dropped)} line(s) are not turns and would be dropped "
                    f"(lines {dropped[:12]}{' ...' if len(dropped) > 12 else ''}). "
                    f"Fix them (lint.py shows each one) or pass --force to skip them.")

    try:
        raw, wav, m4a = out_paths(a.out or str(script.with_suffix("")))
        model, voices = check_models(models_dir(a.models_dir))
        ffmpeg, ffprobe = find_tool("ffmpeg"), find_tool("ffprobe")
        k = load_kokoro(model, voices)
    except SetupError as e:
        return fail(str(e))

    import numpy as np
    import soundfile as sf

    lang, voice = LANGS[a.lang][0], voices_for(a)
    used = {s for s, _, _ in turns}
    unvoiced = sorted(used - set(voice))
    if unvoiced:
        return fail(f"no {a.lang} voice for " + ", ".join(f"HOST_{s}" for s in unvoiced) +
                    f": this language has {len(LANGS[a.lang][1])} voices. Use fewer speakers, "
                    f"or give one with --voice {unvoiced[0]}=NAME")
    voice = {s: v for s, v in voice.items() if s in used}
    have = set(k.get_voices())
    missing = [v for v in voice.values() if v not in have]
    if missing:
        return fail(f"voice(s) not in {VOICES_FILE}: {', '.join(missing)}. "
                    f"Available: {', '.join(sorted(have))}")

    words = sum(len(t.split()) for _, t, _ in turns)
    print(f"[render] {len(turns)} turns, {words} words, speed {a.speed}, language {lang}, "
          + ", ".join(f"HOST_{s} {v}" for s, v in voice.items()))

    rng = np.random.default_rng(7)
    pieces, sr = [], SR_OUT
    t0 = time.time()
    for i, (spk, text, _n) in enumerate(turns):
        audio, sr = synth(k, text, voice[spk], a.speed, lang)
        pieces.append(audio)
        if i + 1 < len(turns):
            prev_open = not text.rstrip().endswith((".", "?", "!"))
            if turns[i + 1][0] == spk:
                gap = 0.450
            elif prev_open:
                gap = 0.090
            elif SEAM.search(text):
                gap = 0.380
            else:
                gap = 0.220 + float(rng.normal(0, 0.030))
            pieces.append(np.zeros(int(max(0.05, gap) * sr), dtype=np.float32))
        if (i + 1) % 15 == 0:
            print(f"  {i + 1}/{len(turns)} turns, {time.time() - t0:.0f}s")

    sf.write(raw, np.concatenate(pieces), sr)
    synth_s = time.time() - t0

    try:
        subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", str(raw),
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                        "-ar", str(SR_OUT), "-ac", "1", str(wav)], check=True)
        subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", str(wav),
                        "-c:a", "aac", "-b:a", "96k", str(m4a)], check=True)
    except subprocess.CalledProcessError as e:
        return fail(f"ffmpeg failed with exit code {e.returncode}; the unnormalised audio "
                    f"is kept at {raw}")
    raw.unlink(missing_ok=True)

    secs = probe_seconds(ffprobe, m4a)
    if a.no_wav:
        wav.unlink(missing_ok=True)
    mins = secs / 60
    print(f"[render] synthesis {synth_s:.0f}s ({secs / synth_s:.1f}x realtime)")
    print(f"[render] duration read back from the file: {int(secs // 60)}:{secs % 60:04.1f} "
          f"({mins:.2f} min), {words / mins:.0f} words a minute, "
          f"{len(turns) / mins:.1f} turns a minute")
    print(f"[render] wrote {m4a}" + ("" if a.no_wav else f" and {wav.name}"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
