#!/usr/bin/env python3
"""Uploads a series to YouTube as private videos with the user's own uploader (the youtube-publish skill): the long
videos first, then each Short with its long video's link in the description. The text of each video is publish.py's,
so it is what publish.md shows.

Writes videos/<series>/upload/<id>.json (the uploader's metadata) and videos/<series>/upload/ids.json (the YouTube
IDs). Without --execute it only runs the uploader's dry run on every file: nothing is sent.
  privacy           always private; the user makes a video public in YouTube Studio
  category          the channel profile's "youtube_category" (default "27", Education)
  synthetic media   publish.json "synthetic": true when a realistic-looking person, place or event is made by AI
  thumbnail         a long video's parts/<id>.jpg; a Short's is set in Studio (the uploader refuses it)
A video already in ids.json is skipped, except one whose thumbnail YouTube refused: running again retries only that.

The uploader is ~/Library/Application Support/YouTubeUploader/uploader/upload, or $YOUTUBE_UPLOADER; its README says
how a channel is connected. Exit 3: every video is up, but YouTube refused a thumbnail.

Usage: python3 scripts/upload.py <series> [--execute]
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from check import upright
from publish import ROOT, video

UPLOADER = os.environ.get("YOUTUBE_UPLOADER", str(Path.home() / "Library/Application Support/YouTubeUploader/uploader/upload"))
LINK = "(add the link to the long video after you upload it)"  # where publish.py leaves the link in a Short
REFUSED = "video_uploaded_thumbnail_failed"


def script(vid: str) -> dict:
    return json.loads((ROOT / "src/videos" / vid / "script.json").read_text())


def channel(vid: str) -> str:
    """The channel of a video: a Short's is its long video's."""
    s = script(vid)
    if s.get("channel"):
        return s["channel"]
    if s.get("from"):
        return channel(s["from"])
    sys.exit(f"{vid}: script.json has no \"channel\"; the uploader needs one")


def uploaded(vid: str) -> dict:
    """What ids.json says about a video: its YouTube ID and how its upload went."""
    series, vid_id = vid.split("/")
    f = ROOT / "videos" / series / "upload/ids.json"
    return json.loads(f.read_text()).get(vid_id, {}) if f.exists() else {}


def metadata(vid: str, link: str) -> dict:
    """The uploader's metadata for one video. A Short cut from a long video gets that video's link (a stand-in before
    that is up); a Short made on its own has none."""
    md, bad = video(vid)
    if bad:
        sys.exit("\n".join(bad) + f"\nFix these first: python3 scripts/publish.py {vid.split('/')[0]}")
    text = re.search(r"```text\n(.*?)\n```", md, re.S).group(1)
    tags = re.search(r"^Tags: (.*)$", md, re.M)
    short = upright(script(vid))
    if script(vid).get("from"):
        if LINK not in text:
            sys.exit(f"{vid}: no place for the long video's link in the description (publish.py changed?)")
        text = text.replace(LINK, f"https://youtu.be/{link}")
    profile = json.loads((ROOT / "src/channels" / f"{channel(vid)}.json").read_text())
    meta = {"title": md.split("\n", 1)[0][3:], "description": text, "tags": tags.group(1).split(", ") if tags else [],
            "category_id": profile.get("youtube_category", "27"), "made_for_kids": False, "privacy": "private",
            "video_type": "short" if short else "long"}
    series, vid_id = vid.split("/")
    thumb = ROOT / "videos" / series / "parts" / f"{vid_id}.jpg"
    if not short and thumb.exists():
        meta["thumbnail"] = str(thumb)
    pub = json.loads((ROOT / "src/videos" / vid / "publish.json").read_text())
    return meta | {"notify_subscribers": False, "contains_synthetic_media": bool(pub.get("synthetic", False))}


def main() -> None:
    args = [a for a in sys.argv[1:] if a != "--execute"]
    execute = len(args) < len(sys.argv) - 1
    if len(args) != 1 or "/" in args[0]:
        sys.exit(__doc__)
    series = args[0]
    vids = [f"{series}/{p.parent.name}" for p in sorted((ROOT / "src/videos" / series).glob("*/publish.json"))]
    if not vids:
        sys.exit(f"{series}: no video has a publish.json yet (youtube-publish skill)")
    out = ROOT / "videos" / series / "upload"
    out.mkdir(parents=True, exist_ok=True)
    refused = []
    for vid in sorted(vids, key=lambda v: bool(script(v).get("from"))):  # long videos first: each Short links to one
        vid_id, done = vid.split("/")[1], uploaded(vid)
        if done.get("video_id") and done.get("result") != REFUSED:
            print(f"{vid_id}: up already, https://youtu.be/{done['video_id']}")
            continue
        long = script(vid).get("from")
        link = uploaded(long).get("video_id") if long else ""
        if long and not link and execute:
            sys.exit(f"{vid_id}: its long video {long} is not up yet; upload that first")
        mp4 = ROOT / "videos" / series / "parts" / f"{vid_id}.mp4"
        if not mp4.exists():
            sys.exit(f"{vid_id}: {mp4.relative_to(ROOT)} is not built yet")
        meta = out / f"{vid_id}.json"
        meta.write_text(json.dumps(metadata(vid, link or "LONGVIDEOID"), ensure_ascii=False, indent=2) + "\n")
        r = subprocess.run([UPLOADER, "--channel", channel(vid), "--video", str(mp4), "--metadata", str(meta),
                            "--execute" if execute else "--dry-run"], capture_output=True, text=True)
        if r.returncode not in (0, 3):  # the uploader's output is safe to show: it never prints credentials
            sys.exit(f"{vid_id}: the uploader stopped (exit {r.returncode}); nothing after it was tried\n{r.stdout}{r.stderr}")
        res = json.loads(r.stdout)
        if not execute:
            print(f"{vid_id}: dry run ok, {res.get('channel_name')}, {res.get('privacy')}, thumbnail {'yes' if res.get('thumbnail_requested') else 'no'}")
            continue
        ids_file = out / "ids.json"
        ids = json.loads(ids_file.read_text()) if ids_file.exists() else {}
        keep = ("result", "video_id", "thumbnail", "actual_privacy")
        ids[vid_id] = {k: res.get(k) if res.get(k) is not None else done.get(k) for k in keep}  # a rerun answers less
        ids_file.write_text(json.dumps(ids, indent=1) + "\n")
        print(f"{vid_id}: {res.get('result')}, https://youtu.be/{res.get('video_id')}, thumbnail {res.get('thumbnail')}")
        if r.returncode == 3:
            refused.append(vid_id)
    if refused:
        print(f"YouTube refused the thumbnail of {', '.join(refused)}: verify the channel for custom thumbnails "
              "(youtube.com/verify, with that channel selected), then run this again; only the thumbnail is sent")
        sys.exit(3)


if __name__ == "__main__":
    main()
