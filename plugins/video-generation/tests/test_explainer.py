#!/usr/bin/env python3
"""Tests for the explainer tools: the facts check of check.py, the requests and takes of voice.py, new.py and short.py.

Run: python3 plugins/video-generation/tests/test_explainer.py   (no network: the Google call is never made)
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


def test_voice_requests() -> None:
    g = voice.body("Hello.", {"voice": "Kore", "style": "Warm."})
    assert g["voice"] == {"languageCode": "en-US", "name": "Kore", "modelName": voice.GEMINI} and g["input"]["prompt"] == "Warm."
    c = voice.body("Hola.", {"voice": "Charon", "model": "chirp3-hd"}, "es")
    assert c["voice"] == {"languageCode": "es-US", "name": "es-US-Chirp3-HD-Charon"} and "prompt" not in c["input"]
    parts = voice.chunks([(["a" * 3000], ""), (["b" * 3000], ""), (["c" * 100], "")])
    assert len(parts) == 2 and parts[1][0].startswith("b") and parts[1][0].endswith("c"), [len(p) for p, _ in parts]
    assert len(voice.chunks([(["x" * 3000, "y" * 3000], "")])) == 2  # a scene too long alone splits between lines
    toned = voice.chunks([(["a."], ""), (["b."], "awe"), (["c."], "awe"), (["d."], "")])
    assert [t for _, t in toned] == ["", "awe", ""] and toned[1][0] == "b.\n\nc.", toned  # a new tone starts a new take
    assert voice.body("x", {"style": "Calm."}, tone="Slower.")["input"]["prompt"] == "Calm. Slower."
    assert check.plain("Wait... <short pause> look <gasp> here.") == "Wait... look here."
    assert check.numbers("<long pause> About seventy <sigh> percent.") == {"seventy", "percent"}
    with wave.open(io.BytesIO(voice.join([wav(1.0), wav(2.0)], gap=0.5))) as w:
        assert abs(w.getnframes() / w.getframerate() - 3.5) < 0.01


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
        profile = {"name": "Demo", "grounds": ["#ffffff"], "accent": "#1f7a7a", "google": {"voice": "Kore", "style": "Warm."}, "closing": "Talk to your doctor."}
        (tmp / "src/channels/demo.json").write_text(json.dumps(profile))
        new = [sys.executable, str(tmp / "scripts/new.py"), "explainer", "demo/01-flu", "How flu works", "--channel"]
        assert subprocess.run(new + ["nope"], capture_output=True).returncode != 0  # a channel without a profile is refused
        subprocess.run(new + ["demo"], check=True, capture_output=True)
        d = tmp / "src/videos/demo/01-flu"
        script = json.loads((d / "script.json").read_text())
        assert script["channel"] == "demo" and script["recording"] == "voice.wav" and script["google"] == profile["google"], script
        tsx = (d / "index.tsx").read_text()
        assert "import channel from '../../../channels/demo.json';" in tsx and "  channel,\n" in tsx and "look: EXPLAIN," in tsx, tsx
        check.ROOT = tmp
        assert check.closing("demo/01-flu", script) == 1  # the placeholder last line is not the channel's closing
        script["scenes"][-1]["lines"][-1] = "So rest. <short pause> And talk to your doctor."
        assert check.closing("demo/01-flu", script) == 0
        script["scenes"][-1]["lines"][-1] = "A Short ends elsewhere."
        assert check.closing("demo/01-flu", script | {"from": "demo/00-long"}) == 0
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
    finally:
        shutil.rmtree(tmp)


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print(f"{name}: ok")
