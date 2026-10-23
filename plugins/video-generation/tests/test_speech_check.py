"""The speech check of workspace/scripts/align.py, on lines Whisper really heard from finished videos.
Run with a Python that has the workspace's packages: <workspace>/.venv/bin/python tests/test_speech_check.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "workspace/scripts"))
from align import missed  # noqa: E402


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
