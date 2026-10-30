# Choosing and using a medium

## Which medium for which moment

| The moment shows | Medium | Why |
|---|---|---|
| How something works inside: a machine, a device, a vessel, a cell built from simple shapes | **3D in three.js** (`Stage`) | It can be cut open, parts light up when named, the camera moves on the words, it renders in seconds |
| An organ, a tissue, where something sits in the body | **Codex picture** (`Picture`) | Organs are soft shapes the 3D tools are not made for; a textbook picture is clearer |
| A process, a quantity, a comparison, an idea: interest growing, a dose, a ratio, a timeline | **2D in code** (`Svg2D`, `Counter`, `Bar`, `Label`, the kit's `Draw` and `Arrow`) | Exact, readable, moves step by step with the words |
| A calculation the viewer must follow: a loan, a budget, compound interest | **Worked example** (`Tex` on a white panel) | The viewer sees each number go where it goes |
| An idea with no object: a habit, a feeling, a loop of cause and effect | **2D loop or diagram**, or an **ink drawing that draws itself** (`Sketch`) | A loop shows a cycle better than words; a drawing that appears line by line holds the eye |
| A person in a situation, a moment of a day, the context of an idea | **AI clip** of that moment, or a **full-frame picture** (`FullPicture`) for at most 3 s with something drawn over it | It puts the viewer in the moment; a still picture held longer is a slideshow |
| A real-world example, a place, a person in a situation, the context of a fact | **Codex picture** (`Picture`) | One clear picture says "this is where it happens" faster than any words |
| Real motion that cannot be built in 3D or 2D: a crowd, traffic, weather, a person doing something, a place, the everyday thing a number is compared to | **AI clip from the Colab GPU** (`Clip`) | Brings life where a picture would stand still; costs GPU time (about 3 minutes a clip) and can melt faces; about one clip a minute of video (see AI clips) |
| The real thing the viewer should recognise: a real place or event, everyday life filmed, a game or film the video is about | **Real footage** (`Clip` of a piece from `footage.py`): stock, an official trailer, gameplay, a YouTube excerpt | It is the thing itself, not a picture of it; stock is free and fast, someone else's footage only when the video is about that work (see Real footage) |

Questions to choose by, in order:

1. What must the viewer understand at this second? Write it as one sentence.
2. Which medium shows that sentence with the fewest words on screen?
3. Is it accurate in that medium? (A Codex picture of a valve may put parts in the wrong place; a 3D model you build is
   exactly what you made.)
4. Does it repeat the last scene's medium and layout? Vary when you can, but never at the cost of clarity.

A recap is pictures and the model doing its job again, not a list.

## 3D in three.js (`src/kits/explainer.tsx`)

- `Stage pose={...}` holds a scene; `pose` is `[target x, y, z, azimuth, elevation, distance, fov]`. Move the camera with
  `glide(t, start, [[at, seconds, pose], ...])` and turn it slowly with `drift(pose, t, degreesPerSecond)`. Give it
  `lamps` near parts that sit in shadow, `sky` for a dark set (problem scenes read well on `K.dark`), `size` for the
  sun's shadow area in model units.
- Build machines from `Lathe` (a solid turned around the y axis from its outline: shafts, casings, cups, rings, pipes)
  and `Sweep` (a section swept around the axis whose shape changes with the angle: a spiral casing). Both cut open with
  `open` (0 closed, 1 a quarter removed), show their cut faces in `cap`, draw their edges, and fade with `ghost`.
  Corners are softened by `chamfer`. Plain three.js meshes work too (`boxGeometry`, `cylinderGeometry`, `tubeGeometry`).
- A part named by the voice glows: `glow={ACCENT} heat={flash(t, said(words, i, 'impeller')) * 0.8}`.
- Tags: `<Tags pose={pose} items={[{text: 'Impeller', at: [x, y, z], o: ease(t, said(words, 1, 'impeller'), 0.4)}, ...]} />`
  places the pills itself: beside the object, 110 px apart or more, lines that do not cross, inside the safe area and
  clear of a Short's captions and buttons. A point on a picture or a 2D drawing is `to: [x, y]`. With a moving camera
  give each tag its `side`. `Tag` with a `pin` places one pill by hand, only where Tags cannot. Tag only a part whose name is new and that the viewer could not pick out alone; at most three tags at once. A part
  the viewer can already see is named by the voice and glows or moves on its word.
- Flow: drops (`sphereGeometry` meshes) moving along a path that is a pure function of time, coloured with `heatColor`
  and explained by a `Legend`. Things that keep turning across scenes take their angle from `timeline(...).turn(...)`.
- A second small view: `Inset` with its own `Stage w={...} h={...}`.
- The scene must be a pure function of `t`: no state, no random. Use `hash(k, salt)`.
- Look at one frame in the middle of every camera move: models clip the camera, tags drift off parts.

Reference: the `pump-turbine` series in the owner's workspace (`src/videos/pump-turbine/`) builds an end-suction pump,
water, cavitation bubbles, a vortex rope and stall cells this way, landscape and upright.

## Editing moves

An explainer has no cuts between cameras, so the camera and the media do that work. Each move marks a point; a move
that marks nothing is decoration.

- **Cut in, cut back:** on the word that matters, glide in to the detail (the eye, a vane edge), then back to the whole
  when the voice moves on.
- **Push in** on a reveal, **pull out** to show where a part sits in the whole, **pan** to follow the water.
- **B-roll:** a picture or clip held while the voice gives detail about it, then gone at the next line.
- **Pattern interrupt** between chapters: a change of set (light to dark for the problems), of medium, or of scale.

## Pictures

`images` in `script.json`, drawn by `scripts/art.py` in the clean textbook style of the explainer type (white ground,
no text). One subject per picture, named plainly; real objects with their real parts. Show with
`<Picture art={art.name} x y size o label="Two words" />`. In upright videos a 560 to 600 px picture above the main
object works; in landscape, 400 to 560 px beside it. A picture enters when the voice names its subject and leaves at the
next line. A picture is not motion: beside a moving 3D or 2D view it is fine, but on its own it gets something that
moves over it within 3 seconds (an arrow that draws, a path, a highlight that travels), or it becomes a clip's start
frame. Use pictures in place of words: a small picture says "bacteria", "a dentist", "a bus" better than the word.

## AI clips (Colab GPU)

The user wants more AI video in the channel videos: plan **about one clip a minute, 8 to 12 in a long video, at least
one in every chapter**, and give each a job:

- **The hook**: the first frame is a clip of the real thing in motion (the pump hall, the dentist's chair, the
  trading floor), so the silent preview already moves.
- **A chapter's opening**, under the line that joins it to the last one: the new place or situation, in motion.
- **Every everyday comparison**: the houses the plant could power, a bus in a jam, a glass of sugary drink. The
  comparison lands faster when the viewer sees it.
- **Real-world context**: the machine at work, a person in the situation, the place where it happens.
- **The first scene of each Short run**: a clip fills the upright frame and moves from its first frame.

A clip never carries what must be exact: parts, numbers, anatomy, a real product, logo or person stay in 3D, 2D or a
checked picture, and code draws over a clip what the voice names in it (an arrow, a path, a part that lights up).
A clip is about 7 seconds (6 to 8: long enough to hold a moment, short enough for the L4's memory). A 5 second clip
took about 3 minutes of L4 time; plan about 4 for 7 seconds (not measured yet). A long video's clips take under an
hour of GPU, which costs cents (`ai-clips`, `models-and-prompting.md`). Each clip is a line in the plan's clip table with what it
explains.

For real motion only. In `script.json`: `"clips": {"crowd": {"image": "market", "motion": "People walk past, the camera
stays still.", "seconds": 7}}` (the picture comes from `images` first). The `ai-clips` skill runs them after the user
approves the plan and its cost. Place them with `<Clip src="art/<series>/<id>/clips/crowd.mp4" />`. Check six large
frames of every clip (`scripts/frames.py`); redo melted hands, faces or objects. A clip with a realistic person carries
the AI mark (`AiMark` from `src/kits/ad.tsx`).

## Real footage

Filmed footage brings what an AI clip only imitates: the real place, the real game, the real event. Mix it with the
clips, the 3D and the drawings; in a Short, two or three pieces of footage often carry the moments a picture would
hold still. `scripts/footage.py` brings each piece in: it cuts the seconds you use, removes the sound (the video keeps
only its own voice and effects), crops it to the frame and records where it came from in `footage.json`, so
`publish.py` credits it and `check.py` refuses any piece that did not come in that way.

- **Stock** (Pexels, Pixabay): search in the video's shape, look at the thumbnails it saves, take one. Search for
  the exact moment the voice describes ("a nurse checks a drip bag"), not the topic ("hospital"): a generic stock
  shot that explains nothing is the slop the review looks for. Stock never shows a brand, logo or recognisable
  person in a way that says they back the video.
- **Someone else's work** (a trailer, gameplay, any YouTube video): only in a video about that work (the news about
  a game, how a film was made, a review), from its official store page or channel when there is one (`search steam
  <appid>` lists a game's trailers), at most 8 seconds a piece, with the voice explaining and code drawing over it.
  Never as the whole picture of a scene for its full length, never a film's or game's music. Content ID can still
  claim the video, and a takedown is a strike on the channel: keep the excerpts short and few.
  An age-restricted YouTube video cannot be fetched (it needs a signed-in browser, which the tool never uses): take
  another one, or the store page's trailer.
- Look at six frames of every piece (`scripts/frames.py`), as for an AI clip: a logo, a watermark, a face that should
  not be there or text that tells a different story means another piece.
- In a scene: `<Clip src="art/<series>/<id>/footage/<name>.mp4" />` (sketch and story kits import `Clip` from
  `src/kits/ad.tsx`). A piece is only as long as it was cut: a scene longer than the piece needs a second one.

## 2D in code

`Svg2D` gives an SVG the size of the frame; inside it, the kit's `Draw` (a path that draws itself as `p` goes 0 to 1)
and `Arrow`. `Counter` counts a number up, `Bar` fills, `Label` places a word. Charts are drawn from data in the code;
an illustration of a typical shape says so on screen ("illustration: the usual shape"). Panels behind 2D are white
(`rgba(255,255,255,.95)`, radius 30) or dark (`rgba(14,18,24,.88)`) with enough room: measure the chart before you size
the panel.

## Worked examples

For money and anything with a calculation. One equation builds term by term on a white panel, each term appearing
when the voice says it; one equation on screen at a time; every number on it is said in the scene (`stills.mjs`
reports one that is not). Use the math kit's `Tex` in the ink colour, sized to the panel you measured:

```tsx
import {Tex, col} from '../../../kit';
<Tex x={380} y={60} size={56} color={K.ink} tex={`1000 \\times ${col(K.green, '0.05')}`} />
```

`col` and `op` of `src/kit.tsx` colour or fade one part. The result is said and shown last. Say which currency a
money example uses.

## Ideas, not objects

Psychology, habits, philosophy: there is nothing to cut open, so the risk is stock pictures that explain nothing.

- A loop or a cause and effect: 2D in `Svg2D` (`Draw`, `Arrow`), each step drawn on its word.
- A thing or a scene that stands for the idea (an hourglass, a desk at night): an ink drawing that draws itself. Add
  `"sketch": true` to the picture in `images`; `art.py` then draws it as ink and traces its strokes. Show it with the
  sketch kit's `Sketch` inside `Svg2D`: `<Sketch art={art.desk} x={480} y={500} w={560} p={ease(t, b[0], 3)} />`.
- A person in a situation: `FullPicture` with a slow camera (`p={t / dur}`), drawn as a full scene: `"scene": true` in
  `images` (wide, no white margin; `"ar": "9:16"` for a Short's own picture). Faces calm, hands out of view where they can.
  The start picture of a clip is drawn the same way.
- A quote: the words on a white card in the reader's voice, the author and the work under it, never more than two
  lines. Find it in the original text first (`script-review.md`).

## Sources on screen

For a claim a viewer could act on (a treatment, a dose, a rate), show where it comes from while the voice says it:
`<Source o={span(t, b[2], b[3])}>Source: WHO, 2024</Source>`. Give the claim its `"date"` in `facts.json`, so the
year is not reported as an unsaid number.

## Captions

Only the upright Shorts show captions. The long landscape video has none on screen (the user's rule); its subtitle
file (`scripts/srt.py`) goes to YouTube as closed captions. In a Short the captions follow the voice word by word, two
or three big words, the word being said in the caption colour. They show the script's words exactly, so write a term as the viewer should read
it ("HA", not "H A"): if the voice says it wrong, reword the line, never spell it for the ear.

## Shapes

The long video is landscape. The scenes of the three Short runs also play in the upright frame (`scripts/short.py`), so
they read `const tall = useTall();` and choose their layout from it:

- **Landscape** (1920 x 1080): no captions; panels, charts and pictures take one side, the 3D the other. Text between
  x = 90 and 1830, y = 50 and 1050.
- **Upright** (1080 x 1920): text between y = 220 and 1340 and x = 70 and 1010; the captions own y 1380 to 1500. Below
  y = 840 keep text left of x = 900 (TikTok and Reels buttons). The main object sits in the lower half, a picture or
  panel above it (a 560 to 600 px picture at x = 240). Cameras stand further back and see a machine more from its ends.
- Write both sets side by side: `pose = tall ? TALL_V : WIDE_V` (Tags place themselves for each shape),
  `<Picture x={tall ? 240 : 130} y={tall ? 240 : 150} size={tall ? 600 : 560} .../>`. 2D drawn in `Svg2D` places its
  parts from `useFrame()`.
- After cutting a Short, look at its stills, fix what does not fit in the long video's scene, then look at both again.
