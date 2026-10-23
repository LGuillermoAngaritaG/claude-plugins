import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {Easing, interpolate, random} from 'remotion';

export const W = 1920;
export const H = 1080;

// Manim's palette, so it reads as 3b1b.
export const C = {
  bg: '#0e1013',
  white: '#ece6e2',
  grey: '#8b9099',
  dim: '#3a3f48',
  blue: '#58c4dd',
  teal: '#5cd0b3',
  green: '#83c167',
  yellow: '#f7d96f',
  gold: '#f0ac5f',
  red: '#fc6255',
  purple: '#b189c6',
};

const smooth = Easing.inOut(Easing.cubic);
/** Eased 0 to 1, starting at `at` seconds and lasting `d`. */
export const ramp = (t: number, at: number, d = 0.7) =>
  interpolate(t, [at, at + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: smooth});
/** Like `ramp`, but at a steady speed: for sweeps, counters and anything that must not ease. */
export const lin = (t: number, at: number, d = 1) => interpolate(t, [at, at + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
/** A derivation step: fades in at `on`, then dims at `off` (when the next step arrives) but stays readable. */
export const step = (t: number, on: number, off?: number) => ramp(t, on) * (off === undefined ? 1 : 1 - 0.55 * ramp(t, off));
/** 1 between a and b, 0 outside, with soft edges. */
export const span = (t: number, a: number, b: number, d = 0.5) => Math.min(ramp(t, a, d), 1 - ramp(t, b, d));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Deterministic random in [0, 1). Remotion renders frames out of order, so no Math.random. */
export const rnd = (i: number, salt = '') => random(`${salt}${i}`);
export const line = (pts: number[][]) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L');

// ---- text ----

type Pos = {x: number; y: number; size?: number; color?: string; o?: number; align?: 'center' | 'left' | 'right'};
const place = ({x, y, size = 56, color = C.white, o = 1, align = 'center'}: Pos): React.CSSProperties => ({
  position: 'absolute',
  left: x,
  top: y,
  fontSize: size,
  color,
  opacity: o,
  whiteSpace: 'nowrap',
  transform: `translate(${align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0'}, -50%)`,
});

/** `mono` is for file and solver names. */
export const Txt: React.FC<Pos & {children: React.ReactNode; mono?: boolean}> = ({children, mono, ...p}) => (
  <div data-box="" style={{...place(p), fontFamily: mono ? 'KaTeX_Typewriter, monospace' : 'KaTeX_Main, serif'}}>{children}</div>
);

export const Tex: React.FC<Pos & {tex: string}> = ({tex, ...p}) => (
  <div
    data-box=""
    style={place(p)}
    dangerouslySetInnerHTML={{__html: katex.renderToString(tex, {output: 'html', trust: true, strict: false})}}
  />
);
/** Fade one part of a formula. */
export const op = (o: number, s: string) => `\\htmlStyle{opacity:${o.toFixed(3)}}{${s}}`;
export const col = (c: string, s: string) => `\\textcolor{${c}}{${s}}`;

export const Head: React.FC<{t: number; children: React.ReactNode}> = ({t, children}) => (
  <Txt x={110} y={95} size={56} color={C.grey} align="left" o={ramp(t, 0.1)}>
    {children}
  </Txt>
);

// ---- drawing ----

export const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
    {children}
  </svg>
);

/** A path that draws itself as p goes 0 to 1. */
export const Draw: React.FC<{d: string; p?: number; color?: string; w?: number; o?: number; fill?: string; dash?: boolean}> = ({
  d,
  p = 1,
  color = C.white,
  w = 5,
  o = 1,
  fill = 'none',
  dash,
}) =>
  p <= 0 ? null : (
    <path
      d={d}
      pathLength={1}
      strokeDasharray={dash ? '0.02 0.02' : '1 1'}
      strokeDashoffset={dash ? 0 : 1 - p}
      stroke={color}
      strokeWidth={w}
      fill={fill}
      fillOpacity={p}
      opacity={dash ? o * p : o}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );

type P2 = [number, number];
export const Arrow: React.FC<{from: P2; to: P2; p?: number; color?: string; w?: number; o?: number}> = ({
  from,
  to,
  p = 1,
  color = C.white,
  w = 6,
  o = 1,
}) => {
  const dx = (to[0] - from[0]) * p;
  const dy = (to[1] - from[1]) * p;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;
  const hs = Math.min(w * 4, len * 0.5);
  const tx = from[0] + dx;
  const ty = from[1] + dy;
  const bx = tx - ux * hs;
  const by = ty - uy * hs;
  return (
    <g opacity={o} stroke={color} fill={color}>
      <line x1={from[0]} y1={from[1]} x2={bx} y2={by} strokeWidth={w} strokeLinecap="round" />
      <polygon
        points={`${tx},${ty} ${bx - uy * hs * 0.5},${by + ux * hs * 0.5} ${bx + uy * hs * 0.5},${by - ux * hs * 0.5}`}
        stroke="none"
      />
    </g>
  );
};

type Ax = {x: number; y: number; w: number; h: number; xr: P2; yr: P2};
/** Maps data to screen. `path(f)` gives the curve of f over the x range. */
export const axes = (a: Ax) => {
  const X = (v: number) => a.x + ((v - a.xr[0]) / (a.xr[1] - a.xr[0])) * a.w;
  const Y = (v: number) => a.y + a.h - ((v - a.yr[0]) / (a.yr[1] - a.yr[0])) * a.h;
  const path = (f: (v: number) => number, from = a.xr[0], to = a.xr[1], n = 120) =>
    line(
      Array.from({length: n + 1}, (_, i) => {
        const v = from + ((to - from) * i) / n;
        return [X(v), Y(f(v))];
      }),
    );
  return {...a, X, Y, path};
};

/** Axis arrows. They cross at zero when zero is inside the range, else at the bottom left. */
export const Axes: React.FC<{ax: ReturnType<typeof axes>; p?: number; color?: string}> = ({ax, p = 1, color = C.grey}) => {
  const y0 = ax.Y(Math.min(Math.max(0, ax.yr[0]), ax.yr[1]));
  const x0 = ax.X(Math.min(Math.max(0, ax.xr[0]), ax.xr[1]));
  return (
    <>
      <Arrow from={[ax.x, y0]} to={[ax.x + ax.w, y0]} p={p} color={color} w={4} />
      <Arrow from={[x0, ax.y + ax.h]} to={[x0, ax.y]} p={p} color={color} w={4} />
    </>
  );
};

/**
 * Opening card. `kicker` is the small line above the title, for example "Fourier · Part 2 of 5".
 * Children are drawn behind the text: pass an `<Svg>` with a moving picture of the subject.
 */
export const TitleCard: React.FC<{t: number; kicker: string; title: string; sub: string; children?: React.ReactNode}> = ({t, kicker, title, sub, children}) => (
  <>
    {children}
    <Txt x={130} y={410} size={48} color={C.blue} align="left" o={ramp(t, 0.2)}>
      {kicker}
    </Txt>
    <Txt x={130} y={520} size={108} align="left" o={ramp(t, 0.5)}>
      {title}
    </Txt>
    <Txt x={130} y={640} size={46} color={C.grey} align="left" o={ramp(t, 0.9)}>
      {sub}
    </Txt>
  </>
);

/** Closing list. Item i appears with narration line i, and "next" with the line after the last item. `heading` is for a video in another language. */
export const Recap: React.FC<{t: number; b: number[]; items: [string, string][]; next?: string; heading?: string}> = ({t, b, items, next, heading = 'To sum up'}) => (
  <>
    <Head t={t}>{heading}</Head>
    {items.map(([color, text], i) => (
      <React.Fragment key={text}>
        <div style={{position: 'absolute', left: 150, top: 274 + i * 150, width: 12, height: 52, background: color, opacity: ramp(t, b[i])}} />
        <Txt x={200} y={300 + i * 150} size={56} align="left" o={ramp(t, b[i])}>
          {text}
        </Txt>
      </React.Fragment>
    ))}
    {next && (
      <Txt x={960} y={985} size={46} color={C.grey} o={ramp(t, b[items.length])}>
        Next · {next}
      </Txt>
    )}
  </>
);

/** A round arrow: dir 1 turns clockwise on screen, -1 the other way. */
export const Spin: React.FC<{x: number; y: number; r: number; dir: number; color: string; o?: number; w?: number}> = ({x, y, r, dir, color, o = 1, w = 7}) => {
  const pts = Array.from({length: 25}, (_, i) => {
    const a = -2.4 + dir * (i / 24) * 4.2;
    return [x + r * Math.cos(a), y + r * Math.sin(a)];
  });
  const [ex, ey] = pts[24];
  const a = -2.4 + dir * 4.2;
  return (
    <g opacity={o}>
      <path d={line(pts)} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />
      <Arrow from={[ex, ey]} to={[ex - dir * 4.5 * w * Math.sin(a), ey + dir * 4.5 * w * Math.cos(a)]} color={color} w={w} />
    </g>
  );
};
