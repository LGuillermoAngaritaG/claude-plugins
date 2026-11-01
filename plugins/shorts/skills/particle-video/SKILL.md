---
name: particle-video
description: >
  Makes an upright (1080 x 1920) Short in the particle look: real 3D objects (organs, vessels, cells, pills, molecules)
  printed as a dot screen, glowing particles with depth (blood, hormones, drugs, calcium), a camera that always moves,
  a few mono labels and captions. People are Codex pictures, never 3D shapes. The house look of the Cell to Cure
  Shorts (its profile says "short_look": "particles"); also for any "how does X work inside the body" or other
  mechanism a viewer cannot see. For several Shorts, or a channel's Shorts, start with short-video.
---

# Particle video

The look of science Shorts made with code: a cut-open artery with blood streaming through it, an enzyme making a
hormone that squeezes the wall, a drug plugging the enzyme. Every object is a lit 3D shape printed as dots, every
moving thing is a particle, and the camera flies to what the voice names. 45 seconds to 2.5 minutes.

The finished example is `${CLAUDE_PLUGIN_ROOT}/examples/particles/01-bp-medicines/` (Cell to Cure, "How Daily Blood
Pressure Pills Work", 2:10, approved by the user on 2026-10-31: "it looks awesome"). **Read its `ace.tsx` first and
fully**: it is the reference scene every other scene was built to match. `plan.md` there is the plan the scene agents
got. Its pictures are not in the plugin.

## What the user rejected on the way (do not repeat)

1. **Flat 2D diagrams** (version 1: lines, polygons, a barcode of dashes for blood, labels everywhere): "the animations
   don't look good enough". Causes found: the main action was tiny and the background huge, the bottom half was empty,
   the blood read as a still stripe, everything was flat, up to 8 text items per frame, a camera that never moved.
2. **People built from 3D shapes** (a capsule body and a sphere head): "I don't like when you draw humans in 3D, we
   don't have good proportions like that". People are Codex pictures (below). Organs and objects in 3D are fine.
3. **No subtitles**: the user wants the captions kept (the look draws them). **No sound at all**: sometimes there must
   be sound effects.

## Rules

- **One big subject per moment**, 50 to 75% of the frame width. Pixels per world unit = 1920 / (2 * d * tan(fov / 2)),
  d the camera distance; work the framing out with it, then check stills.
- **Real 3D, printed in dots**: solids in `<World>` (lit from the upper left, a halftone pass), never flat drawings.
  Dark scenes read best; use the paper ground (`dark={false}`) only for a sheet or a chart.
- **Particles with depth** in `<Glow>` with `<Swarm>` (a soft dot plus a short streak, bigger when near): blood,
  hormone, salt and water, calcium, air. `size` is the dot's world diameter, 0.04 to 0.1. Under about 3000 per scene.
  On paper use `glow={false}` (additive light is invisible on paper).
- **The camera always moves**: 2 to 4 shots per scene joined by moves (`camAt` keys plus its float). Push in on the
  word that matters (the drug plugging the enzyme), pull back to show the result (the artery widening). Lay the objects
  of different shots far apart in the world so a move never flies through one, and nothing from another shot pokes in.
- **A section anchor in every scene** (the user, 2026-10-31: "something that keeps the key thing of what we are talking
  about" while the voice talks about that section): `<Anchor word="WATER PILLS" icon="drop" sub="1 / DIURETICS ·
  INDAPAMIDE" source="..." />` at the top, an icon and the key word on a band of the ground, there from the first frame
  of the scene to its last. Icons: pill, drop, heart, kidney, vessel, calendar (add one in the kit when a section needs
  it). The word is the section, not the line ("ACE INHIBITORS", "EVERY DAY"); the sub line holds its number and the
  names to remember. It replaces the Header and any drug chip; a giant faint word behind the action was tried and lost
  behind the 3D objects.
- **Few words**: the Anchor, at most 2 or 3 short mono labels pinned to objects with `project` (kept between x 220 and
  860 and below the anchor band, lower than y 420), the captions. `Big` only for a key idea or number the
  captions are not saying at that moment ("not a cure", "2 or more").
- **Distinct shapes for the actors**: a hormone is a chain of coral beads (`Beads`), a drug is a small blue capsule
  (`Pill`), a receptor is a cup (`Cup`), an enzyme is a ball with a notch (`Ball notch`), so the viewer can follow who
  blocks whom.
- **Colours**: blue = the medicine (BLUE solids, SKY particles), coral = what raises the risk, soft whites and pinks =
  the body; artery lining dark (`inner="#8a3a44"`) so the coral blood reads on it.
- **Pure functions of time** (`hash`, never `Math.random` or state). Each event lands on a spoken word (`said`);
  something new every 1 to 2 seconds.
- **Sound effects sometimes**: 2 to 4 per scene (pop, whoosh, sweep, tick, hit, chime) on the moments the picture
  changes, quiet (0.12 to 0.25). The engine adds the music bed.
- **Medical shapes right**: a kidney bean with the renal artery, renal vein and ureter at the inner dent (hilum),
  spindle-shaped smooth muscle cells, ACE turning angiotensin I into II, ARBs blocking the receptor. Ask a reviewer
  when unsure.

## People

```bash
scripts/cutout_draw.sh <series>/<id> <name> 3:4 person "<who, framing, pose>"     # 9:16 for a full standing body
.venv/bin/python scripts/cutout_prep.py <series>/<id> --gaps                         # clear ground and arm gaps
```

Look at `out/art/<series>/<id>/qa.png` (every picture on pink): no blue left between arms and body, pale clothes not
eaten. Then in the scene file, at the top: `preload(SRC, ...)` (a texture that arrives after a frame is drawn is
missing from it), and `<Cutout src={SRC} h={...} aspect={w / h from sprites.json} p={[x, y, z]} />` inside `<World>`.
Pictures are never mirrored or stretched. Waist-up people: hide the bottom edge at a frame edge or under a gradient.
Particles may flow over them (the body with glowing vessels, the cough's puff of air).

## The loop

1. Run `${CLAUDE_PLUGIN_ROOT}/scripts/video-plugin.sh` (it prints `<video plugin>`), read `<video plugin>/docs/pipeline.md`
   and `docs/tools.md`, run `<video plugin>/scripts/workspace.sh <workspace>`.
2. **Facts first.** One research agent checks every claim against the channel's allowed sources and returns the exact
   wording and URL of each; it also names the facts a short video must not get wrong. Write `script.json` (about 165
   words a minute; B1 English), `references.md` by chapter with `<!-- scenes: ... -->`, and `publish.json`. Then the
   channel's fact reviewers (Cell to Cure: two `video-reviewer`s, one with references.md and one blind) and apply their
   fixes: they changed "for life" claims, "family background" (to ethnic background and other conditions) and added
   "never stop without asking your doctor".
3. `python3 scripts/new.py particles <series>/<id> "<title>" --channel <channel>`, then
   `npm run -s tts <series>/<id> && .venv/bin/python scripts/align.py <series>/<id>`, and write the word times of
   each line to `words.txt` for the scene agents.
4. **Code the reference scene yourself** (the most important mechanism, like the example's `ace.tsx`), look at its
   stills and fix it until it is right. Then write `plan.md` (rules plus a section per scene file, as the example) and
   give the other scenes to three `scene-coder` agents in parallel, one file of about three scenes each, each told to
   read `plan.md`, the reference scene and `src/kits/particles.tsx`, to touch only its file, and to iterate on stills.
5. Look at every sheet yourself (`node scripts/stills.mjs <series>/<id>` plus `name:seconds` moments), send fixes back
   to the agent that wrote the scene, then `scripts/build.sh <series>/<id>` and pull a dozen frames from the finished
   file to confirm pictures and 3D are in every one.

## Known traps

- `stills.mjs` cannot see inside the 3D canvas: the layout check only covers the HTML text, and `World` leaves a
  marker so camera moves count as motion. Read the pictures yourself.
- An `Artery` window faces the camera (+z); blood particles in the Glow layer are not hidden by solids, so keep them
  inside the open window.
- A Swarm whose paths wrap around draws a streak across the frame at the wrap: hide the particle there (return null).
- Labels from `project` near the frame edge or the header: clamp them or pin them elsewhere.
- Render: several minutes for 2:10 on this Mac (GPU); the file is about 100 MB, too big to send to the phone.
