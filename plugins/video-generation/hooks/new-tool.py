#!/usr/bin/env python3
"""After a Write: when the file is a script (or an engine file) written while working in a video workspace, remind the
agent to keep it in the plugin, where the next agent will find it. Silent everywhere else. Never fails the tool call."""
import json
import sys
from pathlib import Path

SCRIPTS = {".py", ".sh", ".mjs", ".cjs", ".js", ".ts"}


def workspace(p: Path):
    """The video workspace that holds p, if any: a folder with src/engine.tsx and scripts/build.sh."""
    for d in [p, *p.parents]:
        if (d / "src/engine.tsx").exists() and (d / "scripts/build.sh").exists():
            return d
    return None


def note(data: dict) -> str:
    path = Path(data.get("tool_input", {}).get("file_path", ""))
    if "plugins/video-generation" in str(path) or not path.suffix:
        return ""
    ws = workspace(path.parent) or workspace(Path(data.get("cwd", "/")))
    if ws is None:
        return ""
    inside = ws in path.parents
    if inside and path.suffix == ".tsx" and path.is_relative_to(ws / "src") and not path.is_relative_to(ws / "src/videos"):
        return (f"video-generation: {path.relative_to(ws)} is an engine file of the workspace, a copy from the plugin: the next "
                "workspace.sh --apply overwrites it. Make the change in the plugin's workspace/ folder instead (see "
                "'A tool you need is missing' in the plugin's docs/tools.md), or in your series' _shared.tsx if only it needs it.")
    if path.suffix not in SCRIPTS:
        return ""
    if inside and path.is_relative_to(ws / "scripts"):
        where = f"{path.relative_to(ws)} sits among the engine scripts of the workspace, which the next workspace.sh --apply can overwrite."
    elif inside and path.is_relative_to(ws / "src/videos"):
        return ""  # a helper of one video stays with it
    else:
        where = f"you wrote a script, {path.name}, while making a video."
    return (f"video-generation: {where} First check that docs/tools.md of the plugin does not already have a tool for this. "
            "If a later video could use it, save it in the plugin source, not in the installed plugin folder: follow "
            "'A tool you need is missing' in the plugin's docs/tools.md. If it is a one-off, carry on.")


def main() -> None:
    try:
        text = note(json.load(sys.stdin))
    except Exception:
        return
    if text:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": text}}))


if __name__ == "__main__":
    main()
