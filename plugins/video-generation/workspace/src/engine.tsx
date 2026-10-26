import React, {useEffect, useState} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Audio} from '@remotion/media';
import {AbsoluteFill, Sequence, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {C, ramp, rnd} from './kit';

export const FPS = 30;
// Seconds of silence before the first line, between lines, and after the last line of a scene.
// A script.json can set its own with "pace": [lead, gap, tail].
const PACE = [0.4, 0.3, 0.7];

/** One spoken word: `at` and `end` are seconds since the scene started. */
export type Word = {w: string; at: number; end: number};
/** t = seconds since the scene started, b[i] = when narration line i starts, dur = scene length, words[i] = the words of line i. */
export type SceneProps = {t: number; b: number[]; dur: number; words: Word[][]};
type Script = {title: string; seed?: string | number; pace?: number[]; scenes: {id: string; lines: string[]}[]};
// `gap` = the pause after a clip when it is not the usual one. `words` = [word, start, end] in seconds into the clip, written by scripts/align.py.
type Timing = Record<string, {file: string; dur: number; gap?: number; words?: (string | number)[][]}[]>;
/**
 * What a type of video looks like: its canvas, its background (any CSS background), the area text must stay in
 * [x0, y0, x1, y1], its smallest text, the fonts to wait for, `cut` = scenes cut instead of fading, and an
 * `overlay` drawn over every scene (captions). A video without a look is the 1920 x 1080 math look of src/kit.tsx.
 */
export type Look = {w: number; h: number; bg: string; safe: number[]; minText: number; fonts?: string[]; cut?: boolean; overlay?: React.FC<SceneProps>; vary?: (seed: string) => Partial<Look>};

/**
 * What makes one video differ from the next inside the same look: `<series>/<id>`, or the "seed" of its script.json.
 * A look file picks from its own short lists with `pick(seed, 'paper', [...])`, so a video always renders the same
 * way, two videos rarely match, and changing "seed" deals a video another hand.
 */
export const Seed = React.createContext('');
export const pick = <T,>(seed: string, what: string, from: T[]): T => from[Math.floor(rnd(0, seed + what) * from.length)];
/**
 * A YouTube channel's look, from src/channels/<name>.json of the workspace (the explainer-video skill,
 * references/channels.md): its grounds, its accent, the colour of text on the ground, the colour of the spoken word.
 */
export type Channel = {name: string; grounds?: string[]; accent?: string; ink?: string; caption_hot?: string};
/** The channel of this video, or null: a kit takes its defaults from it, so a video without one looks as it always did. */
export const Theme = React.createContext<Channel | null>(null);
/** The size of the frame of this video, from its look: a kit that draws for both shapes (landscape and upright) reads it. */
export const Canvas = React.createContext({w: 1920, h: 1080});
/** True inside the player. False where scripts/stills.mjs walks the scenes without drawing them, where a video file cannot play. */
export const Live = React.createContext(false);
const seedOf = (def: VideoDef, series: string) => String(def.script.seed ?? `${series}/${def.id}`);
/** A sound effect: public/sfx/<name>.wav, or a file under public/ named with its extension, starting `at` seconds into its scene. `len` plays only that many seconds of it, from `skip` seconds in. */
export type Cue = {at: number; name: string; vol?: number; len?: number; skip?: number};
export type VideoDef = {
  id: string;
  script: Script;
  timing: Timing;
  scenes: Record<string, React.FC<SceneProps>>;
  look?: Look;
  /** The channel the video is made for: its grounds replace the look's, its colours the kit's defaults. */
  channel?: Channel;
  /** Sound effects per scene id, from the same `b` and `words` the scene gets. */
  sounds?: Record<string, (b: number[], dur: number, words: Word[][]) => Cue[]>;
  /** A quiet loop under the whole video: public/sfx/<name>.wav, or a file under public/ named with its extension (music). */
  bed?: {name: string; vol?: number};
  /** The art.json of the video (scripts/art.py): its images are loaded before the first frame. */
  art?: Record<string, {src: string; ink?: string}>;
};

const layout = (v: VideoDef) => {
  const [lead, gap, tail] = v.script.pace ?? PACE;
  return v.script.scenes.map(({id}) => {
    let t = lead;
    let last = 0;
    const clips = v.timing[id].map((c) => {
      const at = t;
      last = c.gap ?? gap;
      t += c.dur + last;
      return {file: c.file, at, words: (c.words ?? []).map(([w, a, e]) => ({w: String(w), at: at + Number(a), end: at + Number(e)}))};
    });
    return {id, clips, frames: Math.round((t - last + tail) * FPS)};
  });
};

/** The second at which `text` is first said in line `i`, to place a cue on a word: `ramp(t, said(words, 2, 'knife'))`. */
export const said = (words: Word[][], i: number, text: string) => {
  const key = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const hit = (words[i] ?? []).find((x) => key(x.w).startsWith(key(text)));
  if (!hit) throw new Error(`line ${i} never says "${text}" (or scripts/align.py has not run): ${(words[i] ?? []).map((x) => x.w).join(' ')}`);
  return hit.at;
};

export const frames = (v: VideoDef) => layout(v).reduce((n, s) => n + s.frames, 0);

// A scene that reads a line the script does not have would animate on NaN and look fine. Fail instead.
const strict = (b: number[], id: string) =>
  new Proxy(b, {
    get(o, k, r) {
      if (typeof k === 'string' && /^\d+$/.test(k) && Number(k) >= o.length) {
        throw new Error(`scene "${id}" uses line ${k} but the script has ${o.length}`);
      }
      return Reflect.get(o, k, r);
    },
  });

const Scene: React.FC<Omit<SceneProps, 't'> & {Comp: React.FC<SceneProps>; look?: Look}> = ({Comp, look, ...p}) => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{opacity: look?.cut ? 1 : Math.min(ramp(t, 0, 0.3), 1 - ramp(t, p.dur - 0.3, 0.3))}}>
      <Live.Provider value={true}>
        <Comp t={t} {...p} />
      </Live.Provider>
      {look?.overlay && <look.overlay t={t} {...p} />}
    </AbsoluteFill>
  );
};

const Sound: React.FC<{cue: Cue}> = ({cue}) => {
  const n = cue.len ? Math.round(cue.len * FPS) : Infinity;
  // A slice of a long sound ends with a short fade, not a click.
  return <Audio src={staticFile(cue.name.includes('.') ? cue.name : `sfx/${cue.name}.wav`)} trimBefore={Math.round((cue.skip ?? 0) * FPS)} volume={(f) => (cue.vol ?? 0.3) * Math.max(0, Math.min(1, (n - f) / 4))} />;
};

const FONTS = ['', 'bold ', 'italic ']
  .map((s) => `${s}40px KaTeX_Main`)
  .concat('italic 40px KaTeX_Math', 'bold 40px KaTeX_Math', '40px KaTeX_Typewriter', '40px KaTeX_AMS', ...[1, 2, 3, 4].map((n) => `40px KaTeX_Size${n}`));

const held: HTMLImageElement[] = [];

// ---- for scripts/stills.mjs only ----

const num = (v: string | null | undefined) => (v ? parseFloat(v) : 1);

/**
 * Walks every scene in half-second steps, without drawing it, and returns the stretches where the viewer
 * has nothing to watch: `empty` = only the heading is on screen, `frozen` = nothing changes at all,
 * `fades` = things fade in or out but nothing moves. Elements marked `data-ambient` are left out.
 */
const scan = (def: VideoDef, seed: string) =>
  layout(def).flatMap((s, i, all) => {
    const dur = s.frames / FPS;
    const b = s.clips.map((c) => c.at);
    const words = s.clips.map((c) => c.words);
    const Comp = def.scenes[s.id];
    const runs: {scene: string; kind: string; from: number; to: number}[] = [];
    const close = (kind: string, from: number | null, to: number, min: number) => {
      if (from !== null && to - from >= min) runs.push({scene: s.id, kind, from, to});
    };
    const last = ['', ''];
    const since = [0.5, 0.5];
    const moving = !!def.look || i < all.length - 1; // the last scene of the math look is the recap, a list by design
    // Runs of equal marks: [0] the scene as drawn (5 s is a long hold), [1] the scene without its opacities (10 s of fades only).
    const step = (marks: string[], t: number) =>
      marks.forEach((m, k) => {
        if (m === last[k]) return;
        if (moving) close(k ? 'fades' : 'frozen', since[k], t, k ? 10 : 5);
        last[k] = m;
        since[k] = t;
      });
    let bare: number | null = 0;
    for (let t = 0.5; t < dur - 0.3; t += 0.5) {
      const html = renderToStaticMarkup(
        <Seed.Provider value={seed}>
          <Comp t={t} b={b} dur={dur} words={words} />
        </Seed.Provider>,
      );
      const div = document.createElement('div');
      div.innerHTML = html;
      div.querySelectorAll('[data-ambient]').forEach((el) => el.remove()); // decoration that never stops moving
      // What the viewer can see apart from the heading: text and shapes that are not faded out.
      const shown = Array.from(div.querySelectorAll<HTMLElement>('[data-box], div:empty, :is(path, line, circle, rect, ellipse, polygon, polyline, text, image):not(defs *), img')).some((el) => {
        if (el.matches('[data-box]') && num(el.style.top) <= 150) return false;
        let o = 1;
        for (let e: HTMLElement | null = el; e && e !== div; e = e.parentElement) o *= num(e.style.opacity || e.getAttribute('opacity'));
        return o > 0.1;
      });
      if (shown) {
        close('empty', bare, t, 1.5);
        bare = null;
      } else if (bare === null) bare = t;
      const fades = div.innerHTML.replace(/opacity[:=]"?[\d.e-]+/g, '');
      // For "nothing changes", what the viewer cannot see does not count, even if it moves.
      div.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (num(el.style.opacity || el.getAttribute('opacity')) <= 0.1) el.remove();
      });
      step([div.innerHTML, fades], t);
    }
    close('empty', bare, dur, 1.5);
    step(['', ''], dur);
    // A hold inside a stretch of fades is the same complaint twice.
    return runs.filter((r) => r.kind !== 'frozen' || !runs.some((f) => f.kind === 'fades' && f.from <= r.from && r.to <= f.to));
  });

// `label` names the frame in a corner of the still. `boxes` logs where every visible piece of text sits,
// so the script can report text that overlaps, leaves the canvas or is too small. `scan` logs the dead stretches.
const Probe: React.FC<{def: VideoDef; seed: string}> = ({def, seed}) => {
  const props = getInputProps() as {label?: string; boxes?: boolean; scan?: boolean};
  const frame = useCurrentFrame();
  useEffect(() => {
    if (!props.boxes) return;
    const handle = delayRender('boxes');
    Promise.all(FONTS.concat(def.look?.fonts ?? []).map((f) => document.fonts.load(f))).then(() => {
      try {
        // Opacity of an element as the viewer sees it: its own times that of everything around it.
        const seen = (el: Element | null): number => (el ? Number(getComputedStyle(el).opacity) * seen(el.parentElement) : 1);
        const strokes = Array.from(document.querySelectorAll<SVGGeometryElement>('svg :is(path, line, circle, rect, ellipse, polygon, polyline):not(defs *)'))
          .filter((s) => getComputedStyle(s).stroke !== 'none' && seen(s) * Number(getComputedStyle(s).strokeOpacity) > 0.3)
          .flatMap((s) => {
            const m = s.getScreenCTM();
            return m ? [{s, box: s.getBoundingClientRect(), inv: m.inverse()}] : [];
          });
        const out = Array.from(document.querySelectorAll('[data-box], svg text'))
          .filter((el) => !el.parentElement?.closest('[data-box]'))
          .flatMap((el) => {
            const r = {x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, o: 0, small: 1e9};
            const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            for (let n = walk.nextNode(); n; n = walk.nextNode()) {
              const o = seen(n.parentElement);
              if (!n.textContent?.trim() || o < 0.15) continue;
              const range = document.createRange();
              range.selectNodeContents(n);
              const q = range.getBoundingClientRect();
              if (!q.width) continue;
              r.x0 = Math.min(r.x0, q.left);
              r.y0 = Math.min(r.y0, q.top);
              r.x1 = Math.max(r.x1, q.right);
              r.y1 = Math.max(r.y1, q.bottom);
              r.o = Math.max(r.o, o);
              r.small = Math.min(r.small, parseFloat(getComputedStyle(n.parentElement!).fontSize));
            }
            if (r.x1 <= r.x0) return [];
            const size = parseFloat(getComputedStyle(el).fontSize);
            // A stroke (a curve, an arrow, the edge of a box) that passes through the ink of this text.
            const struck = strokes.some(({s, box, inv}) => {
              if (box.right < r.x0 || box.left > r.x1 || box.bottom < r.y0 || box.top > r.y1) return false;
              for (let i = 1; i < 8; i++) {
                for (let j = 1; j < 4; j++) {
                  const p = new DOMPoint(r.x0 + ((r.x1 - r.x0) * i) / 8, r.y0 + size * 0.25 + ((r.y1 - r.y0 - size * 0.5) * j) / 4).matrixTransform(inv);
                  if (s.isPointInStroke(p)) return true;
                }
              }
              return false;
            });
            return [{...r, size, struck, text: (el.textContent ?? '').slice(0, 40)}];
          });
        // The lines of the explainer kit's tags, in frame pixels, for lines that cross.
        const lines = Array.from(document.querySelectorAll<SVGLineElement>('line[data-tag-line]'))
          .filter((l) => seen(l) > 0.3)
          .map((l) => ({text: l.dataset.tagLine ?? '', at: ['x1', 'y1', 'x2', 'y2'].map((a) => Number(l.getAttribute(a)))}));
        const {w, h, safe, minText} = def.look ?? {w: 0, h: 0, safe: null, minText: 0};
        console.log(`BOXES ${JSON.stringify({frame, out, lines, scan: props.scan ? scan(def, seed) : [], w, h, safe, minText})}`);
      } finally {
        continueRender(handle); // a scene that cannot be measured must not hang the still
      }
    });
  }, [props.boxes, props.scan, frame, def, seed]);
  return props.label ? <div style={{position: 'absolute', right: 14, bottom: 6, font: '26px KaTeX_Typewriter, monospace', color: C.grey}}>{props.label}</div> : null;
};

export const Video: React.FC<{def: VideoDef; series: string}> = ({def: plain, series}) => {
  const seed = seedOf(plain, series);
  const theme = plain.channel ?? null;
  const ground = theme?.grounds ? {bg: pick(seed, 'ground', theme.grounds)} : {};
  const def = plain.look && (plain.look.vary || theme?.grounds) ? {...plain, look: {...plain.look, ...plain.look.vary?.(seed), ...ground}} : plain;
  // Hold the first frame until the fonts and the images are in, or early frames render in a fallback serif or without their picture.
  const [handle] = useState(() => delayRender('fonts and images'));
  useEffect(() => {
    const images = Object.values(def.art ?? {}).flatMap((a) => (a.ink ? [a.src, a.ink] : [a.src])).map((src) => {
      const img = new Image();
      img.src = staticFile(src);
      held.push(img); // kept, so the decoded picture stays in memory
      return img.decode();
    });
    Promise.all([...FONTS.concat(def.look?.fonts ?? []).map((f) => document.fonts.load(f)), ...images]).then(() => continueRender(handle));
  }, [handle, def]);

  const scenes = layout(def);
  const total = scenes.reduce((n, s) => n + s.frames, 0);
  let from = 0;
  return (
    <Seed.Provider value={seed}>
    <Theme.Provider value={theme}>
    <Canvas.Provider value={{w: def.look?.w ?? 1920, h: def.look?.h ?? 1080}}>
    <AbsoluteFill style={{background: def.look?.bg ?? C.bg}}>
      {scenes.map((s) => {
        const start = from;
        from += s.frames;
        const b = s.clips.map((c) => c.at);
        const words = s.clips.map((c) => c.words);
        const dur = s.frames / FPS;
        return (
          <React.Fragment key={s.id}>
            <Sequence from={start} durationInFrames={s.frames}>
              <Scene Comp={def.scenes[s.id]} look={def.look} b={strict(b, s.id)} dur={dur} words={words} />
              {s.clips.map((c) => (
                <Sequence key={c.file} from={Math.round(c.at * FPS)}>
                  <Audio src={staticFile(`audio/${series}/${def.id}/${c.file}`)} />
                </Sequence>
              ))}
            </Sequence>
            {/* Outside the scene, so the tail of a sound is not cut where the scene ends. */}
            {(def.sounds?.[s.id]?.(b, dur, words) ?? []).map((cue, i) => (
              <Sequence key={i} from={start + Math.round(cue.at * FPS)} durationInFrames={cue.len ? Math.round(cue.len * FPS) : undefined}>
                <Sound cue={cue} />
              </Sequence>
            ))}
          </React.Fragment>
        );
      })}
      {/* The volume counts frames from the start of the file: "extend" keeps counting through the loops, so the bed fades in once and out at the end.
          The voice and most effects are mono, which @remotion/media plays 3 dB louder than the old <Audio> did; the bed is stereo and is not,
          so it gets the same 3 dB (SQRT2) to keep the mix the guides were written for. */}
      {def.bed && <Audio loop loopVolumeCurveBehavior="extend" src={staticFile(def.bed.name.includes('.') ? def.bed.name : `sfx/${def.bed.name}.wav`)} volume={(f) => Math.SQRT2 * (def.bed?.vol ?? 0.12) * Math.min(1, f / FPS, (total - f) / FPS)} />}
      <Probe def={def} seed={seed} />
    </AbsoluteFill>
    </Canvas.Provider>
    </Theme.Provider>
    </Seed.Provider>
  );
};
