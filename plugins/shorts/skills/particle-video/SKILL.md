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
4. **Bizarre shapes, organs missing** (2026-11-01, on the week-47 hepatitis B and cancer vaccine Shorts: "great! but
   they look a little bit bizarre ... we should pay more attention at the organs and things that are showed"). Seen:
   the liver never shown in a liver disease Short, the skin never shown in a melanoma Short; cells as lumpy balls with
   bits stuck on; faceted low-poly spheres; a brown slab and a grey wall that stood for nothing a viewer could name; an
   mRNA vaccine (a shot) drawn as a capsule; rows of balls for every number.

## The organ first, then inside it

Every Short about a disease or a drug shows **where in the body** it happens before it goes inside:
1. **The body**: the Codex person with the organ glowing in its real place (the liver under the right ribs, the skin
   of an arm, the kidneys at the back), or the organ alone in 3D.
2. **The organ** in 3D, its real shape and colour family, recognisable without a label: the liver's two lobes and its
   wedge shape, a kidney bean with the hilum, a heart with its chambers and great vessels, skin in its layers.
3. **The tissue or cell**, reached by a camera push from the organ (never a cut to a new world with nothing around it):
   liver cells in plates beside a blood channel, a skin layer with the tumour in it.
The camera comes back out to the organ or the body when the voice talks about the person again.

## Shapes a viewer can name

- **Use a real reference** for every organ, cell and particle before you build it: a textbook drawing or a micrograph
  from the channel's sources. Copy its outline and proportions. Ask yourself: could a viewer name it with the label
  hidden? If not, rebuild it.
- **Smooth surfaces**: spheres and organs with 64 segments or more (a faceted ball reads as a mistake), soft bumps
  built into the shape, not small balls stuck on it.
- **Each actor one clean form**: a virus is a smooth sphere with even surface proteins at the right spacing, a T cell a
  round cell with short folds, a cancer cell larger and irregular with a dark nucleus visible through a cut. Never a
  random cluster of lumps.
- **Nothing stands for nothing**: no slab, box or wall that is not a real thing. A surface the camera needs is a real
  tissue (a cell layer, a vessel wall).
- **The medicine in its real form**: a pill is a pill, a shot is a syringe and a vial, an infusion is a bag and a line.
  Check the label in the sources.
- **Numbers**: a trial result is a 100-person icon chart or a bar with its value, said by the voice; at most one such
  chart per Short. Never a grid of balls with no meaning.

## Cell to Cure (the channel this look is for)

- **Keep the channel's identity**: its voice comes from the profile (`new.py --channel cell-to-cure` copies it), the
  engine's music bed plays under it, the captions mark the spoken word in coral, the colours are the kit's (blue
  medicine, coral risk). Do not change these per video.
- **The profile's rules bind**: sources only from its list (WHO, CDC, NIH, NHS, NICE, Cochrane, peer-reviewed papers);
  every claim a viewer could act on shows its source on screen (the Anchor's source line); no promise of a cure
  ("control, not a cure"); anatomy right; two fact reviewers.
- **The shape that worked** (2:10, about 360 words): a hook on what the viewer already does ("millions take a pill
  every day"); what sets the thing (the levers); one numbered section per kind or step (1 / ... to 4 / ...), each with
  how it works, one name to remember, one common side effect; why it matters day to day; then who it fits, the
  closing line on screen ("Talk to your doctor before changing treatment") and one question for the comments.
- **Never advice to change treatment**: say "a doctor may switch you", never "switch"; anything about stopping says
  "never stop without asking your doctor".

## Rules

- **One big subject per moment**, 50 to 75% of the frame width. Pixels per world unit = 1920 / (2 * d * tan(fov / 2)),
  d the camera distance; work the framing out with it, then check stills.
- **Real 3D, printed in dots**: solids in `<World>` (lit from the upper left, a halftone pass), never flat drawings. The dots are 4.5 px (`World` default `cell`); the first three Cell to Cure Shorts used 9 px and the user found them "too grainy and pixelated" (2026-10-31). Do not raise `cell` again.
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
  of the scene to its last. Icons: pill, drop, heart, kidney, vessel, dna, calendar (add one in the kit when a section needs
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
- **No empty moment**: when a scene changes shot or object, the next one is in before the last leaves (a second of
  bare ground between the chart and the pills in the example's daily scene was the weakest moment).
- **Pure functions of time** (`hash`, never `Math.random` or state). Each event lands on a spoken word (`said`);
  something new every 1 to 2 seconds.
- **Sound effects sometimes**: 2 to 4 per scene from the sound library (`scripts/sfx.py find`; see Sound effects in the pipeline) on the moments the picture
  changes, quiet (0.12 to 0.25). The engine adds the music bed.
- **Medical shapes right**: a kidney bean with the renal artery, renal vein and ureter at the inner dent (hilum),
  spindle-shaped smooth muscle cells, ACE turning angiotensin I into II, ARBs blocking the receptor, the liver
  (hepatitis) and the skin (melanoma) shown where they are. The organ and cell shots are the focus moments of the
  review (review-loop.md, Particles).

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
4. **Build the organ and the main cell first** and look at each alone, beside its reference picture, until a viewer
   could name it. Then **code the reference scene yourself** (the most important mechanism, like the example's
   `ace.tsx`), look at its stills and fix it until it is right. Then write `plan.md` (rules plus a section per scene file, as the example) and
   give the other scenes to three `scene-coder` agents in parallel, one file of about three scenes each, each told to
   read `plan.md`, the reference scene and `src/kits/particles.tsx`, to touch only its file, and to iterate on stills.
5. Look at every sheet yourself (`node scripts/stills.mjs <series>/<id>` plus `name:seconds` moments), send fixes back
   to the agent that wrote the scene, then `scripts/build.sh <series>/<id>` and pull a dozen frames from the finished
   file to confirm pictures and 3D are in every one.

## Publish

`publish.json` (title, a 2 to 4 sentence intro that says "Not medical advice", tags) beside `script.json`;
`references.md` with "## To go deeper" and one "## <chapter>" per part, each with `<!-- scenes: ... -->`. Then
`python3 scripts/publish.py <series>` and `python3 scripts/upload.py <series>` (dry run), then `--execute`: always
private. To replace a video already up, move `videos/<series>/upload/` to `upload-old-<n>/`, run both again, and tell
the user to delete the old one in Studio (the uploader cannot delete). Captions (.srt) go up in Studio by hand.

## Known traps

- `stills.mjs` cannot see inside the 3D canvas: the layout check only covers the HTML text, and `World` leaves a
  marker so camera moves count as motion. Read the pictures yourself.
- An `Artery` window faces the camera (+z); blood particles in the Glow layer are not hidden by solids, so keep them
  inside the open window.
- A Swarm whose paths wrap around draws a streak across the frame at the wrap: hide the particle there (return null).
- A path helper (a point along a polyline at `u`) must clamp `u` to 0..1: a particle born before the scene starts has
  a negative `u`, reads past the start of the list and crashes the render at that scene's first frame. Stills at
  sampled moments can miss it; a full render cannot.
- Labels from `project` near the frame edge or the header: clamp them or pin them elsewhere.
- Render: several minutes for 2:10 on this Mac (GPU); the file is about 100 MB, too big to send to the phone.
