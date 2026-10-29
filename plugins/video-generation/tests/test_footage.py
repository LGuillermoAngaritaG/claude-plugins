#!/usr/bin/env python3
"""footage.py brings real footage in cut, silent, cropped to the frame and recorded; check.py refuses footage that did
not come in that way; publish.py credits it. No network: the Pexels answer is faked and its file is local.
Run: python3 tests/test_footage.py (needs ffmpeg)."""
import contextlib
import io
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

WS = Path(__file__).resolve().parent.parent / "workspace"
sys.dont_write_bytecode = True
sys.path.insert(0, str(WS / "scripts"))
import check  # noqa: E402
import footage  # noqa: E402


def probe(f: Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", str(f)], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def test_footage() -> None:
    tmp = Path(tempfile.mkdtemp())
    try:
        (tmp / "scripts").mkdir()
        for f in ("footage.py", "check.py", "publish.py"):
            shutil.copy(WS / "scripts" / f, tmp / "scripts" / f)
        src = tmp / "trailer.mp4"  # a wide source with sound, 10 s
        subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=25:duration=10", "-f", "lavfi", "-i", "sine=frequency=440:duration=10", "-shortest", str(src)], check=True)
        d = tmp / "src/videos/demo-shorts/01-heart"
        d.mkdir(parents=True)
        (d / "script.json").write_text(json.dumps({"title": "Heart", "type": "sketch", "channel": "demo", "scenes": [{"id": "hook", "lines": ["One line."]}]}))
        run = lambda *a: subprocess.run([sys.executable, str(tmp / "scripts/footage.py"), "demo-shorts/01-heart", "get", *a], capture_output=True, text=True)
        r = run("mine", str(src), "--from", "2", "--seconds", "3")
        assert r.returncode == 1 and "needs --credit" in r.stderr, r.stderr  # a file of yours says whose it is
        r = run("mine", str(src), "--from", "2", "--seconds", "3", "--credit", "Me", "--license", "own recording")
        assert r.returncode == 0, r.stderr
        info = probe(tmp / "public/art/demo-shorts/01-heart/footage/mine.mp4")
        assert [s["codec_type"] for s in info["streams"]] == ["video"], info  # the sound is gone
        assert (info["streams"][0]["width"], info["streams"][0]["height"], info["streams"][0]["r_frame_rate"]) == (1080, 1920, "30/1"), info
        assert abs(float(info["format"]["duration"]) - 3) < 0.1, info
        r = run("clip", "youtube:abc", "--seconds", "9")
        assert r.returncode == 1 and "8 seconds at most" in r.stderr, r.stderr  # refused before any download

        # Stock from Pexels: the smallest file that fills 1080p is taken, and the photographer is credited.
        footage.ROOT, check.ROOT = tmp, tmp
        answer = {"url": "https://www.pexels.com/video/1/", "user": {"name": "Ana"}, "video_files": [
            {"file_type": "video/mp4", "width": 640, "height": 360, "link": "small"},
            {"file_type": "video/mp4", "width": 1920, "height": 1080, "link": str(src)},
            {"file_type": "video/mp4", "width": 3840, "height": 2160, "link": "huge"}]}
        footage.fetch = lambda url, headers=None: answer
        footage.os.environ["PEXELS_API_KEY"] = "test"
        sys.argv = ["footage.py", "demo-shorts/01-heart", "get", "street", "pexels:1", "--seconds", "2"]
        with contextlib.redirect_stdout(io.StringIO()):
            footage.main()
        pieces = json.loads((d / "footage.json").read_text())
        assert pieces["street"]["credit"] == "Ana on Pexels" and pieces["street"]["license"] == "Pexels License", pieces
        assert pieces["mine"] == {"ref": str(src), "url": "", "credit": "Me", "license": "own recording", "from": 2.0, "seconds": 3.0}, pieces

        # check.py: a scene that plays a piece footage.py did not bring in is refused.
        (d / "timing.json").write_text("{}")
        (d / "index.tsx").write_text("<Clip src=\"art/demo-shorts/01-heart/footage/street.mp4\" />\n<Clip src=\"art/demo-shorts/01-heart/footage/ghost.mp4\" />\nscenes: {hook: Hook}\n")
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            check.check("demo-shorts/01-heart")
        assert "footage ghost did not come in" in out.getvalue() and "footage street" not in out.getvalue(), out.getvalue()

        # publish.py credits every piece once, with its link.
        (d / "references.md").write_text("# Heart\n\n## Sources\n\n- Book. A, 2020. https://example.com/book\n")
        (d / "publish.json").write_text(json.dumps({"title": "How a heart beats", "intro": "Your heart, in a minute."}))
        r = subprocess.run([sys.executable, str(tmp / "scripts/publish.py"), "demo-shorts"], capture_output=True, text=True)
        md = (tmp / "videos/demo-shorts/publish.md").read_text()
        assert r.returncode == 0 and "Footage\n- Me\n- Ana on Pexels https://www.pexels.com/video/1/" in md, r.stdout + md
    finally:
        shutil.rmtree(tmp)


if __name__ == "__main__":
    test_footage()
    print("test_footage: ok")
