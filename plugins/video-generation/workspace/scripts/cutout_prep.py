#!/usr/bin/env python3
"""Cut-outs for a cutout video (shorts plugin, cutout-video skill): the flat blue ground of each Codex picture becomes transparent,
the picture is trimmed to its subject, and the head of a character pose is measured.

Reads out/art/<series/id>/raw/*.png, writes public/art/<series/id>/<name>.png, sprites.json beside the
script (size, trim box, head centre and radius in the trimmed picture) and qa.png (every cut-out on a coloured ground).

Usage: .venv/bin/python scripts/cutout_prep.py <series/id>   (after scripts/cutout_draw.sh)
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
HOLES = {"board"}  # pictures with the ground showing through a hole


def key(rgb: np.ndarray, holes: bool = False) -> np.ndarray:
    """Alpha of a picture on a flat ground: the ground colour connected to the border is clear, the edge is un-blended."""
    ground = np.median(np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]), 0)
    dist = np.sqrt(((rgb - ground) ** 2).sum(2))
    lab, _ = ndimage.label(dist < 60)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, border[border > 0])
    if holes:  # ground seen through a hole (the handle of a board): every large patch of the exact ground colour
        sizes = ndimage.sum(np.ones_like(dist), lab, range(lab.max() + 1))
        bg |= np.isin(lab, np.nonzero(sizes > 300)[0][1:]) & (dist < 30)
    alpha = np.where(bg, 0.0, 1.0)
    # A 3 px band round the ground: partly ground, partly ink. Its alpha is how far it is from the ground colour.
    edge = ndimage.binary_dilation(bg, iterations=3) & ~bg
    alpha[edge] = np.clip(dist[edge] / 160, 0, 1)
    return alpha


def head(alpha: np.ndarray) -> tuple[int, int, float]:
    """The largest disc inside the hole-filled silhouette, in the top half: there it is the head, even when the body is wider."""
    solid = ndimage.binary_fill_holes(alpha > 0.5)
    dt = ndimage.distance_transform_edt(solid)
    dt[dt.shape[0] // 2 :] = 0
    y, x = np.unravel_index(dt.argmax(), dt.shape)
    return int(x), int(y), float(dt[y, x])


def main() -> None:
    vid = sys.argv[1]
    raw = ROOT / "out/art" / vid / "raw"
    dest = ROOT / "public/art" / vid
    dest.mkdir(parents=True, exist_ok=True)
    out, tiles = {}, []
    for f in sorted(raw.glob("*.png")):
        rgb = np.asarray(Image.open(f).convert("RGB"), float)
        alpha = key(rgb, f.stem in HOLES)
        ys, xs = np.nonzero(alpha > 0.05)
        pad = 12
        y0, y1, x0, x1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, rgb.shape[0]), max(xs.min() - pad, 0), min(xs.max() + pad + 1, rgb.shape[1])
        # Edge pixels take the colour of the ink they blend with: no blue fringe.
        rgb = np.where((alpha > 0)[..., None] & (alpha < 1)[..., None], np.minimum(rgb, 40), rgb)
        rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)[y0:y1, x0:x1]
        Image.fromarray(rgba).save(dest / f.name)
        hx, hy, hr = head(alpha[y0:y1, x0:x1])
        out[f.stem] = {"src": f"art/{vid}/{f.name}", "w": int(x1 - x0), "h": int(y1 - y0), "trim": [int(x0), int(y0)], "head": [hx, hy, round(hr, 1)]}
        if f.stem == "halves":  # two halves side by side: where to split them, the emptiest column of the middle third
            a = alpha[y0:y1, x0:x1]
            w = a.shape[1]
            out[f.stem]["split"] = int(w // 3 + np.argmin(a[:, w // 3 : 2 * w // 3].sum(0)))
        tiles.append(Image.fromarray(rgba))
    (ROOT / "src/videos" / vid / "sprites.json").write_text(json.dumps(out, indent=1) + "\n")
    # The sheet: every cut-out shrunk onto a strong colour, so a hole or a fringe shows.
    cell = 360
    sheet = Image.new("RGB", (cell * 4, cell * ((len(tiles) + 3) // 4)), (230, 60, 140))
    for i, t in enumerate(tiles):
        t.thumbnail((cell - 20, cell - 20))
        sheet.paste(t, (i % 4 * cell + 10, i // 4 * cell + 10), t)
    sheet.save(ROOT / "out/art" / vid / "qa.png")
    for name, s in out.items():
        print(f"{name:10} {s['w']} x {s['h']}  head {s['head']}")


if __name__ == "__main__":
    main()
