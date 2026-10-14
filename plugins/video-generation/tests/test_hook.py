"""The hook that asks an agent to save a new tool in the plugin: when it speaks and when it stays silent.
Run: python3 tests/test_hook.py"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HOOK = Path(__file__).parent.parent / "hooks/new-tool.py"


def say(file: Path, cwd: Path) -> str:
    out = subprocess.run([sys.executable, str(HOOK)], input=json.dumps({"tool_name": "Write", "cwd": str(cwd), "tool_input": {"file_path": str(file)}}), capture_output=True, text=True, check=True).stdout
    return json.loads(out)["hookSpecificOutput"]["additionalContext"] if out.strip() else ""


with tempfile.TemporaryDirectory() as tmp:
    ws, other = Path(tmp) / "ws", Path(tmp) / "elsewhere"
    for d in (ws / "src/videos/s/01-x", ws / "scripts", ws / "src/kits", other):
        d.mkdir(parents=True)
    (ws / "src/engine.tsx").touch()
    (ws / "scripts/build.sh").touch()
    assert "save it in the plugin source" in say(other / "calib.py", ws)  # a scratch script while making a video
    assert "engine scripts" in say(ws / "scripts/thing.py", ws)
    assert "engine file" in say(ws / "src/kits/new.tsx", ws)
    assert say(ws / "src/videos/s/01-x/helper.py", ws) == ""  # one video's helper stays with it
    assert say(ws / "src/videos/s/01-x/index.tsx", ws) == ""
    assert say(other / "x.py", other) == ""  # not a video workspace
    assert say(Path(tmp) / "plugins/video-generation/workspace/scripts/x.py", ws) == ""  # already in the plugin
    bad = subprocess.run([sys.executable, str(HOOK)], input="not json", capture_output=True, text=True)
    assert bad.returncode == 0 and bad.stdout == ""
print("ok: hook")
