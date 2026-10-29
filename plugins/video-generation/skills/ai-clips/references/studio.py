#!/usr/bin/env python3
"""Client for the colab-video-studio server (server.py). Standard library only.

  studio.py connect <url> <key>     save the server address, print its status
  studio.py status
  studio.py load <ltx|sfx|music|tts>   prepare a model on the server and wait for it
  studio.py run <job.json> <out>    render every shot of the job into <out>, skipping shots already there
  studio.py unload                  free the GPU memory, to switch to another model
  studio.py kill                    release the GPU and wait until the server is gone

Exit code 3 means the server is gone (the Colab runtime or its tunnel died): start the notebook cell again,
connect, load the model and run the same job into the same <out>.

A job is {"model": "ltx", "shots": [{"name", "prompt", "seed", ...}]}. Per model a shot also takes:
  ltx    seconds, aspect, megapixels, enhance_prompt, image (a local picture: image-to-video)
  sfx    seconds
  music  seconds, lyrics, bpm, keyscale, language (prompt is the style tags)
  tts    language ("en" allows tags like [laugh]; "es" and others use the multilingual voice),
         voice (a local audio sample to clone); prompt is the text to speak
"""
import json
import mimetypes
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = Path.home() / ".colab-video-studio.json"

LTX = "Lightricks/LTX-2.5"
ACE = "Comfy-Org/ace_step_1.5_ComfyUI_files"
ENHANCER = ("Comfy-Org/gemma-4", "text_encoders/gemma4_e2b_it_int8_convrot.safetensors", "text_encoders")

# What "load <model>" sends to the server. Only one model should be loaded at a time on an L4.
MODELS = {
    # LTX-2.5: text-to-video, and image-to-video when a shot has "image". Gated: needs HF_TOKEN in Colab Secrets.
    "ltx": {
        "files": [
            (LTX, "diffusion_models/ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors", "diffusion_models"),
            (LTX, "text_encoders/gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors", "text_encoders"),
            (LTX, "vae/ltx-2.5-video-vae-bf16.safetensors", "vae"),
            (LTX, "vae/ltx-2.5-audio-vae-bf16.safetensors", "vae"),
            (LTX, "latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors", "latent_upscale_models"),
        ],
        # The prompt enhancer (~10 GB) is only downloaded by "load ltx --enhance".
        "placeholders": [("text_encoders", "gemma4_e2b_it_int8_convrot.safetensors")],
    },
    # Stable Audio 3 Small SFX: sound effects.
    "sfx": {
        "files": [
            ("Comfy-Org/stable-audio-3", "checkpoints/stable_audio_3_small_sfx.safetensors", "checkpoints"),
            ("Comfy-Org/stable-audio-3", "text_encoders/t5gemma_b_b_ul2.safetensors", "text_encoders"),
        ],
    },
    # ACE-Step 1.5 XL turbo: music, with or without vocals.
    "music": {
        "files": [
            (ACE, "split_files/diffusion_models/acestep_v1.5_xl_turbo_bf16.safetensors", "diffusion_models"),
            (ACE, "split_files/text_encoders/qwen_0.6b_ace15.safetensors", "text_encoders"),
            (ACE, "split_files/text_encoders/qwen_4b_ace15.safetensors", "text_encoders"),
            (ACE, "split_files/vae/ace_1.5_vae.safetensors", "vae"),
        ],
    },
    # Chatterbox: speech. The nodes download their own weights on the first run.
    "tts": {
        "custom_nodes": ["https://github.com/filliptm/ComfyUI_Fill-ChatterBox@f7d7a16187430abcaf91a3039b9c83aa9960816a"],
    },
}

ASPECTS = {
    "1:1": "1:1 (Square)",
    "2:3": "2:3 (Portrait Photo)",
    "3:2": "3:2 (Photo)",
    "3:4": "3:4 (Portrait Standard)",
    "4:3": "4:3 (Standard)",
    "9:16": "9:16 (Portrait Widescreen)",
    "16:9": "16:9 (Widescreen)",
    "21:9": "21:9 (Ultrawide)",
}
LANGUAGES = {"en": "English (en)", "es": "Spanish (es)"}
DEFAULTS = {
    "ltx": {"seconds": 7, "aspect": "16:9", "megapixels": 0.9, "enhance_prompt": False},
    "sfx": {"seconds": 5},
    "music": {"seconds": 30, "lyrics": "[Instrumental]", "bpm": 120, "keyscale": "C major", "language": "en"},
    "tts": {"language": "en"},
}
MEDIA = (".mp4", ".webm", ".mkv", ".flac", ".mp3", ".wav", ".opus")


def build_workflow(model, shot, upload=None):
    """Return the API workflow for one shot. Shot keys override DEFAULTS[model].

    upload is the server-side name of the shot's picture (ltx) or voice sample (tts).
    """

    s = {**DEFAULTS[model], **shot}
    kind = {"ltx": "ltx_i2v" if upload else "ltx_t2v", "tts": "tts_turbo" if s.get("language") == "en" else "tts_multi"}.get(model, model)
    wf = json.loads((HERE / "workflows" / f"{kind}.json").read_text())
    if model == "ltx":
        if upload:
            wf["img"]["inputs"]["image"] = upload
        wf["405:376"]["inputs"]["value"] = s["prompt"]
        wf["405:362"]["inputs"]["value"] = int(s["seconds"])
        wf["405:339"]["inputs"]["noise_seed"] = int(s["seed"])
        wf["405:338"]["inputs"]["noise_seed"] = int(s["seed"]) + 1
        wf["405:383"]["inputs"]["value"] = bool(s["enhance_prompt"])
        wf["409"]["inputs"]["aspect_ratio"] = ASPECTS[s["aspect"]]
        wf["409"]["inputs"]["megapixels"] = float(s["megapixels"])
        wf["75"]["inputs"]["filename_prefix"] = "video/ltx"
    elif model == "sfx":
        wf["6"]["inputs"]["text"] = s["prompt"]
        wf["11"]["inputs"]["seconds"] = float(s["seconds"])
        wf["3"]["inputs"]["seed"] = int(s["seed"])
    elif model == "music":
        enc = wf["94"]["inputs"]
        enc.update(tags=s["prompt"], lyrics=s["lyrics"], seed=int(s["seed"]), bpm=int(s["bpm"]), duration=float(s["seconds"]), keyscale=s["keyscale"], language=s["language"])
        wf["98"]["inputs"]["seconds"] = float(s["seconds"])
        wf["3"]["inputs"]["seed"] = int(s["seed"])
    else:
        node = wf["4"]["inputs"]
        node.update(text=s["prompt"], seed=int(s["seed"]))
        if kind == "tts_multi":
            node["language"] = LANGUAGES.get(s["language"], s["language"])
        if upload:
            wf["voice"] = {"class_type": "LoadAudio", "inputs": {"audio": upload}}
            node["audio_prompt"] = ["voice", 0]
    return wf


def clean_shots(model, shots):
    out = []
    for i, shot in enumerate(shots, 1):
        if not shot.get("prompt"):
            raise ValueError(f"Shot {i} has no prompt")
        s = dict(shot)
        s["name"] = re.sub(r"[^a-z0-9]+", "_", s.get("name", f"shot{i}").lower()).strip("_")[:40]
        s.setdefault("seed", int(time.time() * 1000 + i) % 2**31)
        if model == "ltx" and s.get("aspect", DEFAULTS[model]["aspect"]) not in ASPECTS:
            raise ValueError(f"Shot {i}: aspect must be one of {list(ASPECTS)}")
        source = s.get(SOURCE.get(model, ""))
        if source and not Path(source).is_file():
            raise ValueError(f"Shot {i}: no such file {source}")
        out.append(s)
    return out


# The local file a shot may carry: a first frame for video, a voice sample to clone for speech.
SOURCE = {"ltx": "image", "tts": "voice"}


# HTTP

class ServerGone(Exception):
    """The URL stopped answering: the Colab runtime or its tunnel is gone."""


class Server:
    def __init__(self, url, key, grace_s=60):
        self.url, self.key, self.grace_s = url.rstrip("/"), key, grace_s

    def call(self, path, data=None, ctype="application/json", method=None, timeout=120):
        if data is not None and not isinstance(data, bytes):
            data = json.dumps(data).encode()
        req = urllib.request.Request(self.url + path, data, {"X-Studio-Key": self.key, "Content-Type": ctype}, method=method)
        try:
            return urllib.request.urlopen(req, timeout=timeout).read()
        except urllib.error.HTTPError as e:
            if e.code != 530:  # Cloudflare answers 530 when no tunnel is behind the URL any more
                raise RuntimeError(f"{path}: HTTP {e.code} {e.read().decode(errors='replace')[:1500]}") from None
            err = "HTTP 530"
        except OSError as e:  # no such host, refused, reset or timed out
            err = e
        if not self.answers():
            raise ServerGone(f"{self.url} stopped answering ({err}): the Colab runtime or its tunnel is gone") from None
        raise RuntimeError(f"{path}: {err}") from None

    def answers(self):
        """True when /status answers within grace_s: one dropped request is not a dead server."""

        deadline = time.time() + self.grace_s
        while True:
            try:
                urllib.request.urlopen(urllib.request.Request(self.url + "/status", headers={"X-Studio-Key": self.key}), timeout=10).read()
                return True
            except OSError:
                if time.time() >= deadline:
                    return False
                time.sleep(5)

    def json(self, path, data=None, method=None, timeout=120):
        return json.loads(self.call(path, data, method=method, timeout=timeout))

    def upload(self, picture):
        p = Path(picture)
        boundary = uuid.uuid4().hex
        mime = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
        body = (
            f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{p.name}"\r\nContent-Type: {mime}\r\n\r\n'.encode()
            + p.read_bytes()
            + f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{boundary}--\r\n'.encode()
        )
        return json.loads(self.call("/comfy/upload/image", body, f"multipart/form-data; boundary={boundary}"))["name"]

    def render(self, workflow, timeout_min=90):
        """Queue a workflow, wait for it, and return its output files as ComfyUI describes them."""

        prompt_id = self.json("/comfy/prompt", {"prompt": workflow, "client_id": uuid.uuid4().hex})["prompt_id"]
        deadline = time.time() + timeout_min * 60
        while time.time() < deadline:
            hist = self.json(f"/comfy/history/{prompt_id}", timeout=30).get(prompt_id)
            if hist and hist.get("status", {}).get("completed") is not None:
                st = hist["status"]
                if st.get("status_str") == "error":
                    errors = [
                        f"{m[1].get('node_type')}: {m[1].get('exception_message', '').strip()}"
                        for m in st.get("messages", []) if m[0] == "execution_error"
                    ]
                    raise RuntimeError(f"Generation failed: {errors}")
                files = [
                    item for out in hist["outputs"].values() for items in out.values() if isinstance(items, list)
                    for item in items if isinstance(item, dict) and item.get("filename", "").endswith(MEDIA)
                ]
                if not files:
                    raise RuntimeError(f"No media in outputs: {hist['outputs']}")
                return files
            time.sleep(5)
        raise TimeoutError(f"Shot still running after {timeout_min} min")

    def download(self, item, dest):
        q = urllib.parse.urlencode({"filename": item["filename"], "subfolder": item.get("subfolder", ""), "type": item.get("type", "output")})
        Path(dest).write_bytes(self.call(f"/comfy/view?{q}", timeout=600))


def load(server, model, enhance=False):
    spec = {"name": model, **MODELS[model]}
    if enhance and model == "ltx":
        spec = {**spec, "files": spec["files"] + [ENHANCER], "placeholders": []}
    server.json("/load", spec)
    while True:
        time.sleep(10)
        st = server.json("/status")
        if st["phase"] != "loading":
            if st.get("error"):
                raise RuntimeError(st["error"])
            return st
        print(st["step"], flush=True)


def run(server, job, out_dir):
    """Render every shot not already in out_dir. One failed shot does not stop the others; a gone server
    (ServerGone) stops the run. Returns the result, also saved as result.json."""

    model = job["model"]
    shots = clean_shots(model, job["shots"])
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    # Files of an earlier run of this job, by shot name: a run that stopped halfway goes on where it stopped.
    have = {m[1]: p for p in out.iterdir() if (m := re.fullmatch(r"\d+_(\w+?)_seed\d+(\.\w+)", p.name)) and m[2] in MEDIA}
    result = {"model": model, "shots": shots, "done": [], "failed": []}
    for i, shot in enumerate(shots, 1):
        t0 = time.time()
        try:
            if shot["name"] in have:
                result["done"].append({"shot": shot["name"], "file": str(have[shot["name"]]), "minutes": 0})
                print(f"have {i}/{len(shots)} {have[shot['name']].name}", flush=True)
                continue
            source = shot.get(SOURCE.get(model, ""))
            item = server.render(build_workflow(model, shot, server.upload(source) if source else None))[0]
            dest = out / f"{i:02d}_{shot['name']}_seed{shot['seed']}{Path(item['filename']).suffix}"
            server.download(item, dest)
            result["done"].append({"shot": shot["name"], "file": str(dest), "minutes": round((time.time() - t0) / 60, 1)})
            print(f"done {i}/{len(shots)} {dest.name}", flush=True)
        except ServerGone:
            raise
        except Exception as e:
            result["failed"].append({"shot": shot["name"], "error": str(e)[:1500]})
            print(f"FAILED {i}/{len(shots)} {shot['name']}: {e}", flush=True)
        finally:
            (out / "result.json").write_text(json.dumps(result, indent=1))
    return result


def kill(server, wait_s=120):
    """Release the GPU, then confirm the server stopped answering."""

    server.json("/kill", {})
    deadline = time.time() + wait_s
    while time.time() < deadline:
        time.sleep(5)
        try:
            server.call("/status", timeout=10)
        except Exception:
            return True
    return False


def main(argv):
    cmd, args = (argv + [""])[0], argv[1:]
    if cmd == "connect":
        CONFIG.write_text(json.dumps({"url": args[0], "key": args[1]}))
        CONFIG.chmod(0o600)
        cmd = "status"
    if cmd not in ("status", "load", "run", "unload", "kill"):
        sys.exit(__doc__)
    server = Server(**json.loads(CONFIG.read_text()))
    if cmd == "status":
        print(json.dumps(server.json("/status"), indent=1))
    elif cmd == "load":
        print(json.dumps(load(server, args[0], "--enhance" in args), indent=1))
    elif cmd == "run":
        result = run(server, json.loads(Path(args[0]).read_text()), args[1])
        sys.exit(1 if result["failed"] else 0)
    elif cmd == "unload":
        print(json.dumps(server.json("/unload", {})))
    elif cmd == "kill":
        if not kill(server):
            sys.exit("The server still answers. In the Colab tab choose Runtime -> Disconnect and delete runtime.")
        print("Server is gone.")


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except ServerGone as e:
        print(f"SERVER GONE: {e}", file=sys.stderr)
        sys.exit(3)
