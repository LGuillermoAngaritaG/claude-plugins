# Builder brief (fill the angle brackets; one per Short of a batch)

Give each approved Short to one builder (`subagent_type: "video-builder"`) with this brief and its block of
ideas.md at the end. A Short is small enough for one builder from script to stills; the scene code goes to one
`scene-coder` in the explainer look, so the builder's own context stays small. Builders work alone: they do not ask
the user anything; they decide and report.

```markdown
# Brief: build one Short of <series>

You own ONE Short, <series>/<id>, up to (not including) the render. Other builders work on other Shorts on this Mac
at the same time. The user approved your idea; there is no other stop for the user.

Workspace: <workspace> (run every command from there). Video plugin (read only): <video plugin>. Shorts plugin
(read only): <shorts plugin>. Your working files (briefs for your helpers, notes): <scratchpad>/<series>/<id>/ only.

## Read first
- <shorts plugin>/skills/short-video/SKILL.md: the rules, and "Each Short" is your loop
- <video plugin>/docs/pipeline.md and <video plugin>/docs/tools.md
- your look: <explainer: <video plugin>/skills/explainer-video/references/ media.md, scene-agents.md,
  script-review.md, claim-review.md, review.md | sketch: <shorts plugin>/skills/sketch-video/SKILL.md and
  <shorts plugin>/examples/body/01-heartbeat/ | story: <shorts plugin>/skills/story-video/SKILL.md and
  <shorts plugin>/examples/crime/01-last-train/>
- the channel profile src/channels/<channel>.json: its voice, sources, fact reviewers and review rules bind you
- your idea: its block in src/videos/<series>/ideas.md (below)

## Steps ("Each Short" in SKILL.md, steps 1 to 6)
1. new.py, then the script and its sources (facts.json, references.md).
2. Blind script review (`video-reviewer`) and, at the same time, the claim review (`video-reviewer` with only
   script.json, facts.json and claim-review.md); the second fact reviewer if the profile says "fact_reviewers": 2.
3. Voice, align.py, check.py: about the length ideas.md planned (45 s to 2.5 min), and for a channel explainer the hook, ending and pace, before step 4.
4. Pictures (art.py; look at each one), the clips the main session made for you, 3D, and the real footage of your
   idea through scripts/footage.py (media.md, "Real footage"; six frames of each piece with frames.py).
5. Scenes (explainer: one `scene-coder`; sketch and story: yourself, as their skill says).
6. check.py at 0 problems, stills.mjs, every sheet read (the first tile is the first frame), then a blind anti-slop
   review (`video-reviewer` with the sheets, review.md and the profile's review rules). Fix every real problem.
7. publish.json (title, intro, tags).
8. Stop before rendering: never run build.sh or render.mjs.
<clips, if any: "The main session made your clips: <names and paths>. Use them with <Clip src=...>; if one is
missing, animate that moment in code and say so.">

## Rules
- Touch only src/videos/<series>/<id>/, public/art/<series>/<id>/ and public/audio/<series>/<id>/. Never a plugin,
  the engine, another Short or the profiles; a part the kit lacks goes in your Short's own files, and you say so.
- No commits, no emojis.

## Report (short, plain)
The id and its length with pauses; one line per scene (what is on screen, why); what the reviewers found, what you
fixed and what you left (and why); claims you could not confirm; the two or three moments you are least sure of.
```
