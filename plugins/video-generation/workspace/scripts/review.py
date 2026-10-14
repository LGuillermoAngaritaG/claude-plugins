#!/usr/bin/env python3
"""The review page: the user checks each stage of a video in a browser, approves items or asks for changes, and sends
them to the agent. Skill: guided-video.

The page is built from the files of the video, every two seconds, so a picture shows up as soon as it is drawn and a
changed line as soon as it is saved. The agent only moves the stage on and leaves a note; the user's answers land in
src/videos/<series>/<id>/review.json.

Stages: brief (what we make), plan (script, voice, pictures, music, clips, sounds and motion, in words), pictures
(the drawn pictures and the stills of the animation), sound (voice lines, music, effects, AI clips), final (the cut).

Usage: python3 scripts/review.py serve [--port 4600]           the page, at http://localhost:4600 (one server for every video)
       python3 scripts/review.py start <series/id> <brief.json>  a new review, at the brief stage
       python3 scripts/review.py stage <series/id> <stage> ["note to the user"]   move on (or back), waiting for the user
       python3 scripts/review.py wait <series/id>                 block until the user sends, then print what they asked
       python3 scripts/review.py read <series/id>                 print the user's last answers again
brief.json: {"idea": "...", "types": ["ad"], "length": "20 seconds", "language": "English", "audience": "...",
             "questions": ["Which screens of the app should we show?"]}
"""
from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import re
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
STAGES = [("brief", "What we make"), ("plan", "Script and plan"), ("pictures", "Pictures and motion"), ("sound", "Voice, music and clips"), ("final", "Final cut")]
TYPES = {"math": "Math explainer (wide)", "sketch": "Hand-drawn short", "story": "Story short", "ad": "Ad or promo", "other": "Something else"}
SERVED = ("public", "videos", "out")  # the only folders the page can read files from


def folder(video: str) -> Path:
    if not re.fullmatch(r"[a-z0-9-]+/\d\d[a-z]?-[a-z0-9-]+", video):
        raise ValueError(f"not a video name: {video}")
    return ROOT / "src/videos" / video


def load(video: str) -> dict:
    f = folder(video) / "review.json"
    return json.loads(f.read_text()) if f.exists() else {}


def save(video: str, state: dict) -> None:
    f = folder(video) / "review.json"
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=1, ensure_ascii=False) + "\n")
    os.replace(tmp, f)  # whole file or nothing: the page and the agent read it at any moment


def read_json(p: Path) -> dict:
    try:
        return json.loads(p.read_text())
    except (OSError, ValueError):
        return {}


def rev(*parts) -> str:
    return hashlib.sha1(json.dumps(parts, sort_keys=True, default=str).encode()).hexdigest()[:10]


def media(p: Path) -> dict:
    """A file the page can show, with a revision that changes when the file does."""
    if not p.exists():
        return {"status": "pending", "rev": "pending"}
    return {"status": "ready", "media": "/media/" + str(p.relative_to(ROOT)), "rev": rev(p.name, p.stat().st_mtime_ns)}


def items(video: str) -> list[dict]:
    """Everything there is to review, by stage, read from the files of the video as they are now."""
    d = folder(video)
    series, vid_id = video.split("/")
    script, art, timing = read_json(d / "script.json"), read_json(d / "art.json"), read_json(d / "timing.json")
    out = []

    def add(stage, id_, title, body="", group="", kind="text", **more):
        out.append({"stage": stage, "id": id_, "title": title, "body": body, "group": group, "kind": kind, "rev": more.pop("rev", rev(title, body)), **more})

    # Plan: everything in words, before anything is generated.
    if script.get("scenes"):
        voice = f"Voice {script.get('voice', 'the default Kokoro voice')}, speed {script.get('speed', 1)}, language {script.get('lang', 'en')}"
        add("plan", "voice", "Voice", voice + (f"\nMood: {script['mood']}" if script.get("mood") else "") + (f"\nRecorded: {script['recording']}" if script.get("recording") else ""), "Whole video")
        if script.get("style"):
            add("plan", "style", "Look of the footage", script["style"], "Whole video")
        for i, s in enumerate(script["scenes"], 1):
            body = "\n".join(s["lines"])
            for k, label in (("visual", "On screen"), ("sound", "Sound")):
                if s.get(k):
                    body += f"\n\n{label}: {s[k]}"
            add("plan", f"scene:{s['id']}", f"Scene {i}: {s['id']}", body, "Script")
        for name, spec in script.get("images", {}).items():
            spec = spec if isinstance(spec, dict) else {"prompt": spec}
            add("plan", f"image:{name}", name, spec["prompt"] + (f"\n(Keeps the person and place of {spec['ref']})" if spec.get("ref") else ""), "Pictures to draw")
        for name, c in script.get("clips", {}).items():
            add("plan", f"clip:{name}", name, f"{c['motion']}\nStarts from: {c.get('image', 'text only')} · {c.get('seconds', 5)} s", "AI clips (GPU)")
        if script.get("music"):
            m = script["music"]
            add("plan", "music", "Music", f"{m['prompt']} · {m.get('seconds', 30)} s", "Whole video")
    # Pictures: the drawings as they land, and the stills of the animation.
    for name, spec in script.get("images", {}).items():
        prompt = spec["prompt"] if isinstance(spec, dict) else spec
        f = ROOT / "public" / art[name]["src"] if name in art else d / "_not_drawn_yet"
        add("pictures", f"image:{name}", name, prompt, "Pictures", "image", **media(f))
    stills = sorted((ROOT / "out/stills" / series).glob(f"{vid_id}-*.png"))
    for f in stills:
        if re.fullmatch(rf"{re.escape(vid_id)}-\d+\.png", f.name):
            add("pictures", f"stills:{f.stem}", f"Stills, sheet {f.stem.rsplit('-', 1)[1]}", "One frame per line, just before the next line starts.", "Motion and layout", "image", **media(f))
    # Sound: every voice line (with what the speech check could not hear), music, effects, clips.
    for s in script.get("scenes", []):
        for i, (line, c) in enumerate(zip(s["lines"], timing.get(s["id"], []))):
            flag = f"The speech check did not hear: {', '.join(c['missed'])}. Heard: {c.get('heard', '')}" if c.get("missed") else ""
            add("sound", f"line:{s['id']}:{i}", f"{s['id']} {i}", line, "Voice", "audio", flag=flag, **media(ROOT / "public/audio" / video / c["file"]))
    bed = re.search(r"bed:\s*\{\s*name:\s*'([^'.]+)'", (d / "index.tsx").read_text() if (d / "index.tsx").exists() else "")
    if bed:  # a bed from the shared effects (the drone of the stories); music of the video's own is listed below
        add("sound", "bed", f"Bed: {bed.group(1)}", "Plays quietly under the whole video. python3 scripts/mix.py says how far under the voice.", "Music and effects", "audio", **media(ROOT / "public/sfx" / f"{bed.group(1)}.wav"))
    own = ROOT / "public/art" / video
    for f in sorted(own.glob("*")):
        if f.suffix.lower() in (".mp3", ".wav", ".flac", ".m4a"):
            add("sound", f"audio:{f.stem}", "Music" if f.stem == "music" else f.stem, "", "Music and effects", "audio", **media(f))
    for f in sorted((own / "clips").glob("*.mp4")):
        sheet = ROOT / "out/frames" / f"{f.stem}.png"
        add("sound", f"clip:{f.stem}", f.stem, script.get("clips", {}).get(f.stem, {}).get("motion", ""), "AI clips", "video", sheet=media(sheet).get("media"), **media(f))
    # Final: the finished part, its subtitles, and the app overlays.
    part = ROOT / "videos" / series / "parts" / f"{vid_id}.mp4"
    add("final", "final", script.get("title", vid_id), "", "The video", "video", **media(part))
    srt = part.with_suffix(".srt")
    if srt.exists():
        add("final", "subtitles", "Subtitles", srt.read_text()[:600] + ("..." if len(srt.read_text()) > 600 else ""), "The video", rev=rev(srt.stat().st_mtime_ns))
    for f in sorted((ROOT / "out/safezones").glob(f"{vid_id}-*.png"), key=lambda f: float(f.stem.rsplit("-", 1)[1])):
        add("final", f"zones:{f.stem}", f"Under TikTok and Reels, at {f.stem.rsplit('-', 1)[1]} s", "", "App buttons and text over the video", "image", **media(f))
    return out


def view(video: str) -> dict:
    state = load(video)
    last = state.get("submissions", [])[-1:] or [{}]
    return {
        "video": video,
        "title": read_json(folder(video) / "script.json").get("title", video),
        "stages": [{"id": k, "title": t} for k, t in STAGES],
        "types": TYPES,
        "stage": state.get("stage", "brief"),
        "waiting": state.get("waiting", "user"),
        "note": state.get("notes", {}).get(state.get("stage", "brief"), ""),
        "brief": state.get("brief", {}),
        "done": state.get("done", False),
        "version": state.get("version", 0),
        "last": last[0],
        "items": items(video),
    }


class Page(BaseHTTPRequestHandler):
    def log_message(self, *args) -> None:  # quiet: the agent reads review.json, not the server log
        pass

    def send(self, code: int, body: bytes, kind: str, extra: dict | None = None) -> None:
        self.send_response(code)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def json(self, data, code: int = 200) -> None:
        self.send(code, json.dumps(data, ensure_ascii=False).encode(), "application/json")

    def do_GET(self) -> None:
        url = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        try:
            if url.path == "/":
                self.send(200, (Path(__file__).parent / "review.html").read_bytes(), "text/html; charset=utf-8")
            elif url.path == "/api/videos":
                self.json(sorted(str(f.parent.relative_to(ROOT / "src/videos")) for f in (ROOT / "src/videos").glob("*/*/review.json")))
            elif url.path == "/api/state":
                self.json(view(q["video"]))
            elif url.path.startswith("/media/"):
                self.file(unquote(url.path[len("/media/"):]))
            else:
                self.send(404, b"not found", "text/plain")
        except (ValueError, KeyError) as e:
            self.json({"error": str(e)}, 400)

    def file(self, rel: str) -> None:
        p = (ROOT / rel).resolve()
        if not any(p.is_relative_to(ROOT / top) for top in SERVED) or not p.is_file():
            return self.send(404, b"not found", "text/plain")
        size, kind = p.stat().st_size, mimetypes.guess_type(p.name)[0] or "application/octet-stream"
        # Ranges, so audio and video can be scrubbed.
        m = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if m and (m.group(1) or m.group(2)):
            a = int(m.group(1)) if m.group(1) else size - int(m.group(2))
            b = int(m.group(2)) if m.group(1) and m.group(2) else size - 1
            with p.open("rb") as fh:
                fh.seek(a)
                body = fh.read(b - a + 1)
            return self.send(206, body, kind, {"Content-Range": f"bytes {a}-{a + len(body) - 1}/{size}", "Accept-Ranges": "bytes"})
        self.send(200, p.read_bytes(), kind, {"Accept-Ranges": "bytes"})

    def do_POST(self) -> None:
        url = urlparse(self.path)
        if url.path != "/api/send":
            return self.send(404, b"not found", "text/plain")
        try:
            data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            video = data["video"]
            state = load(video)
            if not state:
                raise ValueError("this video has no review yet")
            sent = {"at": time.strftime("%Y-%m-%d %H:%M:%S"), "stage": state.get("stage", "brief"), "items": data.get("items", {}), "message": data.get("message", ""), "done": bool(data.get("done")), "read": False}
            if data.get("brief"):
                sent["brief"] = state["brief"] = data["brief"]  # the brief is now the user's
            state.setdefault("submissions", []).append(sent)
            state["waiting"], state["version"] = "agent", state.get("version", 0) + 1
            if sent["done"]:
                state["done"] = True
            save(video, state)
            self.json({"ok": True})
        except (ValueError, KeyError) as e:
            self.json({"error": str(e)}, 400)


def report(video: str, sent: dict) -> str:
    """The user's answers as a to-do list for the agent."""
    lines = [f"{video}: the user sent the {sent['stage']} stage at {sent['at']}" + (" and marked the video DONE" if sent.get("done") else "")]
    if sent.get("brief"):
        lines.append("Brief, as the user left it:")
        lines += [f"  {k}: {json.dumps(v, ensure_ascii=False)}" for k, v in sent["brief"].items()]
    changes = {k: v for k, v in sent["items"].items() if v.get("change")}
    ok = [k for k, v in sent["items"].items() if v.get("ok")]
    for k, v in changes.items():
        lines.append(f"  CHANGE {k}: {v['change']}")
    if ok:
        lines.append(f"  approved: {', '.join(ok)}")
    if sent.get("message"):
        lines.append(f"  message: {sent['message']}")
    if not changes and not sent.get("done"):
        lines.append("  No change asked: go on to the next stage." if ok or sent.get("brief") else "  Nothing approved and nothing asked: ask the user in the page note what they need.")
    return "\n".join(lines)


def main() -> None:
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "serve":
        port = int(a[a.index("--port") + 1]) if "--port" in a else 4600
        server = ThreadingHTTPServer(("127.0.0.1", port), Page)  # this machine only
        print(f"review page: http://localhost:{port}", flush=True)
        server.serve_forever()
    if len(a) < 2:
        sys.exit(__doc__)
    cmd, video = a[0], a[1]
    folder(video)
    state = load(video)
    if cmd == "start":
        if state:
            sys.exit(f"{video}: a review exists already (stage {state.get('stage')}); move it with: review.py stage {video} <stage>")
        brief = json.loads(Path(a[2]).read_text() if Path(a[2]).exists() else a[2])
        folder(video).mkdir(parents=True, exist_ok=True)
        save(video, {"version": 1, "stage": "brief", "waiting": "user", "brief": brief, "notes": {}, "submissions": []})
        print(f"{video}: review started at the brief stage. Open http://localhost:4600/?video={video}")
    elif cmd == "stage":
        if a[2] not in dict(STAGES):
            sys.exit(f"stages: {', '.join(dict(STAGES))}")
        state["stage"], state["waiting"], state["version"] = a[2], "user", state.get("version", 0) + 1
        state.setdefault("notes", {})[a[2]] = a[3] if len(a) > 3 else ""
        save(video, state)
        print(f"{video}: now at the {a[2]} stage, waiting for the user")
    elif cmd in ("wait", "read"):
        if cmd == "wait":
            while not any(not s.get("read") for s in load(video).get("submissions", [])):
                time.sleep(2)
            state = load(video)
        subs = state.get("submissions", [])
        if not subs:
            sys.exit(f"{video}: the user has not sent anything yet")
        fresh = [s for s in subs if not s.get("read")] or subs[-1:]
        print("\n".join(report(video, s) for s in fresh))
        state = load(video)  # again, so an answer sent a moment ago is not lost
        for s in state.get("submissions", [])[: len(subs)]:
            s["read"] = True
        save(video, state)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
