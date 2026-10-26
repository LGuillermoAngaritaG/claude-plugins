#!/usr/bin/env python3
"""publish.py builds the upload text from a video's own files and checks YouTube's limits; thumbnail.py draws the
words on the empty third. Run: python3 tests/test_publish.py (the thumbnail part needs Pillow: the workspace's .venv)."""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

WS = Path(__file__).resolve().parent.parent / "workspace"
sys.dont_write_bytecode = True


def test_publish() -> None:
    tmp = Path(tempfile.mkdtemp())
    try:
        (tmp / "scripts").mkdir()
        for f in ("publish.py", "check.py"):
            shutil.copy(WS / "scripts" / f, tmp / "scripts" / f)
        (tmp / "src/channels").mkdir(parents=True)
        (tmp / "src/channels/demo.json").write_text(json.dumps({"name": "Demo", "note": "Not advice.", "about": "Demo: things explained.", "tags": ["demo", "how it works"]}))
        d = tmp / "src/videos/demo-2026-w44/01-long"
        d.mkdir(parents=True)
        scenes = [{"id": i, "lines": ["One line."]} for i in ("hook", "a", "b", "c")]
        (d / "script.json").write_text(json.dumps({"title": "Long", "type": "explainer", "channel": "demo", "pace": [0, 0, 0], "scenes": scenes}))
        (d / "timing.json").write_text(json.dumps({s["id"]: [{"file": "x.wav", "dur": 20.0}] for s in scenes}))
        refs = ("# Long: references\n\n## To go deeper\n\n- Book. A, 2020. https://example.com/book\n\n"
                "## First\n<!-- scenes: a -->\n\n- Book. A, 2020. https://example.com/book\n- Paper. B, 2021. https://example.com/paper\n\n"
                "## Second\n<!-- scenes: b -->\n\n- Paper. B, 2021. https://example.com/paper\n\n## Third\n<!-- scenes: c -->\n\n- Site. C. https://example.com/site\n")
        (d / "references.md").write_text(refs)
        (d / "publish.json").write_text(json.dumps({"title": "A Long Video", "intro": "What it is about.", "tags": ["extra", "demo"], "first_chapter": "Today"}))
        s = tmp / "src/videos/demo-2026-w44/02-short-a"
        s.mkdir()
        (s / "script.json").write_text(json.dumps({"title": "Short", "type": "explainer", "from": "demo-2026-w44/01-long", "scenes": scenes[1:2]}))
        (s / "references.md").write_text("# Short\n\n## To go deeper\n\n- Book. A, 2020. https://example.com/book\n\n## First\n<!-- scenes: a -->\n\n- Paper. B, 2021. https://example.com/paper\n")
        (s / "publish.json").write_text(json.dumps({"title": "A Short", "intro": "The short part."}))
        run = lambda: subprocess.run([sys.executable, str(tmp / "scripts/publish.py"), "demo-2026-w44"], capture_output=True, text=True)
        r = run()
        assert r.returncode == 0, r.stdout + r.stderr
        md = (tmp / "videos/demo-2026-w44/publish.md").read_text()
        assert "0:00 Today\n0:20 First\n0:40 Second\n1:00 Third" in md, md  # a chapter before the first, at 0:00
        assert md.count("https://example.com/book") == 1 + 0, md  # once in the long video, not in the Short
        assert "Tags: demo, how it works, extra" in md and "Not advice." in md and "Demo: things explained." in md, md
        short = md.split("## A Short")[1]
        assert "https://example.com/paper" in short and "#Shorts" in short and "Chapters" not in short, short
        assert "Not advice." in short and "Tags: demo, how it works" in short, short  # the channel comes from the long video
        # Too few chapters and a title over YouTube's limit are refused.
        (d / "references.md").write_text(refs.split("## Second")[0])
        (d / "publish.json").write_text(json.dumps({"title": "x" * 101, "intro": "i"}))
        r = run()
        assert r.returncode == 1 and "chapters; YouTube shows chapters only from 3" in r.stdout and "the title has 101" in r.stdout, r.stdout
    finally:
        shutil.rmtree(tmp)


def test_thumbnail() -> None:
    try:
        from PIL import Image
    except ImportError:
        print("test_thumbnail: skipped, no Pillow: run with the workspace's .venv/bin/python")
        return
    sys.path.insert(0, str(WS / "scripts"))
    import thumbnail
    im = thumbnail.compose(Image.new("RGB", (1672, 941), "#f0e8dd"), ["HOT EDGE,", "FROZEN", "MIDDLE"], 1, "left", "#1f5c61", "#c0622b", "#ffffff", 0.72)
    assert im.size == (1280, 720)
    left, right = im.crop((0, 0, 560, 720)), im.crop((720, 0, 1280, 720))
    ink = lambda part: sum(part.convert("L").histogram()[:120])  # dark pixels: the words
    assert ink(left) > 5000 and ink(right) < 100, (ink(left), ink(right))  # the words sit on the left third only


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print(f"{name}: ok")
