# The plan

`plan.md` sits beside `script.json`. The user reads it before anything is built, so it is short, concrete and complete:
every scene, every asset, every cost. Plain words, no jargon the user would not use. Fill this outline.

```markdown
# <Title>

**Viewer:** who it is for, what they know already.
**Length:** <minutes> (<words> words), landscape. **Voice:** Gemini, Charon, "<style>".
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
**To run them I need the notebook's URL and KEY** (or say "no clips" and I will use pictures with a slow camera).

## Short runs (to cut later, about a minute each)
| Short | Scenes | Words | Opens with | Ends on |
|---|---|---|---|---|

## Facts
<n> claims in facts.json; main sources: ... Anything not sourced is left out. The sources, readable and by chapter,
are in references.md, for the description.

## Cost
Voice about <n> US cents. GPU: none / <estimate>. Pictures: Codex (subscription).

## Open questions
Only what the user must decide; none if there are none.
```
