#!/bin/bash
# Prints the folder of the video-generation plugin: the engine, guides, examples and workspace.sh the Shorts skills use.
# An installed plugin cannot reach another one by a relative path, so this looks beside this plugin first (a checkout of
# the marketplace), then in Claude Code's record of installed plugins.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$here/../video-generation/docs/pipeline.md" ]; then
  cd "$here/../video-generation" && pwd
  exit 0
fi
python3 - <<'EOF'
import json, os, sys
from pathlib import Path
record = Path(os.environ.get("CLAUDE_CODE_PLUGIN_CACHE_DIR", Path.home() / ".claude/plugins")) / "installed_plugins.json"
plugins = json.loads(record.read_text()).get("plugins", {}) if record.exists() else {}
found = [i["installPath"] for k, v in plugins.items() if k.split("@")[0] == "video-generation" for i in v
         if Path(i["installPath"], "docs/pipeline.md").exists()]
if not found:
    sys.exit("the video-generation plugin is not installed: /plugin install video-generation@guille-plugins")
print(found[0])
EOF
