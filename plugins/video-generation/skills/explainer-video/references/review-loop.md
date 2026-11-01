# The review loop

How the blind reviews run, for every video of these plugins: the long explainer, the news video and every Short look
(explainer, sketch, story, cutout, particles, diagram). The checklists stay where they are (script-review.md,
claim-review.md, review.md); this file says how to run them so nothing slips through. Learned on the car engine video
of Ordinary Insides (2026-11-01): three reviewers found 46 real problems in a video whose checks were all clean.

## 1. Before the voice

Two `video-reviewer`s at the same time, each with no context of your work:
- the script review: script.json, facts.json, script-review.md and the profile's `review` rules;
- the claim review: script.json, facts.json and claim-review.md. It opens the sources.
A third fact reviewer when the profile says `"fact_reviewers": 2`. Fix the script and facts.json before the voice.

## 2. After the scenes: the stills review

1. Run the full `stills.mjs` of the video (and of each Short cut from it) first, so every reviewer gets the sheets
   of the current code.
2. Split the sheets: one reviewer per two or three chapters of a long video, one per Short. **List in each task
   the exact sheet paths and the scenes they hold**, and ask the reviewer to name any scene of its range it did not
   see. On the engine video two reviewers were given the sheets by number and both missed scenes at the edges of
   their range: hand the edge sheet to both neighbours.
3. Each reviewer gets: its sheet paths, script.json, facts.json, review.md, the look's section below, and the
   profile's `review` rules (the channel rule found real errors: a part drawn where it does not sit).
4. Look at every sheet yourself while they work. You see the shared problems (a model, a colour, a layout used by
   every scene) better than a reviewer of one range.

## 3. Sort the points

- **A shared part** (a 3D model in `_<model>.tsx`, `common.tsx`, a series `_shared.tsx`): you fix it yourself,
  once, before the fixers start, and tell them it changed. A fixer may not edit shared files, so a point sent to
  it comes back "could not fix".
- **A narration line** (a number that does not add up, a word that says more than its source, a word the picture
  contradicts: "both valves" on a four-valve engine): change the line, run the voice step (only that line is read
  again) and `align.py`, add or widen the claim in facts.json, then cut the Shorts again (`short.py ... --again`, then
  `align.py`) before any fixer starts: their cues are on the new words.
- **A scene**: group the points by scene file.

## 4. Fix

One fresh `scene-coder` per file with the brief, a note of what changed in shared parts and narration, its points
and the paths of its sheets; at most three at once. Never wake the agent that wrote the file (its cache is gone and
waking it re-sends everything). Each fixer checks its scenes with `scenes.sh`, in the Short too when the scene is in one.

## 5. Close the loop

Run `check.py` and the full `stills.mjs` again for the video and every Short, until 0 problems, 0 layout problems
and 0 dead stretches, and look at every sheet again: a fix can break a neighbour (on the engine video a coolant
added for one scene showed as teal walls in five others). If the fixes changed much, run one more reviewer on the
changed scenes only. In the report, list what the reviewers found, what you fixed and what you left and why.

## What a reviewer looks for in each look

Add the section of the look to the reviewer's task, beside review.md.

**Explainer (3D, pictures, clips, 2D).** A part shown where it does not sit; a part the voice names that a ghosted
or cut case hides; a flow in the wrong direction or that says something false (one gas colour per pipe); tags on
single items when the word is plural; a stroke or state dial that disagrees with the voice at that second; an AI
clip that shows something wrong (a car driving through a red light) or made-up text after a few seconds.

**Sketch (ink drawings that draw themselves).** A drawing that is done before the voice reaches it, or still
drawing after the voice moved on; a stroke that wanders or a part of an object missing (a tool with no handle); text
written where a drawing would do; a drawing with the wrong parts (memory: real objects drawn with their parts).

**Story (painted pictures, a case).** A picture held with only a slow camera; a face or hand melted; a picture that
shows more than the facts say (a weapon, a place, a person the sources do not name); in a real case, a picture that
looks like a real person or a real photograph; a fiction story told as real.

**Cutout (paper characters).** A character whose pieces do not join (a limb that floats or bends the wrong way); the
same character drawn two ways; a character that stands still while it speaks or is spoken about; a money or health
number on screen the voice does not say; a cast reused from another video.

**Particles (3D dot print, Cell to Cure).** Anatomy in the wrong place or with the wrong parts; particles that move
against the real flow (blood, a hormone, a drug); a drug shown to cure what it controls; a dot screen so dense the
shape is lost or so sparse it reads as noise; a person drawn in 3D (people are Codex pictures).

**Diagram (one engineering diagram, Signal Over Hype).** A box in the wrong place of the diagram for where it lives;
a packet moving the wrong way or between boxes that do not talk; a label that claims more than the source; a
diagram that changes layout between scenes so the viewer loses it; a page shown longer than as proof.

**News.** A page zoomed into and read; a page held over 3 seconds; an explanation that repeats the headline instead
of showing how it works; a date or number on screen the voice does not say.
