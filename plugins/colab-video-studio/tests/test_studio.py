# End-to-end check of server.py and studio.py against a fake ComfyUI, all on localhost.
# Run: python tests/test_studio.py

import json
import sys
import tempfile
import threading
import types
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REF = Path(__file__).parent.parent / "skills/generate-video-clips/references"
sys.path.insert(0, str(REF))
import studio  # noqa: E402

calls = []


class FakeComfy(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _reply(self, obj, ctype="application/json"):
        body = obj if isinstance(obj, bytes) else json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/history/bad"):
            return self._reply({"bad": {"status": {"completed": False, "status_str": "error", "messages": [["execution_error", {"node_type": "KSampler", "exception_message": "out of memory"}]]}, "outputs": {}}})
        if self.path.startswith("/history/"):
            pid = self.path.split("/")[-1]
            return self._reply({pid: {"status": {"completed": True, "status_str": "success"}, "outputs": {"75": {"images": [{"filename": "clip.mp4", "subfolder": "video", "type": "output"}]}}}})
        if self.path.startswith("/view"):
            return self._reply(b"VIDEO", "video/mp4")
        self._reply({"queue_running": [], "queue_pending": []})

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        calls.append(self.path)
        if self.path == "/prompt":
            wf = json.loads(body)["prompt"]
            calls.append(wf)
            return self._reply({"prompt_id": "bad" if "FAIL" in json.dumps(wf) else "ok1"})
        if self.path == "/upload/image":
            assert b"PNGDATA" in body
            return self._reply({"name": "first.png", "subfolder": "", "type": "input"})
        self._reply({})


def start(handler):
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{httpd.server_address[1]}"


def demo():
    killed = []
    colab = types.ModuleType("google.colab")
    colab.runtime = types.SimpleNamespace(unassign=lambda: killed.append(1))
    sys.modules["google"] = types.ModuleType("google")
    sys.modules["google.colab"] = colab

    srv = {}
    exec(compile((REF / "server.py").read_text(), "server.py", "exec"), srv)
    srv["COMFY_URL"] = start(FakeComfy)
    srv["STATE"]["phase"] = "ready"
    url = start(srv["Handler"])

    try:
        urllib.request.urlopen(url + "/status")
        raise AssertionError("no key must be refused")
    except urllib.error.HTTPError as e:
        assert e.code == 401

    s = studio.Server(url, srv["KEY"])
    assert s.json("/status")["phase"] == "ready"

    tmp = Path(tempfile.mkdtemp())
    pic = tmp / "first.png"
    pic.write_bytes(b"PNGDATA")
    job = {"model": "ltx", "shots": [
        {"name": "Text Shot", "prompt": "a cat", "seed": 1, "aspect": "9:16"},
        {"name": "bad", "prompt": "FAIL", "seed": 2},
        {"name": "picture", "prompt": "a dog", "seed": 3, "image": str(pic)},
    ]}
    result = studio.run(s, job, tmp / "out")
    assert [d["shot"] for d in result["done"]] == ["text_shot", "picture"], result
    assert [f["shot"] for f in result["failed"]] == ["bad"] and "out of memory" in result["failed"][0]["error"], result
    assert (tmp / "out/01_text_shot_seed1.mp4").read_bytes() == b"VIDEO"
    assert json.loads((tmp / "out/result.json").read_text())["failed"]

    sent = [c for c in calls if isinstance(c, dict)]
    assert sent[0]["409"]["inputs"]["aspect_ratio"] == "9:16 (Portrait Widescreen)" and "img" not in sent[0]
    assert sent[2]["img"]["inputs"]["image"] == "first.png" and sent[2]["405:377"]["inputs"]["video_latent"] == ["405:357", 0]

    assert studio.build_workflow("sfx", {"prompt": "door slam", "seed": 1, "seconds": 3})["6"]["inputs"]["text"] == "door slam"
    music = studio.build_workflow("music", {"prompt": "lofi", "seed": 1, "seconds": 20})
    assert music["94"]["inputs"]["tags"] == "lofi" and music["98"]["inputs"]["seconds"] == 20.0
    assert studio.build_workflow("tts", {"prompt": "hi [laugh]", "seed": 1})["4"]["class_type"] == "FL_ChatterboxTurboTTS"
    es = studio.build_workflow("tts", {"prompt": "hola", "seed": 1, "language": "es"}, "me.wav")
    assert es["4"]["inputs"]["language"] == "Spanish (es)" and es["4"]["inputs"]["audio_prompt"] == ["voice", 0]

    s.json("/unload", {})
    assert "/free" in calls
    assert studio.kill(s, wait_s=0) is False and killed == [1]
    print("ok")


if __name__ == "__main__":
    demo()
