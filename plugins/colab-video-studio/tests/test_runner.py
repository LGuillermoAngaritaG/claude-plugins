# Control-flow check for runner.py with Colab stubbed out. Run: python tests/test_runner.py

import json
import sys
import tempfile
import types
from pathlib import Path

RUNNER = Path(__file__).parent.parent / "skills/generate-video-clips/references/runner.py"


def demo():
    calls = []
    colab = types.ModuleType("google.colab")
    colab.drive = types.SimpleNamespace(flush_and_unmount=lambda timeout_ms: calls.append("flush"))
    colab.runtime = types.SimpleNamespace(unassign=lambda: calls.append("unassign"))
    sys.modules["google"] = types.ModuleType("google")
    sys.modules["google.colab"] = colab

    r = {}
    exec(compile(RUNNER.read_text(), str(RUNNER), "exec"), r)

    tmp = Path(tempfile.mkdtemp())
    out = tmp / "batch"
    out.mkdir()
    clip = tmp / "clip.mp4"
    clip.write_bytes(b"x")
    r["COMFY_LOG"] = tmp / "comfyui.log"
    r["COMFY_LOG"].write_text("boom")

    def fake_run(workflow, timeout_min=90):
        if "bad" in json.dumps(workflow):
            raise RuntimeError("out of memory")
        return clip

    for name in ("_install", "_download", "_start_server"):
        r[name] = lambda *a: None
    r["run_workflow"] = fake_run
    r["STATE"].update(out_dir=str(out), done=[])

    shots = [{"name": n, "prompt": n, "seed": 1} for n in ("one", "bad", "three")]
    r["_batch"]("h3", shots, str(out), None, True)

    status = json.loads((out / "status.json").read_text())
    assert [d["shot"] for d in status["done"]] == ["one", "three"], status
    assert [f["shot"] for f in status["failed"]] == ["bad"], status
    assert status["phase"] == "error" and status["runtime"] == "unassigning", status
    assert (out / "01_one_seed1.mp4").exists() and (out / "03_three_seed1.mp4").exists()
    assert (out / "comfyui.log").read_text() == "boom"
    assert calls == ["flush", "unassign"], calls
    print("ok")


if __name__ == "__main__":
    demo()
