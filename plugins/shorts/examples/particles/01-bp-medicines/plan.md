# Rebuild in 3D: scene plan

The first version (a.tsx, b.tsx, c.tsx: flat 2D canvas) looked like a textbook. The user asked for clearer, higher
quality animation. Every scene is rebuilt on kits/particles.tsx: real 3D objects printed as a dot screen, glowing particles with
depth, a moving camera. **ace.tsx (the ACE scene) is the finished reference: read it fully first and match its quality.**

## Rules (all scenes)
- Solids in `<World cam={cam} dark?>`; particles in `<Glow cam={cam}>` with `<Swarm>`; HTML text after them.
  On paper scenes use `<World dark={false}>` and `<Swarm glow={false}>` (additive glow is invisible on paper).
  Keep the `<Ground>` wrapper from kits/particles.tsx as the outer element.
- **One big subject per moment**, 50 to 75% of the frame width. Framing: pixels per world unit =
  1920 / (2 * d * tan(fov / 2)), with d the camera distance. Everything that matters sits between y 380 and y 1360
  (header above, captions at 1380..1520 below). Check with stills, then adjust.
- **The camera always moves** (`camAt` keys plus its float). 2 to 4 shots per scene, joined by moves (push in on the
  word that matters, pull back to show the result). Lay out the objects of different shots apart in the world so the
  camera does not fly through one object on its way to another, and nothing from another shot pokes into frame.
- **Few words on screen**: the Header (with SOURCE), at most 2 or 3 short mono labels pinned to objects with `project`,
  and the drug chip. No `Big` word unless it is a key idea not said at that moment by the captions (most scenes: none).
- Colours: medicine = BLUE (solids) / SKY (particles); what raises pressure = CORAL; body tissue = soft whites and
  pinks; artery lining dark (`inner="#8a3a44"`) so the CORAL blood reads on it.
- Particles: total n under about 3000 per scene; `size` 0.04 to 0.1. Pure functions of time only (`hash`, no
  Math.random, no state).
- Each event lands on a spoken word (`said`). Something new every 1 to 2 s.
- Sounds: keep 2 to 4 per scene (pop, whoosh, sweep, tick, hit, chime) on the moments the picture changes.
- Export `scenes` and `sounds` exactly as before (indeace.tsx reads them).
- Medical shapes must be right: kidney bean with the ureter and renal vessels at the inner dent (hilum); smooth muscle
  cells are spindles; ARBs block receptors; calcium channel blockers keep calcium out of the muscle cells.

## a.tsx: hook, levers, end
- **hook (dark)**: frame 0 already shows a big Pill tumbling (camera close, slow orbit). On "every day": camera pulls
  back, seven small pills appear in a row/arc, one per day (mono MON..SUN under them via `project`, tick sound).
  Line 1: the big pill dissolves into SKY particles (Swarm from its surface outward) while the camera pulls back to a
  large Person (s about 3 to 4, soft white-blue): the particles stream along branching vessel curves through the body
  (arms, legs, head) as glowing streaks.
- **levers (paper)**: a large cut-open `Artery` (dark={false}, light wall, coral blood Swarm glow={false}) with an
  outward push shown by the wall breathing. "heart": camera moves to a `Heart` at the artery's left end, pumping,
  flow speeds up. "fluid": more blood particles appear (fade in more of the n). "narrower": the artery r shrinks
  (squeeze), then eases back. Line 2: camera pulls back and up; four HTML chips (DIURETIC, ACE INHIBITOR, ARB,
  CALCIUM BLOCKER) in a 2 x 2 grid at y about 1180..1290, each with a thin SVG line to the object it acts on
  (DIURETIC to the blood/fluid, the other three to the artery wall), drawn on "one of those".
- **end (dark)**: three Person figures of different heights and colours, camera orbits slowly; chips AGE, ETHNIC
  BACKGROUND, OTHER CONDITIONS pinned under them via `project` on their words. "Talk": the bordered HTML panel
  TALK TO YOUR DOCTOR / BEFORE CHANGING TREATMENT. "Did": four 3D pills of the four kinds (different colour pairs)
  orbit in the middle; Big "your pill?" may be used here; mono TELL US IN THE COMMENTS.

## b.tsx: water, arb (drop ace from b.tsx: ace.tsx owns it)
- **water (dark)**: a large 3D `Kidney` (hilum facing the artery side), a renal artery `Pipe` into the hilum from a
  big vertical/side `Artery` or Pipe, and the ureter `Pipe` leaving the hilum downward. Blood Swarm flows in through
  the renal artery and fans inside the kidney. "get rid": white salt dots and SKY water dots stream down the ureter
  (rate rising). Line 2 "Less fluid": camera moves to the main artery (cut open): fewer blood particles (fade part of
  n), the vessel looks emptier. Chip DIURETIC + mono e.g. INDAPAMIDE at the start.
- **arb (dark)**: camera close on a slab of artery wall (a thick boxGeometry or a big flattened Artery) with 6 or 7
  `Cup` receptors on its top. CORAL `Beads` hormone chains fall and settle into cups ("still made"), the wall
  contracts a little. "blocks": blue `Pill` drug molecules drop into every cup first; later hormone chains bounce off
  and drift away. Line 2: HTML: chips ACE INHIBITOR and ARB with an arrow labelled IF COUGH on "switch", then a "+"
  between them crossed out in CORAL with NOT BOTH on "combine". Chip ARB + mono -SARTAN · LOSARTAN at the start.

## c.tsx: calcium, beta, daily
- **calcium (paper)**: a big `Spindle` smooth muscle cell (dark={false}) with 5 or 6 small channel pores on its
  surface (small dark Ball or ring meshes). CORAL calcium Swarm (glow={false}) streams into the pores; the cell
  squeezes (`squeeze` up) on "squeeze". "keeps": small BLUE `Pill`s fly in and plug every pore; calcium bounces off and
  drifts; the cell relaxes. Then the camera pulls back to an `Artery` (paper) that widens on "widens". Mono SOME
  PEOPLE: SWOLLEN ANKLES on "swollen". Chip CALCIUM CHANNEL BLOCKER + mono AMLODIPINE.
- **beta (dark)**: a large `Heart` beating (`beat`), the beat slowing from the word "slow" on; a SKY heartbeat trace
  (Swarm along a scrolling ECG curve in 3D, or HTML SVG) under it; chip BETA BLOCKER + mono -OLOL; mono UK
  GUIDELINES: USUALLY LATER on "UK".
- **daily (paper)**: keep the chart idea of the current c.tsx daily (it reads well), but put it in the World: 3D Pills
  drop onto the day marks as each dose is taken (the missing third dose is a grey pill that fades away), the effect
  line and the coral pressure line can stay as HTML SVG over the World. Keep NEVER STOP WITHOUT ASKING YOUR DOCTOR, Big
  "not a cure" and Big "2 or more" with two 3D pills sliding together.
