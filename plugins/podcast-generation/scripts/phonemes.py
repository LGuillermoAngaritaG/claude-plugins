#!/usr/bin/env python3
"""How the Kokoro voice will say a script, to catch a wrong word before rendering.
Usage: phonemes.py <episode.md> [es]    every turn of a script, English or Spanish
       phonemes.py --say "some text"     one phrase, English
       phonemes.py --say-es "un texto"   one phrase, Spanish
"""
import os
import sys
from pathlib import Path

from kokoro_onnx import Kokoro

MODELS = Path(os.environ.get("PODCAST_MODELS_DIR", Path.home() / ".local/share/two-host-podcast/models"))

args = sys.argv[1:]
if not args or (args[0] in ("--say", "--say-es") and len(args) < 2):
    sys.exit(__doc__)
kokoro = Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))
if args[0] in ("--say", "--say-es"):
    print(kokoro.tokenizer.phonemize(" ".join(args[1:]), "en-us" if args[0] == "--say" else "es-419"))
else:
    lang = "es-419" if args[1:2] == ["es"] else "en-us"
    for n, line in enumerate(Path(args[0]).read_text().splitlines(), 1):
        if line.startswith("**HOST_"):
            print(f"{n}: {line}\n    {kokoro.tokenizer.phonemize(line.split(':**', 1)[1], lang)}")
