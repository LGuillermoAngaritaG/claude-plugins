#!/usr/bin/env python3
"""Starts a video: src/videos/<series>/<id>/ with a script.json and an index.tsx that import the right look, pass the
type check, and hold two placeholder scenes. Replace the lines and the scenes, then run the voice step. It also writes an
empty timing.json (the voice step overwrites it) and, for the types with pictures, an empty art.json (art.py fills it).

An explainer also gets facts.json, where every claim of the narration is listed with its source, and references.md,
those sources in readable form for the video's description.

Usage: python3 scripts/new.py <math | sketch | story | ad | explainer | explainer-short> <series/id> "<title>"
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACE = {"sketch": [0.3, 0.2, 0.5], "story": [0.25, 0.15, 0.35], "ad": [0.2, 0.15, 0.35], "explainer": [0.35, 0.25, 0.6], "explainer-short": [0.3, 0.2, 0.5]}

HEAD = """import React from 'react';
import {{SceneProps, VideoDef}} from '../../../engine';
{imports}
import script from './script.json';
import timing from './timing.json';
"""
SCENES = {
    "math": (
        "import {C, Recap, TitleCard} from '../../../kit';",
        """
// The title card takes a moving picture of the subject on the right: draw it inside <TitleCard>.
const Title: React.FC<SceneProps> = ({t}) => <TitleCard t={t} kicker="{series}" title="{short}" sub="One line on what this video answers" />;

const Sum: React.FC<SceneProps> = ({t, b}) => <Recap t={t} b={b} items={[[C.blue, 'First point'], [C.gold, 'Second point']]} />;
""",
        "{title: Title, recap: Sum}",
        "",
    ),
    "sketch": (
        "import {lin} from '../../../kit';\nimport {Note, SKETCH} from '../../../kits/sketch';\nimport art from './art.json';",
        """
// Each scene draws one main picture of art.json with <Sketch> inside <Svg>, paired with scratch() in `sounds`.
const Hook: React.FC<SceneProps> = ({t}) => <Note x={540} y={700} size={120} p={lin(t, 0.2, 0.8)}>{short}</Note>;

const End: React.FC<SceneProps> = ({t}) => <Note x={540} y={700} size={90} p={lin(t, 0.2, 0.8)}>the point</Note>;
""",
        "{hook: Hook, end: End}",
        "  look: SKETCH,\n  art,\n",
    ),
    "story": (
        "import {STORY, StoryTitle} from '../../../kits/story';\nimport art from './art.json';",
        """
// Every scene fills the screen with a <Shot> of art.json that moves the whole time: p={lin(t, 0, dur)}.
const Title: React.FC<SceneProps> = ({t}) => <StoryTitle t={t} kind="A fictional story" title={['{upper}']} />;

const End: React.FC<SceneProps> = () => null;
""",
        "{title: Title, end: End}",
        "  look: STORY,\n  art,\n  bed: {name: 'drone', vol: 0.4},\n",
    ),
    "ad": (
        "import {AD, EndCard, Headline} from '../../../kits/ad';\nimport art from './art.json';",
        """
// Footage first: <Clip src="art/{video}/clips/<name>.mp4" /> (scripts/clips.py) or a <Shot> of art.json.
const Hook: React.FC<SceneProps> = ({t}) => <Headline t={t} at={0.1}>{short}</Headline>;

const End: React.FC<SceneProps> = ({t}) => <EndCard t={t} name="Product" line="One line on what it does" cta="Try it free" url="example.com" />;
""",
        "{hook: Hook, end: End}",
        "  look: AD,\n  art,\n",
    ),
    "explainer": (
        "import {EXPLAIN, Label, ease} from '../../../kits/explainer';\nimport art from './art.json';",
        """
// Each moment takes the medium that explains it best: a 3D <Stage>, a <Picture> of art.json, a <Clip> (an AI clip),
// or 2D (<Svg2D>, <Label>, <Counter>, <Bar>). See the explainer-video skill.
const Hook: React.FC<SceneProps> = ({t}) => <Label x={960} y={480} size={96} o={ease(t, 0.2, 0.6)}>{short}</Label>;

const End: React.FC<SceneProps> = ({t}) => <Label x={960} y={480} size={72} o={ease(t, 0.2, 0.6)}>the point</Label>;
""",
        "{hook: Hook, end: End}",
        "  look: EXPLAIN,\n  art,\n",
    ),
    "explainer-short": (
        "import {EXPLAIN_V, Label, ease} from '../../../kits/explainer';\nimport art from './art.json';",
        """
// Upright, for Shorts: text between y = 220 and 1340, the captions own 1380 to 1500. See the explainer-video skill.
const Hook: React.FC<SceneProps> = ({t}) => <Label x={540} y={600} size={88} o={ease(t, 0.2, 0.6)}>{short}</Label>;

const End: React.FC<SceneProps> = ({t}) => <Label x={540} y={600} size={72} o={ease(t, 0.2, 0.6)}>the point</Label>;
""",
        "{hook: Hook, end: End}",
        "  look: EXPLAIN_V,\n  art,\n",
    ),
}


def camel(vid_id: str) -> str:
    words = re.sub(r"^\d+[a-z]?-", "", vid_id).split("-")
    return words[0] + "".join(w.title() for w in words[1:])


def main() -> None:
    if len(sys.argv) != 4 or sys.argv[1] not in SCENES or sys.argv[2].count("/") != 1:
        sys.exit(__doc__)
    kind, video, title = sys.argv[1:]
    series, vid_id = video.split("/")
    if not re.fullmatch(r"\d\d[a-z]?-[a-z0-9-]+", vid_id):
        sys.exit(f'the id "{vid_id}" must start with two digits and use lower case and dashes, like 01-heartbeat')
    d = ROOT / "src/videos" / video
    if (d / "script.json").exists() or (d / "index.tsx").exists():
        sys.exit(f"{d.relative_to(ROOT)} already has a video")  # a folder with only the review.json of guided-video is fine
    first, last = ("title", "recap") if kind == "math" else ("title", "end") if kind == "story" else ("hook", "end")
    script = {"title": title}
    if kind.startswith("explainer"):
        script |= {"type": "explainer"} | ({"shape": "upright"} if kind == "explainer-short" else {}) | {"pace": PACE[kind], "images": {}}
    elif kind != "math":
        script |= {"type": kind, "pace": PACE[kind], "images": {}}
    if kind == "story":
        script["case"] = "fiction"
    script["scenes"] = [{"id": first, "lines": ["The first line: the hook."]}, {"id": last, "lines": ["The last line."]}]
    imports, scenes, table, extra = SCENES[kind]
    short = title if len(title) <= 18 else title[:18].rsplit(" ", 1)[0]
    fill = {"{series}": series.replace("-", " ").capitalize(), "{short}": short, "{upper}": short.upper(), "{video}": video}
    for k, v in fill.items():
        scenes = scenes.replace(k, v)
    tsx = HEAD.format(imports=imports) + scenes + f"\nexport const {camel(vid_id)}: VideoDef = {{\n  id: '{vid_id}',\n{extra}  script,\n  timing,\n  scenes: {table},\n}};\n"
    d.mkdir(parents=True, exist_ok=True)
    (d / "script.json").write_text(json.dumps(script, indent=1, ensure_ascii=False) + "\n")
    (d / "timing.json").write_text("{}\n")
    if kind != "math":
        (d / "art.json").write_text("{}\n")
    if kind.startswith("explainer"):
        (d / "facts.json").write_text('{\n "claims": []\n}\n')
        (d / "references.md").write_text(f"# {title}: references\n\nEvery source behind the facts, by chapter, for the description. Open access unless marked.\n\n## To go deeper\n\n## <Chapter>\n<!-- scenes: <scene ids> -->\n")
    (d / "index.tsx").write_text(tsx)
    print(f"{d.relative_to(ROOT)}: script.json, index.tsx, timing.json" + ("" if kind == "math" else ", art.json") + (", facts.json, references.md" if kind.startswith("explainer") else ""))


if __name__ == "__main__":
    main()
