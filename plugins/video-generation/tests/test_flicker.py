"""qc.py's flicker check on made-up clips: a patch that blinks every frame is found, one that moves or pops once is
not. Run: python3 tests/test_flicker.py"""
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "workspace/scripts"))
import qc


def clip(path: Path, box: str) -> None:
    """Two seconds, 640 x 360, 30 fps, grey, with a white 120 px box laid over where `box` says."""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=gray:s=640x360:r=30:d=2", "-f", "lavfi", "-i", "color=white:s=120x120:r=30:d=2", "-filter_complex", f"[0][1]overlay={box}", "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", str(path)], check=True)


with tempfile.TemporaryDirectory() as tmp:
    blink, slide, pop = Path(tmp) / "blink.mp4", Path(tmp) / "slide.mp4", Path(tmp) / "pop.mp4"
    clip(blink, "x=100:y=100:enable='mod(n,2)'")
    clip(slide, "x=10+5*n:y=100")
    clip(pop, "x=100:y=100:enable='gte(n,30)'")
    found = qc.flicker(blink, 640, 360, 30)
    assert len(found) == 1, found
    f0, f1, worst, share, (x0, y0, x1, y1) = found[0]
    assert f1 - f0 > 40 and share > 0.05, found
    assert x0 <= 100 and y0 <= 100 and x1 >= 220 and y1 >= 220, found
    assert qc.flicker(slide, 640, 360, 30) == []
    assert qc.flicker(pop, 640, 360, 30) == []
    out = Path(tmp) / "frames.jpg"
    qc.frames(blink, worst, (x0, y0, x1, y1), out)
    assert out.stat().st_size > 0
print("flicker: ok")
