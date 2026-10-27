"""The voice step of workspace/scripts/tts.py: which engine reads a video, and the silence cut around a Phonon line.
Run with a Python that has the workspace's packages: <workspace>/.venv/bin/python tests/test_tts.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "workspace/scripts"))
import numpy as np  # noqa: E402
from tts import on_kokoro, trim  # noqa: E402

assert not on_kokoro("Hadley", "en") and not on_kokoro("Elodie-Rose", "en")
assert on_kokoro("am_fenrir", "en") and on_kokoro("ef_dora", "es")

sr = 24000
line = np.concatenate([np.zeros(sr // 5), 0.3 * np.sin(np.arange(sr) / 3), np.zeros(sr)])  # 0.2 s, 1 s of speech, 1 s
assert abs(len(trim(line, sr)) / sr - 1.15) < 0.01, len(trim(line, sr)) / sr
assert len(trim(np.zeros(sr), sr)) == sr  # nothing loud: left as it is
print("ok")
