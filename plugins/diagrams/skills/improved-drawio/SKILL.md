---
name: "improved-drawio"
description: "Use for polished architecture diagrams the user can edit in draw.io, such as cloud diagrams with AWS, Azure, GCP or Kubernetes icons, pipelines, integration maps and flows. Grid layout, checked render."
---

# improved-drawio

Builds precise diagrams as native `.drawio` files. A short Python script places boxes, icons and groups on a column and row grid, so every position is computed. draw.io's own viewer renders the file in headless Chromium, and you look at the image and fix defects before the user sees it. The user then edits the file in draw.io, where arrows stay attached to shapes.

## When to use

| Situation | Skill |
|---|---|
| Layered or tiered architecture, pipelines, data flows, integration maps | This one |
| Cloud deployment with AWS, Azure, GCP, Kubernetes, Cisco or brand icons, with nested groups such as region, VPC and subnet | This one |
| C4 context and container views, lanes, simple flows on a grid | This one |
| Sketch or whiteboard look | excalidraw |
| UML class, sequence, ERD, BPMN, mind maps, ML model figures | drawio-skill |
| Dependency or import graphs, more than about 25 nodes, no natural grid | drawio-skill with its auto-layout |

## Setup

`gridgram.py` is embedded at the end of this file. Extract it byte for byte. Do not retype it and do not improve it.

```bash
python3 - "<this skill's base directory>/SKILL.md" <<'EOF'
import hashlib, pathlib, re, sys
md = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
code = re.search(r"<!-- gridgram:start -->\s*```python\n(.*?)\n```\s*<!-- gridgram:end -->", md, re.S).group(1)
pathlib.Path("gridgram.py").write_text(code + "\n", encoding="utf-8")
print(hashlib.sha256("\n".join(line.rstrip() for line in code.splitlines()).encode()).hexdigest())
EOF
python3 gridgram.py selftest
```

- Expected hash: `17cf2ae5fccbe8c8adc82598731a5bb8707931a7ef7f149d748fbc3245774073`
- A different hash means the embedded block changed after it was written. Tell the user, and go on only if the selftest passes. After a deliberate change to the script, update the hash here.
- If SKILL.md is not on disk, write the embedded block to `gridgram.py` with the Write tool, then run the selftest.
- The selftest must print `selftest ok` before you go on.
- `gridgram.py` needs Python 3.9 or newer.
- Rendering needs the Python `playwright` package, Chromium, and network access to `viewer.diagrams.net` and `app.diagrams.net`.
- Cowork cloud sessions have Playwright and Chromium preinstalled. Do not run `playwright install` there.
- Elsewhere, run `pip install playwright && playwright install chromium`.
- Without network, export with the draw.io desktop CLI instead: `drawio -x -f png -s 2 -o out.png in.drawio`.
- The viewer runs inside the local browser. It downloads scripts, stencils and library images, and the diagram XML is not uploaded.
- Icon lookup downloads the official draw.io shape index once from `raw.githubusercontent.com/jgraph/drawio-mcp`, about 5 MB. Brand logos come from `unpkg.com`.

## Workflow

### 1. Choose the grid before any code

- Say in one sentence what the columns mean and what the rows mean. For example, columns are stages and rows are platforms.
- Pick the canvas from the destination. `word` is a 6.5 inch text column, `readme` is 900 px, `slide` is a 16:9 slide.
- List the shapes and give each one a cell. A box that feeds several rows spans those rows, so its arrows run straight.
- Decide box or icon per component. Use an icon when the component is a named cloud service or product. Use a box for your own components and for anything without an official icon.

### 2. Write the diagram script

- Save it as `<name>.gridgram.py`. Use only grid cells. Never write x or y values.
- Follow the worked examples below.

### 3. Resolve icons

- Call `icons("<name>.icons.json", key="query | text the style must contain", ...)` at the top of the script. It returns `key -> (style, (w, h))`, which unpacks straight into `d.icon(col, row, title, *I["key"])`.
- The JSON file caches every result. A later run needs no search and no network. Never paste or retype a style string.
- List candidates before you choose the filter: `python3 gridgram.py shapes "aws lambda"`.

| Family | Query example | Filter after the bar |
|---|---|---|
| AWS service | `aws lambda` | `aws4.resourceIcon`, or `aws4.` when the service has no resource icon |
| AWS group | `aws vpc`, `public subnet`, `aws region` | `aws4.group` or the exact `grIcon` name |
| Azure | `azure function apps` | `azure2` |
| GCP | `gcp cloud run` | `image=data` |
| Kubernetes | `kubernetes pod` | `kubernetes.icon2` |
| Network | `cisco router` | `cisco` |
| Brand logo | `brand:claude`, `brand:snowflake`, `brand:openai` | none, the name is a lobe-icons file name |

- Avoid the `aws3`, `aws3d` and `mscae` families when a current one exists.
- Pass a group style to a container with `d.container(..., style=I["vpc"][0])`.
- Icon rows need more height. Use about `row_h=80, row_gap=24` on `word`, `row_h=90, row_gap=30` on `readme` and `row_h=110, row_gap=40` on `slide`.
- Nested groups make room for their own borders. Raise `col_gap` to about 50 so arrows and badges still fit between them.

### 4. Render, look, fix

- Run the script. It writes `<name>.drawio` and `<name>.png`.
- Read the PNG with the Read tool. Look at it. Do not skip this step.
- Preview at scale 2. Larger images can exceed the image reader's size limit.
- Read the `may overflow` warnings on stderr. They are estimates, and the image decides.

| Defect | Fix |
|---|---|
| Text clipped or crowded | Shorten the text, then widen the column weight, then raise `row_h` |
| Badge or label on top of something | Move the badge with `at` or the label with `label_at`, from -1 at the source to 1 at the target |
| Several elbows overlap where arrows leave one box | Make the source box span the target rows |
| Arrow crosses a shape | Move a shape to another cell. Do not route around it |
| Icon is a blank or wrong shape | List candidates with `shapes` and tighten the filter |
| Group borders crowd the arrows | Raise `col_gap` |
| Legend runs past the canvas | Shorten the legend texts |
| Diagram too dense | Split it into two diagrams |

- Repeat until the image is clean. Two to four passes are normal.
- Fix a generated file through its script. Do not patch coordinates in its XML.

### 5. Deliver

- Render the final PNG. Use scale 3 for `word`, which gives 300 dpi at 6.5 inches. Use scale 2 for `readme` and `slide`.
- Deliver `<name>.drawio`, `<name>.png`, `<name>.gridgram.py` and `<name>.icons.json` together.
- Tell the user that the `.drawio` opens in draw.io, that arrows and badges follow a dragged shape, and that you will edit the file in place once they have saved it there.

## API

| Call | Notes |
|---|---|
| `Diagram(canvas="word", cols=[1, 1, 1], rows=3, row_h=60, col_gap=40, row_gap=20, title=None)` | `cols` are width weights. `rows` is a count or a list of heights. For `slide` use about `row_h=80, row_gap=50, col_gap=80`. |
| `header(col, text, colspan=1)` | Column label above the grid |
| `container(col, row, title, rowspan=1, colspan=1, style="")` | A group. Shapes and smaller groups whose cells lie inside become its children and move with it in draw.io. Groups nest to any depth. `style` takes a vendor group style |
| `box(col, row, title, sub=None, status="prop", rowspan=1, colspan=1, valign="middle", style="")` | Returns the id. `sub` accepts `\n`. Use `valign="top"` on tall boxes. `style` appends raw draw.io style, for example `shape=cylinder3;boundedLbl=1;size=10;` |
| `icon(col, row, title, style, wh=(1, 1), sub=None)` | Returns the id. The icon sits in the cell with its label below. Pass `*I["key"]` for `style` and `wh` |
| `arrow(src, dst, label=None, badge=None, dashed=False, both=False, at=0.0, label_at=0.0)` | Direction and attachment points are computed. A vertical arrow starts below an icon's label |
| `legend({"live": "Live today"}, badge=None)` | One entry per status used. `badge` explains the numbered circles |
| `icons(cache_path, key="query | filter")` | Resolves icons through the official draw.io shape index and caches them |
| `save(path, force=False)` | Refuses to replace a file that draw.io has saved |
| `render(drawio_path, png_path, scale=2)` | Also available as `python3 gridgram.py render in.drawio out.png 2` |

- Statuses are `live`, `built`, `prop`, `risk` and `plain`.
- Add a status in the diagram script with `gridgram.STATUS["name"] = (fill, stroke)`.

## Design rules

- One idea per shape. Keep the title within four words and the sub within six.
- On a box, color means status and nothing else. Use at most three statuses plus `plain`, and add a legend whenever status color appears.
- Icons keep their vendor colors and carry no status.
- Under an icon, the title says what the component does in this system and the sub names the service, for example "Orchestrator" over "Cloud Run".
- Use one icon family per vendor in a diagram.
- Flow runs left to right or top to bottom. Prefer straight arrows.
- Text lives inside boxes. Label an arrow only when it spans a wide gap.
- When the document has a table, put numbered badges on the arrows and key the table rows to them.
- Details belong in the document. The diagram shows structure.
- Stay under about 20 shapes.

## Changing an existing diagram

Read the first line of the `.drawio` file.

| `<mxfile host=...>` | Meaning | Action |
|---|---|---|
| `gridgram` | Generated and untouched | Change `<name>.gridgram.py` and run it again |
| Anything else, such as `Electron`, `app.diagrams.net` or a hash | The user saved it in draw.io, so it holds manual edits | Edit the XML in place. Never regenerate |

Rules for editing in place:

- Never pass `force=True` unless the user says to discard their manual edits.
- Ids are readable, for example `box_sync_endpoint`, `icon_orchestrator`, `group_vpc`, `edge_pipeline_on_main_sync_endpoint` and the same edge id with `_badge` or `_label`.
- Change text in the cell's `value`. The title sits inside `<b>` and the sub inside `<font>`.
- Change status through `fillColor` and `strokeColor`, with the pairs from `STATUS` in `gridgram.py`.
- Add a shape by copying a sibling `mxCell`. Keep x, y, width and height on multiples of 10 and aligned with the neighbours.
- A child's geometry is relative to its parent group.
- Connect cells with an edge cell that carries `source` and `target`. Copy the style of an existing edge.
- Render with `python3 gridgram.py render <name>.drawio <name>.png 2`, then look and fix as in step 4.
- If `<diagram>` holds base64 text instead of `<mxGraphModel>`, the file is compressed. Decode it with `urllib.parse.unquote(zlib.decompress(base64.b64decode(data), -15).decode())`, or ask the user to untick File, Properties, Compressed and save again.

## Limits

- Output is PNG plus the `.drawio` source. The viewer's SVG relies on `foreignObject`, which Word and many viewers do not draw.
- The preview uses the fonts of the machine that renders it. Text can wrap a little differently in the user's draw.io. Leave slack in boxes.
- Elbow arrows that leave one box toward several rows overlap near the source. Span the source box across those rows instead.
- An icon fills one cell. It cannot span cells.
- Vendor icons and brand logos are trademarks of their owners. Use them to identify the service and for nothing else.

## Worked example, boxes

<!-- example:start -->
```python
from gridgram import Diagram, render

# Columns are stages. Rows are targets.

d = Diagram(canvas="word", cols=[1.2, 1.2, 1.4, 1.3], rows=3)
for col, name in enumerate(["Source", "Delivery", "Landing zone", "Consumers"]):
    d.header(col, name)

d.container(0, 0, "Git host", rowspan=3)
repo = d.box(0, 0, "Registry repo", "single source of truth", "live")
pipe = d.box(0, 1, "Pipeline on main", "gates\npackages", "live", rowspan=2, valign="top")
sync = d.box(1, 1, "Sync service", "converges every target to the commit", "prop", rowspan=2, valign="top")

mirror = d.box(2, 1, "Mirror repo", "one-way push", "prop")
store = d.box(2, 2, "Workspace folder", "import, then reconcile", "built")
tools = d.box(3, 0, "Developer tools", "pull with their own access", "live")
chat = d.box(3, 1, "Chat assistant", "org-wide plugins", "prop")
notebook = d.box(3, 2, "Notebook agent", "loads skills by itself", "built")

d.arrow(repo, tools, label="git pull", badge=1)
d.arrow(pipe, sync, badge=2)
d.arrow(sync, mirror, badge=3)
d.arrow(mirror, chat)
d.arrow(sync, store, badge=4)
d.arrow(store, notebook)

d.legend({"live": "Live", "built": "Built, not deployed", "prop": "Proposed"}, badge="integration point")
d.save("example.drawio")
render("example.drawio", "example.png", scale=2)
```
<!-- example:end -->

## Worked example, cloud icons and nested groups

<!-- cloud:start -->
```python
from gridgram import Diagram, icons, render

# Columns run from the client to the data tier. Rows split primary from supporting services.

I = icons("cloud.icons.json",
          users="aws users | resIcon=mxgraph.aws4.users", cdn="aws cloudfront | aws4.resourceIcon",
          alb="aws application load balancer | aws4.application_load_balancer",
          ecs="elastic container service | aws4.resourceIcon", rds="aws rds | aws4.resourceIcon",
          s3="simple storage service | aws4.resourceIcon", cache="elasticache | aws4.resourceIcon",
          region="aws region | group_region;strokeColor=#00A4A6", vpc="aws vpc | group_vpc2",
          public="public subnet | aws4.group", private="private subnet | aws4.group")

d = Diagram(canvas="readme", cols=[0.8, 1, 1, 1, 1], rows=2, row_h=90, row_gap=30, col_gap=50,
            title="Three-tier web app on AWS")
d.container(1, 0, "Region us-east-1", rowspan=2, colspan=4, style=I["region"][0])
d.container(2, 0, "VPC", rowspan=2, colspan=3, style=I["vpc"][0])
d.container(2, 0, "Public subnet", style=I["public"][0])
d.container(3, 0, "Private subnet", rowspan=2, colspan=2, style=I["private"][0])

users = d.icon(0, 0, "Users", *I["users"])
cdn = d.icon(1, 0, "CloudFront", *I["cdn"], sub="static assets")
alb = d.icon(2, 0, "Application Load Balancer", *I["alb"])
ecs = d.icon(3, 0, "ECS service", *I["ecs"], sub="API containers")
rds = d.icon(4, 0, "RDS PostgreSQL", *I["rds"], sub="primary")
s3 = d.icon(1, 1, "S3", *I["s3"], sub="assets bucket")
cache = d.icon(3, 1, "ElastiCache", *I["cache"], sub="sessions")
replica = d.icon(4, 1, "RDS replica", *I["rds"], sub="read only")

d.arrow(users, cdn, label="HTTPS", label_at=-0.5)
d.arrow(cdn, alb)
d.arrow(cdn, s3)
d.arrow(alb, ecs)
d.arrow(ecs, rds)
d.arrow(ecs, cache)
d.arrow(rds, replica, dashed=True, label="replication")
d.save("cloud.drawio")
render("cloud.drawio", "cloud.png", scale=2)
```
<!-- cloud:end -->

## gridgram.py

<!-- gridgram:start -->
```python
# gridgram.py - grid-placed diagrams written as editable draw.io files.
"""A diagram script places elements on a column and row grid. Positions are computed.

    from gridgram import Diagram, render
    d = Diagram(canvas="word", cols=[1, 1, 1], rows=2)
    a = d.box(0, 0, "Source", "single source of truth", "live")
    b = d.icon(1, 0, "Function", "<style from the shape search>", wh=(78, 78))
    d.arrow(a, b, badge=1)
    d.save("name.drawio")
    render("name.drawio", "name.png")

CLI:
    python3 gridgram.py render in.drawio out.png [scale]
    python3 gridgram.py shapes "aws lambda" [text the style must contain]
    python3 gridgram.py selftest
"""
import base64
import html
import json
import os
import re
import sys
import tempfile
import urllib.request
import xml.etree.ElementTree as ET

INK, MUTED, RULE = "#1F2937", "#5B6472", "#D1D5DB"

# Status name -> (fill, stroke). Color carries status and nothing else.

STATUS = {
    "live": ("#E4F2E6", "#3C8D4B"),
    "built": ("#FCEFD5", "#B7791F"),
    "prop": ("#E8EDF6", "#4A6FA5"),
    "risk": ("#FBE4E4", "#B42318"),
    "plain": ("#FFFFFF", "#9AA3AF"),
}

# One unit is 1/100 inch in draw.io, so "word" fills a 6.5 inch text column.

CANVAS = {
    "word": {"width": 650, "title": 11, "sub": 9, "icon": 40},
    "readme": {"width": 900, "title": 13, "sub": 11, "icon": 48},
    "slide": {"width": 1200, "title": 16, "sub": 12, "icon": 56},
}

MARGIN, PAD, BAND, HOST = 20, 10, 24, "gridgram"
VIEWER = "https://viewer.diagrams.net/js/viewer-static.min.js"

# The official draw.io shape index, about 10,000 shapes. Brand logos come from the lobe-icons set.

SHAPES = "https://raw.githubusercontent.com/jgraph/drawio-mcp/main/shape-search/search-index.json"
BRANDS = "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/"
LEFT, TOP, RIGHT, BOTTOM = 0, 1, 2, 3


def _round10(value):
    return int(round(value / 10.0)) * 10


def _wrap(text, size, width, bold=False):
    """Greedy word wrap on an estimated character width."""
    per_line = max(1, int(width / (size * (0.52 if bold else 0.47))))
    lines = []
    for part in text.split("\n"):
        line = ""
        for word in part.split(" "):
            if line and len(line) + 1 + len(word) > per_line:
                lines.append(line)
                line = word
            else:
                line = (line + " " + word).strip()
        lines.append(line)
    return lines


def _edges(cell):
    col, row, colspan, rowspan = cell
    return col, row, col + colspan - 1, row + rowspan - 1


class Diagram:
    def __init__(self, canvas="word", cols=(1, 1, 1), rows=3, row_h=60, col_gap=40, row_gap=20, title=None):
        self.canvas = CANVAS[canvas]
        self.cols, self.col_gap, self.row_gap, self.title = list(cols), col_gap, row_gap, title
        self.row_h = list(rows) if isinstance(rows, (list, tuple)) else [row_h] * rows
        self.headers, self.containers, self.nodes, self.arrows, self.legend_spec = [], [], {}, [], None
        self.ids = set()

    # ---------------------------------------------------------------- elements

    def header(self, col, text, colspan=1):
        self.headers.append((col, colspan, text))

    def container(self, col, row, title, rowspan=1, colspan=1, style=""):
        self.containers.append({"id": self._id("group", title), "cell": (col, row, colspan, rowspan),
                                "title": title, "style": style})

    def box(self, col, row, title, sub=None, status="prop", rowspan=1, colspan=1, valign="middle", style=""):
        key = self._id("box", title)
        self.nodes[key] = {"kind": "box", "cell": (col, row, colspan, rowspan), "title": title, "sub": sub,
                           "status": status, "valign": valign, "style": style}
        return key

    def icon(self, col, row, title, style, wh=(1, 1), sub=None):
        key = self._id("icon", title)
        self.nodes[key] = {"kind": "icon", "cell": (col, row, 1, 1), "title": title, "sub": sub,
                           "style": style, "wh": wh}
        return key

    def arrow(self, src, dst, label=None, badge=None, dashed=False, both=False, at=0.0, label_at=0.0):
        self.arrows.append({"src": src, "dst": dst, "label": label, "badge": badge,
                            "dashed": dashed, "both": both, "at": at, "label_at": label_at})

    def legend(self, statuses, badge=None):
        self.legend_spec = (statuses, badge)

    # ---------------------------------------------------------------- geometry

    def _id(self, kind, text):
        base = kind + "_" + (re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")[:32] or "x")
        key, n = base, 2
        while key in self.ids:
            key, n = f"{base}_{n}", n + 1
        self.ids.add(key)
        return key

    @staticmethod
    def _within(inner_cell, outer_cell):
        a, b = _edges(outer_cell), _edges(inner_cell)
        return a[0] <= b[0] and a[1] <= b[1] and b[2] <= a[2] and b[3] <= a[3]

    def _holds(self, outer, inner):
        """Whether one container holds another. Equal spans nest in the order they were declared."""
        if outer is inner or not self._within(inner["cell"], outer["cell"]):
            return False
        same = _edges(outer["cell"]) == _edges(inner["cell"])
        return not same or self.containers.index(outer) < self.containers.index(inner)

    def _grow(self, group, side):
        """Nesting levels that share this side of the container, itself included."""
        inner = [g for g in self.containers
                 if self._holds(group, g) and _edges(g["cell"])[side] == _edges(group["cell"])[side]]
        return 1 + max((self._grow(g, side) for g in inner), default=0)

    def _home(self, cell, group=None):
        """The smallest container around a node's cell, or around another container. None at the top level."""
        found = [g for g in self.containers if (self._holds(g, group) if group else self._within(cell, g["cell"]))]
        return min(found, key=lambda g: (g["cell"][2] * g["cell"][3], -self.containers.index(g)), default=None)

    def _layout(self):
        cols, rows = len(self.cols), len(self.row_h)
        extra = [[0] * max(cols, rows) for _ in range(4)]
        for group in self.containers:
            edge = _edges(group["cell"])
            for side in (LEFT, TOP, RIGHT, BOTTOM):
                levels = self._grow(group, side)
                room = (BAND + PAD) * levels if side == TOP else PAD * levels if side == BOTTOM else PAD * (levels - 1)
                extra[side][edge[side]] = max(extra[side][edge[side]], room)

        width = self.canvas["width"]
        free = width - 2 * MARGIN - self.col_gap * (cols - 1) - sum(extra[LEFT][:cols]) - sum(extra[RIGHT][:cols])
        self.col_w = [_round10(free * weight / sum(self.cols)) for weight in self.cols]
        self.col_x, x = [], MARGIN
        for index, col_width in enumerate(self.col_w):
            x += extra[LEFT][index]
            self.col_x.append(x)
            x += col_width + extra[RIGHT][index] + self.col_gap

        y = MARGIN + (30 if self.title else 0) + (30 if self.headers else 0)
        self.row_y = []
        for index, height in enumerate(self.row_h):
            y += extra[TOP][index]
            self.row_y.append(y)
            y += height + extra[BOTTOM][index] + self.row_gap
        self.bottom = y - self.row_gap

    def _rect(self, cell):
        col, row, last_col, last_row = _edges(cell)
        x, y = self.col_x[col], self.row_y[row]
        return x, y, self.col_x[last_col] + self.col_w[last_col] - x, self.row_y[last_row] + self.row_h[last_row] - y

    def _outer(self, group):
        x, y, w, h = self._rect(group["cell"])
        left, top, right, bottom = (self._grow(group, side) for side in (LEFT, TOP, RIGHT, BOTTOM))
        return x - PAD * left, y - (BAND + PAD) * top, w + PAD * (left + right), h + (BAND + PAD) * top + PAD * bottom

    @staticmethod
    def _ports(src, dst):
        """Exit point, entry point and direction. The line runs straight where the two shapes share a span."""
        def shared(a0, a_len, b0, b_len):
            low, high = max(a0, b0), min(a0 + a_len, b0 + b_len)
            if high - low < 20:
                return None
            small0, small_len = (a0, a_len) if a_len <= b_len else (b0, b_len)
            return min(max(small0 + small_len / 2.0, low + 10), high - 10)

        sx, sy, sw, sh = src
        dx, dy, dw, dh = dst
        if dx >= sx + sw or dx + dw <= sx:
            line = shared(sy, sh, dy, dh)
            ey, ny = ((line - sy) / sh, (line - dy) / dh) if line is not None else (0.5, 0.5)
            return ((1, ey), (0, ny), "right") if dx >= sx + sw else ((0, ey), (1, ny), "left")
        line = shared(sx, sw, dx, dw)
        ex, nx = ((line - sx) / sw, (line - dx) / dw) if line is not None else (0.5, 0.5)
        return ((ex, 1), (nx, 0), "down") if dy >= sy + sh else ((ex, 0), (nx, 1), "up")

    # ---------------------------------------------------------------- draw.io

    def to_xml(self):
        self._layout()
        taken = set(self.ids)
        title_size, sub_size, icon_size = self.canvas["title"], self.canvas["sub"], self.canvas["icon"]
        badge_size = 2 * round(sub_size * 0.9)
        mxfile = ET.Element("mxfile", host=HOST, agent="improved-drawio")
        diagram = ET.SubElement(mxfile, "diagram", name="Page-1", id="page1")
        model = ET.SubElement(diagram, "mxGraphModel", grid="1", gridSize="10", guides="1", tooltips="1",
                              connect="1", arrows="1", fold="1", page="0", math="0", background="#FFFFFF")
        root = ET.SubElement(model, "root")
        ET.SubElement(root, "mxCell", id="0")
        ET.SubElement(root, "mxCell", id="1", parent="0")

        def vertex(key, value, style, rect, parent="1", **extra):
            cell = ET.SubElement(root, "mxCell", id=key, value=value, style=style, vertex="1", parent=parent, **extra)
            x, y, w, h = rect
            return ET.SubElement(cell, "mxGeometry", {"x": f"{x:g}", "y": f"{y:g}", "width": f"{w:g}",
                                                     "height": f"{h:g}", "as": "geometry"})

        def label(title, sub, title_lines=None):
            text = "<br>".join(html.escape(line) for line in (title_lines or [title]))
            value = f"<b>{text}</b>"
            if sub:
                value += f'<br><font color="{MUTED}" style="font-size:{sub_size}px">' \
                         + html.escape(sub).replace("\n", "<br>") + "</font>"
            return value

        def place(rect, home):
            """The rectangle relative to its parent, and the parent's id."""
            if home is None:
                return rect, "1"
            origin = self._outer(home)
            return (rect[0] - origin[0], rect[1] - origin[1], rect[2], rect[3]), home["id"]

        text = "text;html=1;strokeColor=none;fillColor=none;fontFamily=Helvetica;whiteSpace=wrap;"
        width = self.canvas["width"]
        if self.title:
            vertex("title", html.escape(self.title), text + f"align=left;verticalAlign=middle;fontStyle=1;"
                   f"fontSize={title_size + 4};fontColor={INK};", (MARGIN, MARGIN - 5, width - 2 * MARGIN, 30))
        if self.headers:
            top = MARGIN + (30 if self.title else 0)
            for col, colspan, name in self.headers:
                x, _, w, _ = self._rect((col, 0, colspan, 1))
                vertex(self._id("header", name), html.escape(name.upper()), text + "align=center;"
                       f"verticalAlign=middle;fontStyle=1;fontSize={sub_size};fontColor={MUTED};", (x, top, w, 20))
            vertex("header_rule", "", f"line;html=1;strokeWidth=1;strokeColor={RULE};", (MARGIN, top + 18, width - 2 * MARGIN, 10))

        # Outer containers come first, so every parent exists before its children.

        for group in sorted(self.containers, key=lambda g: -g["cell"][2] * g["cell"][3]):
            rect, parent = place(self._outer(group), self._home(group["cell"], group))
            vertex(group["id"], html.escape(group["title"]),
                   f"rounded=1;absoluteArcSize=1;arcSize=16;html=1;whiteSpace=wrap;container=1;collapsible=0;"
                   f"recursiveResize=0;fillColor=#F7F8FA;strokeColor=#9AA3AF;fontFamily=Helvetica;fontStyle=1;"
                   f"fontSize={title_size};fontColor={INK};verticalAlign=top;spacingTop=4;" + group["style"],
                   rect, parent)

        rects, below = {}, {}
        for key, node in self.nodes.items():
            cell = self._rect(node["cell"])
            home = self._home(node["cell"])
            if node["kind"] == "icon":
                w, h = node["wh"]
                icon_w = round(icon_size * w / h)
                room = 1.3 * (title_size + sub_size)
                rect = (round(cell[0] + (cell[2] - icon_w) / 2), round(cell[1] + max(0, (cell[3] - icon_size - 4 - room) / 2)),
                        icon_w, icon_size)
                lines = _wrap(node["title"], title_size, cell[2] + self.col_gap / 2, True)
                below[key] = round(6 + 1.3 * (title_size * len(lines) + sub_size * bool(node["sub"])))
                needed = icon_size + below[key]
                if needed > cell[3] + self.row_gap / 2:
                    print(f"gridgram: label may overflow {key} ({needed:.0f} > {cell[3]})", file=sys.stderr)

                # draw.io splits a style on semicolons, so a data URI drops its ";base64" marker.

                style = re.sub(r"(data:image/[a-z+.-]+);base64,", r"\1,", node["style"].rstrip(";"))
                local, parent = place(rect, home)
                vertex(key, label(node["title"], node["sub"], lines), style + ";html=1;whiteSpace=nowrap;"
                       f"labelPosition=center;verticalLabelPosition=bottom;align=center;verticalAlign=top;spacingTop=0;"
                       f"labelBackgroundColor=none;"
                       f"fontFamily=Helvetica;fontStyle=0;fontSize={title_size};fontColor={INK};", local, parent)
            else:
                rect = cell
                fill, stroke = STATUS[node["status"]]
                needed = 12 + 1.3 * (title_size * len(_wrap(node["title"], title_size, rect[2] - 12, True))
                                     + sub_size * len(_wrap(node["sub"] or "", sub_size, rect[2] - 12)) * bool(node["sub"]))
                if needed > rect[3]:
                    print(f"gridgram: text may overflow {key} ({needed:.0f} > {rect[3]})", file=sys.stderr)
                local, parent = place(rect, home)
                vertex(key, label(node["title"], node["sub"]),
                       f"rounded=1;absoluteArcSize=1;arcSize=12;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};"
                       f"strokeWidth=1.2;fontFamily=Helvetica;fontSize={title_size};fontColor={INK};spacing=6;"
                       f"verticalAlign={node['valign']};" + node["style"], local, parent)
            rects[key] = rect

        for arrow in self.arrows:
            (ex, ey), (nx, ny), heading = self._ports(rects[arrow["src"]], rects[arrow["dst"]])
            key = self._id("edge", arrow["src"].split("_", 1)[1] + "__" + arrow["dst"].split("_", 1)[1])

            # A vertical line clears the label under an icon, so it starts or ends below that label.

            exit_dy = below.get(arrow["src"], 0) if heading == "down" else 0
            entry_dy = below.get(arrow["dst"], 0) if heading == "up" else 0
            style = (f"edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor={INK};strokeWidth=1.2;"
                     f"endArrow=block;endFill=1;endSize=5;exitX={ex:.4g};exitY={ey:.4g};exitDx=0;exitDy={exit_dy};"
                     f"entryX={nx:.4g};entryY={ny:.4g};entryDx=0;entryDy={entry_dy};"
                     + ("exitPerimeter=0;" if exit_dy else "") + ("entryPerimeter=0;" if entry_dy else "")
                     + ("dashed=1;dashPattern=4 3;" if arrow["dashed"] else "")
                     + ("startArrow=block;startFill=1;startSize=5;" if arrow["both"] else ""))
            edge = ET.SubElement(root, "mxCell", id=key, value="", style=style, edge="1", parent="1",
                                 source=arrow["src"], target=arrow["dst"])
            ET.SubElement(edge, "mxGeometry", {"relative": "1", "as": "geometry"})

            # The label and the badge are children of the edge. They ride the arrow when a shape is dragged.

            if arrow["label"]:
                cell = ET.SubElement(root, "mxCell", id=key + "_label", value=html.escape(arrow["label"]), vertex="1",
                                     connectable="0", parent=key, style="edgeLabel;html=1;align=center;"
                                     f"verticalAlign=middle;resizable=0;points=[];fontFamily=Helvetica;"
                                     f"fontSize={sub_size};fontColor={MUTED};labelBackgroundColor=none;")

                # The offset is perpendicular to the edge and its sign follows the direction of travel.
                # The text sits above a horizontal line and to the right of a vertical one.

                lift = badge_size / 2 + sub_size * 0.7
                if heading in ("down", "up"):
                    lift = badge_size / 2 + 6 + len(arrow["label"]) * sub_size * 0.26
                lift *= 1 if heading in ("right", "down") else -1
                geometry = ET.SubElement(cell, "mxGeometry", {"x": f"{arrow['label_at']:g}", "y": f"{lift:g}",
                                                              "relative": "1", "as": "geometry"})
                ET.SubElement(geometry, "mxPoint", {"as": "offset"})
            if arrow["badge"] is not None:
                cell = ET.SubElement(root, "mxCell", id=key + "_badge", value=str(arrow["badge"]), vertex="1",
                                     connectable="0", parent=key, style=f"ellipse;html=1;aspect=fixed;resizable=0;"
                                     f"fillColor={INK};strokeColor=#FFFFFF;fontColor=#FFFFFF;fontFamily=Helvetica;"
                                     f"fontSize={sub_size};fontStyle=1;")
                geometry = ET.SubElement(cell, "mxGeometry", {"x": f"{arrow['at']:g}", "y": "0", "width": f"{badge_size}",
                                                              "height": f"{badge_size}", "relative": "1", "as": "geometry"})
                ET.SubElement(geometry, "mxPoint", {"x": f"{-badge_size / 2:g}", "y": f"{-badge_size / 2:g}", "as": "offset"})

        if self.legend_spec:
            statuses, badge = self.legend_spec
            nowrap = text.replace("whiteSpace=wrap;", "")
            x, y = MARGIN, self.bottom + 20
            for name, caption in statuses.items():
                fill, stroke = STATUS[name]
                vertex(self._id("legend", name), "", f"rounded=1;absoluteArcSize=1;arcSize=6;html=1;fillColor={fill};"
                       f"strokeColor={stroke};", (x, y + 4, 20, 12))
                w = len(caption) * sub_size * 0.52 + 8
                vertex(self._id("legend_text", name), html.escape(caption), nowrap + "align=left;verticalAlign=middle;"
                       f"fontSize={sub_size};fontColor={MUTED};", (x + 26, y, w, 20))
                x += 26 + w + 14
            if badge:
                vertex("legend_badge", "n", f"ellipse;html=1;aspect=fixed;fillColor={INK};strokeColor=#FFFFFF;"
                       f"fontColor=#FFFFFF;fontFamily=Helvetica;fontSize={sub_size};fontStyle=1;",
                       (x, y + 10 - badge_size / 2, badge_size, badge_size))
                vertex("legend_badge_text", html.escape(badge), nowrap + "align=left;verticalAlign=middle;"
                       f"fontSize={sub_size};fontColor={MUTED};", (x + badge_size + 6, y, len(badge) * sub_size * 0.52 + 8, 20))

        self.ids = taken
        ET.indent(mxfile, space="  ")
        return ET.tostring(mxfile, encoding="unicode")

    def save(self, path, force=False):
        """Refuses to replace a file that draw.io has saved, because it holds manual edits."""
        if os.path.exists(path) and not force:
            head = open(path, encoding="utf-8").read(400)
            if f'host="{HOST}"' not in head:
                sys.exit(f"gridgram: {path} was saved by draw.io. Edit its XML in place, or pass force=True.")
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(self.to_xml())
        return path


def render(drawio_path, png_path, scale=2):
    """PNG through draw.io's own viewer in headless Chromium. The XML never leaves the machine."""
    from playwright.sync_api import sync_playwright

    xml = open(drawio_path, encoding="utf-8").read()
    config = json.dumps({"xml": xml, "nav": False, "toolbar": None, "lightbox": False, "border": 10})
    with sync_playwright() as play:
        browser = play.chromium.launch()
        page = browser.new_page(device_scale_factor=scale, viewport={"width": 2000, "height": 1400})
        page.set_content(f'<html><body style="margin:0;background:#fff"><div id="host">'
                         f'</div><script src="{VIEWER}"></script></body></html>', wait_until="networkidle")
        if not page.evaluate("typeof GraphViewer !== 'undefined'"):
            sys.exit(f"gridgram: could not load {VIEWER}. Without network, export with the draw.io desktop CLI instead.")
        page.evaluate("""(config) => {
            const div = document.createElement('div');
            div.className = 'mxgraph';
            div.setAttribute('data-mxgraph', config);
            document.getElementById('host').appendChild(div);
            GraphViewer.processElements();
        }""", config)
        page.wait_for_selector(".mxgraph svg", state="attached", timeout=30000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(400)
        box = page.locator(".mxgraph").bounding_box()
        page.locator(".mxgraph").screenshot(path=png_path)
        browser.close()
    print(f"gridgram: {png_path} {int(box['width'] * scale)}x{int(box['height'] * scale)} px")
    return png_path


def shapes(query, must="", limit=8):
    """Official draw.io shapes whose title and tags hold every query word. The best title match comes first."""
    path = os.path.join(tempfile.gettempdir(), "gridgram-shape-index.json")
    if not os.path.exists(path):
        urllib.request.urlretrieve(SHAPES, path)
    words = query.lower().split()
    with open(path, encoding="utf-8") as handle:
        hits = [shape for shape in json.load(handle) if shape["type"] == "vertex" and must in shape["style"]
                and all(word in (shape["title"] + " " + shape["tags"]).lower() for word in words)]
    hits.sort(key=lambda shape: (sum(word not in shape["title"].lower() for word in words), len(shape["title"])))
    return hits[:limit]


def icons(cache_path, **wanted):
    """Resolves name="query | text the style must contain" or name="brand:claude" to (style, (w, h)).

    Results are kept in a JSON file beside the diagram script, so a later run needs no search and no network.
    """
    cache = {}
    if os.path.exists(cache_path):
        with open(cache_path, encoding="utf-8") as handle:
            cache = json.load(handle)
    for name, query in wanted.items():
        if cache.get(name, {}).get("query") == query:
            continue
        if query.startswith("brand:"):
            svg = None
            for variant in ("-color.svg", ".svg"):
                try:
                    svg = urllib.request.urlopen(BRANDS + query[6:].strip() + variant, timeout=30).read()
                    break
                except OSError:
                    continue
            if svg is None:
                sys.exit(f"gridgram: no brand logo named {query[6:]!r} in lobe-icons")
            style = "shape=image;imageAspect=0;aspect=fixed;image=data:image/svg+xml," + base64.b64encode(svg).decode()
            cache[name] = {"query": query, "style": style, "wh": [1, 1]}
        else:
            text, _, must = (part.strip() for part in query.partition("|"))
            hits = shapes(text, must)
            if not hits:
                sys.exit(f'gridgram: no draw.io shape for {query!r}. List candidates with: python3 gridgram.py shapes "{text}"')
            cache[name] = {"query": query, "style": hits[0]["style"], "wh": [hits[0]["w"], hits[0]["h"]]}
    with open(cache_path, "w", encoding="utf-8") as handle:
        json.dump(cache, handle, indent=1)
    return {name: (cache[name]["style"], tuple(cache[name]["wh"])) for name in wanted}


def selftest():
    d = Diagram(cols=[1, 1], rows=2, title="Selftest")
    d.header(0, "left")
    d.container(0, 0, "Outer", rowspan=2)
    d.container(0, 0, "Inner")
    a = d.box(0, 0, "A & <B>", "first\nsecond", "live")
    b = d.box(1, 0, "Tall", status="prop", rowspan=2)
    c = d.icon(0, 1, "Icon node", "shape=image;image=data:image/svg+xml;base64,AAAA;", wh=(2, 1))
    d.arrow(a, b, label="calls", badge=1)
    d.arrow(c, b, badge=2, dashed=True)
    d.legend({"live": "Live"}, badge="step")
    root = ET.fromstring(d.to_xml())
    cells = {cell.get("id"): cell for cell in root.iter("mxCell")}
    edges = [cell for cell in cells.values() if cell.get("edge")]
    assert len(edges) == 2 and all(e.get("source") in cells and e.get("target") in cells for e in edges)
    assert cells["group_inner"].get("parent") == "group_outer" and cells[a].get("parent") == "group_inner"
    assert cells[c].get("parent") == "group_outer" and cells[b].get("parent") == "1"
    assert ";base64" not in cells[c].get("style") and cells[c].find("mxGeometry").get("width") == "80"
    assert "exitY=0.5;" in cells["edge_icon_node_tall"].get("style"), "the line leaves the icon at its middle"
    print("gridgram: selftest ok,", len(cells), "cells")


if __name__ == "__main__":
    if sys.argv[1:2] == ["render"] and len(sys.argv) >= 4:
        render(sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 2)
    elif sys.argv[1:2] == ["shapes"] and len(sys.argv) >= 3:
        for hit in shapes(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else ""):
            print(f'{hit["title"][:40]:40} {hit["w"]:>4}x{hit["h"]:<4} ...{hit["style"][-90:]}')
    elif sys.argv[1:2] == ["selftest"]:
        selftest()
    else:
        sys.exit(__doc__)
```
<!-- gridgram:end -->