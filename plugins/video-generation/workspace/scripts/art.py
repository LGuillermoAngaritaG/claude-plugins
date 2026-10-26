#!/usr/bin/env python3
"""Images for the video types that use them, made by Codex (ChatGPT image generation, through `atelier run codex-image`).

A script.json lists its images as "images": {"name": "what to draw"}; a value can also be
{"prompt": "...", "ar": "1:1"}. The "type" of the script sets the style and what is done with the result:

  sketch   an ink drawing with colour washes on white. White becomes transparent, and the ink lines are
           traced into pen strokes, so the animation can draw the picture line by line.
  story    a full painted frame, upright. Used as it is.
  ad       a photographic frame, upright: the first frame of an AI clip (skill ai-clips), or a still.
  explainer  a clean textbook illustration on white, square: shown in a frame (Picture), or the first frame of a clip.

An image can name an earlier image as its reference, {"prompt": "...", "ref": "anna"}: Codex is told
to keep the person, the clothes and the room of that picture. Text alone never gives the same face twice.

Writes public/art/<series>/<id>/<name>.png (and <name>.ink.png for a sketch) and art.json beside the
script: for each image its file, its size and, for a sketch, its strokes. An image is made again only
when its prompt changes. The untouched result of Codex is kept in out/art/, so `--retrace` can trace
the strokes again without drawing again.

Usage: .venv/bin/python scripts/art.py <series/id> [--retrace]
"""
import hashlib
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.measure import approximate_polygon
from skimage.morphology import skeletonize

ROOT = Path(__file__).resolve().parent.parent

STYLE = {
    "sketch": (
        "Hand-drawn illustration in black ink on a pure white background: confident, slightly uneven pen lines of "
        "even medium weight, like a skilled whiteboard explainer drawing. Simple and clear: few lines, closed shapes, "
        "no hatching, no cross-hatching, no stippling, no texture. Fill some areas with flat soft watercolour washes in two "
        "or three muted colours, staying loosely inside the lines. One subject, centred, with a wide empty white margin on "
        "every side. No text, no letters, no numbers, no labels, no frame, no background scene, no paper texture, no shadow under the subject.",
        "1:1",
    ),
    "story": (
        "Cinematic digital painting for a true-crime documentary: moody, low-key lighting, deep shadows, one clear focal "
        "point, muted cold palette with a single warm light source, soft film grain, shallow depth of field. Composed for "
        "an upright phone screen, with the subject in the middle third and calm dark space at the top and at the bottom. "
        "People are seen from behind, far away or in silhouette: no recognisable faces, no real persons. No gore, no blood, "
        "no weapons pointed at anyone. No text, no letters, no numbers, no signs with writing, no logos, no watermark, no frame.",
        "9:16",
    ),
    "ad": (
        "Photorealistic still frame from a modern commercial, shot on a cinema camera: natural soft light, realistic skin "
        "and materials, shallow depth of field, a calm colour grade. Composed for an upright phone screen, with the main "
        "subject in the upper half and quieter space in the lower half. Ordinary, believable people, not models posing, "
        "with their mouths closed. Laptops and phones are seen from behind or from the side, so no screen content is "
        "visible. No text, no letters, no numbers, no logos, no brand names, no watermark, no frame.",
        "9:16",
    ),
    # A picture that fills the frame (an explainer's FullPicture, the start of a clip): "scene": true in "images".
    "scene": (
        "Clean modern illustration of a real scene, like an editorial picture in a good magazine: flat colours with soft "
        "shading, crisp thin dark outlines, a calm palette, natural light. The scene fills the whole frame edge to edge, "
        "with no white margin and no border. Ordinary, believable people with calm faces and simple, natural hands. No "
        "text, no letters, no numbers, no logos, no readable screens, no watermark.",
        "16:9",
    ),
    "explainer": (
        "Clean modern technical illustration, like a figure in a good textbook: flat colours with soft shading, crisp thin "
        "dark outlines, a calm palette with one or two warm accents. One subject, centred and fully in view, on a pure white "
        "background with a wide empty margin. Correct in every detail a specialist would check. No text, no letters, no "
        "numbers, no labels, no arrows, no logos, no frame, no watermark.",
        "1:1",
    ),
}


def draw(prompt: str, ar: str, dest: Path) -> None:
    """One image from Codex. It takes about a minute. atelier exits 0 even when the agent gives up: the file is the only proof."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["atelier", "run", "codex-image", "--hide-steps", "-i", f"prompt={prompt}", "-i", f"dest={dest}", "-i", f"ar={ar}"], cwd=dest.parent, check=True, stdout=subprocess.DEVNULL, timeout=900)
    if not dest.exists():
        sys.exit(f"Codex did not make {dest}")


def trace(ink: np.ndarray) -> list[list]:
    """The ink of a drawing as pen strokes [width, length, points], in the order a hand would draw them."""
    skel = skeletonize(ink)
    half = ndimage.distance_transform_edt(ink)  # how far each ink pixel is from the paper: half the line width on the skeleton
    h, w = skel.shape
    near = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    todo = {(int(y), int(x)) for y, x in zip(*np.nonzero(skel))}
    degree = lambda p: sum((p[0] + dy, p[1] + dx) in todo for dy, dx in near)
    strokes = []
    # Start from line ends, so a line is walked from one end to the other; what is left after that are closed loops.
    for pick in (lambda: [p for p in todo if degree(p) == 1], lambda: list(todo)):
        for start in sorted(pick()):
            while start in todo:
                path, p = [start], start
                todo.discard(start)
                while True:
                    step = [(p[0] + dy, p[1] + dx) for dy, dx in near if (p[0] + dy, p[1] + dx) in todo]
                    if not step:
                        break
                    # Keep going straight where lines cross.
                    back = path[-4] if len(path) > 3 else path[0]
                    p = max(step, key=lambda q: (q[0] - back[0]) * (p[0] - back[0]) + (q[1] - back[1]) * (p[1] - back[1]))
                    todo.discard(p)
                    path.append(p)
                if len(path) > 1:
                    strokes.append(path)
                start = next((q for q in path if any((q[0] + dy, q[1] + dx) in todo for dy, dx in near)), None)  # a branch left behind
                if start is None:
                    break
                start = next((q[0] + dy, q[1] + dx) for q in [start] for dy, dx in near if (q[0] + dy, q[1] + dx) in todo)
    out = []
    for path in strokes:
        pts = approximate_polygon(np.array(path, float), 0.8)[:, ::-1]  # x, y
        length = float(np.hypot(*np.diff(pts, axis=0).T).sum())
        width = 2 * float(max(half[y, x] for y, x in path)) + 5  # wide enough to uncover the whole line
        out.append([round(width, 1), round(length, 1), pts])
    # The hand: start at the top left, then always the nearest line end, turning a line round when its far end is nearer.
    order, pen = [], np.zeros(2)
    while out:
        k, flip = min(((i, f) for i in range(len(out)) for f in (0, 1)), key=lambda c: float(np.hypot(*(out[c[0]][2][-1 if c[1] else 0] - pen))))
        width, length, pts = out.pop(k)
        pts = pts[::-1] if flip else pts
        pen = pts[-1]
        order.append([width, length, "M" + "L".join(f"{x:.0f},{y:.0f}" for x, y in pts)])
    return order


def sketch(raw: Path, dest: Path) -> dict:
    """White becomes transparent (the paper shows through), and the ink is split off and traced."""
    rgb = np.asarray(Image.open(raw).convert("RGB"), float) / 255
    alpha = 1 - rgb.min(axis=2)  # white = paper = clear; any colour or black stays
    alpha = np.clip((alpha - 0.04) / 0.5, 0, 1)
    # Take the white back out of the colour, so a pale wash keeps its hue on cream paper.
    colour = np.where(alpha[..., None] > 0, (rgb - (1 - alpha[..., None])) / np.maximum(alpha[..., None], 1e-3), 0).clip(0, 1)
    Image.fromarray((np.dstack([colour, alpha]) * 255).astype(np.uint8)).save(dest)
    dark = rgb.max(axis=2) < 0.42  # ink: dark in every channel
    dark = ndimage.binary_opening(dark) | dark  # keep thin lines
    ink = np.dstack([rgb * 0, np.where(dark, 1.0, 0)])
    ink[..., 3] = ndimage.gaussian_filter(ink[..., 3], 0.6)
    Image.fromarray((ink * 255).astype(np.uint8)).save(dest.with_suffix(".ink.png"))
    strokes = trace(dark)
    return {"ink": str(dest.with_suffix(".ink.png").relative_to(ROOT / "public")), "strokes": strokes, "len": round(sum(s[1] for s in strokes))}


WORKERS = 3  # ponytail: Codex images drawn at once; more may run into the subscription's rate limit


def key(kind: str, ar: str, spec: dict, style: str, ref_prompt: str = "") -> str:
    """The hash an image is kept under: it changes with its prompt, its shape, the style and its reference."""
    return hashlib.sha1(f"{kind}{ar}{spec['prompt']}{style}{ref_prompt}".encode()).hexdigest()[:8]


def save(d: Path, art: dict) -> None:
    (d / "art.json").write_text("{\n" + ",\n".join(f" {json.dumps(k)}: {json.dumps(v)}" for k, v in art.items()) + "\n}\n")


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1 or "/" not in args[0]:
        sys.exit(__doc__)
    vid = args[0]
    d = ROOT / "src/videos" / vid
    script = json.loads((d / "script.json").read_text())
    kind = script.get("type")
    if kind not in STYLE:
        sys.exit(f'{vid}: only a script with "type": "sketch", "story", "ad" or "explainer" has images')
    old = json.loads((d / "art.json").read_text()) if (d / "art.json").exists() else {}
    # A channel's own style (src/channels/<name>.json, "art_style") is added to the type's, whose rules stay.
    channel = ROOT / "src/channels" / f"{script['channel']}.json" if script.get("channel") else None
    extra = json.loads(channel.read_text()).get("art_style") if channel and channel.exists() else None
    # An explainer's picture with "sketch": true is an ink drawing traced into pen strokes, for the sketch kit's Sketch;
    # one with "scene": true fills the frame, for FullPicture or the start of a clip.
    look = lambda spec: "sketch" if spec.get("sketch") else "scene" if spec.get("scene") else kind
    style = lambda spec: f"{STYLE[look(spec)][0]} {extra}" if extra else STYLE[look(spec)][0]
    art = {}
    specs = {n: (s if isinstance(s, dict) else {"prompt": s}) for n, s in script.get("images", {}).items()}
    # Images that need no other image as their reference are drawn a few at a time; the loop below then finds them
    # drawn. An image with "ref" waits for its reference, in the loop.
    first = []
    for name, spec in specs.items():
        ar = spec.get("ar", STYLE[look(spec)][1])
        digest = key(look(spec), ar, spec, style(spec))
        raw = ROOT / "out/art" / vid / f"{name}-{digest}.png"
        done = old.get(name, {}).get("prompt") == digest and (ROOT / "public" / old[name].get("src", "-")).exists()
        if not spec.get("ref") and not raw.exists() and not done:
            first.append((f"{spec['prompt']}. {style(spec)}", ar, raw))
    if first:
        print(f"{vid}: drawing {len(first)} image(s), {WORKERS} at a time ...", flush=True)
        with ThreadPoolExecutor(WORKERS) as pool:
            list(pool.map(lambda job: draw(*job), first))
    for name, spec in specs.items():
        ar = spec.get("ar", STYLE[look(spec)][1])
        ref = spec.get("ref")
        if ref and ref not in art:
            sys.exit(f'{vid}: image "{name}" has "ref": "{ref}", which must be an image listed before it')
        keep = f" Open the picture {ROOT / 'public' / art[ref]['src']} and keep its person, face, hair, clothes and room exactly the same." if ref else ""
        digest = key(look(spec), ar, spec, style(spec), art[ref]["prompt"] if ref else "")
        raw = ROOT / "out/art" / vid / f"{name}-{digest}.png"
        dest = ROOT / "public/art" / vid / f"{name}.png"
        if old.get(name, {}).get("prompt") == digest and dest.exists() and not ("--retrace" in sys.argv and raw.exists()):
            art[name] = old[name]
            continue
        if not raw.exists():
            print(f"{vid}: drawing {name} ...", flush=True)
            draw(f"{spec['prompt']}.{keep} {style(spec)}", ar, raw)
        dest.parent.mkdir(parents=True, exist_ok=True)
        size = Image.open(raw).size
        art[name] = {"prompt": digest, "src": str(dest.relative_to(ROOT / "public")), "w": size[0], "h": size[1]}
        if look(spec) == "sketch":
            art[name].update(sketch(raw, dest))
        else:
            Image.open(raw).convert("RGB").save(dest.with_suffix(".jpg"), quality=90)
            dest = dest.with_suffix(".jpg")
            art[name]["src"] = str(dest.relative_to(ROOT / "public"))
        print(f"{vid}: {name} {size[0]} x {size[1]}" + (f", {len(art[name]['strokes'])} strokes" if look(spec) == "sketch" else ""), flush=True)
        save(d, {**old, **art})  # after every image: a run that is stopped keeps what it has drawn
    save(d, art)


if __name__ == "__main__":
    main()
