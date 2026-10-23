// The hand-drawn look: ink drawings on cream paper that draw themselves, upright, 1080 x 1920.
// Guide: SKETCH.md.
import React, {useContext} from 'react';
import {staticFile} from 'remotion';
import {Cue, Look, Seed, pick} from '../engine';
import {line, rnd} from '../kit';
import {captions, font} from './shared';

export const W = 1080;
export const H = 1920;
export const K = {
  paper: '#f6f1e4',
  ink: '#1f1d1b',
  grey: '#6f6a60',
  red: '#d2452c',
  blue: '#2f6db0',
  green: '#3d8a56',
  yellow: '#ffd23f',
};
const HAND = 'Caveat, cursive';
font('Caveat', 'Caveat.ttf', '400 700');

// What differs from one video to the next: the paper, the colour of the marks, and the pen.
const PAPERS = [[K.paper, '#e9e1cd'], ['#f3f3ee', '#dfe0d8'], ['#f4ead6', '#e6d8bb'], ['#eef1f3', '#d9dee2']];
const accent = (seed: string) => pick(seed, 'accent', [K.red, K.blue, K.green, '#c2571a']);
/** The colour of the marks in this video: use it for the main point, so text and underline match. */
export const useAccent = () => accent(useContext(Seed));
const paper = (seed: string) => {
  const [mid, edge] = pick(seed, 'paper', PAPERS);
  return `radial-gradient(120% 90% at 50% 45%, ${mid} 55%, ${edge} 100%)`;
};

export const SKETCH: Look = {
  w: W,
  h: H,
  bg: paper(''),
  vary: (seed) => ({bg: paper(seed)}),
  // Phone apps cover the top, the bottom and the right edge of an upright video.
  safe: [70, 220, 1010, 1520],
  minText: 44,
  fonts: ['700 60px Caveat'],
  overlay: captions({y: 1440, size: 78, family: HAND, weight: 700, color: K.ink, hot: accent, max: 22}),
};

export const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
    {children}
  </svg>
);

type Art = {src: string; ink?: string; w: number; h: number; strokes?: (number | string)[][]; len?: number};
/**
 * A drawing of art.json that draws itself as `p` goes 0 to 1: the pen follows the ink lines, then the colour washes in.
 * `x`, `y` is its centre and `w` its width on the canvas. Put it inside an `<Svg>`.
 */
export const Sketch: React.FC<{art: Art; x: number; y: number; w: number; p: number; o?: number; pen?: boolean}> = ({art, x, y, w, p, o = 1, pen: withPen = true}) => {
  const seed = useContext(Seed);
  if (p <= 0) return null;
  const h = (w * art.h) / art.w;
  const box = {x: x - w / 2, y: y - h / 2, width: w, height: h};
  const id = `sk-${art.src.replace(/\W/g, '-')}`;
  const ink = Math.min(1, p / 0.82); // the last part of p is the colour
  const route = routeOf(art);
  const now = ink * route.total;
  return (
    <g opacity={o}>
      {ink < 1 && (
        <mask id={id} maskUnits="userSpaceOnUse" {...box}>
          <g transform={`translate(${box.x} ${box.y}) scale(${w / art.w})`} fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
            {(art.strokes ?? []).map(([width, length, d], i) => {
              const part = Math.min(1, (now - route.legs[i].from) / Number(length));
              return part <= 0 ? null : <path key={i} d={String(d)} strokeWidth={width} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - part} />;
            })}
          </g>
        </mask>
      )}
      <image href={staticFile(art.ink ?? art.src)} {...box} mask={ink < 1 ? `url(#${id})` : undefined} opacity={1 - Math.max(0, (p - 0.82) / 0.18)} />
      {p > 0.82 && <image href={staticFile(art.src)} {...box} opacity={(p - 0.82) / 0.18} />}
      {withPen && route.legs.length > 0 && p < 0.9 && <Pen seed={seed} at={penAt(route, now).map((v, i) => (i < 2 ? [box.x, box.y][i] + (v * w) / art.w : v))} mid={[x, y]} o={Math.min(1, p / 0.03, (0.9 - p) / 0.08)} />}
    </g>
  );
};

// The way of the pen over a drawing: every stroke, and after it the hop to where the next one starts. A hop takes
// time too (as if it were a line a third as long), so the pen glides between lines; it does not jump.
type Leg = {from: number; pts: number[][]; hop: number};
const routes = new WeakMap<Art, {legs: Leg[]; total: number}>();
const routeOf = (art: Art) => {
  let route = routes.get(art);
  if (!route) {
    const all = (art.strokes ?? []).map(([, , d]) => String(d).slice(1).split('L').map((q) => q.split(',').map(Number)));
    let from = 0;
    const legs = all.map((pts, i) => {
      const next = all[i + 1]?.[0] ?? pts[pts.length - 1];
      const end = pts[pts.length - 1];
      const leg = {from, pts, hop: Math.hypot(next[0] - end[0], next[1] - end[1]) / 3};
      from += Number(art.strokes![i][1]) + leg.hop;
      return leg;
    });
    routes.set(art, (route = {legs, total: from}));
  }
  return route;
};
/** Where the pen is, in the pixels of the drawing, and how far it is lifted off the paper (0 to 1). */
const penAt = (route: {legs: Leg[]}, now: number) => {
  const i = Math.max(0, route.legs.findIndex((l, k) => now < (route.legs[k + 1]?.from ?? Infinity)));
  const {from, pts, hop} = route.legs[i];
  const end = pts[pts.length - 1];
  const length = (route.legs[i + 1]?.from ?? from + hop) - from - hop;
  let left = now - from;
  if (left >= length) {
    const next = route.legs[i + 1]?.pts[0] ?? end;
    const k = hop ? Math.min(1, (left - length) / hop) : 0;
    return [end[0] + (next[0] - end[0]) * k, end[1] + (next[1] - end[1]) * k, Math.sin(k * Math.PI)];
  }
  for (let j = 1; j < pts.length; j++) {
    const d = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
    if (left <= d) return [pts[j - 1][0] + ((pts[j][0] - pts[j - 1][0]) * left) / (d || 1), pts[j - 1][1] + ((pts[j][1] - pts[j - 1][1]) * left) / (d || 1), 0];
    left -= d;
  }
  return [end[0], end[1], 0];
};

// The pens: [body, band near the tip, tip]. A pencil has a wooden cone, a marker a short felt tip.
const PENS = [
  {kind: 'pencil', body: '#f2c230', band: '#e8d3b0', tip: '#2a2826'},
  {kind: 'pencil', body: '#c8452f', band: '#e8d3b0', tip: '#2a2826'},
  {kind: 'pencil', body: '#2f5d8a', band: '#e8d3b0', tip: '#2a2826'},
  {kind: 'marker', body: '#26282c', band: '#3a3d43', tip: '#1f1d1b'},
  {kind: 'marker', body: '#e9e6df', band: '#26282c', tip: '#1f1d1b'},
];
/**
 * A pen with its tip at `at` = [x, y, lift], held by a right hand that is not shown. The pen points back at the wrist,
 * which rests below and to the right and follows the tip at half its speed: so the pen turns as it crosses the
 * drawing (`mid` is the centre of the drawing), the way a held pen does. It has no outline, so the checks do not
 * take it for a drawn line.
 */
const Pen: React.FC<{seed: string; at: number[]; mid: number[]; o: number}> = ({seed, at: [x, y, lift], mid, o}) => {
  const turn = (Math.atan2((x + mid[0]) / 2 + 240 - x, y - ((y + mid[1]) / 2 + 520)) * 180) / Math.PI;
  const pen = pick(seed, 'pen', PENS);
  const cone = pen.kind === 'pencil' ? 46 : 22;
  return (
    <g data-ambient="" opacity={o} transform={`translate(${x.toFixed(1)} ${(y - lift * 16).toFixed(1)}) rotate(${(turn + lift * 4).toFixed(1)})`}>
      <polygon points={`${6 + lift * 10},${4 + lift * 6} 1,${-cone} 31,${-cone} 31,${-cone - 330} 1,${-cone - 330}`} fill="#000" opacity={0.1} transform={`translate(${12 + lift * 10} ${8 + lift * 6})`} />
      <polygon points={`0,0 -15,${-cone} 15,${-cone}`} fill={pen.band} />
      <polygon points={`0,0 ${(-15 * 12) / cone},-12 ${(15 * 12) / cone},-12`} fill={pen.tip} />
      <rect x={-15} y={-cone - 300} width={30} height={300} fill={pen.body} />
      <rect x={-15} y={-cone - 300} width={10} height={300} fill="#000" opacity={0.12} />
      <rect x={-15} y={-cone - 330} width={30} height={30} rx={4} fill={pen.kind === 'pencil' ? '#d98a8a' : pen.band} />
    </g>
  );
};

type Pos = {x: number; y: number; size?: number; color?: string; align?: 'center' | 'left' | 'right'; rot?: number};
/** Handwritten text that writes itself from left to right as `p` goes 0 to 1. `x`, `y` is its centre unless `align` says otherwise. */
export const Note: React.FC<Pos & {p: number; children: React.ReactNode}> = ({x, y, size = 72, color = K.ink, align = 'center', rot = 0, p, children}) => (
  <div
    data-box=""
    style={{
      position: 'absolute',
      left: x,
      top: y,
      font: `700 ${size}px ${HAND}`,
      color,
      opacity: p <= 0 ? 0 : 1,
      whiteSpace: 'nowrap',
      transform: `translate(${align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0'}, -50%) rotate(${rot}deg)`,
      clipPath: `inset(-20% ${(110 * (1 - p) - 10).toFixed(1)}% -20% -10%)`, // the slanted letters hang over the box
    }}
  >
    {children}
  </div>
);

// A line a hand would draw: not quite straight. `salt` keeps two marks from wobbling the same way.
const wobble = (pts: number[][], amp: number, salt: string) => line(pts.map(([x, y], i) => [x + (rnd(i, salt + 'x') - 0.5) * amp, y + (rnd(i, salt + 'y') - 0.5) * amp]));
const mark = (d: string, p: number, color: string, w: number, o = 1) =>
  p <= 0 ? null : <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, p)} stroke={color} strokeWidth={w} opacity={o} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
const between = (a: number[], b: number[], n: number, bow = 0) =>
  Array.from({length: n + 1}, (_, i) => {
    const k = i / n;
    const lift = Math.sin(k * Math.PI) * bow;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [a[0] + (b[0] - a[0]) * k + ((b[1] - a[1]) / len) * lift, a[1] + (b[1] - a[1]) * k - ((b[0] - a[0]) / len) * lift];
  });

/** A hand-drawn line under something, from `x` to `x + w`. */
export const Underline: React.FC<{x: number; y: number; w: number; p: number; color?: string}> = ({x, y, w, p, color}) => mark(wobble(between([x, y], [x + w, y], 8, 6), 5, `u${x}${y}`), p, color ?? accent(useContext(Seed)), 8);

/** A highlighter stroke behind a word: draw it before the text in the scene. */
export const Highlight: React.FC<{x: number; y: number; w: number; p: number; h?: number; color?: string}> = ({x, y, w, p, h = 54, color = K.yellow}) => mark(wobble(between([x, y], [x + w, y], 5, 3), 4, `h${x}${y}`), p, color, h, 0.75);

/** A hand-drawn ring around something: centre and radii. */
export const Ring: React.FC<{x: number; y: number; rx: number; ry: number; p: number; color?: string}> = ({x, y, rx, ry, p, color}) =>
  mark(
    wobble(
      Array.from({length: 27}, (_, i) => {
        const a = -2 + (i / 24) * 2 * Math.PI; // a little more than one turn, like a real pen
        return [x + rx * (1 + i * 0.002) * Math.cos(a), y + ry * (1 + i * 0.002) * Math.sin(a)];
      }),
      rx * 0.03,
      `r${x}${y}`,
    ),
    p,
    color ?? accent(useContext(Seed)),
    7,
  );

/** A hand-drawn arrow with a slight bow. */
export const Arrow: React.FC<{from: number[]; to: number[]; p: number; color?: string; bow?: number}> = ({from, to, p, color = K.ink, bow = 30}) => {
  const pts = between(from, to, 10, bow);
  const [ex, ey] = pts[10];
  const a = Math.atan2(ey - pts[8][1], ex - pts[8][0]);
  const tip = (da: number) => [ex - 34 * Math.cos(a + da), ey - 34 * Math.sin(a + da)];
  return (
    <>
      {mark(wobble(pts, 4, `a${from}${to}`), p / 0.8, color, 7)}
      {mark(line([tip(0.5), [ex, ey], tip(-0.5)]), (p - 0.8) / 0.2, color, 7)}
    </>
  );
};

/** The sound of the pen for `len` seconds from `at`: pair it with every `Sketch`, `Note` and mark that draws. */
export const scratch = (at: number, len: number, vol = 0.22): Cue => ({at, name: 'pencil-long', len, vol, skip: rnd(Math.round(at * 10), 'pen') * 4});
