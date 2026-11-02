# The review loop

How the reviews run, for every video of these plugins: the long explainer, the news video and every Short look
(explainer, sketch, story, cutout, particles, diagram). The checklists stay where they are (script-review.md,
claim-review.md, review.md); this file says how to run them.

**Few passes, aimed where videos go wrong** (the user, 2026-11-01: "I don't want a lot of review passes ... just pay
attention to certain things in the videos where we need more focus, not on the entire video"). There is no blind
review of every sheet and no second review round. The facts are reviewed once before the voice; the pictures get one
focused check of the moments listed for the look below.

## 1. Before the voice

Two `video-reviewer`s at the same time, each with no context of your work:
- the script review: script.json, facts.json, script-review.md and the profile's `review` rules;
- the claim review: script.json, facts.json and claim-review.md. It opens the sources.
A third fact reviewer when the profile says `"fact_reviewers": 2`. Fix the script and facts.json before the voice.

## 2. The focus check (once, after the scenes)

1. Run `check.py` and the full `stills.mjs` and skim every sheet yourself for what breaks the whole video (a blank
   frame, text cut by the frame, a scene in the wrong place). This is a skim, not a review.
2. **List the focus moments** from the look's section below: in a long video about 10 to 15, in a Short 5 to 8. Each is
   `scene:second` and the one question it must pass ("do the gears mesh?", "is the liver where the liver is?").
3. Pull those frames at full size (`node scripts/stills.mjs <series>/<id> <scene>:<second> ...`) and look at each one
   against its question. Then give the same frames, their questions and the look's section to **one** fresh
   `video-reviewer` (no sheets, no other frames). One reviewer, one round.
4. Fix what you both found. A shared part (a 3D model in `_<model>.tsx`, a series `_shared.tsx`) you fix yourself,
   once. A narration line: change it, run the voice step and `align.py`, widen facts.json, cut the Shorts again
   (`short.py ... --again`, `align.py`) before scenes change. A scene: one fresh `scene-coder` per file with its points,
   at most three at once; never wake the agent that wrote it.
5. Run `check.py` and `stills.mjs` again and look again only at the frames that changed and their neighbours. No new
   reviewer. In the report, list the focus moments, what was found, what you fixed and what you left and why.
6. **Flicker, after the render** (any look with 3D or particles). Stills cannot show it, so the file check
   (`qc.py`, the last step of the build) looks at every frame of the finished file. For each "flicker" it reports,
   open its frames in `out/flicker/` and find the cause in "Flicker" of media.md. Fix it, render the part again and
   run `qc.py` until it reports no flicker. A video with flicker is not published or uploaded; the only exception is a
   flagged moment you looked at and can explain (fast motion the voice asks for), named in the report.

## Focus moments for each look

Add the section of the look to the reviewer's task, beside review.md.

**Explainer 3D (machines and objects).** Before any scene: render the model alone from the front, the side, the top
and three-quarter, beside a real photo or a manufacturer's cutaway of the device, and compare part by part. Then the
focus moments: the first full view of the model, every cut-open view, every moment a mechanism moves (gears, valves,
pistons, flow), every exploded view. Questions:
- Does every part touch what holds it (a shaft in its bearing, a gear on its axle, a board on its posts)? Nothing
  floats in the air.
- Does a striped, ribbed or toothed part turn fast enough to strobe (more than 9 stripes go past a point each second)?
- Do solids pass through each other? Two gears overlapping, a pipe through a casing, a coil through its frame.
- Do gears mesh: teeth of one in the gaps of the next, pitch circles touching, the turn speeds in the right ratio and
  opposite directions? Does the driving part (a rotor's pinion, a motor) actually touch the first gear?
- Does every pipe and wire run end to end, from one fitting to the next? A pipe that ends in the air is a mistake.
- Is the part where it sits in the real device, at the right size against the others?
- Does the flow go the real way, with one colour per state (hot gas, cold liquid) that matches the legend?
- Are glows, ghosts and helper shapes gone when they are not explaining something (an orange box left around a coil)?

**Explainer pictures, clips, 2D.** A tag on the wrong part; a stroke or dial that disagrees with the voice at that
second; an AI clip that shows something wrong or made-up text; a chart or card that is empty while the voice talks
about it.

**Sketch.** A drawing done before the voice reaches it or still drawing after; a real object missing a part; text where
a drawing would do.

**Story.** A picture held with only a slow camera; a melted face or hand; a picture that shows more than the facts say;
in a real case, a picture that looks like a real person or photograph.

**Cutout.** Each character's first appearance and each moment two characters share the frame; every card, chart or
number; every prop that acts. Questions: are there as many people as the story has (the customer and the baker, the
friend who asks)? Does any object have eyes or a mouth (it must not)? Is every card filled when the voice names it?
Does each character stay drawn the same way? Is anything over a face or cut by the frame?

**Particles (Cell to Cure).** Each organ, tissue and cell the first time it is shown, and each moment a drug, virus or
hormone acts. Questions: could a viewer name the organ or cell without the label? Is it where it is in the body and
does the zoom come from the body down? Are the round shapes smooth (no flat facets)? Does every shape stand for a real
thing, and is it the right thing (no box or slab standing in for a cell)? Do particles move the real way? Is a drug
shown as control, not cure? People are Codex pictures, never 3D.

**Diagram (Signal Over Hype).** The overview, the end map and each action moment. Questions: does each section show
the thing itself happening (the attack, the agent at work), not only cards lighting up? Is each box where the thing
lives? Do packets move the right way between parts that really talk? Is a page shown only as proof?

**News.** A page zoomed into and read; a page held over 3 seconds; an explanation that repeats the headline instead
of showing how it works; a date or number on screen the voice does not say.
