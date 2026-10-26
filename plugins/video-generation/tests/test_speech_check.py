"""The speech check of workspace/scripts/align.py, on lines Whisper really heard from finished videos, and its cuts.
Run with a Python that has the workspace's packages: <workspace>/.venv/bin/python tests/test_speech_check.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "workspace/scripts"))
import numpy as np  # noqa: E402
from align import SR, cut, even, levels, missed, pauses, stop  # noqa: E402


def heard(text: str) -> list[tuple[str, float, float]]:
    return [(w, 0.0, 0.0) for w in text.split()]


CASES = [
    # Numbers said as words, written as digits: not a misreading.
    ("It beats around one hundred thousand times a day.", "It beats around 100,000 times a day.", []),
    ("It left Harlow Station at eleven fifty-two, on a cold night in March.", "It left Harlow Station at 11.52 on a cold night in March.", []),
    # Spelling and hyphens.
    ("The solver mixes each cell with its upstream neighbour.", "The solver mixes each cell with its upstream neighbor.", []),
    ("That is the blow-up.", "That is the blow up.", []),
    ("El agua cambia de dirección.", "El agua cambia de direccion.", []),
    # Real misses: a name Whisper did not recognise, and a phrase that came out wrong.
    ("The limit has a name, the Courant number.", "The limit has a name, the carot number.", ["courant"]),
    ("The physics did not change. Only the time step did.", "The physics did not change. Only the time stepped in.", ["step"]),
    ("Nine people got on the last train.", "", ["nine", "people", "got", "on", "the", "last", "train"]),
]

for line, got, want in CASES:
    assert missed(line, heard(got)) == want, (line, missed(line, heard(got)), want)
print(f"ok: {len(CASES)} lines")

# Cuts, on a recording of three "words" (sound) with pauses between them: 0.0-1.0 s sound, 1.0-1.6 s pause, 1.6-2.4 s
# sound, 2.4-2.7 s pause, 2.7-3.0 s sound. Whisper's times are off by a few tenths, as they often are.
x = np.zeros(SR * 3, np.float32)
for a, b in [(0.0, 1.0), (1.6, 2.4), (2.7, 3.0)]:
    x[round(a * SR) : round(b * SR)] = 0.1 * np.sin(np.arange(round(b * SR) - round(a * SR)) * 0.05)
ps = pauses(*levels(x))
assert [(round(s, 2), round(e, 2)) for s, e in ps] == [(1.0, 1.6), (2.4, 2.7)], ps
assert abs(cut(ps, 1.0, 1.0, 2.4) - 1.54) < 0.011  # Whisper starts the second word 0.6 s early: the cut still waits for it
assert abs(cut(ps, 0.8, 1.9, 2.3) - 1.54) < 0.011  # or 0.3 s late
assert abs(stop(ps, 0.2, 1.4, 3.0) - 1.25) < 0.011  # the end put 0.4 s late: the line still stops in the pause, not in the next word
assert abs(stop(ps, 0.2, 0.7, 3.0) - 1.25) < 0.011  # or 0.3 s early: it does not cut the word
assert abs(stop(ps, 2.0, 2.5, 3.0) - 2.65) < 0.011  # a short pause: never past it, into the next sound
# The voice pauses briefly inside a line ("two thousand ... eight hundred", 1.0-1.15 s), then 0.5 s before the next
# line. Whisper starts the next line's first word at 1.2 s, in the middle of the number, and ends it at 2.9 s: the cut
# goes in the long pause, not in the number (as it did in the first channel week).
y = np.zeros(SR * 3, np.float32)
for a, b in [(0.0, 1.0), (1.15, 2.1), (2.6, 3.0)]:
    y[round(a * SR) : round(b * SR)] = 0.1 * np.sin(np.arange(round(b * SR) - round(a * SR)) * 0.05)
assert abs(cut(pauses(*levels(y)), 1.2, 1.2, 2.9) - 2.54) < 0.011
# The first line of a recording starts where its first silence ends, even when that silence is shorter than a gap inside
# the first word (a Short opens with 0.06 s of it): here the recording opens on sound, and then on 0.3 s of silence.
assert cut(pauses(*levels(y)), 0.0, 0.0, 0.9) == 0.0
assert abs(cut(pauses(*levels(np.concatenate([np.zeros(int(0.3 * SR), np.float32), y]))), 0.0, 0.0, 1.2) - 0.24) < 0.011
# A short first word, then a longer pause: "...interest. So. ... Our example". The line starts before "So" (1.0 to
# 1.2 s), not in the pause after it (1.4 to 1.9 s).
z = np.zeros(SR * 3, np.float32)
for a, b in [(0.0, 1.0), (1.2, 1.4), (1.9, 2.5)]:
    z[round(a * SR) : round(b * SR)] = 0.1 * np.sin(np.arange(round(b * SR) - round(a * SR)) * 0.05)
assert abs(cut(pauses(*levels(z)), 1.0, 1.0, 1.4) - 1.14) < 0.011
quiet, loud = 0.3 * x[: SR], x[int(1.6 * SR) : int(2.4 * SR)].copy()
q, l = even([quiet, loud], levels(x)[1])
assert abs(20 * np.log10(np.std(q[1000:-1000]) / np.std(l[1000:-1000]))) < 0.5 and q[0] == 0  # one level, faded in
print("ok: cuts")
