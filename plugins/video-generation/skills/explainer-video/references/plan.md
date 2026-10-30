# The plan

`plan.md` sits beside `script.json`. The user reads it before anything is built, so it is short, concrete and complete:
every scene, every asset, every cost. Plain words, no jargon the user would not use. Fill this outline.

```markdown
# <Title>

**Viewer:** who it is for, what they know already.
**Length:** <minutes> (<words> words), landscape. **Voice:** Phonon, <voice> at <speed>.
**The question it answers:** one sentence. **The payoff:** the last thing the viewer understands.

## Chapters

| # | Chapter | Its question | Scenes | Minutes |
|---|---|---|---|---|
| 1 | ... | ... | hook, parts | 1.5 |

## Scenes

### 1. <Chapter>
- **hook** (lines 1-2), tone "curious, a little amazed": <what is on screen>. Medium: 3D (pump model, camera glides
  in). Tags: Impeller, Volute.
- **parts** (lines 3-6): ... Medium: 2D (chart of ...). Picture: `warehouse` (... ).
- **fees** (lines 7-8): Part: Compare (two funds, bars for the fee, "Cheaper" wins on "less"). Things: props Coin, Bars.

For each scene, name a part when one fits the explaining move: Compare, Process, Timeline, BigNumber (a number,
then an everyday comparison), VideoMap (the map early on), Ask (the closing question); give its content and cue
words. A part does the layout, the timing and the motion, so the scene costs a few lines. Keep one or two hero scenes
per video hand-made, and never the same part in two scenes in a row.

## Pictures (Codex)
| Name | Shows | Used in |
|---|---|---|

## 3D models
| Model | What it is built from | Scenes |
|---|---|---|

## Colab clips
None. — or:
| Name | Starts from picture | Motion | Seconds | Why a clip and not 3D or a picture |
|---|---|---|---|---|
GPU estimate: <minutes> on an L4, about <n> compute units (from `ai-clips` references/models-and-prompting.md).
**They run on your Colab GPU:** I start the notebook in my browser when I can, else I need its URL and KEY (or say "no clips" and I will animate those moments in code).

## Short runs (to cut later, about a minute each)
| Short | Scenes | Words | Opens with | Ends on |
|---|---|---|---|---|

## Facts
<n> claims in facts.json; main sources: ... Anything not sourced is left out. The sources, readable and by chapter,
are in references.md, for the description.

## Cost
Voice: local, free. GPU: none / <estimate>. Pictures: Codex (subscription).

## Open questions
Only what the user must decide; none if there are none.
```
