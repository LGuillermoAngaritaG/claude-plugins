"""The review server and its commands, on a throwaway workspace: start, the page's answers, the agent's to-do list,
and the folders the page may read. Run: python3 tests/test_review.py"""
import json
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

SRC = Path(__file__).parent.parent / "workspace/scripts"

with tempfile.TemporaryDirectory() as tmp:
    ws = Path(tmp)
    (ws / "scripts").mkdir()
    for f in ("review.py", "review.html"):
        shutil.copy(SRC / f, ws / "scripts" / f)
    v = ws / "src/videos/s/01-x"
    v.mkdir(parents=True)
    (v / "script.json").write_text(json.dumps({"title": "T", "type": "ad", "images": {"a": "A cup"}, "scenes": [{"id": "hook", "lines": ["Hello there."], "visual": "A cup"}]}))
    run = lambda *a: subprocess.run([sys.executable, str(ws / "scripts/review.py"), *a], capture_output=True, text=True)
    assert run("start", "s/01-x", '{"idea": "i", "types": ["ad"]}').returncode == 0
    assert run("start", "s/01-x", '{"idea": "i"}').returncode != 0  # never wipes a review
    assert run("stage", "s/01-x", "plan", "look").returncode == 0
    sys.path.insert(0, str(ws / "scripts"))
    import review

    server = ThreadingHTTPServer(("127.0.0.1", 0), review.Page)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_address[1]}"
    state = json.loads(urllib.request.urlopen(f"{url}/api/state?video=s/01-x").read())
    assert state["stage"] == "plan" and state["note"] == "look"
    ids = {i["id"]: i for i in state["items"]}
    assert "scene:hook" in ids and ids["image:a"]["status"] == "pending"
    body = json.dumps({"video": "s/01-x", "items": {"scene:hook": {"change": "Say goodbye", "rev": ids["scene:hook"]["rev"]}, "voice": {"ok": True}}}).encode()
    urllib.request.urlopen(urllib.request.Request(f"{url}/api/send", body, {"Content-Type": "application/json"}))
    out = run("wait", "s/01-x").stdout
    assert "CHANGE scene:hook: Say goodbye" in out and "approved: voice" in out, out
    assert json.loads((v / "review.json").read_text())["waiting"] == "agent"
    for bad in ("src/videos/s/01-x/script.json", "public/../scripts/review.py"):
        try:
            urllib.request.urlopen(f"{url}/media/{bad}")
            raise AssertionError(f"served {bad}")
        except urllib.error.HTTPError as e:
            assert e.code == 404
    server.shutdown()
print("ok: review")
