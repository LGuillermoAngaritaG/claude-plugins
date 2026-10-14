// Contact sheets of stills, to check a video without rendering it.
// Usage: node scripts/stills.mjs <series/id> [what ...]
//   (nothing)        one frame per narration line, taken just before the next line starts -> <id>-N.png
//   <scene>          eight frames spread over that scene, to see how it moves             -> <id>-<what>-N.png
//   <scene>:<sec>    one moment, in seconds since the scene started (alone, it comes at full size)
//   @<sec>           one moment, in seconds since the video started
// Each tile has its scene and the second in a corner. After each sheet come the layout problems
// of its frames (text on text, a line through text, text cut by the canvas or outside the safe area,
// tiny or dimmed text) and, in a full run, the stretches where the viewer has nothing to watch.
import {renderStill} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync} from 'node:fs';
import {dirname} from 'node:path';
import {open, scenesOf} from './lib.mjs';

const [video, ...args] = process.argv.slice(2);
if (!video?.includes('/')) throw new Error('usage: node scripts/stills.mjs <series/id> [scene | scene:seconds | @seconds ...]');
const scenes = scenesOf(video);
const at = (s, sec) => {
  const f = Math.min(s.n - 1, Math.max(0, Math.round(sec * 30)));
  return {frame: s.start + f, label: `${s.id} ${(f / 30).toFixed(1)}s`};
};
const picks = args.flatMap((a) => {
  const [id, sec] = a.split(':');
  const f = a[0] === '@' ? Math.round(Number(a.slice(1)) * 30) : null; // a moment of the whole video, as a frame
  const s = f === null ? scenes.find((x) => x.id === id) : scenes.find((x) => f < x.start + x.n);
  if (!s) throw new Error(`"${a}" is not a moment of this video or one of its scenes: ${scenes.map((x) => x.id).join(', ')}`);
  if (f !== null) return [at(s, (f - s.start) / 30)];
  return sec === undefined ? Array.from({length: 8}, (_, i) => at(s, ((i + 0.5) * s.n) / 240)) : [at(s, Number(sec))];
});
const shots = picks.length ? picks : scenes.flatMap((s) => [...s.b.slice(1).map((t) => at(s, t - 0.15)), at(s, s.n / 30 - 0.5)]);
const name = `out/stills/${video}${picks.length ? `-${args.join('+').replace(/[^\w+.-]/g, '-').slice(0, 40)}` : ''}`;
// A page under load now and then fails to open: one more try settles it.
const still = (o) => renderStill(o).catch(() => renderStill(o));

// A text box is as tall as its line, which is taller than the ink: `cut` takes that slack off.
const cut = (b, k) => ({...b, y0: b.y0 + b.size * k, y1: b.y1 - b.size * k});
const meet = (a, b, gap) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > gap && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > gap;
// Without a look (the math videos) the canvas is 1920 x 1080 and the heading line may sit above the safe area.
const problems = (boxes, look) => {
  const found = [];
  const {w, h, safe: [x0, y0, x1, y1], minText} = look.safe ? look : {w: 1920, h: 1080, safe: [80, 160, 1840, 1050], minText: 28};
  for (const [i, a] of boxes.entries()) {
    const ink = cut(a, 0.12);
    const head = !look.safe && ink.y1 <= 150 && ink.y0 >= 40;
    if (ink.x0 < 0 || ink.x1 > w || ink.y0 < 0 || ink.y1 > h) found.push(`cut by the canvas: "${a.text}"`);
    else if (ink.x0 < x0 || ink.x1 > x1 || ink.y1 > y1 || (ink.y0 < y0 && !head)) found.push(`outside the safe area: "${a.text}"`);
    if (a.struck) found.push(`a line runs through text: "${a.text}"`);
    if (a.size < minText) found.push(`${Math.round(a.size)} px text, the smallest that reads is ${minText}: "${a.text}"`);
    else if (a.small < minText * 0.78) found.push(`has ${Math.round(a.small)} px parts (a small \\frac? use \\dfrac, a/b or a bigger size): "${a.text}"`);
    if (a.o < 0.4 && !picks.length) found.push(`dimmed to ${a.o.toFixed(2)}, hard to read: "${a.text}"`);
    for (const b of boxes.slice(i + 1)) {
      if (meet(ink, cut(b, 0.12), 3)) found.push(`text on text: "${a.text}" and "${b.text}"`);
      else if (meet(cut(a, 0.06), cut(b, 0.06), 2)) found.push(`text too close to text: "${a.text}" and "${b.text}"`);
    }
  }
  return found;
};

// Remotion echoes everything the page logs, as lines that start with the tab. This keeps them out of the terminal.
for (const stream of [process.stdout, process.stderr]) {
  const write = stream.write.bind(stream);
  stream.write = (chunk, ...rest) => String(chunk).includes('[Tab ') || write(chunk, ...rest);
}

mkdirSync(dirname(name), {recursive: true});
const {serveUrl, composition} = await open(video);
const cols = composition.width > composition.height ? 2 : 4; // an upright video gets four tiles a row
const all = new Set(); // every distinct problem of the run
let dead = []; // stretches with nothing to watch, from the scan that runs with the first still
for (let sheet = 0; sheet * 8 < shots.length; sheet++) {
  const part = shots.slice(sheet * 8, sheet * 8 + 8);
  const tmp = part.map((_, i) => `${name}-tmp-${i}.png`);
  const seen = new Map(); // problem -> the tiles that show it
  for (const [i, {frame, label}] of part.entries()) {
    let boxes = [];
    let look = {};
    const onBrowserLog = ({text}) => {
      if (!text.startsWith('BOXES ')) return;
      const log = JSON.parse(text.slice(6));
      boxes = log.out;
      look = log;
      if (!picks.length && !sheet && !i) dead = log.scan;
    };
    await still({composition, serveUrl, output: tmp[i], frame, scale: shots.length > 1 ? 0.5 : 1, inputProps: {label, boxes: true, scan: !picks.length && !sheet && !i}, onBrowserLog});
    for (const p of problems(boxes, look)) seen.set(p, [...(seen.get(p) ?? []), label]);
  }
  const out = `${name}-${sheet}.png`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${name}-tmp-%d.png`, '-frames:v', '1', '-vf', `tile=${Math.min(cols, part.length)}x${Math.ceil(part.length / cols)}:nb_frames=${part.length}`, out]);
  tmp.forEach((f) => rmSync(f));
  console.log(`${out}: ${part.map((s) => s.label).join(' | ')}`);
  for (const [p, labels] of seen) {
    const first = labels.filter((l, k) => labels.findIndex((m) => m.split(' ')[0] === l.split(' ')[0]) === k); // one tile per scene
    console.log(`  ${p}  (${first.join(', ')}${labels.length > first.length ? `, and ${labels.length - first.length} more` : ''})`);
  }
  seen.forEach((_, p) => all.add(p));
}
for (const {scene, kind, from, to} of dead) {
  const what = {empty: 'only the heading is on screen', frozen: 'nothing changes', fades: 'things fade in and out but nothing moves'}[kind];
  console.log(`${what}: ${scene} ${from.toFixed(1)}s to ${to.toFixed(1)}s`);
}
console.log(`${all.size} layout problem(s), ${picks.length ? 'dead stretches are only checked in a full run' : `${dead.length} dead stretch(es)`}`);
