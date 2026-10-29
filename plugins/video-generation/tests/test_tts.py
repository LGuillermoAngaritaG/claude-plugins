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

# A Speechify voice reads both languages, its pace as SSML, the text escaped (no network: urlopen is replaced).
import base64, io, json, os, urllib.request  # noqa: E401, E402
import soundfile as sf  # noqa: E402
import tts  # noqa: E402

assert not on_kokoro("speechify:wyatt_32", "en") and not on_kokoro("speechify:wyatt_32", "es")
sent = []


def fake(req, timeout):
    sent.append(json.loads(req.data))
    wav = io.BytesIO()
    sf.write(wav, line, sr, format="WAV")
    return io.BytesIO(json.dumps({"audio_data": base64.b64encode(wav.getvalue()).decode()}).encode())


urllib.request.urlopen, os.environ["SPEECHIFY_API_KEY"] = fake, "test"
a, rate = tts.read("Tom & Jerry", "speechify:george", 1.05)
assert sent[-1] == {"input": '<speak><prosody rate="+5%">Tom &amp; Jerry</prosody></speak>', "voice_id": "george",
                    "audio_format": "wav", "model": "simba-3.5"}, sent[-1]
assert rate == sr and abs(len(a) / sr - 1.15) < 0.01
tts.read("Hola", "speechify:lucia", 0.95, "es")
assert sent[-1]["language"] == "es-MX" and 'rate="-5%"' in sent[-1]["input"]
print("ok")
