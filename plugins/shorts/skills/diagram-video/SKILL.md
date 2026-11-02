---
name: diagram-video
description: >
  Makes an upright (1080 x 1920) Short in the diagram look: one engineering diagram of the system the story is about,
  built up through the video and cut with line-drawn animations of the things it is about (the attack, the agent at
  work, the satellite), with its parts in boxes for where they live (a service, a machine, an account), cards
  with line icons, arrows that carry moving dots and labelled packets, a camera that pans and zooms over it, the spoken
  words popping in under it and a section heading on top. The house look of the Signal Over Hype Shorts (its profile
  says "short_look": "diagram"); also for any "how does this software, service or system work" story. For several
  Shorts, or a channel's Shorts, start with short-video.
---

# Diagram video

How a system works, shown as the diagram an engineer would draw on a whiteboard, and then run: a comment leaves
GitHub, passes the policy, becomes a ticket, wakes a worker in its own folder, and comes back as a pull request. One
diagram for the whole Short; each section lights up its part of it while the voice talks. 45 seconds to 2.5 minutes.

The finished example is `${CLAUDE_PLUGIN_ROOT}/examples/diagram/01-deepseek-superagent/` (Signal Over Hype, "DeepSeek's
Super-agent prototype", 1:17, approved by the user on 2026-10-31: "I really liked this"). **Read its `index.tsx`
fully before you draw**: the layout, the boxes, the routes and the camera keys are the reference. The look is
`src/kits/diagram.tsx`.

## What the user rejected on the way (do not repeat)

1. **Floating 3D props** (Codex product renders that drop, spin and act things out, with the pop-in words): liked
   at first, then "let's try another style".
2. **Dot-printed 3D and particles** (the Cell to Cure look moved to this channel): "I didn't like it".
3. **A diagram without boxes**: "you should separate things with boxes, to understand in which environment or which
   part these things live". One box around one moment is not enough: every part sits in the box of its place.
4. **Weird arrows**: long detours through other boxes, two arrows landing side by side on one card, small jogs, arrows
   through labels. Fixed by laying the diagram out again, not by bending the lines.
5. **Only diagrams** (2026-11-01, on the week-47 Shorts): "too much focus on the diagrams, we should have the diagrams
   to understand the overall thing but also we should show animations for the things we are talking about". The AI
   hackers Short showed cards lighting up and a grid of dots for "200 organizations" while the voice told of passwords
   tried on many logins; nothing showed a password being tried.

## Diagram for the map, animation for the thing

The diagram answers "where are we and what talks to what". The thing the voice describes is shown happening, as its
own animation:
- **The diagram** opens the Short (the overview), comes back for a second or two between sections to show where the
  next part sits, and closes it (the end map).
- **Each section has one or two action moments** (4 to 8 s each, about half of the section's time): the camera dives
  into the card the voice names and the stage becomes that thing at work. A password list tried on a login box, the
  lock icons turning red one by one; an agent's terminal typing commands, files opening; a satellite crossing the frame
  with its solar panels opening and a chip working inside; a model's text answer streaming in; a pull request getting
  its green check. Then the camera pulls back out into the diagram.
- **Drawn in the same look**: line drawings on the slate ground in the channel's colours (cyan lines, coral risk, white
  text), built in code like the cards and icons: screens, windows, forms, devices, a globe, a server rack. No Codex 3D
  renders and no particles (both rejected above), no AI pictures of real people, products or logos. Real footage only
  when it is official and the channel's rules allow it.
- **Show, then label**: the animation shows what happens; the words under it are the captions. At most one short mono
  label inside an action moment.

## Keep (the channel's identity, approved)

- The slate ground with its slow glow, signal lines and dust (`Ground`, painted by the board itself: a channel's
  `grounds` replace a look's `bg`).
- The spoken words popping in one by one under the diagram, at y 1240 (`DIAGRAM(hot, swaps)` makes the look; `hot`
  words big and bold, numbers cyan; `swaps` show a phrase shorter, "eighty percent" as "80%"). They are the captions.
- The section heading at the top, the whole scene (`Top`, through `sceneOf`): the key word and a mono line under it,
  "1 / IT LISTENS · ONE GITHUB REPOSITORY". The user asked for "subtitles at the top" and kept them.
- The channel's voice (Speechify dorian) and the pluck music bed.
- Real pages as proof (`Proof`, from `scripts/shots.mjs`): the channel shows every story's primary source with its
  date. Two to four per Short, about 2 to 3 seconds each, the claim marked.

## Rules

- **One diagram, many moments.** Every part of the system is a `Node` placed once in diagram space; the camera
  (`View` keys: time, x, y, zoom) moves to the part the voice names. Parts not yet explained are `ghost` cards (dashed,
  grey) from the hook's overview on, and switch on when their word is said.
- **Boxes by where things live.** Before any code, list the parts and the place of each from the facts (the docs
  say where a thing runs, who enforces a rule, which account a process uses). Then nest `Group`s: a service (GITHUB,
  CHAT APP), a person (OPERATOR), the machine (YOUR MACHINE), the runtime inside it (DEEPSEEK HARNESS), its folders
  (WORK FOLDERS · ONE PER TICKET). A box may change with the story: its colour and label (the machine turns coral
  "AS YOUR OS USER"; the runtime turns teal "AGENT'S OWN OS ACCOUNT").
- **Arrows**:
  - Straight or one or two elbows.
  - They start and end on a card's edge (a card is as wide as `120 + max(19.5 x label letters, 17 x sub letters)`, and
    120 tall, 150 with a sub line).
  - One arrow per side of a card. Two inputs come in from two sides, as the repository (left) and the chat app (right)
    into the policy.
  - A long route back (a worker's result to GitHub) runs outside the boxes, along the edge of the diagram.
  - No arrow passes through a card or a label. When one would, move the parts (a gate at the top centre of its box,
    the next part right under it), not the line.
- **Labels**: box labels in a corner no arrow crosses (`right`, `bottom`); a fact that belongs to a card goes in its sub
  line ("NO APPROVAL" on the shell), not in a label floating on a line. Line labels (`label` on `Edge`) only while their
  moment lasts (`labelAt`, `labelOut`).
- **Flows show what moves**: `Edge` `flow` (dots per second) once a link works, `dash` for polling, `Packet`s with a
  short mono text on the spoken word, `stop` for a refused one (it turns coral, crossed, and drops), `cut` for a link
  that is closed. Cards: `on` (cyan glow), `risk` (coral), `done` (white, a check badge), `off`, `Progress` for a worker.
- **Time is whole-video time.** `clock(script, timing)` gives `T0`, `line(scene, i)` and `W(scene, i, word)`; every
  event of the diagram is placed with them, so the diagram keeps its state across scenes. `sceneOf` makes each scene;
  `whooshes` puts a quiet whoosh before each camera move.
- **The stage** is y 400 to 1160 (between the heading and the words). Parts outside it fade and are not drawn. Keep the
  camera at zoom 0.6 or more whenever the viewer must read the cards; below 0.6 the cards keep only their icons and the
  packets become dots (the overview of the hook and the end map).
- **Something moves every second**: a card drawing in, a packet, a camera move, a badge, the action of an action
  moment. The camera holds on a part of the diagram no longer than one line.
- **Icons** are `Icon` names: user, cpu, hub, repo, chat, shield, ticket, folder, merge, monitor, terminal, home, key,
  clock, warning, flask, question, check, x. Add one in the kit (a 24 x 24 line drawing) when a part needs it; never a
  real logo.
- **The channel's rules bind** (src/channels/signal-over-hype.json): primary sources only, a company's claim said as its
  claim, the real page with its date, no AI pictures of real people, products or logos.

## The loop

1. Run `${CLAUDE_PLUGIN_ROOT}/scripts/video-plugin.sh` (it prints `<video plugin>`), read `<video plugin>/docs/pipeline.md`
   and `docs/tools.md`, run `<video plugin>/scripts/workspace.sh <workspace>`.
2. **Facts first**: one research agent reads the primary sources (the repository and its docs, the announcement, the
   paper) and returns each claim with its exact wording and URL, and where each part of the system runs. Write
   `script.json` (B1 English, 160 to 195 words a minute (the example: 251 words in 1:17), three or four numbered sections, a question for the comments at
   the end), `facts.json`, `references.md` with `<!-- scenes: ... -->`, `publish.json`, and the `"shots"` of the pages.
   Then the channel's reviewers (short-video, "Each Short", step 2).
3. `python3 scripts/new.py diagram <series>/<id> "<title>" --channel signal-over-hype`, then
   `npm run -s tts <series>/<id>`, `.venv/bin/python scripts/align.py <series>/<id>`, `node scripts/shots.mjs <series>/<id>`.
4. **Draw the diagram on paper first**: the boxes, the parts in them, the arrows and which side each enters, the
   order things light up. **Then list the action moments**: for each section, the line it sits on, the thing shown
   happening and the card it dives from. Then code it in `index.tsx` like the example: the positions as constants, the
   routes as point lists, one `Diagram` component, one component per action moment, the `VIEW` keys, one `sceneOf` per
   scene.
5. Look: `node scripts/stills.mjs <series>/<id>` and `scene:seconds` frames in the middle of each moment (the sheet's
   own frames fall where the camera is moving). Fix every arrow through a label, a card cut by the stage, a camera at
   zoom under 0.6 while the voice names a card. Expected and fine: "a line runs through text" for packets and line
   labels, and 20 to 30 words at once when many cards show.
6. `scripts/build.sh <series>/<id>` (check.py knows the type "diagram"), then pull a dozen frames from the finished file.

## Publish

As short-video says: `publish.json`, `references.md`, `publish.py`, `upload.py` (private).
