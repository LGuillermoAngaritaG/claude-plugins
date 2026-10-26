#!/usr/bin/env python3
"""A YouTube thumbnail for a long video: a picture with one third left empty, and the title's few words drawn in code
on that third, so they are spelled right. 1280 x 720 JPG, videos/<series>/parts/<id>.jpg (the youtube-publish skill).

publish.json beside the script.json:
  "thumbnail": {"words": ["HOT EDGE,", "FROZEN", "MIDDLE"], "hot": 1,
                "subject": "A microwave oven, large, split down the middle: ...",
                "picture": "art/<series>/<id>/<name>.jpg",   (optional: a picture under public/ instead of a new drawing)
                "shrink": 0.72}                               (optional: the picture filled the frame; make room for words)
The channel profile gives "thumbnail": {"side": "left" | "right", "style": "...", "ink": "#..", "hot": "#..", "edge": "#.."}:
the empty third, the look of the picture, the colour of the words, of the "hot" line and of their outline.
Without "picture", Codex draws "<subject> <style>" with the side third left empty (scripts/art.py, about a minute);
the drawing is kept in out/thumbs/ and drawn again only when the words of the prompt change.

Usage: .venv/bin/python scripts/thumbnail.py <series/id>
"""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H = 1280, 720
FONT = ROOT / "public/fonts/Montserrat.ttf"


def font(size: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(FONT), size)
    try:
        f.set_variation_by_axes([900])  # Montserrat is a variable font: its heaviest weight
    except OSError:
        pass
    return f


def compose(picture: Image.Image, words: list[str], hot: int, side: str, ink: str, hot_ink: str, edge: str, shrink: float = 1.0) -> Image.Image:
    """The picture cut to 1280 x 720, and the words in one block on the empty side, as big as fits 500 px."""
    s = max(W / picture.width, H / picture.height)
    im = picture.convert("RGB").resize((round(picture.width * s), round(picture.height * s)), Image.LANCZOS)
    im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
    if shrink < 1:  # the subject filled the frame: shrink it to the far side, on its own background colour
        corner = (8, 8) if side == "left" else (W - 8, 8)
        small = im.resize((round(W * shrink), round(H * shrink)), Image.LANCZOS)
        bg = Image.new("RGB", (W, H), im.getpixel(corner))
        x = W - small.width - 10 if side == "left" else 10
        bg.paste(small, (x, (H - small.height) // 2 + 20))
        im = bg
    box = 500
    size = 140
    while size > 40 and max(font(size).getlength(w) for w in words) > box:
        size -= 4
    f, lh = font(size), round(size * 1.05)
    x0 = 56 if side == "left" else W - 56 - box
    y0 = (H - lh * len(words)) // 2
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i, w in enumerate(words):
        x = x0 if side == "left" else x0 + box - f.getlength(w)
        d.text((x, y0 + i * lh), w, font=f, fill=hot_ink if i == hot else ink, stroke_width=max(4, size // 18), stroke_fill=edge)
    shade = layer.split()[3].filter(ImageFilter.GaussianBlur(10))  # a soft shadow under the words
    base = im.convert("RGBA")
    base.paste(Image.new("RGBA", (W, H), (0, 0, 0, 90)), (6, 8), shade)
    return Image.alpha_composite(base, layer).convert("RGB")


def prompt(subject: str, style: str, side: str) -> str:
    other = "right" if side == "left" else "left"
    return (f"YouTube thumbnail, wide 16:9. {subject} {style} The subject sits in the {other} two thirds; the {side} third "
            "is plain background and empty. No text, no letters, no numbers, no logos.")


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1].count("/") != 1:
        sys.exit(__doc__)
    vid = sys.argv[1]
    d = ROOT / "src/videos" / vid
    script = json.loads((d / "script.json").read_text())
    t = json.loads((d / "publish.json").read_text()).get("thumbnail")
    profile = ROOT / "src/channels" / f"{script.get('channel')}.json"
    look = json.loads(profile.read_text()).get("thumbnail") if script.get("channel") and profile.exists() else None
    if not t or not look:
        sys.exit(f'{vid}: needs "thumbnail" in publish.json and in its channel profile (youtube-publish skill)')
    if t.get("picture"):
        src = ROOT / "public" / t["picture"]
    else:
        p = prompt(t["subject"], look["style"], look["side"])
        src = ROOT / "out/thumbs" / vid / f"{hashlib.sha1(p.encode()).hexdigest()[:8]}.png"
        if not src.exists():
            from art import draw  # Codex, through atelier; only needed for a new drawing
            print(f"{vid}: drawing the thumbnail picture ...", flush=True)
            draw(p, "16:9", src)
    im = compose(Image.open(src), t["words"], t.get("hot", -1), look["side"], look["ink"], look["hot"], look["edge"], t.get("shrink", 1.0))
    series, vid_id = vid.split("/")
    dest = ROOT / "videos" / series / "parts" / f"{vid_id}.jpg"
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, quality=92)
    mb = dest.stat().st_size / 1e6
    print(f"{dest.relative_to(ROOT)}: {W} x {H}, {mb:.2f} MB" + ("  (over 2 MB: YouTube refuses it)" if mb > 2 else ""))
    if mb > 2:
        sys.exit(1)


if __name__ == "__main__":
    main()
