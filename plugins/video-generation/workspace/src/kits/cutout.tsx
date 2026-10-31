// The cut-out look: flat cartoon cut-outs from Codex, moved by code. Upright, 1080 x 1920. Guide: the shorts plugin's cutout-video skill.
// Every pose is its own picture; poses swap inside a squash, never fade. A 2.5D camera moves over flat layers.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Look} from '../engine';
import {captions, font} from './shared';

export const W = 1080;
export const H = 1920;
export const INK = '#1b1b1b';
font('Montserrat', 'Montserrat.ttf', '100 900');

const Caption = captions({y: 1465, size: 80, family: 'Montserrat, sans-serif', weight: 900, color: '#fff', hot: () => '#ffd23f', shadow: '0 0 4px #000, 0 0 4px #000, 0 5px 0 #000, 0 0 10px #000'});
export const CUTOUT: Look = {w: W, h: H, bg: '#cfe9f1', safe: [70, 220, 1010, 1520], minText: 44, fonts: ['900 60px Montserrat'], cut: true, overlay: Caption};

export const clamp = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const io = (u: number) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);
export const out3 = (u: number) => 1 - (1 - u) ** 3;
/** 0 before `at`, 1 after `at + len`, eased in between. */
export const ease = (t: number, at: number, len: number, f = io) => f(clamp((t - at) / len));
/** A pop-in with overshoot: 0 to 1 over `len`, a little past 1 on the way. */
export const pop = (t: number, at: number, len = 0.35) => {
  const u = clamp((t - at) / len);
  return u <= 0 ? 0 : 1 + Math.sin(u * Math.PI) * 0.18 * (1 - u) - (1 - u) ** 3;
};

// ---- camera ----
/** Camera keys: [time, x, y, zoom on the character plane]. Holds are two equal keys. */
export type Key = [number, number, number, number];
export type Cam = {x: number; y: number; z: number};
export const camAt = (t: number, keys: Key[], f = io): Cam => {
  let i = keys.findIndex((k) => k[0] > t);
  if (i < 0) i = keys.length;
  const a = keys[Math.max(0, i - 1)];
  const b = keys[Math.min(keys.length - 1, i)];
  const u = b[0] === a[0] ? 1 : f(clamp((t - a[0]) / (b[0] - a[0])));
  const k = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u)); // zoom in log space: even speed
  return {x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), z: 1000 - 1000 / k};
};
/** Shake in screen px: sums of sines times an envelope. `hits` are [time, strength px]. */
export const shake = (t: number, hits: [number, number][]) => {
  const amp = hits.reduce((s, [at, a]) => s + (t >= at ? a * Math.exp(-(t - at) * 7) : 0), 0);
  return [amp * (Math.sin(t * 83.6) * 0.6 + Math.sin(t * 44.6) * 0.4), amp * (Math.sin(t * 71.2) * 0.5 + Math.sin(t * 29.3) * 0.5)];
};

/**
 * A flat layer at depth `z` (the character stands at 1000). Children are placed where they show with the camera
 * at rest (x 540, y 960, z 0), in screen px; the camera then moves them with real depth.
 */
export const Layer: React.FC<{cam: Cam; z: number; blur?: number; children: React.ReactNode}> = ({cam, z, blur = 0, children}) => {
  const d = z - cam.z;
  if (d < 200) return null;
  const k = 1000 / d;
  const r = k / (1000 / z);
  return (
    <AbsoluteFill style={{filter: blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : undefined}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate(${540 - k * (cam.x - 540)}px, ${960 - k * (cam.y - 960)}px) scale(${r}) translate(-540px, -960px)`}}>{children}</div>
    </AbsoluteFill>
  );
};

// ---- sprites ----
export type Sprite = {src: string; w: number; h: number; head: number[]};
/** A picture by its centre `x`, `y` and width `w`. `sx`, `sy`, `rot` turn it about `origin` (0..1 of its box, default its bottom middle). */
export const Pic: React.FC<{s: Sprite; x: number; y: number; w: number; sx?: number; sy?: number; rot?: number; origin?: [number, number]; flip?: boolean}> = ({s, x, y, w, sx = 1, sy = 1, rot = 0, origin = [0.5, 1], flip}) => {
  const h = (w * s.h) / s.w;
  return (
    <Img src={staticFile(s.src)} style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transformOrigin: `${origin[0] * 100}% ${origin[1] * 100}%`, transform: `rotate(${rot}deg) scale(${(flip ? -1 : 1) * sx}, ${sy})`}} />
  );
};
/** A character pose placed by its head: the head centre lands on `hx`, `hy` with radius `hr`, whatever the picture. */
export const Pose: React.FC<{s: Sprite; hx: number; hy: number; hr: number; sx?: number; sy?: number; rot?: number}> = ({s, hx, hy, hr, sx = 1, sy = 1, rot = 0}) => {
  const k = hr / s.head[2];
  const w = s.w * k;
  const h = s.h * k;
  const left = hx - s.head[0] * k;
  const top = hy - s.head[1] * k;
  return (
    <Img src={staticFile(s.src)} style={{position: 'absolute', left, top, width: w, height: h, transformOrigin: '50% 100%', transform: `rotate(${rot}deg) scale(${sx}, ${sy})`}} />
  );
};
/** Where a point of a pose picture (its own px) lands on screen, for things drawn on it (tears, a face on what it holds). */
export const onPose = (s: Sprite, hx: number, hy: number, hr: number, px: number, py: number): [number, number] => {
  const k = hr / s.head[2];
  return [hx + (px - s.head[0]) * k, hy + (py - s.head[1]) * k];
};
/** The pose at time `t` from swaps [time, name], and the squash of the swap: anticipation, swap, then a damped stretch. */
export const swapAt = (t: number, swaps: [number, string][]) => {
  let name = swaps[0][1];
  let sx = 1;
  let sy = 1;
  for (const [at, n] of swaps) {
    if (t >= at) name = n;
    const d = t - at;
    if (at > 0 && d > -0.1 && d < 0) {
      sx = 1 + 0.04 * ((d + 0.1) / 0.1);
      sy = 1 - 0.06 * ((d + 0.1) / 0.1);
    } else if (at > 0 && d >= 0 && d < 0.8) {
      const s = 0.07 * Math.exp(-d * 7) * Math.cos(d * 20);
      sx = 1 - s * 0.6;
      sy = 1 + s;
    }
  }
  return {name, sx, sy};
};
/** Breathing on a hold: about the waist, under 1 %. */
export const breath = (t: number) => 1 + 0.009 * Math.sin(t * Math.PI * 2 * 0.6);

// ---- drawn in code, in the same flat style ----
export const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
    {children}
  </svg>
);

/** Two cartoon eyes on an object. `mood`: open, squeeze (> <), smug (half lids), angry (tilted lids). `open` 0..1 blinks. */
export const Eyes: React.FC<{x: number; y: number; r: number; gap?: number; mood?: 'open' | 'squeeze' | 'smug' | 'angry'; look?: [number, number]; open?: number; s?: number}> = ({x, y, r, gap = 1.25, mood = 'open', look = [0, 0], open = 1, s = 1}) => {
  if (s <= 0) return null;
  const sw = r * 0.22;
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>
      {[-1, 1].map((side) => {
        const cx = x + side * r * gap;
        if (mood === 'squeeze') {
          const d = `M${cx + side * r * 0.7} ${y - r * 0.6} L${cx - side * r * 0.5} ${y} L${cx + side * r * 0.7} ${y + r * 0.6}`; // > <
          return <path key={side} d={d} fill="none" stroke={INK} strokeWidth={sw * 1.3} strokeLinecap="round" strokeLinejoin="round" />;
        }
        const ry = r * Math.max(0.08, open);
        const lid = mood === 'smug' ? 0.5 : mood === 'angry' ? 0.45 : 0;
        const id = `eye${Math.round(cx)}${Math.round(y)}`;
        return (
          <g key={side}>
            <clipPath id={id}>
              <ellipse cx={cx} cy={y} rx={r * 0.8} ry={ry} />
            </clipPath>
            <ellipse cx={cx} cy={y} rx={r * 0.8} ry={ry} fill="#fff" stroke={INK} strokeWidth={sw} />
            <g clipPath={`url(#${id})`}>
              <circle cx={cx + look[0] * r * 0.3} cy={y + look[1] * r * 0.3} r={r * 0.38} fill={INK} />
              <circle cx={cx + look[0] * r * 0.3 + r * 0.13} cy={y + look[1] * r * 0.3 - r * 0.14} r={r * 0.12} fill="#fff" />
              {lid > 0 && (
                <g transform={`rotate(${mood === 'angry' ? side * -18 : 0} ${cx} ${y})`}>
                  <rect x={cx - r} y={y - r * 1.2} width={r * 2} height={r * (0.2 + lid * 1.4)} fill="#c9b08a" />
                  <line x1={cx - r} x2={cx + r} y1={y - r + r * lid * 1.4} y2={y - r + r * lid * 1.4} stroke={INK} strokeWidth={sw} />
                </g>
              )}
            </g>
            {open < 0.2 && <line x1={cx - r * 0.8} x2={cx + r * 0.8} y1={y} y2={y} stroke={INK} strokeWidth={sw} strokeLinecap="round" />}
          </g>
        );
      })}
    </g>
  );
};
/** A blink: 1, closing for 0.15 s around each time in `at`. */
export const blink = (t: number, at: number[]) => at.reduce((o, a) => Math.min(o, Math.abs(t - a) < 0.075 ? 0 : 1), 1);

/** A small mouth: smile, grin (open with tongue), o, or wobble (frown). */
export const Mouth: React.FC<{x: number; y: number; w: number; kind: 'smile' | 'grin' | 'o' | 'frown'}> = ({x, y, w, kind}) => {
  const sw = w * 0.12;
  if (kind === 'o') return <ellipse cx={x} cy={y} rx={w * 0.22} ry={w * 0.28} fill="#7a2a2a" stroke={INK} strokeWidth={sw} />;
  if (kind === 'grin')
    return <path d={`M${x - w / 2} ${y - w * 0.1} Q${x} ${y + w * 0.7} ${x + w / 2} ${y - w * 0.1} Z`} fill="#7a2a2a" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />;
  const bend = kind === 'smile' ? 0.45 : -0.35;
  return <path d={`M${x - w / 2} ${y} Q${x} ${y + w * bend} ${x + w / 2} ${y}`} fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" />;
};

const rand = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
/**
 * Gas: puffs born every `every` s from `from`, rising to `to` with a wobble; each grows, then shrinks away
 * (outlined puffs never fade). Clusters of circles share one outline: every ink circle first, then every fill.
 */
export const Puffs: React.FC<{t: number; from: [number, number]; to: [number, number]; start: number; end: number; every?: number; life?: number; r?: number; color?: string; seed?: number; spread?: number}> = ({t, from, to, start, end, every = 0.16, life = 1.8, r = 34, color = '#e6f3b4', seed = 1, spread = 60}) => {
  const puffs: {x: number; y: number; r: number}[] = [];
  for (let i = 0; start + i * every < Math.min(t, end); i++) {
    const born = start + i * every;
    const u = (t - born) / life;
    if (u < 0 || u > 1) continue;
    const j = seed * 100 + i;
    const off = (rand(j) - 0.5) * spread;
    const x = lerp(from[0] + off, to[0] + off * 1.6, out3(u)) + Math.sin(u * 6 + rand(j + 1) * 6) * 18;
    const y = lerp(from[1], to[1], out3(u));
    const size = r * (0.7 + rand(j + 2) * 0.6) * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.7;
    for (let c = 0; c < 3; c++) puffs.push({x: x + (c - 1) * size * 0.7, y: y + (c === 1 ? -size * 0.35 : 0), r: size * (c === 1 ? 1 : 0.75)});
  }
  return (
    <g>
      {puffs.map((p, i) => p.r > 0.5 && <circle key={`i${i}`} cx={p.x} cy={p.y} r={p.r + 5} fill={INK} />)}
      {puffs.map((p, i) => p.r > 0.5 && <circle key={`f${i}`} cx={p.x} cy={p.y} r={p.r} fill={color} />)}
    </g>
  );
};

/** One cartoon drop: light blue teardrop with an outline and a glint, pointing along `rot` degrees. */
export const Drop: React.FC<{x: number; y: number; r: number; rot?: number}> = ({x, y, r, rot = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d={`M0 ${-r * 1.9} C${r * 0.4} ${-r * 0.9} ${r} ${-r * 0.4} ${r} ${r * 0.2} A${r} ${r} 0 1 1 ${-r} ${r * 0.2} C${-r} ${-r * 0.4} ${-r * 0.4} ${-r * 0.9} 0 ${-r * 1.9} Z`} fill="#8fd3ff" stroke={INK} strokeWidth={r * 0.28} strokeLinejoin="round" />
    <ellipse cx={-r * 0.35} cy={r * 0.05} rx={r * 0.18} ry={r * 0.3} fill="#fff" />
  </g>
);
/** Tears shooting out of an eye: drops launched every `every` s with `vx`, `vy` (px/s), falling with gravity. */
export const Tears: React.FC<{t: number; x: number; y: number; start: number; end: number; vx: number; vy?: number; every?: number; r?: number; g?: number}> = ({t, x, y, start, end, vx, vy = -520, every = 0.07, r = 13, g = 2600}) => {
  const drops = [];
  for (let i = 0; start + i * every < Math.min(t, end); i++) {
    const d = t - (start + i * every);
    if (d > 0.9) continue;
    const jx = vx * (0.85 + rand(i) * 0.3);
    const jy = vy * (0.85 + rand(i + 9) * 0.3);
    const px = x + jx * d;
    const py = y + jy * d + 0.5 * g * d * d;
    const rot = (Math.atan2(jy + g * d, jx) * 180) / Math.PI - 90; // the point trails behind
    drops.push(<Drop key={i} x={px} y={py} r={r * (0.8 + rand(i + 3) * 0.4)} rot={rot + 180} />);
  }
  return <g>{drops}</g>;
};
