#!/usr/bin/env python3
"""Tests for the explainer tools: the facts check of check.py, the requests and takes of voice.py, new.py and short.py.

Run with a Python that has the workspace's packages (no network: the Google call is never made):
  <workspace>/.venv/bin/python plugins/video-generation/tests/test_explainer.py
"""
import io
import json
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

WS = Path(__file__).resolve().parent.parent / "workspace"
sys.dont_write_bytecode = True  # no __pycache__ inside workspace/, which is copied into every workspace
sys.path.insert(0, str(WS / "scripts"))
import check  # noqa: E402
import voice  # noqa: E402


def wav(seconds: float) -> bytes:
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(24000)
        w.writeframes(b"\1\0" * int(24000 * seconds))
    return out.getvalue()


def test_numbers() -> None:
    assert check.numbers("About seventy to eighty percent comes back.") == {"seventy", "eighty", "percent"}
    assert check.numbers("Take two lakes, one high and one low.") == set()
    assert check.numbers("It turns at roughly a third of the shaft speed, 1450 times a minute.") == {"third", "1450"}
    assert check.numbers("It came out in 2017. It weighs 1.5 kg, about 2,000 grams.") == {"2017", "1.5", "2,000"}


def test_voice_requests() -> None:
    g = voice.body("Hello.", {"voice": "Kore", "style": "Warm."})
    assert g["voice"] == {"languageCode": "en-US", "name": "Kore", "modelName": voice.GEMINI} and g["input"]["prompt"] == "Warm."
    c = voice.body("Hola.", {"voice": "Charon", "model": "chirp3-hd"}, "es")
    assert c["voice"] == {"languageCode": "es-US", "name": "es-US-Chirp3-HD-Charon"} and "prompt" not in c["input"]
    parts = voice.chunks([(["a" * 800], ""), (["b" * 800], ""), (["c" * 100], "")])
    assert len(parts) == 2 and parts[1][0].startswith("b") and parts[1][0].endswith("c"), [len(p) for p, _ in parts]
    assert len(voice.chunks([(["x" * 800, "y" * 800], "")])) == 2  # a scene too long alone splits between lines
    toned = voice.chunks([(["a."], ""), (["b."], "awe"), (["c."], "awe"), (["d."], "")])
    assert [t for _, t in toned] == ["", "awe", ""] and toned[1][0] == "b.\n\nc.", toned  # a new tone starts a new take
    assert voice.body("x", {"style": "Calm."}, tone="Slower.")["input"]["prompt"] == "Calm. Slower."
    assert check.plain("Wait... <short pause> look <gasp> here.") == "Wait... look here."
    assert check.numbers("<long pause> About seventy <sigh> percent.") == {"seventy", "percent"}
    with wave.open(io.BytesIO(voice.join([wav(1.0), wav(2.0)], gap=0.5))) as w:
        assert abs(w.getnframes() / w.getframerate() - 3.5) < 0.01


def tone(seconds: float, hz: float, quiet_after: float = 0.0) -> bytes:
    """A take that sounds like speech to sound(): a buzz at `hz`, on for 0.3 s and off for 0.1 s, 12 dB quieter after
    `quiet_after` seconds (when it is not 0)."""
    import numpy as np

    t = np.arange(int(24000 * seconds)) / 24000
    a = 0.1 * np.sign(np.sin(2 * np.pi * hz * t)) * ((t % 0.4) < 0.3)
    if quiet_after:
        a[t > quiet_after] *= 0.25
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(24000)
        w.writeframes((a * 32767).astype(np.int16).tobytes())
    return out.getvalue()


def test_drift() -> None:
    """sound() hears a take that fades or moves in pitch, and steady() reads a new one again and keeps the steadier."""
    fade, pitch = voice.sound(tone(60, 150))
    assert fade < 1 and abs(pitch - 150) < 5, (fade, pitch)
    assert voice.off(voice.sound(tone(60, 150)), 150) < 1
    assert voice.off(voice.sound(tone(60, 150, quiet_after=40)), 150) >= 1  # fades 12 dB
    assert voice.off(voice.sound(tone(60, 190)), 150) >= 1  # 27% high
    tmp, speak = Path(tempfile.mkdtemp()), voice.speak
    try:
        reqs = [{"input": {"text": t}} for t in "abc"]
        takes = [tone(30, 150), tone(30, 152), tone(30, 200)]
        calls = []
        voice.speak = lambda req, proj: calls.append(req) or tone(30, 151)
        voice.steady("demo", reqs, takes, [2], "p", tmp)
        assert len(calls) == 1 and voice.off(voice.sound(takes[2]), 151) < 1  # read again once, the steady reading kept
        assert voice.take_file(reqs[2], tmp).read_bytes() == takes[2]
        voice.steady("demo", reqs, takes, [0, 1], "p", tmp)
        assert len(calls) == 1  # steady takes are not read again
        assert all(voice.judged(r, tmp).exists() for r in reqs)  # and none is judged again on the next run
    finally:
        voice.speak = speak
        shutil.rmtree(tmp)

def test_take_again() -> None:
    """voice.py reads a take again when its file was deleted, even though the text did not change."""
    tmp = Path(tempfile.mkdtemp())
    root, speak, project = voice.ROOT, voice.speak, voice.project
    try:
        d = tmp / "src/videos/demo/01-x"
        d.mkdir(parents=True)
        (d / "script.json").write_text(json.dumps({"title": "x", "recording": "voice.wav", "google": {"voice": "Kore"}, "scenes": [{"id": "a", "lines": ["One."]}, {"id": "b", "tone": "warm", "lines": ["Two."]}]}))
        calls = []
        voice.ROOT, voice.project = tmp, lambda g: "p"
        voice.speak = lambda req, proj: calls.append(req) or wav(0.5)
        voice.take("demo/01-x")
        assert len(calls) == 2, calls
        voice.take("demo/01-x")
        assert len(calls) == 2  # nothing changed, nothing read
        sorted((tmp / "out/voice/demo/01-x").glob("*.wav"))[0].unlink()
        voice.take("demo/01-x")
        assert len(calls) == 3  # the deleted take, and only it, is read again
    finally:
        voice.ROOT, voice.speak, voice.project = root, speak, project
        shutil.rmtree(tmp)


def test_new_explainer() -> None:
    tmp = Path(tempfile.mkdtemp())
    try:
        (tmp / "scripts").mkdir()
        for f in ("new.py", "check.py"):
            shutil.copy(WS / "scripts" / f, tmp / "scripts" / f)
        subprocess.run([sys.executable, str(tmp / "scripts/new.py"), "explainer-short", "demo/01-pen", "How a pen works"], check=True, capture_output=True)
        d = tmp / "src/videos/demo/01-pen"
        script = json.loads((d / "script.json").read_text())
        assert script["type"] == "explainer" and script["shape"] == "upright", script
        assert "look: EXPLAIN_V" in (d / "index.tsx").read_text()
        assert json.loads((d / "facts.json").read_text()) == {"claims": []}
        # The facts check: a number with no claim is refused, then accepted once a claim with a source covers it.
        script["scenes"][0]["lines"] = ["The ball is seventy percent steel."]
        (d / "script.json").write_text(json.dumps(script))
        check.ROOT = tmp
        assert check.facts("demo/01-pen", script) == 1
        (d / "facts.json").write_text(json.dumps({"claims": [{"says": "seventy percent steel", "source": "https://example.com"}]}))
        assert check.facts("demo/01-pen", script) == 1  # its source is not in references.md yet
        (d / "references.md").write_text((d / "references.md").read_text() + "- Pens. Example. https://example.com\n")
        assert check.facts("demo/01-pen", script) == 0
    finally:
        shutil.rmtree(tmp)


def test_channel() -> None:
    """A channel video: new.py writes the channel and its voice, check.py holds it to the channel's closing line, and
    art.py keeps a picture under a new key when the channel's style changes."""
    tmp = Path(tempfile.mkdtemp())
    try:
        (tmp / "scripts").mkdir()
        shutil.copy(WS / "scripts" / "new.py", tmp / "scripts" / "new.py")
        (tmp / "src/channels").mkdir(parents=True)
        profile = {"name": "Demo", "grounds": ["#ffffff"], "accent": "#1f7a7a", "voice": "Hadley", "speed": 1.05, "closing": "Talk to your doctor."}
        (tmp / "src/channels/demo.json").write_text(json.dumps(profile))
        new = [sys.executable, str(tmp / "scripts/new.py"), "explainer", "demo/01-flu", "How flu works", "--channel"]
        assert subprocess.run(new + ["nope"], capture_output=True).returncode != 0  # a channel without a profile is refused
        subprocess.run(new + ["demo"], check=True, capture_output=True)
        d = tmp / "src/videos/demo/01-flu"
        script = json.loads((d / "script.json").read_text())
        assert script["channel"] == "demo" and script["voice"] == "Hadley" and script["speed"] == 1.05 and "recording" not in script, script
        tsx = (d / "index.tsx").read_text()
        assert "import channel from '../../../channels/demo.json';" in tsx and "  channel,\n" in tsx and "look: EXPLAIN," in tsx, tsx
        check.ROOT = tmp
        assert check.closing("demo/01-flu", script) == 1  # the placeholder last line is not the channel's closing
        script["scenes"][-1]["lines"][-1] = "So rest. <short pause> And talk to your doctor."
        assert check.closing("demo/01-flu", script) == 0
        script["scenes"][-1]["lines"][-1] = "A Short ends elsewhere."
        assert check.closing("demo/01-flu", script | {"from": "demo/00-long"}) == 0
        talk = {"channel": "demo", "scenes": [{"id": "hook", "lines": ["Did you know a pump can run backwards?"]}, {"id": "end", "lines": ["How long is yours?"]}]}
        assert check.viewer("demo/01-flu", talk, {}) == 0  # not voiced yet: no pace to judge
        flat = {"channel": "demo", "scenes": [{"id": "hook", "lines": ["Cut the power."]}, {"id": "end", "lines": ["The end."]}]}
        assert check.viewer("demo/01-flu", flat, {}) == 2  # no question in the hook, none for the comments
        assert check.viewer("demo/01-flu", flat | {"from": "demo/00-long"}, {}) == 0  # a Short is left out
        line = lambda dur: [{"dur": dur}]
        assert check.viewer("demo/01-flu", talk, {"hook": line(1.0), "end": line(0.5)}) == 0  # 12 words in 3.7 s: 195 a minute
        assert check.viewer("demo/01-flu", talk, {"hook": line(4.0), "end": line(4.0)}) == 1  # 12 words in 10.2 s: 71 a minute
    finally:
        shutil.rmtree(tmp)
    try:
        import art
    except ImportError:
        print("test_channel: the art.py part is skipped: run with the workspace's .venv/bin/python to cover it")
        return
    spec = {"prompt": "A flu virus"}
    base = art.STYLE["explainer"][0]
    assert art.key("explainer", "1:1", spec, base) != art.key("explainer", "1:1", spec, base + " Medical blue.")


def test_short_on_its_own() -> None:
    """A Short made on its own (the shorts plugin): a sketch takes a channel's voice but keeps its look, needs no closing
    line, and check.py holds it to 45 to 60 seconds once voiced."""
    import contextlib
    tmp = Path(tempfile.mkdtemp())
    try:
        (tmp / "scripts").mkdir()
        shutil.copy(WS / "scripts" / "new.py", tmp / "scripts" / "new.py")
        (tmp / "src/channels").mkdir(parents=True)
        (tmp / "src/channels/demo.json").write_text(json.dumps({"name": "Demo", "voice": "speechify:dorian", "speed": 1.0, "closing": "Talk to your doctor."}))
        subprocess.run([sys.executable, str(tmp / "scripts/new.py"), "sketch", "demo-shorts/01-heart", "How a heart beats", "--channel", "demo"], check=True, capture_output=True)
        d = tmp / "src/videos/demo-shorts/01-heart"
        script = json.loads((d / "script.json").read_text())
        assert script["channel"] == "demo" and script["voice"] == "speechify:dorian" and script["type"] == "sketch", script
        assert "channels/demo.json" not in (d / "index.tsx").read_text() and (d / "references.md").exists()
        check.ROOT = tmp
        assert check.upright(script) and check.closing("demo-shorts/01-heart", script) == 0

        def report(dur: float) -> str:
            """check.py's report with every line of the video lasting dur seconds."""
            (d / "timing.json").write_text(json.dumps({s["id"]: [{"dur": dur}] for s in script["scenes"]}))
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                check.check("demo-shorts/01-heart")
            return out.getvalue()

        assert "but a Short is 45 to 60 s" in report(14.0)  # two scenes of 14 s and their pauses: about 30 s
        assert "a Short is" not in report(24.0)  # about 50 s
        (d / "script.json").write_text(json.dumps(script | {"seconds": [20, 40]}))
        assert "but a Short is 20 to 40 s" in report(24.0)
    finally:
        shutil.rmtree(tmp)


def test_news() -> None:
    """new.py news writes a briefing that check.py holds to its rules: dated claims, pages taken, cue words said."""
    tmp = Path(tempfile.mkdtemp())
    try:
        (tmp / "scripts").mkdir()
        shutil.copy(WS / "scripts" / "new.py", tmp / "scripts" / "new.py")
        subprocess.run([sys.executable, str(tmp / "scripts/new.py"), "news", "demo/01-briefing", "Monday"], check=True, capture_output=True)
        d = tmp / "src/videos/demo/01-briefing"
        script = json.loads((d / "script.json").read_text())
        assert script["format"] == "news" and script["type"] == "explainer" and (d / "shots.json").exists(), script
        assert "story1: Story1" in (d / "index.tsx").read_text()
        check.ROOT = tmp
        assert check.news("demo/01-briefing", script) == 2  # the two placeholder pages are not taken
        (d / "facts.json").write_text(json.dumps({"claims": [{"says": "x", "source": "https://example.com"}]}))
        shots = {n: {"src": f"art/demo/01-briefing/shots/{n}.png"} for n in ("story1", "story2")}
        (d / "shots.json").write_text(json.dumps(shots))
        (tmp / "public/art/demo/01-briefing/shots").mkdir(parents=True)
        for n in shots:
            (tmp / "public" / shots[n]["src"]).write_bytes(b"png")
        script["scenes"][2]["cue"] = "nowhere"
        assert check.news("demo/01-briefing", script) == 2  # a claim with no date, a cue its lines do not say
        (d / "facts.json").write_text(json.dumps({"claims": [{"says": "x", "source": "https://example.com", "date": "2026-10-24"}]}))
        script["scenes"][2]["cue"] = "Mark"
        assert check.news("demo/01-briefing", script) == 0
    finally:
        shutil.rmtree(tmp)


def test_short() -> None:
    """short.py: the scenes asked for, the long video's clips joined with their gaps, the code that reuses its scenes."""
    tmp = Path(tempfile.mkdtemp())
    try:
        (tmp / "scripts").mkdir()
        shutil.copy(WS / "scripts" / "short.py", tmp / "scripts" / "short.py")
        d = tmp / "src/videos/demo/01-long"
        d.mkdir(parents=True)
        audio = tmp / "public/audio/demo/01-long"
        audio.mkdir(parents=True)
        scenes = [{"id": "a", "lines": ["One.", "Two."]}, {"id": "b", "lines": ["Three."]}, {"id": "c", "lines": ["Four."]}]
        (d / "script.json").write_text(json.dumps({"title": "Long", "type": "explainer", "pace": [0.35, 0.25, 0.6], "scenes": scenes}))
        timing = {}
        for sc in scenes:
            timing[sc["id"]] = []
            for i, _ in enumerate(sc["lines"]):
                name = f"{sc['id']}-{i}.wav"
                (audio / name).write_bytes(wav(1.0))
                timing[sc["id"]].append({"file": name, "dur": 1.0})
        (d / "timing.json").write_text(json.dumps(timing))
        (d / "facts.json").write_text('{"claims": []}')
        (d / "references.md").write_text("# Refs\n\n## To go deeper\n\n- Book\n\n## One\n<!-- scenes: a -->\n\n- A source\n\n## Two\n<!-- scenes: c -->\n\n- C source\n")
        (d / "index.tsx").write_text("export const longDemo: VideoDef = {id: '01-long'};\n")
        subprocess.run([sys.executable, str(tmp / "scripts/short.py"), "demo/01-long", "02-short-a", "A Short", "a", "b"], check=True, capture_output=True)
        out = tmp / "src/videos/demo/02-short-a"
        short = json.loads((out / "script.json").read_text())
        assert [s["id"] for s in short["scenes"]] == ["a", "b"] and short["shape"] == "upright" and short["recording"] == "voice.wav", short
        with wave.open(str(out / "voice.wav")) as w:
            seconds = w.getnframes() / w.getframerate()
        assert abs(seconds - (1 + 0.25 + 1 + 0.6 + 1 + 0.6)) < 0.01, seconds  # line gap 0.25, scene gap 0.6
        tsx = (out / "index.tsx").read_text()
        assert "import {longDemo} from '../01-long';" in tsx and "scenes: {a: S.a, b: S.b}" in tsx and "look: EXPLAIN_V" in tsx, tsx
        assert "channel: longDemo.channel," in tsx, tsx  # a Short wears the long video's channel
        assert (out / "facts.json").exists()
        again = [sys.executable, str(tmp / "scripts/short.py"), "demo/01-long", "02-short-a", "A Short", "a"]
        assert subprocess.run(again, capture_output=True).returncode != 0  # an existing Short is kept...
        subprocess.run(again + ["--again"], check=True, capture_output=True)  # ...unless it is cut again on purpose
        assert [s["id"] for s in json.loads((out / "script.json").read_text())["scenes"]] == ["a"]
        subprocess.run(again[:-1] + ["a", "b"] + ["--again"], check=True, capture_output=True)
        refs = (out / "references.md").read_text()
        assert "- Book" in refs and "- A source" in refs and "- C source" not in refs, refs  # only the chapters of a and b
    finally:
        shutil.rmtree(tmp)


def test_scene_files() -> None:
    """check.py follows `hook: A.scenes.hook` into the scene file and refuses a cue on a word the line does not say."""
    tmp = Path(tempfile.mkdtemp())
    try:
        d = tmp / "src/videos/demo/01-long"
        d.mkdir(parents=True)
        (d / "script.json").write_text(json.dumps({"title": "Long", "scenes": [{"id": "s", "lines": ["Hello there."]}]}))
        (d / "timing.json").write_text(json.dumps({"s": [{"file": "s-0.wav", "dur": 1.0, "words": [["Hello", 0.0, 0.4], ["there.", 0.4, 0.8]]}]}))
        (d / "index.tsx").write_text("import * as A from './a';\nexport const longDemo: VideoDef = {id: '01-long', scenes: {s: A.scenes.s}};\n")
        scene = lambda word: f"\nconst S: React.FC<SceneProps> = ({{t, words}}) => ease(t, said(words, 0, '{word}'));\nexport const scenes: Record<string, React.FC<SceneProps>> = {{s: S}};\n"
        check.ROOT = tmp
        (d / "a.tsx").write_text(scene("nope"))
        assert check.check("demo/01-long") == 1
        (d / "a.tsx").write_text(scene("there"))
        assert check.check("demo/01-long") == 0
        # An id with a dash is quoted in both maps, as short.py writes it: it is followed into the scene file too.
        (d / "script.json").write_text(json.dumps({"title": "Long", "scenes": [{"id": "now-wins", "lines": ["Hello there."]}]}))
        (d / "timing.json").write_text(json.dumps({"now-wins": [{"file": "s-0.wav", "dur": 1.0, "words": [["Hello", 0.0, 0.4], ["there.", 0.4, 0.8]]}]}))
        (d / "index.tsx").write_text("import * as A from './a';\nexport const longDemo: VideoDef = {id: '01-long', scenes: {'now-wins': A.scenes['now-wins']}};\n")
        dashed = lambda word: scene(word).replace("{s: S}", "{'now-wins': S}")
        (d / "a.tsx").write_text(dashed("nope"))
        assert check.check("demo/01-long") == 1
        (d / "a.tsx").write_text(dashed("there"))
        assert check.check("demo/01-long") == 0
    finally:
        shutil.rmtree(tmp)


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print(f"{name}: ok")
