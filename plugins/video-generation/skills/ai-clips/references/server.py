# Colab side of colab-video-studio: headless ComfyUI behind a key-protected public URL.
#
# The notebook loads this file and calls serve(). It prints a URL and a KEY, and the
# client (studio.py, on the user's computer) drives it:
#
#   GET  /status        phase, loaded models, GPU memory, ComfyUI queue, minutes left
#   GET  /log           the end of the ComfyUI log
#   POST /load          download a model's files (and custom nodes) in the background
#   POST /unload        free the GPU memory, to switch to another model
#   POST /kill          unassign the runtime now, which stops billing
#   *    /comfy/...     forwarded to ComfyUI (prompt, history, view, upload/image, ...)
#
# Every request needs the header X-Studio-Key. The runtime unassigns itself after
# idle_min minutes without a request or a running job, and always after max_min.
#
# The server itself listens on 127.0.0.1 only; a Cloudflare quick tunnel publishes it.

import json
import os
import re
import secrets
import subprocess
import threading
import time
import traceback
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

COMFY_COMMIT = "8010b48"
COMFY_DIR = Path("/content/ComfyUI")
COMFY_URL = "http://127.0.0.1:8188"
COMFY_LOG = Path("/content/comfyui.log")
TUNNEL_LOG = Path("/content/tunnel.log")
CLOUDFLARED = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
PORT = 8000

KEY = secrets.token_urlsafe(24)
HF_TOKEN = None
STATE = {"phase": "starting", "step": "", "loaded": []}
_LOCK = threading.Lock()
_clock = {"start": time.time(), "last": time.time(), "idle_min": 20, "max_min": 120}
_comfy = {"proc": None}


def _set(**kw):
    with _LOCK:
        STATE.update(kw)


def _sh(cmd, cwd=None):
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\n{r.stdout[-2000:]}\n{r.stderr[-2000:]}")


# ComfyUI

def _comfy_up():
    try:
        urllib.request.urlopen(COMFY_URL + "/system_stats", timeout=5)
        return True
    except Exception:
        return False


def _start_comfy():
    if _comfy["proc"] and _comfy["proc"].poll() is None:
        _comfy["proc"].terminate()
        _comfy["proc"].wait()
    log = open(COMFY_LOG, "a")
    _comfy["proc"] = subprocess.Popen(
        ["python", "main.py", "--listen", "127.0.0.1", "--port", "8188"],
        cwd=COMFY_DIR, stdout=log, stderr=subprocess.STDOUT,
    )
    for _ in range(180):
        if _comfy_up():
            return
        if _comfy["proc"].poll() is not None:
            raise RuntimeError("ComfyUI exited. GET /log for the reason.")
        time.sleep(2)
    raise RuntimeError("ComfyUI did not start. GET /log for the reason.")


def _install():
    try:
        _set(phase="installing", step="ComfyUI")
        if not COMFY_DIR.exists():
            _sh(f"git clone -q https://github.com/comfyanonymous/ComfyUI.git {COMFY_DIR}")
        _sh(f"git checkout -q {COMFY_COMMIT}", cwd=COMFY_DIR)
        _sh("pip install -q -r requirements.txt", cwd=COMFY_DIR)
        _start_comfy()
        _set(phase="ready", step="")
    except Exception as e:
        traceback.print_exc()
        _set(phase="error", error=str(e)[:1500])


def _load(spec):
    """spec: {"name", "files": [[repo, path, folder]], "placeholders": [[folder, name]], "custom_nodes": ["git url@commit"]}"""

    try:
        from huggingface_hub import hf_hub_download

        restart = False
        for entry in spec.get("custom_nodes", []):  # "https://github.com/owner/repo@commit"
            url, _, commit = entry.partition("@")
            dest = COMFY_DIR / "custom_nodes" / url.rstrip("/").split("/")[-1].removesuffix(".git")
            if dest.exists():
                continue
            _set(step=f"installing {dest.name}")
            _sh(f"git clone -q {url} {dest}")
            if commit:
                _sh(f"git checkout -q {commit}", cwd=dest)
            if (dest / "requirements.txt").exists():
                _sh("pip install -q -r requirements.txt", cwd=dest)
            restart = True

        # ComfyUI checks that every file a workflow names exists, even on a branch that
        # is switched off, so an empty placeholder stands in for an optional big file.

        for folder, name in spec.get("placeholders", []):
            p = COMFY_DIR / "models" / folder / name
            p.parent.mkdir(parents=True, exist_ok=True)
            if not p.exists():
                p.touch()
        for repo, path, folder in spec.get("files", []):
            dest = COMFY_DIR / "models" / folder / Path(path).name
            if dest.exists() and dest.stat().st_size > 0:
                continue
            _set(step=f"downloading {dest.name}")
            for attempt in range(3):  # the first call of a session sometimes fails to reach the Hub
                try:
                    local = hf_hub_download(repo, path, local_dir="/content/hf", token=HF_TOKEN)
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    time.sleep(5)
            dest.parent.mkdir(parents=True, exist_ok=True)
            os.replace(local, dest)
        if restart:
            _set(step="restarting ComfyUI")
            _start_comfy()
        with _LOCK:
            if spec["name"] not in STATE["loaded"]:
                STATE["loaded"].append(spec["name"])
        _set(phase="ready", step="")
    except Exception as e:
        traceback.print_exc()
        _set(phase="ready", step="", error=f"load {spec.get('name')}: {e}"[:1500])


def _queue():
    try:
        q = json.loads(urllib.request.urlopen(COMFY_URL + "/queue", timeout=5).read())
        return len(q.get("queue_running", [])), len(q.get("queue_pending", []))
    except Exception:
        return 0, 0


def _gpu():
    try:
        r = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.used,memory.total", "--format=csv,noheader"],
            capture_output=True, text=True,
        )
        return r.stdout.strip() or "none"
    except FileNotFoundError:
        return "none"


# Runtime control

def kill():
    """Release the GPU runtime. Billing stops once Colab unassigns the VM."""

    _set(phase="killed")
    from google.colab import runtime

    runtime.unassign()


def _watchdog():
    while True:
        time.sleep(30)
        running, pending = _queue()
        with _LOCK:
            busy = running or pending or STATE["phase"] in ("installing", "loading")
        now = time.time()
        if busy:
            _clock["last"] = now
        if now - _clock["last"] > _clock["idle_min"] * 60 or now - _clock["start"] > _clock["max_min"] * 60:
            kill()
            return


# HTTP

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json"):
        if not isinstance(body, bytes):
            body = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle(self):
        if not secrets.compare_digest(self.headers.get("X-Studio-Key", ""), KEY):
            return self._send(401, {"error": "missing or wrong X-Studio-Key"})
        _clock["last"] = time.time()
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        path = self.path.split("?")[0]

        if path == "/status":
            with _LOCK:
                snap = dict(STATE)
            now = time.time()
            running, pending = _queue()
            snap.update(
                gpu=_gpu(), queue_running=running, queue_pending=pending,
                idle_left_min=round(_clock["idle_min"] - (now - _clock["last"]) / 60, 1),
                max_left_min=round(_clock["max_min"] - (now - _clock["start"]) / 60, 1),
            )
            return self._send(200, snap)
        if path == "/log":
            text = COMFY_LOG.read_bytes()[-20000:] if COMFY_LOG.exists() else b""
            return self._send(200, text, "text/plain")
        if path == "/load" and self.command == "POST":
            with _LOCK:
                if STATE["phase"] != "ready":
                    return self._send(409, {"error": f"busy: {STATE['phase']} {STATE['step']}"})
                STATE.update(phase="loading", step="")
                STATE.pop("error", None)
            threading.Thread(target=_load, args=(json.loads(body),), daemon=True).start()
            return self._send(202, {"ok": True})
        if path == "/unload" and self.command == "POST":
            req = urllib.request.Request(
                COMFY_URL + "/free", json.dumps({"unload_models": True, "free_memory": True}).encode(),
                {"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req, timeout=30)
            return self._send(200, {"ok": True, "gpu": _gpu()})
        if path == "/kill" and self.command == "POST":
            self._send(200, {"ok": True})
            threading.Thread(target=kill, daemon=True).start()
            return
        if self.path.startswith("/comfy/"):
            headers = {k: v for k, v in self.headers.items() if k.lower() == "content-type"}
            req = urllib.request.Request(COMFY_URL + self.path[len("/comfy"):], body or None, headers, method=self.command)
            try:
                r = urllib.request.urlopen(req, timeout=120)
                return self._send(r.status, r.read(), r.headers.get("Content-Type", "application/octet-stream"))
            except urllib.error.HTTPError as e:
                return self._send(e.code, e.read(), e.headers.get("Content-Type", "text/plain"))
            except urllib.error.URLError as e:
                return self._send(502, {"error": f"ComfyUI is not answering: {e.reason}"})
        self._send(404, {"error": "unknown path"})

    def do_GET(self):
        self._handle()

    def do_POST(self):
        self._handle()


def _tunnel():
    """Publish PORT through a Cloudflare quick tunnel and return its https URL."""

    exe = Path("/content/cloudflared")
    if not exe.exists():
        urllib.request.urlretrieve(CLOUDFLARED, exe)
        exe.chmod(0o755)
    subprocess.Popen(
        [str(exe), "tunnel", "--no-autoupdate", "--url", f"http://127.0.0.1:{PORT}"],
        stdout=open(TUNNEL_LOG, "w"), stderr=subprocess.STDOUT,
    )
    for _ in range(60):
        m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", TUNNEL_LOG.read_text())
        if m:
            return m.group(0)
        time.sleep(1)
    raise RuntimeError(f"No tunnel URL. See {TUNNEL_LOG}")


def serve(idle_min=20, max_min=120):
    """Start the server and its tunnel, print the URL and the KEY, then install ComfyUI in the background.
    Returns only when the runtime is killed, so the cell keeps running."""

    global HF_TOKEN
    if _gpu() == "none":
        raise RuntimeError("No GPU. Runtime -> Change runtime type -> L4, then run this cell again.")
    _clock.update(start=time.time(), last=time.time(), idle_min=idle_min, max_min=max_min)

    # Secrets can only be read from the cell itself, so the token is fetched here, once.

    try:
        from google.colab import userdata

        HF_TOKEN = userdata.get("HF_TOKEN")
    except Exception as e:
        print(f"No HF_TOKEN ({type(e).__name__}). Gated models such as LTX-2.5 will fail to download.")

    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    url = _tunnel()
    threading.Thread(target=_install, daemon=True).start()
    threading.Thread(target=_watchdog, daemon=True).start()
    print(f"GPU: {_gpu()}")
    print(f"Stops by itself after {idle_min} idle minutes, and always after {max_min} minutes.")
    print("Give these two lines to Claude:")
    print(f"URL: {url}")
    print(f"KEY: {KEY}")

    # Keep the cell running: Colab treats a notebook with no running cell as idle and stops it.
    while STATE["phase"] != "killed":
        time.sleep(30)
