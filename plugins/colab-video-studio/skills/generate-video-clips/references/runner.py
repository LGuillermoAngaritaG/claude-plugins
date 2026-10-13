# Colab video runner: MiniMax H3 or LTX-2.5 through headless ComfyUI.
#
# Paste this whole file into one Colab cell and run it. It only defines
# functions; nothing starts until start_batch() is called.
#
#   mount_drive()                      foreground; the user approves a Drive popup
#   start_batch(model, shots, ...)     starts setup + rendering in a background thread
#   status()                           prints progress as JSON; fast, safe to poll
#   stop()                             unassigns the runtime now, which stops billing

import copy
import json
import os
import re
import shutil
import subprocess
import threading
import time
import traceback
import urllib.error
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path

COMFY_COMMIT = "8010b48"
COMFY_DIR = Path("/content/ComfyUI")
COMFY_URL = "http://127.0.0.1:8188"
COMFY_LOG = Path("/content/comfyui.log")
DRIVE_ROOT = Path("/content/drive/MyDrive/claude_videos")

WORKFLOWS = {
    "h3": json.loads(r"""{"140:119":{"class_type":"VAELoader","inputs":{"vae_name":"minimax_h3_video_vae_int8_convrot.safetensors"}},"140:120":{"class_type":"VAELoader","inputs":{"vae_name":"minimax_h3_audio_vae_fp32.safetensors"}},"140:121":{"class_type":"VAEDecodeAudio","inputs":{"samples":["140:125",0],"vae":["140:120",0]}},"140:122":{"class_type":"VAEDecode","inputs":{"samples":["140:125",0],"vae":["140:119",0]}},"140:123":{"class_type":"KSamplerSelect","inputs":{"sampler_name":"res_multistep"}},"140:124":{"class_type":"BasicScheduler","inputs":{"scheduler":"simple","steps":["140:136",0],"denoise":1,"model":["140:135",0]}},"140:125":{"class_type":"SamplerCustomAdvanced","inputs":{"noise":["140:129",0],"guider":["140:126",0],"sampler":["140:123",0],"sigmas":["140:124",0],"latent_image":["140:131",1]}},"140:126":{"class_type":"BasicGuider","inputs":{"model":["140:135",0],"conditioning":["140:131",0]}},"140:127":{"class_type":"UNETLoader","inputs":{"unet_name":"minimax_h3_fl2va_pruned_int8_convrot.safetensors","weight_dtype":"default"}},"140:128":{"class_type":"CLIPLoader","inputs":{"clip_name":"qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors","type":"minimax","device":"default"}},"140:129":{"class_type":"RandomNoise","inputs":{"noise_seed":757358688076805}},"140:130":{"class_type":"CreateVideo","inputs":{"fps":24,"bit_depth":8,"images":["140:122",0],"audio":["140:121",0]}},"140:131":{"class_type":"MiniMaxH3ImageToVideo","inputs":{"prompt":"","width":["115",0],"height":["115",1],"length":["140:132",1],"clip":["140:128",0],"vae":["140:119",0]}},"140:132":{"class_type":"ComfyMathExpression","inputs":{"expression":"max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17","values.a":["140:133",0]}},"140:133":{"class_type":"PrimitiveFloat","inputs":{"value":5}},"140:134":{"class_type":"LoraLoaderModelOnly","inputs":{"lora_name":"minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors","strength_model":1,"model":["140:127",0]}},"140:135":{"class_type":"ComfySwitchNode","inputs":{"switch":["140:139",0],"on_false":["140:127",0],"on_true":["140:134",0]}},"140:136":{"class_type":"ComfySwitchNode","inputs":{"switch":["140:139",0],"on_false":["140:137",0],"on_true":["140:138",0]}},"140:137":{"class_type":"PrimitiveInt","inputs":{"value":20}},"140:138":{"class_type":"PrimitiveInt","inputs":{"value":8}},"140:139":{"class_type":"PrimitiveBoolean","inputs":{"value":false}},"92":{"class_type":"SaveVideo","inputs":{"filename_prefix":"video/MiniMax_H3","format":"auto","format.codec":"auto","video":["140:130",0]}},"115":{"class_type":"ResolutionSelector","inputs":{"aspect_ratio":"16:9 (Widescreen)","megapixels":0.4,"multiple":32}}}"""),
    "ltx": json.loads(r"""{"405:370":{"class_type":"CreateVideo","inputs":{"fps":["405:359",0],"bit_depth":8,"images":["405:374",0],"audio":["405:358",0]}},"405:340":{"class_type":"LTXVConcatAVLatent","inputs":{"video_latent":["405:348",0],"audio_latent":["405:367",1]}},"405:395":{"class_type":"ManualSigmas","inputs":{"sigmas":"0.85, 0.7250, 0.4219, 0.0"}},"405:348":{"class_type":"LTXVLatentUpsampler","inputs":{"samples":["405:367",0],"upscale_model":["405:371",0],"vae":["405:385",0]}},"405:358":{"class_type":"LTXVAudioVAEDecode","inputs":{"samples":["405:369",1],"audio_vae":["405:386",0]}},"405:341":{"class_type":"KSamplerSelect","inputs":{"sampler_name":"euler_ancestral"}},"405:391":{"class_type":"LTXVDualCFGGuider","inputs":{"video_cfg":1,"audio_cfg":1,"model":["405:384",0],"positive":["405:365",0],"negative":["405:365",1]}},"405:368":{"class_type":"SamplerCustomAdvanced","inputs":{"noise":["405:338",0],"guider":["405:391",0],"sampler":["405:341",0],"sigmas":["405:395",0],"latent_image":["405:340",0]}},"405:338":{"class_type":"RandomNoise","inputs":{"noise_seed":42}},"405:367":{"class_type":"LTXVSeparateAVLatent","inputs":{"av_latent":["405:344",0]}},"405:369":{"class_type":"LTXVSeparateAVLatent","inputs":{"av_latent":["405:368",0]}},"405:374":{"class_type":"VAEDecodeTiled","inputs":{"tile_size":512,"overlap":64,"temporal_size":64,"temporal_overlap":16,"samples":["405:369",0],"vae":["405:385",0]}},"405:344":{"class_type":"SamplerCustomAdvanced","inputs":{"noise":["405:339",0],"guider":["405:388",0],"sampler":["405:352",0],"sigmas":["405:404",0],"latent_image":["405:377",0]}},"405:404":{"class_type":"ManualSigmas","inputs":{"sigmas":"1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0"}},"405:388":{"class_type":"LTXVDualCFGGuider","inputs":{"video_cfg":1,"audio_cfg":1,"model":["405:384",0],"positive":["405:365",0],"negative":["405:365",1]}},"405:352":{"class_type":"KSamplerSelect","inputs":{"sampler_name":"euler_ancestral"}},"405:339":{"class_type":"RandomNoise","inputs":{"noise_seed":558811532553686}},"405:365":{"class_type":"LTXVConditioning","inputs":{"frame_rate":["405:359",0],"positive":["405:364",0],"negative":["405:373",0]}},"405:377":{"class_type":"LTXVConcatAVLatent","inputs":{"video_latent":["405:356",0],"audio_latent":["405:366",0]}},"405:364":{"class_type":"CLIPTextEncode","inputs":{"text":["405:382",0],"clip":["405:387",0]}},"405:373":{"class_type":"CLIPTextEncode","inputs":{"text":"pc game, console game, video game, cartoon, childish, ugly","clip":["405:387",0]}},"405:356":{"class_type":"EmptyLTXVLatentVideo","inputs":{"width":["405:353",1],"height":["405:355",1],"length":["405:378",1],"batch_size":1}},"405:366":{"class_type":"LTXVEmptyLatentAudio","inputs":{"frames_number":["405:378",1],"frame_rate":["405:359",1],"batch_size":1,"audio_vae":["405:386",0]}},"405:381":{"class_type":"PreviewAny","inputs":{"source":["405:382",0]}},"405:382":{"class_type":"ComfySwitchNode","inputs":{"switch":["405:383",0],"on_false":["405:376",0],"on_true":["405:380",0]}},"405:371":{"class_type":"LatentUpscaleModelLoader","inputs":{"model_name":"ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors"}},"405:384":{"class_type":"UNETLoader","inputs":{"unet_name":"ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors","weight_dtype":"default"}},"405:385":{"class_type":"VAELoader","inputs":{"vae_name":"ltx-2.5-video-vae-bf16.safetensors"}},"405:386":{"class_type":"VAELoader","inputs":{"vae_name":"ltx-2.5-audio-vae-bf16.safetensors"}},"405:387":{"class_type":"CLIPLoader","inputs":{"clip_name":"gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors","type":"ltxv","device":"default"}},"405:380":{"class_type":"TextGenerateLTX2Prompt","inputs":{"prompt":["405:376",0],"max_length":600,"sampling_mode":"on","sampling_mode.temperature":0.7,"sampling_mode.top_k":64,"sampling_mode.top_p":0.95,"sampling_mode.min_p":0.05,"sampling_mode.repetition_penalty":1.15,"sampling_mode.seed":0,"sampling_mode.presence_penalty":0,"thinking":false,"use_default_template":true,"clip":["405:393",0]}},"405:378":{"class_type":"ComfyMathExpression","inputs":{"expression":"a * b + 1","values.a":["405:362",0],"values.b":["405:361",0]}},"405:353":{"class_type":"ComfyMathExpression","inputs":{"expression":"a/2","values.a":["405:372",0]}},"405:355":{"class_type":"ComfyMathExpression","inputs":{"expression":"a/2","values.a":["405:360",0]}},"405:359":{"class_type":"ComfyMathExpression","inputs":{"expression":"a","values.a":["405:361",0]}},"405:360":{"class_type":"PrimitiveInt","inputs":{"value":["409",1]}},"405:361":{"class_type":"PrimitiveInt","inputs":{"value":24}},"405:362":{"class_type":"PrimitiveInt","inputs":{"value":5}},"405:372":{"class_type":"PrimitiveInt","inputs":{"value":["409",0]}},"405:376":{"class_type":"PrimitiveStringMultiline","inputs":{"value":""}},"405:393":{"class_type":"CLIPLoader","inputs":{"clip_name":"gemma4_e2b_it_int8_convrot.safetensors","type":"ltxv","device":"default"}},"405:383":{"class_type":"PrimitiveBoolean","inputs":{"value":false}},"75":{"class_type":"SaveVideo","inputs":{"filename_prefix":"video/LTX_2.5_t2v","format":"auto","format.codec":"auto","video":["405:370",0]}},"409":{"class_type":"ResolutionSelector","inputs":{"aspect_ratio":"16:9 (Widescreen)","megapixels":0.9,"multiple":32}}}"""),
}

FILES = {
    "h3": [
        ("Comfy-Org/MiniMax-H3", "diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors", "diffusion_models"),
        ("Comfy-Org/MiniMax-H3", "text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors", "text_encoders"),
        ("Comfy-Org/MiniMax-H3", "vae/minimax_h3_video_vae_int8_convrot.safetensors", "vae"),
        ("Comfy-Org/MiniMax-H3", "vae/minimax_h3_audio_vae_fp32.safetensors", "vae"),
        ("lightx2v/Minimax-h3-Turbo", "minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors", "loras"),
    ],
    "ltx": [
        ("Lightricks/LTX-2.5", "diffusion_models/ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors", "diffusion_models"),
        ("Lightricks/LTX-2.5", "text_encoders/gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors", "text_encoders"),
        ("Lightricks/LTX-2.5", "vae/ltx-2.5-video-vae-bf16.safetensors", "vae"),
        ("Lightricks/LTX-2.5", "vae/ltx-2.5-audio-vae-bf16.safetensors", "vae"),
        ("Lightricks/LTX-2.5", "latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors", "latent_upscale_models"),
        ("Comfy-Org/gemma-4", "text_encoders/gemma4_e2b_it_int8_convrot.safetensors", "text_encoders"),
    ],
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

DEFAULTS = {
    "h3": {"seconds": 5, "aspect": "16:9", "megapixels": 0.4, "turbo": False},
    "ltx": {"seconds": 5, "aspect": "16:9", "megapixels": 0.9, "enhance_prompt": False},
}

STATE = {"phase": "idle"}
_LOCK = threading.Lock()


# Status

def _set(**kw):
    with _LOCK:
        STATE.update(kw)
        STATE["updated"] = datetime.now().isoformat(timespec="seconds")
        snapshot = dict(STATE)

    # The status file on Drive survives the runtime, so the final state stays readable.

    out = snapshot.get("out_dir")
    if out:
        try:
            Path(out, "status.json").write_text(json.dumps(snapshot, indent=1))
        except OSError:
            pass


def status():
    with _LOCK:
        snap = dict(STATE)
    if "started" in snap:
        snap["elapsed_min"] = round((time.time() - snap["started"]) / 60, 1)
    print(json.dumps(snap, indent=1))
    return snap


# Runtime control

def stop():
    """Release the GPU runtime. Billing stops once Colab unassigns the VM."""

    _set(runtime="unassigning")
    _save_log()
    from google.colab import drive, runtime

    # Drive syncs in the background, so unassigning without a flush can drop the last clips.

    try:
        drive.flush_and_unmount(timeout_ms=10 * 60 * 1000)
    except Exception as e:
        print("Drive flush failed:", e)
    runtime.unassign()


def _save_log():
    """Copy the end of the ComfyUI log to the batch folder after an error; /content dies with the runtime."""

    with _LOCK:
        out, failed = STATE.get("out_dir"), STATE.get("phase") == "error"
    if not (out and failed and COMFY_LOG.exists()):
        return
    try:
        Path(out, "comfyui.log").write_bytes(COMFY_LOG.read_bytes()[-200_000:])
    except OSError:
        pass


def mount_drive():
    from google.colab import drive

    drive.mount("/content/drive")
    DRIVE_ROOT.mkdir(parents=True, exist_ok=True)
    print("Drive mounted:", DRIVE_ROOT)


def gpu_info():
    out = subprocess.run(
        ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
        capture_output=True, text=True,
    )
    return out.stdout.strip() or "none"


# Setup

def _sh(cmd, cwd=None):
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\n{r.stdout[-2000:]}\n{r.stderr[-2000:]}")


def _install():
    if not COMFY_DIR.exists():
        _sh(f"git clone -q https://github.com/comfyanonymous/ComfyUI.git {COMFY_DIR}")
    _sh(f"git checkout -q {COMFY_COMMIT}", cwd=COMFY_DIR)
    _sh("pip install -q -r requirements.txt", cwd=COMFY_DIR)


OPTIONAL_FILES = {"gemma4_e2b_it_int8_convrot.safetensors"}


def _download(model, hf_token, shots):
    from huggingface_hub import hf_hub_download

    enhance = any(s.get("enhance_prompt") for s in shots)
    for repo, path, folder in FILES[model]:
        dest = COMFY_DIR / "models" / folder / Path(path).name

        # The prompt enhancer (~10 GB) loads only when enhance_prompt is on.
        # ComfyUI still validates that the file exists, so an empty
        # placeholder stands in when no shot uses it.

        if dest.name in OPTIONAL_FILES and not enhance:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.touch()
            continue
        if dest.exists() and dest.stat().st_size > 0:
            continue
        _set(step=f"downloading {dest.name}")
        local = hf_hub_download(repo, path, local_dir="/content/hf", token=hf_token)
        dest.parent.mkdir(parents=True, exist_ok=True)
        os.replace(local, dest)


def _start_server():
    try:
        urllib.request.urlopen(COMFY_URL + "/system_stats")
        return
    except Exception:
        pass
    log = open(COMFY_LOG, "w")
    proc = subprocess.Popen(
        ["python", "main.py", "--listen", "127.0.0.1", "--port", "8188"],
        cwd=COMFY_DIR, stdout=log, stderr=subprocess.STDOUT,
    )
    for _ in range(180):
        try:
            urllib.request.urlopen(COMFY_URL + "/system_stats")
            return
        except Exception:
            if proc.poll() is not None:
                raise RuntimeError("ComfyUI exited. See comfyui.log")
            time.sleep(2)
    raise RuntimeError("ComfyUI did not start. See comfyui.log")


# ComfyUI client

def _post(path, payload):
    req = urllib.request.Request(COMFY_URL + path, json.dumps(payload).encode(), {"Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"ComfyUI rejected the workflow: {e.read().decode()}") from None


def _get(path):
    return json.loads(urllib.request.urlopen(COMFY_URL + path).read())


def run_workflow(workflow, timeout_min=90):
    """Queue a workflow, wait for it, and return the saved video path."""

    prompt_id = _post("/prompt", {"prompt": workflow, "client_id": uuid.uuid4().hex})["prompt_id"]
    deadline = time.time() + timeout_min * 60
    while time.time() < deadline:
        hist = _get(f"/history/{prompt_id}").get(prompt_id)
        if hist and hist.get("status", {}).get("completed") is not None:
            st = hist["status"]
            if st.get("status_str") == "error":
                errors = [
                    f"{m[1].get('node_type')}: {m[1].get('exception_message', '').strip()}"
                    for m in st.get("messages", []) if m[0] == "execution_error"
                ]
                raise RuntimeError(f"Generation failed: {errors}. See comfyui.log")
            for out in hist["outputs"].values():
                for items in out.values():
                    for item in items if isinstance(items, list) else []:
                        if isinstance(item, dict) and item.get("filename", "").endswith((".mp4", ".webm", ".mkv")):
                            return COMFY_DIR / "output" / item.get("subfolder", "") / item["filename"]
            raise RuntimeError(f"No video in outputs: {hist['outputs']}")
        time.sleep(5)
    raise TimeoutError(f"Shot still running after {timeout_min} min")


def build_workflow(model, shot):
    """Return the API workflow for one shot. Shot keys override DEFAULTS[model]."""

    s = {**DEFAULTS[model], **shot}
    wf = copy.deepcopy(WORKFLOWS[model])
    if model == "h3":
        wf["140:131"]["inputs"]["prompt"] = s["prompt"]
        wf["140:133"]["inputs"]["value"] = float(s["seconds"])
        wf["140:129"]["inputs"]["noise_seed"] = int(s["seed"])
        wf["140:139"]["inputs"]["value"] = bool(s["turbo"])
        wf["115"]["inputs"]["aspect_ratio"] = ASPECTS[s["aspect"]]
        wf["115"]["inputs"]["megapixels"] = float(s["megapixels"])
        wf["92"]["inputs"]["filename_prefix"] = "video/h3"
    else:
        wf["405:376"]["inputs"]["value"] = s["prompt"]
        wf["405:362"]["inputs"]["value"] = int(s["seconds"])
        wf["405:339"]["inputs"]["noise_seed"] = int(s["seed"])
        wf["405:338"]["inputs"]["noise_seed"] = int(s["seed"]) + 1
        wf["405:383"]["inputs"]["value"] = bool(s["enhance_prompt"])
        wf["409"]["inputs"]["aspect_ratio"] = ASPECTS[s["aspect"]]
        wf["409"]["inputs"]["megapixels"] = float(s["megapixels"])
        wf["75"]["inputs"]["filename_prefix"] = "video/ltx"
    return wf


# Batch

def _batch(model, shots, out_dir, hf_token, auto_stop):
    try:
        _set(phase="installing", step="ComfyUI")
        _install()
        _set(phase="downloading")
        _download(model, hf_token, shots)
        _set(phase="starting_server", step="")
        _start_server()

        failed = []
        for i, shot in enumerate(shots, 1):
            _set(phase="rendering", step=f"shot {i}/{len(shots)}: {shot['name']}", shot_started=time.time())
            t0 = time.time()

            # One bad shot must not cost the rest of the batch.

            try:
                src = run_workflow(build_workflow(model, shot))
                dest = Path(out_dir) / f"{i:02d}_{shot['name']}_seed{shot['seed']}{src.suffix}"
                shutil.copy(src, dest)
            except Exception as e:
                traceback.print_exc()
                failed.append({"shot": shot["name"], "error": str(e)[:500]})
                _set(failed=list(failed))
                continue
            with _LOCK:
                STATE["done"].append({"shot": shot["name"], "file": str(dest), "minutes": round((time.time() - t0) / 60, 1)})
            _set()
        if failed:
            _set(phase="error", step="", error=f"{len(failed)} of {len(shots)} shots failed")
        else:
            _set(phase="finished", step="")
    except Exception as e:
        _set(phase="error", error=str(e)[:1500])
        traceback.print_exc()
    finally:
        if auto_stop:
            try:
                stop()
            except Exception as e:
                _set(stop_error=str(e))


def _watchdog(max_minutes):
    deadline = time.time() + max_minutes * 60
    while time.time() < deadline:
        if STATE.get("phase") in ("finished", "error") or STATE.get("runtime"):
            return
        time.sleep(30)
    _set(phase="error", error=f"Watchdog: batch exceeded {max_minutes} min")
    stop()


def start_batch(model, shots, batch_name=None, max_minutes=120, auto_stop=True):
    """Start setup and rendering in the background and return at once.

    model: "h3" or "ltx".
    shots: list of dicts with "name" and "prompt", plus optional
      seconds, aspect, megapixels, seed, and turbo (h3) or enhance_prompt (ltx).
    auto_stop: unassign the runtime when the batch ends, fails, or times out.
    """

    if model not in WORKFLOWS:
        raise ValueError('model must be "h3" or "ltx"')
    if STATE.get("phase") in ("installing", "downloading", "starting_server", "rendering"):
        raise RuntimeError("A batch is already running. Check status().")
    if not Path("/content/drive/MyDrive").exists():
        raise RuntimeError("Drive is not mounted. Run mount_drive() first.")
    gpu = gpu_info()
    if gpu == "none":
        raise RuntimeError("No GPU. Runtime -> Change runtime type -> L4, then rerun this cell.")

    hf_token = None
    if model == "ltx":
        from google.colab import userdata

        hf_token = userdata.get("HF_TOKEN")

    clean = []
    for i, shot in enumerate(shots, 1):
        if not shot.get("prompt"):
            raise ValueError(f"Shot {i} has no prompt")
        s = dict(shot)
        s["name"] = re.sub(r"[^a-z0-9]+", "_", s.get("name", f"shot{i}").lower()).strip("_")[:40]
        s.setdefault("seed", int(time.time() * 1000 + i) % 2**31)
        if s.get("aspect", DEFAULTS[model]["aspect"]) not in ASPECTS:
            raise ValueError(f"Shot {i}: aspect must be one of {list(ASPECTS)}")
        clean.append(s)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = DRIVE_ROOT / f"{stamp}_{batch_name or model}"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "shots.json").write_text(json.dumps({"model": model, "shots": clean}, indent=1))

    with _LOCK:
        STATE.clear()
        STATE.update(model=model, gpu=gpu, out_dir=str(out_dir), shots=len(clean), done=[], started=time.time())
    _set(phase="starting")

    threading.Thread(target=_batch, args=(model, clean, str(out_dir), hf_token, auto_stop), daemon=True).start()
    threading.Thread(target=_watchdog, args=(max_minutes,), daemon=True).start()
    print(f"Batch started on {gpu}. Output: {out_dir}")
    return str(out_dir)


print("Runner loaded. Next: mount_drive(), then start_batch(model, shots).")
