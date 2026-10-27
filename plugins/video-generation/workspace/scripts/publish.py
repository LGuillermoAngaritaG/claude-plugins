#!/usr/bin/env python3
"""Everything to upload a series to YouTube, from the videos' own files: for each video a title, a description (an
intro, chapters, the sources, the channel's note and about line), tags, and the files to upload. Writes
videos/<series>/publish.md and checks YouTube's limits (the youtube-publish skill).

You write publish.json beside each video's script.json:
  {"title": "...", "intro": "Two to four plain sentences.", "tags": ["..."], "first_chapter": "Today's stories",
   "thumbnail": {...}}                                     (scripts/thumbnail.py reads "thumbnail")
A Short (its script.json has "from") needs only "title" and "intro". The rest comes from the files:
  chapters  references.md: each "## <chapter>" with its "<!-- scenes: ... -->", timed with timing.json; a first chapter
            that does not start at 0:00 gets one before it ("first_chapter", or "Intro")
  sources   references.md: "To go deeper", then every other source once. A Short lists its own chapters' sources.
            When the description would pass YouTube's 5,000 characters, each other source is cut to the start of
            its text and its first link, so every source still fits.
  note, about, tags   the channel profile, src/channels/<channel>.json ("note" in publish.json replaces the channel's
            note for one video, for a warning that belongs to its topic)
  files     videos/<series>/parts/<id>.mp4, .srt and .jpg (the thumbnail)

Usage: python3 scripts/publish.py <series>
"""
import json
import re
import sys
from pathlib import Path

from check import PACE, cues

ROOT = Path(__file__).resolve().parent.parent
TITLE, DESCRIPTION, TAGS, CHAPTER = 100, 5000, 500, 10  # YouTube's limits: characters, characters, characters, seconds


def link(line: str) -> str | None:
    """The first link of a source line, without the punctuation that follows it in the sentence."""
    m = re.search(r"https?://\S+", line)
    if not m:
        return None
    url = m.group(0).rstrip(".,;")
    return url[:-1] if url.endswith(")") and url.count("(") < url.count(")") else url


def compact(line: str, n: int) -> str:
    """A source line cut to its first n characters of text and its first link. A line with no link (a number worked
    out in the video) stays whole: cut, it would say nothing."""
    url = link(line)
    if not url:
        return line
    text = line[2 : line.index("http")].strip()
    if len(text) > n:
        text = text[:n].rsplit(" ", 1)[0].rstrip(" ,.;:(") + "..."
    return f"- {text} {url}"


def sources(refs: str, short: bool) -> tuple[list[str], list[str]]:
    """The "To go deeper" lines and every other source line of references.md, each source once (by its first link)."""
    deeper, rest, seen, part = [], [], set(), None
    for line in refs.splitlines():
        if line.startswith("## "):
            part = "deeper" if line[3:].strip().lower() == "to go deeper" else "rest"
        elif line.startswith("- ") and part:
            key = link(line) or line
            if key not in seen:
                seen.add(key)
                (deeper if part == "deeper" else rest).append(line)
    if short:  # a Short's references.md keeps the long video's "To go deeper": its own chapters' sources fit it better
        return [], rest or deeper
    return deeper, rest


def stamp(s: float) -> str:
    return f"{int(s // 60)}:{int(s % 60):02d}"


def chapters(refs: str, script: dict, timing: dict, first: str) -> list[tuple[float, str]]:
    """The chapters of references.md, each at the second its first scene starts."""
    start, frames = {}, 0  # whole frames per scene, as the video counts them (scenesOf in scripts/lib.mjs)
    for scene in script["scenes"]:
        start[scene["id"]] = frames / 30
        frames += round(cues(timing[scene["id"]], script.get("pace", PACE))[1] * 30)
    t = frames / 30
    out = []
    for name, ids in re.findall(r"^## (.+)\n<!-- scenes: ([^>]+?) -->", refs, re.M):
        found = [start[i] for i in ids.split() if i in start]
        if found:
            out.append((min(found), name.strip()))
    out.sort()
    if out and out[0][0] >= 1:
        out.insert(0, (0.0, first))
    return [(0.0 if i == 0 else s, n) for i, (s, n) in enumerate(out)] + [(t, "")]  # the end, for the last length


def video(vid: str) -> tuple[str, list[str]]:
    """The publish.md part of one video, and the problems found."""
    d = ROOT / "src/videos" / vid
    script = json.loads((d / "script.json").read_text())
    pub = json.loads((d / "publish.json").read_text())
    # A Short's script names the long video it was cut from, not the channel: the long video's script does.
    channel = script.get("channel") or json.loads((ROOT / "src/videos" / script["from"] / "script.json").read_text()).get("channel") if script.get("from") else script.get("channel")
    profile = ROOT / "src/channels" / f"{channel}.json"
    ch = json.loads(profile.read_text()) if channel and profile.exists() else {}
    refs = (d / "references.md").read_text() if (d / "references.md").exists() else ""
    short = bool(script.get("from"))
    deeper, rest = sources(refs, short)
    note, about = pub.get("note", ch.get("note", "")), ch.get("about", "")
    bad = []
    if short:
        build = lambda lines: [pub["intro"], "Full video: (add the link to the long video after you upload it)", "Sources\n" + "\n".join(lines), note, "#Shorts"]
    else:
        timing = json.loads((d / "timing.json").read_text())
        marks = chapters(refs, script, timing, pub.get("first_chapter", "Intro"))
        if len(marks) - 1 < 3:
            bad.append(f"{vid}: {len(marks) - 1} chapters; YouTube shows chapters only from 3 (headings with scenes in references.md)")
        bad += [f"{vid}: the chapter \"{n}\" lasts {b - a:.0f} s; YouTube needs at least {CHAPTER}" for (a, n), (b, _) in zip(marks, marks[1:]) if b - a < CHAPTER]
        head = [pub["intro"], "Chapters\n" + "\n".join(f"{stamp(s)} {n}" for s, n in marks[:-1])]
        head += ["To go deeper\n" + "\n".join(deeper)] if deeper else []
        build = lambda lines: head + ["All sources behind this video\n" + "\n".join(lines), note, about]
    # Every source stays; when they do not fit, each is cut shorter until they do.
    for n in (None, 90, 70, 50, 35):
        text = "\n\n".join(p for p in build(rest if n is None else [compact(l, n) for l in rest]) if p.strip())
        if len(text) <= DESCRIPTION:
            break
    tags = ", ".join(dict.fromkeys(ch.get("tags", []) + pub.get("tags", [])))
    if len(pub["title"]) > TITLE:
        bad.append(f"{vid}: the title has {len(pub['title'])} characters; YouTube allows {TITLE}")
    if len(text) > DESCRIPTION:
        bad.append(f"{vid}: the description has {len(text)} characters even with short source lines; YouTube allows {DESCRIPTION}: shorten the intro or the source lines of references.md")
    if len(tags) > TAGS:
        bad.append(f"{vid}: the tags have {len(tags)} characters; YouTube allows {TAGS}")
    if not rest and not deeper:
        bad.append(f"{vid}: no sources in references.md")
    series, vid_id = vid.split("/")
    files = [f"videos/{series}/parts/{vid_id}.{ext}" for ext in ("mp4", "srt", "jpg")]
    have = [f"`{f}`" + ("" if (ROOT / f).exists() else " (not made yet)") for f in files if not (short and f.endswith(".jpg"))]
    md = [f"## {pub['title']}", "", f"{'Short' if short else 'Video'} `{vid}`. Files: " + ", ".join(have) + ".", ""]
    if tags:
        md += [f"Tags: {tags}", ""]
    md += ["```text", text, "```", ""]
    return "\n".join(md), bad


def main() -> None:
    if len(sys.argv) != 2 or "/" in sys.argv[1]:
        sys.exit(__doc__)
    series = sys.argv[1]
    vids = sorted(p.parent.name for p in (ROOT / "src/videos" / series).glob("*/publish.json"))
    if not vids:
        sys.exit(f"{series}: no video has a publish.json yet (youtube-publish skill)")
    out, bad = [f"# {series}: what to upload", "", "Upload the long videos first, then the Shorts, and put the long video's link in each Short.", ""], []
    for v in vids:
        md, problems = video(f"{series}/{v}")
        out.append(md)
        bad += problems
    dest = ROOT / "videos" / series / "publish.md"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text("\n".join(out))
    print("\n".join(bad))
    print(f"{dest.relative_to(ROOT)}: {len(vids)} video(s), {len(bad)} problem(s)")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
