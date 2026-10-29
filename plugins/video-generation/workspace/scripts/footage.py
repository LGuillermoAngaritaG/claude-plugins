#!/usr/bin/env python3
"""Real footage for a video: stock clips (Pexels, Pixabay), game trailers from Steam, excerpts of YouTube videos and
files of your own. Each piece is cut to the seconds the video uses, its sound is removed, it is scaled and cropped to
the video's frame and saved as public/art/<series>/<id>/footage/<name>.mp4; where it came from goes in footage.json
beside script.json. publish.py credits every piece in the description; check.py refuses a footage file that
footage.json does not list.

Rights. Stock comes under its site's free license; it is credited anyway. A trailer, gameplay or any YouTube video is
someone else's work: use it only in a video about that work (news, a review, how it was made), from its official
channel or store page when there is one, at most EXCERPT seconds a piece, with your own voice and drawing over it.
Content ID can still claim such a video, and a takedown is a strike on the channel.

Usage: python3 scripts/footage.py <series/id> search pexels|pixabay "<words>"   candidates in the video's shape, their
                                                                                 thumbnails in out/footage/<series>/<id>/
       python3 scripts/footage.py <series/id> search steam <appid>              a game's trailers on its Steam page
       python3 scripts/footage.py <series/id> get <name> <ref> [--from S] [--seconds N] [--focus F]
                                                         [--credit "..." --license "..."]
  <ref>    pexels:<id> | pixabay:<id> | steam:<appid>/<trailer id> | youtube:<url or id> | a file of yours (it needs
           --credit, who made it, and --license, why you may use it: "own recording", "press kit, media use")
  --from   where the piece starts in the source, in seconds (0); --seconds how long it is (6)
  --focus  where the crop sits across a source wider than the frame, 0 left to 1 right (0.5)
In a scene: <Clip src="art/<series>/<id>/footage/<name>.mp4" /> (sketch and story videos import Clip from kits/ad).
Keys: PEXELS_API_KEY, PIXABAY_API_KEY (free: pexels.com/api, pixabay.com/api/docs). YouTube runs yt-dlp through uvx.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

import check  # scripts/check.py: upright()

ROOT = Path(__file__).resolve().parent.parent
EXCERPT = 8  # ponytail: seconds a piece of someone else's work may last; a rule of thumb for commentary, not a law
OTHERS = ("steam", "youtube")  # sources whose footage belongs to someone else


def fetch(url: str, headers: dict | None = None) -> dict:
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {"User-Agent": "footage.py"}), timeout=60) as r:
        return json.load(r)


def key(name: str) -> str:
    return os.environ.get(name) or sys.exit(f"{name} is not set: get a free key and add it to your shell, as footage.py's help says")


def frame(vid: str) -> tuple[int, int]:
    """The video's frame: upright for Shorts and ads, else wide."""
    script = json.loads((ROOT / "src/videos" / vid / "script.json").read_text())
    return (1080, 1920) if check.upright(script) or script.get("type") == "ad" else (1920, 1080)


def pexels(ref: str = "", words: str = "", tall: bool = True):
    """A Pexels video by id, or the search results for words."""
    head = {"Authorization": key("PEXELS_API_KEY"), "User-Agent": "footage.py"}
    if words:
        q = urllib.parse.urlencode({"query": words, "orientation": "portrait" if tall else "landscape", "per_page": 10})
        return [(v["id"], v["duration"], v["width"], v["height"], v["user"]["name"], v["image"]) for v in fetch(f"https://api.pexels.com/v1/videos/search?{q}", head)["videos"]]
    v = fetch(f"https://api.pexels.com/v1/videos/videos/{ref}", head)
    files = sorted((f for f in v["video_files"] if f.get("width") and f["file_type"] == "video/mp4"), key=lambda f: f["width"] * f["height"])
    best = next((f for f in files if min(f["width"], f["height"]) >= 1080), files[-1])  # the smallest that fills 1080p
    return best["link"], {"url": v["url"], "credit": f"{v['user']['name']} on Pexels", "license": "Pexels License"}


def pixabay(ref: str = "", words: str = "", tall: bool = True):
    """A Pixabay video by id, or the search results for words (Pixabay cannot filter by shape: look at the sizes)."""
    q = urllib.parse.urlencode({"key": key("PIXABAY_API_KEY"), "per_page": 10, "safesearch": "true"} | ({"q": words} if words else {"id": ref}))
    hits = fetch(f"https://pixabay.com/api/videos/?{q}")["hits"]
    if words:
        return [(h["id"], h["duration"], h["videos"]["medium"]["width"], h["videos"]["medium"]["height"], h["user"], h["videos"]["medium"]["thumbnail"]) for h in hits]
    h = hits[0]
    best = h["videos"]["large"] if h["videos"]["large"]["size"] else h["videos"]["medium"]
    return best["url"], {"url": h["pageURL"], "credit": f"{h['user']} on Pixabay", "license": "Pixabay Content License"}


def steam(ref: str = "", words: str = "", tall: bool = True):
    """A trailer of a game's Steam store page (ref "<appid>/<trailer id>"), or the list of its trailers (words: the appid)."""
    app, _, movie = (words or ref).partition("/")
    game = fetch(f"https://store.steampowered.com/api/appdetails?appids={app}")[app]
    if not game.get("success"):
        sys.exit(f"steam: no game with the appid {app}")
    game = game["data"]
    if words:
        return [(m["id"], None, None, None, m["name"], m["thumbnail"]) for m in game.get("movies", [])]
    m = next((m for m in game.get("movies", []) if str(m["id"]) == movie), None) or sys.exit(f"steam: {app} has no trailer {movie}; list them with: search steam {app}")
    by = ", ".join(game.get("publishers") or game.get("developers") or ["its publisher"])
    return m["hls_h264"], {"url": f"https://store.steampowered.com/app/{app}", "credit": f"{game['name']}, \"{m['name']}\", {by}", "license": "excerpt of an official trailer (Steam store page)"}


def youtube(ref: str, start: float, seconds: float, out: Path) -> dict:
    """Downloads only the seconds used, picture only, and says whose video it is."""
    url = ref if "/" in ref else f"https://www.youtube.com/watch?v={ref}"
    yt = ["uvx", "yt-dlp", "--quiet", "--no-warnings", "--no-playlist"]
    info = subprocess.run(yt + ["--print", "%(channel)s\t%(title)s\t%(webpage_url)s", "--skip-download", url], capture_output=True, text=True)
    if info.returncode:
        sys.exit(f"youtube: yt-dlp could not read {url}\n{info.stderr[-600:]}")
    channel, title, page = info.stdout.strip().split("\t")
    got = subprocess.run(yt + ["-f", "bv*[height<=1080]/bv*", "--download-sections", f"*{start}-{start + seconds}", "--force-keyframes-at-cuts", "-o", str(out), url], capture_output=True, text=True)
    if got.returncode or not out.exists():
        sys.exit(f"youtube: yt-dlp could not download {url}\n{got.stderr[-600:]}")
    return {"url": page, "credit": f"{channel}, \"{title}\"", "license": "excerpt (YouTube)"}


def cut(src: str, start: float, seconds: float, size: tuple[int, int], focus: float, dst: Path) -> None:
    """The piece, with no sound, cropped to fill the frame at 30 frames a second."""
    w, h = size
    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}:(iw-{w})*{focus}:(ih-{h})/2,fps=30,format=yuv420p"
    dst.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-i", src, "-t", str(seconds), "-an", "-vf", vf,
                        "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", str(dst)], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"ffmpeg could not cut {src}\n{r.stderr[-600:]}")


def opt(args: list[str], flag: str, default=None):
    return args[args.index(flag) + 1] if flag in args else default


def main() -> None:
    a = sys.argv[1:]
    if len(a) < 4 or a[1] not in ("search", "get") or "/" not in a[0]:
        sys.exit(__doc__)
    vid, cmd = a[0], a[1]
    size = frame(vid)
    if cmd == "search":
        source, words = a[2], a[3]
        find = {"pexels": pexels, "pixabay": pixabay, "steam": steam}.get(source) or sys.exit(f"search: {source} is not one of pexels, pixabay, steam")
        out = ROOT / "out/footage" / vid
        out.mkdir(parents=True, exist_ok=True)
        for ref, secs, w, h, who, thumb in find(words=words, tall=size[1] > size[0]):
            pic = out / f"{source}-{ref}.jpg"
            urllib.request.urlretrieve(thumb, pic)
            shape = f"  {secs} s  {w}x{h}" if w else ""  # Steam does not say a trailer's length or size
            print(f"{source}:{(words + '/') if source == 'steam' else ''}{ref}{shape}  {who}  {pic.relative_to(ROOT)}")
        return
    name, ref = a[2], a[3]
    if not re.fullmatch(r"[a-z0-9-]+", name):
        sys.exit(f'the name "{name}" uses lower case, digits and dashes only')
    start, seconds, focus = float(opt(a, "--from", 0)), float(opt(a, "--seconds", 6)), float(opt(a, "--focus", 0.5))
    source = ref.split(":", 1)[0] if ":" in ref and not Path(ref).exists() else "file"
    if source in OTHERS and seconds > EXCERPT:
        sys.exit(f"{ref}: someone else's footage is used {EXCERPT} seconds at most a piece; cut it into the moments you need")
    dst = ROOT / "public/art" / vid / "footage" / f"{name}.mp4"
    with tempfile.TemporaryDirectory() as tmp:
        if source == "youtube":
            raw = Path(tmp) / "raw.mp4"
            info = youtube(ref.split(":", 1)[1], start, seconds, raw)
            cut(str(raw), 0, seconds, size, focus, dst)  # the download already starts at --from
        elif source == "file":
            if not opt(a, "--credit") or not opt(a, "--license"):
                sys.exit(f"{ref}: a file of yours needs --credit (who made it) and --license (why you may use it)")
            info = {"url": "", "credit": opt(a, "--credit"), "license": opt(a, "--license")}
            cut(ref, start, seconds, size, focus, dst)
        else:
            get = {"pexels": pexels, "pixabay": pixabay, "steam": steam}.get(source) or sys.exit(f"{ref}: the source is one of pexels, pixabay, steam, youtube, or a file")
            link, info = get(ref.split(":", 1)[1])
            cut(link, start, seconds, size, focus, dst)
    if opt(a, "--credit"):
        info["credit"] = opt(a, "--credit")
    manifest = ROOT / "src/videos" / vid / "footage.json"
    pieces = json.loads(manifest.read_text()) if manifest.exists() else {}
    pieces[name] = {"ref": ref, **info, "from": start, "seconds": seconds}
    manifest.write_text(json.dumps(pieces, indent=1, ensure_ascii=False) + "\n")
    print(f"{dst.relative_to(ROOT)}: {seconds:g} s from {ref}, no sound; credit: {info['credit']}")


if __name__ == "__main__":
    main()
