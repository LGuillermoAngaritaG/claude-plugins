// Whole-scene parts for the explainer look: the explaining moves that come back in every channel. Compare (things side
// by side with bars), Process (steps on a path, a cycle when it loops), Timeline (events on an axis), BigNumber (a
// number, then an everyday comparison), VideoMap (the chapters of the video) and Ask (the closing question).
// A part lays out for both shapes (useTall), times each thing to the second the voice says it, keeps something moving
// and stays in the safe areas; the scene gives only its content and its cues: `at` for each thing, from
// said(words, i, 'word'). Each part is a pure function of `t` (seconds into the scene) and its props.
// Every part takes `o` (0 to 1, fades the whole part; default 1) and an optional box `x y w h` (top left, size) to
// share the frame with something else. By default it fills the safe area: landscape x 90 to 1830, y 50 to 1050;
// upright x 70 to 1010, y 220 to 1340, and left of x 900 below y 840 (the buttons of TikTok and Reels).
// Text on screen is only what the scene passes, short: a number only as the string the narration says ("$9 a year"),
// scripts/stills.mjs checks every number on screen. Colours come from the channel (its ink and accent) or the kit's.
import React from 'react';
import {ACCENT, K, Label, Picture, Svg2D, TAU, clamp, ease, easeOut, lerp, pop, settle, useFrame, useTheme} from './explainer';
import {Arrow, Panel} from './props';

/**
 * A thing a part shows: a Codex picture of art.json (`art`, in a white frame, cropped square) or any drawing (`draw`,
 * on a white card), with a short `label` under it. Draw it centred on 0, 0 and 200 px tall (a prop: x={0} y={0}
 * s={200}; an svg placed from -100 to 100): the part moves it to its slot and scales it to fit.
 */
export type Thing = {label?: string; art?: {src: string}; draw?: React.ReactNode};
/** Which thing (`i`, from 0) and the second the voice says it: a winner, a step named again, the current chapter. */
export type Cue = {i: number; at: number};
type Box = {t: number; o?: number; x?: number; y?: number; w?: number; h?: number};
type P2 = [number, number];
type Area = ReturnType<typeof useArea>;

const range = (n: number) => Array.from({length: n}, (_, i) => i);
const frac = (n: number) => n - Math.floor(n);
/** The width of `text` at `size` px, an estimate from the font. */
const tw = (text: string, size: number) => text.length * size * 0.6;
/** A small float, so things that have arrived never stand dead still. */
const bob = (t: number, k: number) => Math.sin(t * 1.7 + k * 2.1) * 5;
const LABEL = 40;
/** How far below a slot's centre its label stands, beyond half the slot. */
const UNDER = 48;

const useArea = ({x, y, w, h}: Omit<Box, 't' | 'o'>) => {
  const f = useFrame();
  const tall = f.h > f.w;
  const [x0, y0, x1, y1] = tall ? [70, 220, 1010, 1340] : [90, 50, 1830, 1050];
  const ax = x ?? x0;
  const ay = y ?? y0;
  const aw = w ?? x1 - ax;
  // Upright, below y = 840 the buttons cover the right edge: the right end of the area at height `yy`.
  const right = (yy: number) => (tall && yy > 840 ? Math.min(900, ax + aw) : ax + aw);
  return {x: ax, y: ay, w: aw, h: h ?? y1 - ay, tall, right};
};

const useColors = () => {
  const th = useTheme();
  const ink = th?.ink ?? K.ink;
  // `soft`: the ink at half, for what stands back (a road, a baseline).
  return {ink, hot: th?.accent ?? ACCENT, soft: /^#[0-9a-f]{6}$/i.test(ink) ? ink + '80' : 'rgba(127,127,127,.5)'};
};

const Layer: React.FC<{o: number; children: React.ReactNode}> = ({o, children}) =>
  o <= 0.01 ? null : <div style={{position: 'absolute', inset: 0, opacity: clamp(o)}}>{children}</div>;

/** A thing in its slot: centre `x y`, `s` px square; `q` 0 to 1 its entrance, `dim` its opacity, `lift` px up, `glow` an accent ring. */
const Slot: React.FC<{thing: Thing; x: number; y: number; s: number; q: number; dim?: number; lift?: number; glow?: number}> = ({thing, x, y, s, q, dim = 1, lift = 0, glow = 0}) => {
  const {hot} = useColors();
  if (q <= 0.01) return null;
  return (
    <div style={{position: 'absolute', left: x - s / 2, top: y - s / 2 - lift, width: s, height: s, opacity: Math.min(1, q * 2) * dim, transform: `scale(${(0.6 + 0.4 * settle(q)) * (1 + 0.06 * glow)})`}}>
      {glow > 0.01 && <div style={{position: 'absolute', inset: -14, borderRadius: 38, border: `7px solid ${hot}`, boxShadow: `0 0 36px ${hot}`, opacity: clamp(glow)}} />}
      {thing.art ? (
        <Picture art={thing.art} x={0} y={0} size={s} o={1} />
      ) : (
        <div style={{position: 'absolute', inset: 0, borderRadius: 26, background: '#ffffff', boxShadow: '0 14px 40px rgba(0,0,0,.28)', overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: s / 2, top: s / 2, transform: `scale(${(s * 0.78) / 200})`, transformOrigin: '0 0'}}>{thing.draw}</div>
        </div>
      )}
    </div>
  );
};

// ---- a path of things (Process, VideoMap) ----

/** The point at `u` (0 to 1) of the stretch from a to b, bent like props' Arrow with the same `bow`. */
const bend = (a: P2, b: P2, bow: number, u: number): P2 => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const m = [(a[0] + b[0]) / 2 - dy * bow, (a[1] + b[1]) / 2 + dx * bow];
  return [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * m[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * m[1] + u * u * b[1]];
};
/** The stretch between two slot centres, cut back to the slots' edges (`s` px, with `low` px of label under each). */
const trim = (a: P2, b: P2, s: number, low: number): [P2, P2] => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const [ux, uy] = [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  const out = (vx: number, vy: number) => Math.min(Math.abs(vx) > 1e-6 ? s / 2 / Math.abs(vx) : Infinity, Math.abs(vy) > 1e-6 ? (vy > 0 ? s / 2 + low : s / 2) / Math.abs(vy) : Infinity) + 22;
  const [ea, eb] = [out(ux, uy), out(-ux, -uy)];
  return [[a[0] + ux * ea, a[1] + uy * ea], [b[0] - ux * eb, b[1] - uy * eb]];
};
/**
 * Where `n` things stand on a path in the area: landscape a row (an arch for 4 or more), upright a column (a zigzag for
 * 4 or more), a ring when it loops. Each stays inside the area with its label, and upright left of the buttons.
 */
const pathOf = (n: number, a: Area, loop: boolean, labels: (string | undefined)[]) => {
  const low = labels.some(Boolean) ? UNDER + 32 : 0;
  const {x, y, w, h, tall} = a;
  const [cx, cy] = [x + w / 2, y + (h - low) / 2];
  let s: number, bow: number, pts: P2[];
  if (loop) {
    s = tall ? Math.min(230, w * 0.25) : Math.min(250, h * 0.27);
    const ry = (h - low - s) / 2 - 10;
    const half = Math.max(s / 2, ...labels.map((l) => tw(l ?? '', LABEL) / 2)) + 6;
    const rx = tall ? Math.min(w / 2 - s / 2 - 30, a.right(y + h) - cx - half) : Math.min(w / 2 - s / 2 - 30, ry * 1.7);
    // Landscape the first step on top; upright a flat top edge (corners for 4), so the stretches between steps stay long.
    // The points of the circle are stretched to fill the box.
    const a0 = -Math.PI / 2 - (tall ? Math.PI / n : 0);
    const u = range(n).map((i) => [Math.cos(a0 + (TAU * i) / n), Math.sin(a0 + (TAU * i) / n)]);
    const fit = (v: number, k: 0 | 1) => {
      const [lo, hi] = [Math.min(...u.map((p) => p[k])), Math.max(...u.map((p) => p[k]))];
      return hi - lo > 1e-6 ? (2 * (v - lo)) / (hi - lo) - 1 : 0;
    };
    bow = -0.2;
    pts = u.map(([p, q]) => [cx + rx * fit(p, 0), cy + ry * fit(q, 1)]);
  } else if (!tall) {
    const cw = w / n;
    s = Math.min(n < 4 ? 320 : 260, cw * (n < 4 ? 0.55 : 0.62), (h - low) * 0.45);
    const amp = n < 4 ? 0 : (h - low - s) * 0.32;
    bow = n < 4 ? -0.12 : -0.08;
    pts = range(n).map((i) => [x + cw * (i + 0.5), cy + amp * (0.5 - Math.sin((Math.PI * i) / Math.max(1, n - 1)))]);
  } else {
    const rh = h / n;
    s = Math.min(n < 4 ? 300 : 250, (rh - low) * (n < 4 ? 0.8 : 1.15), w * 0.4);
    bow = n < 4 ? 0.12 : 0;
    pts = range(n).map((i) => [n < 4 ? cx : cx + (i % 2 ? 1 : -1) * w * 0.22, y + rh * (i + 0.5) - low / 2]);
  }
  pts = pts.map(([px, py], i) => {
    const half = Math.max(s / 2, tw(labels[i] ?? '', LABEL) / 2) + 6;
    return [Math.max(x + half, Math.min(a.right(py + s / 2 + low) - half, px)), py];
  });
  return {pts, s, bow, low};
};

/**
 * Steps along a path: landscape a row (an arch for 4 or more), upright a column (a zigzag for 4 or more), a ring when
 * it `loop`s (blood, money, water: `true` closes the path 0.6 s after the last step, a second closes it then). Each step
 * comes in on its `at`, just after the arrow to it draws itself; once two steps are joined, dots keep travelling along
 * the arrows. `active` lights a step up, with a slow pulse, when the voice names it again.
 */
export const Process: React.FC<Box & {steps: (Thing & {at: number})[]; loop?: true | number; active?: Cue}> = ({t, o = 1, steps, loop, active, ...box}) => {
  const a = useArea(box);
  const {hot} = useColors();
  const n = steps.length;
  const {pts, s, bow, low} = pathOf(n, a, loop !== undefined, steps.map((st) => st.label));
  const closes = loop === undefined || n < 2 ? null : loop === true ? steps[n - 1].at + 0.6 : loop;
  const links = [...range(n - 1).map((i) => ({from: i, to: i + 1, at: steps[i + 1].at - 0.35})), ...(closes === null ? [] : [{from: n - 1, to: 0, at: closes}])].map((l) => ({...l, ends: trim(pts[l.from], pts[l.to], s, low)}));
  return (
    <Layer o={o}>
      {links.map((l, k) => (
        <Arrow key={k} pts={l.ends} p={easeOut(t, l.at, 0.5)} bow={bow} w={9} />
      ))}
      <Svg2D>
        {links.flatMap((l, k) =>
          [0, 0.5].map((off) => {
            const u = frac(t * 0.55 + off + k * 0.13);
            const [px, py] = bend(l.ends[0], l.ends[1], bow, 0.04 + 0.8 * u);
            return <circle key={`${k}-${off}`} cx={px} cy={py} r={11} fill={hot} stroke="#ffffff" strokeWidth={3} opacity={ease(t, l.at + 0.5, 0.4) * Math.sin(Math.PI * u)} />;
          }),
        )}
      </Svg2D>
      {steps.map((st, i) => {
        const q = clamp((t - st.at + 0.05) / 0.5);
        const lit = active?.i === i ? ease(t, active.at, 0.3) * (0.8 + 0.2 * Math.sin(t * 4)) : 0;
        const [x, y] = [pts[i][0], pts[i][1] + bob(t, i)];
        return (
          <React.Fragment key={i}>
            <Slot thing={st} x={x} y={y} s={s} q={q} glow={lit} />
            {st.label && <Label x={x} y={y + s / 2 + UNDER} size={LABEL} o={Math.min(1, q * 2)}>{st.label}</Label>}
          </React.Fragment>
        );
      })}
    </Layer>
  );
};

/**
 * The chapters of the video as things on a dotted road (laid out like Process), each on its word ("We'll see how ...").
 * After the last one, a ring travels along them once; `current` (a chapter and the second the voice opens it) glides the
 * ring to that chapter, lights it and dims the others, so a chapter can open on the same map (give `at` 0 or less to
 * the chapters that are already there).
 */
export const VideoMap: React.FC<Box & {chapters: (Thing & {at: number})[]; current?: Cue}> = ({t, o = 1, chapters, current, ...box}) => {
  const a = useArea(box);
  const {hot, soft} = useColors();
  const n = chapters.length;
  const {pts, s, bow, low} = pathOf(n, a, false, chapters.map((c) => c.label));
  // The ring: from the chapter before the current one (or the first), one hop a chapter after the last has come in.
  const start = current ? Math.max(0, current.i - 1) : 0;
  const tour = chapters[n - 1].at + 0.7;
  const where = (tt: number) => range(n - 1 - start).reduce((k, j) => k + easeOut(tt, tour + j * 0.9, 0.7), start);
  const at = (k: number): P2 => {
    const i = Math.min(n - 2, Math.floor(k));
    return i < 0 ? pts[0] : [lerp(pts[i][0], pts[i + 1][0], k - i), lerp(pts[i][1], pts[i + 1][1], k - i)];
  };
  let ring = at(where(t));
  if (current) {
    const g = easeOut(t, current.at, 0.8);
    const [from, to] = [at(where(current.at)), pts[current.i]];
    if (t > current.at) ring = [lerp(from[0], to[0], g), lerp(from[1], to[1], g)];
  }
  const lit = current ? ease(t, current.at + 0.6, 0.4) : 0;
  const ringO = ease(t, Math.min(tour, chapters[start].at + 0.4), 0.4) * (1 - lit);
  const pulse = frac(t / 1.2);
  return (
    <Layer o={o}>
      <Svg2D>
        {range(n - 1).map((i) => {
          const ends = trim(pts[i], pts[i + 1], s, low);
          const p = easeOut(t, chapters[i + 1].at - 0.35, 0.5);
          if (p <= 0.001) return null;
          const d = 'M' + range(25).map((j) => bend(ends[0], ends[1], bow, (p * j) / 24).map((v) => v.toFixed(1)).join(',')).join(' L');
          return <path key={i} d={d} fill="none" stroke={soft} strokeWidth={16} strokeLinecap="round" strokeDasharray="1 30" strokeDashoffset={-t * 30} />;
        })}
      </Svg2D>
      {chapters.map((c, i) => {
        const q = clamp((t - c.at + 0.05) / 0.5);
        const me = current?.i === i;
        const [x, y] = [pts[i][0], pts[i][1] + bob(t, i)];
        const dim = me ? 1 : 1 - 0.4 * lit;
        return (
          <React.Fragment key={i}>
            <Slot thing={c} x={x} y={y} s={s} q={q} dim={dim} glow={me ? lit * (0.8 + 0.2 * Math.sin(t * 4)) : 0} />
            {c.label && <Label x={x} y={y + s / 2 + UNDER} size={LABEL} o={Math.min(1, q * 2) * dim}>{c.label}</Label>}
          </React.Fragment>
        );
      })}
      {ringO > 0.01 &&
        [0, 1].map((k) => (
          <div key={k} style={{position: 'absolute', left: ring[0] - s / 2 - 16, top: ring[1] - s / 2 - 16, width: s + 32, height: s + 32, boxSizing: 'border-box', borderRadius: 40, border: `7px solid ${hot}`, boxShadow: k ? undefined : `0 0 36px ${hot}`, opacity: ringO * (k ? 1 - pulse : 1), transform: `scale(${k ? 1 + 0.14 * pulse : 1})`}} />
        ))}
    </Layer>
  );
};

// ---- Compare ----

/**
 * Two to four things side by side, landscape in columns (bars stand up from one baseline), upright in rows (bars run
 * right from one edge). Each comes in on its `at` with its label and, when given, a bar that grows to its `value` (0 to
 * 1) and a `show` text at the bar's end ("$9 a year"). `win` lifts that thing and lights it in the accent; the others
 * dim to 0.6 and their bars go grey. A light runs up or along the bars all the time.
 */
export const Compare: React.FC<Box & {items: (Thing & {at: number; value?: number; show?: string})[]; win?: Cue}> = ({t, o = 1, items, win, ...box}) => {
  const a = useArea(box);
  const {hot, soft} = useColors();
  const n = items.length;
  const bars = items.some((it) => it.value !== undefined);
  const w = win ? ease(t, win.at, 0.5) : 0;
  const glow = w * (0.8 + 0.2 * Math.sin(t * 3.2));
  const look = (it: (typeof items)[number], i: number) => {
    const me = win?.i === i;
    return {me, q: clamp((t - it.at + 0.05) / 0.5), grow: easeOut(t, it.at + 0.25, 0.9) * clamp(it.value ?? 0), dim: me ? 1 : 1 - 0.4 * w, lift: me ? w : 0, glow: me ? glow : 0};
  };
  const fill = (i: number, me: boolean, horiz = false) => (
    <>
      <div style={{position: 'absolute', inset: 0, background: '#9aa1a9', opacity: me ? 0 : w}} />
      <div style={{position: 'absolute', [horiz ? 'left' : 'bottom']: `${(frac(t / 2.2 + i * 0.3) * 140 - 20).toFixed(1)}%`, [horiz ? 'top' : 'left']: 0, [horiz ? 'bottom' : 'right']: 0, [horiz ? 'width' : 'height']: 60, background: `linear-gradient(${horiz ? 90 : 0}deg, rgba(255,255,255,0), rgba(255,255,255,.45), rgba(255,255,255,0))`}} />
    </>
  );
  if (!a.tall) {
    const cw = a.w / n;
    const s = Math.min(340, cw * 0.62, a.h * (bars ? 0.36 : 0.6));
    const top = bars ? a.y + 40 : a.y + (a.h - s - 90) / 2;
    const [sy, ly, base] = [top + s / 2, top + s + 50, a.y + a.h - 8];
    const room = base - (ly + 116);
    const bw = Math.min(150, cw * 0.42);
    return (
      <Layer o={o}>
        {bars && <div style={{position: 'absolute', left: a.x + 20, top: base, width: a.w - 40, height: 5, borderRadius: 3, background: soft, opacity: ease(t, items[0].at, 0.5)}} />}
        {items.map((it, i) => {
          const L = look(it, i);
          const cx = a.x + cw * (i + 0.5);
          const hb = room * L.grow;
          return (
            <React.Fragment key={i}>
              <Slot thing={it} x={cx} y={sy + bob(t, i)} s={s} q={L.q} dim={L.dim} lift={26 * L.lift} glow={L.glow} />
              {it.label && <Label x={cx} y={ly - 26 * L.lift} size={44} o={Math.min(1, L.q * 2) * L.dim}>{it.label}</Label>}
              {hb > 0.5 && (
                <div style={{position: 'absolute', left: cx - bw / 2, top: base - hb, width: bw, height: hb, borderRadius: '18px 18px 4px 4px', overflow: 'hidden', background: hot, opacity: L.dim, boxShadow: L.glow ? `0 0 ${34 * L.glow}px ${hot}` : undefined}}>
                  {fill(i, L.me)}
                </div>
              )}
              {it.show && <Label x={cx} y={base - hb - 36} size={44} weight={900} o={ease(t, it.at + 0.5, 0.4) * L.dim}>{it.show}</Label>}
            </React.Fragment>
          );
        })}
      </Layer>
    );
  }
  const rh = a.h / n;
  const s = Math.min(260, rh * 0.74, a.w * 0.34);
  const [sx, tx] = [a.x + s / 2 + 14, a.x + s + 54];
  const len = Math.min(...range(n).map((i) => a.right(a.y + rh * (i + 1)))) - tx;
  return (
    <Layer o={o}>
      {items.map((it, i) => {
        const L = look(it, i);
        const y = a.y + rh * (i + 0.5) - 12 * L.lift;
        const wb = len * L.grow;
        return (
          <React.Fragment key={i}>
            <Slot thing={it} x={sx} y={y + bob(t, i)} s={s} q={L.q} dim={L.dim} glow={L.glow} />
            {it.label && <Label x={tx} y={bars ? y - 58 : y} size={44} align="left" o={Math.min(1, L.q * 2) * L.dim}>{it.label}</Label>}
            {wb > 0.5 && (
              <div style={{position: 'absolute', left: tx, top: y - 14, width: wb, height: 44, borderRadius: '4px 22px 22px 4px', overflow: 'hidden', background: hot, opacity: L.dim, boxShadow: L.glow ? `0 0 ${34 * L.glow}px ${hot}` : undefined}}>
                {fill(i, L.me, true)}
              </div>
            )}
            {it.show && <Label x={tx} y={y + 74} size={44} weight={900} align="left" o={ease(t, it.at + 0.5, 0.4) * L.dim}>{it.show}</Label>}
          </React.Fragment>
        );
      })}
    </Layer>
  );
};

// ---- Timeline ----

/**
 * An axis that draws itself as the events come (landscape across, things above it and `when` below; upright down the
 * left, things and words right of it). Each event comes in on its `at` with its `when` text ("2019"), label and thing;
 * a ring glides to the newest event and keeps pulsing; past events dim to 0.6. `now` (a second) adds a `today` mark
 * ("Today") at the end.
 */
export const Timeline: React.FC<Box & {events: (Thing & {at: number; when: string})[]; now?: number; today?: string}> = ({t, o = 1, events, now, today = 'Today', ...box}) => {
  const a = useArea(box);
  const {hot, ink} = useColors();
  const marks = [...events, ...(now === undefined ? [] : [{at: now, when: today}])];
  const m = marks.length;
  const ats = marks.map((e) => e.at);
  const tall = a.tall;
  // Along the axis: x landscape, y upright.
  const step = (tall ? a.h - 40 : a.w - 80) / m;
  const along = (k: number) => (tall ? a.y + 20 : a.x + 40) + step * (k + 0.5);
  const s = tall ? Math.min(280, step * 0.82) : Math.min(320, step * 0.7, a.h * 0.4);
  const slotTop = a.y + (a.h - (s + 230)) / 2;
  // Upright, the axis, the things and their words stand as one block in the middle of the width.
  const words = Math.max(...events.map((e) => Math.max(tw(e.when, 56), tw(e.label ?? '', 44))));
  const dx = tall ? Math.max(0, (a.right(a.y + a.h) - a.x - (80 + s + 34 + words)) / 2) : 0;
  const axis = tall ? a.x + 34 + dx : slotTop + s + 120;
  const [from, to] = tall ? [a.y + 4, a.y + a.h - 4] : [a.x + 10, a.x + a.w - 10];
  const reach = ats.reduce((r, at, k) => r + (along(k) + step * 0.42 - (k ? along(k - 1) + step * 0.42 : from)) * easeOut(t, at - (k ? 0.5 : 0.7), 0.7), from);
  const mark = ats.reduce((r, at, k) => (k ? r + (along(k) - along(k - 1)) * easeOut(t, at, 0.7) : along(0)), 0);
  const pt = (u: number, v: number): P2 => (tall ? [v, u] : [u, v]);
  const pulse = frac(t / 1.3);
  const [mx, my] = pt(mark, axis);
  return (
    <Layer o={o}>
      <Arrow pts={[pt(from, axis), pt(to, axis)]} p={(reach - from) / (to - from)} w={8} />
      <Svg2D>
        {marks.map((e, k) => {
          const [x, y] = pt(along(k), axis);
          const on = ease(t, e.at - 0.1, 0.3);
          return on > 0.01 && <circle key={k} cx={x} cy={y} r={13 * on} fill="#ffffff" stroke={ink} strokeWidth={4} />;
        })}
        {t > ats[0] && (
          <>
            <circle cx={mx} cy={my} r={20} fill={hot} stroke="#ffffff" strokeWidth={4} opacity={ease(t, ats[0], 0.3)} />
            <circle cx={mx} cy={my} r={22 + 26 * pulse} fill="none" stroke={hot} strokeWidth={5} opacity={(1 - pulse) * ease(t, ats[0], 0.3)} />
          </>
        )}
      </Svg2D>
      {marks.map((e, k) => {
        const q = clamp((t - e.at + 0.05) / 0.5);
        const dim = k < m - 1 ? 1 - 0.4 * ease(t, ats[k + 1], 0.5) : 1;
        const ev = k < events.length ? events[k] : null;
        const u = along(k);
        if (tall) {
          const [sx, tx] = [a.x + 80 + dx + s / 2, a.x + 80 + dx + s + 34];
          return (
            <React.Fragment key={k}>
              {ev && <Slot thing={ev} x={sx} y={u + bob(t, k)} s={s} q={q} dim={dim} />}
              <Label x={ev ? tx : a.x + 80 + dx} y={ev?.label ? u - 34 : u} size={56} weight={900} align="left" o={Math.min(1, q * 2) * dim}>{e.when}</Label>
              {ev?.label && <Label x={tx} y={u + 34} size={44} align="left" o={Math.min(1, q * 2) * dim}>{ev.label}</Label>}
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={k}>
            {ev && <Slot thing={ev} x={u} y={slotTop + s / 2 + bob(t, k)} s={s} q={q} dim={dim} />}
            {ev?.label && <Label x={u} y={slotTop + s + 46} size={LABEL} o={Math.min(1, q * 2) * dim}>{ev.label}</Label>}
            <Label x={u} y={axis + 66} size={52} weight={900} o={Math.min(1, q * 2) * dim}>{e.when}</Label>
          </React.Fragment>
        );
      })}
    </Layer>
  );
};

// ---- BigNumber ----

/** `show` with its first number at `c` (0 to 1) of its value, in the same format: "$1,825" -> "$912". */
const counted = (show: string, c: number) => {
  const m = show.match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m || c >= 1) return show;
  const dec = m[2].split('.')[1]?.length ?? 0;
  const v = Number(m[2].replace(/,/g, '')) * c;
  return m[1] + (m[2].includes(',') ? v.toLocaleString('en-US', {minimumFractionDigits: dec, maximumFractionDigits: dec}) : v.toFixed(dec)) + m[3];
};

/**
 * A big number that counts up to its `show` text ("3 billion", "$1,825") on `at` in under a second and then holds, an
 * accent line under it, its `label` below. On `then.at` the everyday comparison comes: the number moves aside (landscape
 * left, upright up) and a white panel fills, one after another, with small copies of `then.thing` (as many as fit, up
 * to about 40: never a count, `then.label` carries it, "= 365 coffees"). A wave of light keeps running through them.
 */
export const BigNumber: React.FC<Box & {at: number; show: string; label?: string; then?: {at: number; thing: Thing; label?: string}}> = ({t, o = 1, at, show, label, then, ...box}) => {
  const a = useArea(box);
  const {hot} = useColors();
  const c = easeOut(t, at, 0.9);
  const mv = then ? easeOut(t, then.at, 0.8) : 0;
  const chars = Math.max(3, show.length) * 0.66;
  const tall = a.tall;
  const size = lerp(Math.min(tall ? 210 : 230, (a.w * 0.88) / chars), Math.min(tall ? 150 : 170, (a.w * (tall ? 0.88 : 0.44)) / chars), mv);
  const nx = lerp(a.x + a.w / 2, tall ? a.x + a.w / 2 : a.x + a.w * 0.25, mv);
  const ny = lerp(a.y + a.h * (tall ? 0.38 : 0.42), tall ? a.y + 130 : a.y + a.h * 0.4, mv);
  const lineW = show.length * size * 0.6 * c;
  const breathe = 1 + 0.015 * Math.sin(t * 2.2) * ease(t, at + 0.9, 0.5);
  // The panel of copies: landscape the right half, upright below the number, kept left of the buttons.
  const cx = tall ? a.x + a.w / 2 : a.x + a.w * 0.76;
  const hw = tall ? Math.min(a.w / 2, a.right(a.y + a.h) - cx) : a.w * 0.23;
  const [py0, py1] = tall ? [a.y + 430, a.y + a.h - 6] : [a.y + 120, a.y + a.h - 6];
  const [gw, gh] = [hw * 2 - 48, py1 - py0 - 48];
  // The grid of up to 40 copies that covers the most of the room, and the panel just around it.
  const [cols, rows, cell] = range(10)
    .map((i): [number, number, number] => [i + 1, Math.floor(40 / (i + 1)), Math.min(gw / (i + 1), gh / Math.floor(40 / (i + 1)))])
    .reduce((b, g) => (g[0] * g[1] * g[2] ** 2 > b[0] * b[1] * b[2] ** 2 ? g : b));
  const [pw, ph] = [cols * cell + 48, rows * cell + 48];
  const py = tall ? py0 : (py0 + py1 - ph) / 2;
  return (
    <Layer o={o}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${breathe})`, transformOrigin: `${nx}px ${ny}px`}}>
        <Label x={nx} y={ny} size={size} weight={900} o={ease(t, at - 0.1, 0.2)}>{counted(show, c)}</Label>
      </div>
      {c > 0.01 && (
        <div style={{position: 'absolute', left: nx - lineW / 2, top: ny + size * 0.52, width: lineW, height: 12, borderRadius: 6, overflow: 'hidden', background: hot}}>
          <div style={{position: 'absolute', top: 0, bottom: 0, width: 90, left: `${(frac(t / 1.8) * 140 - 20).toFixed(1)}%`, background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.7), rgba(255,255,255,0))'}} />
        </div>
      )}
      {label && <Label x={nx} y={ny + size * 0.52 + 62} size={48} o={ease(t, at + 0.3, 0.4)}>{label}</Label>}
      {then && (
        <>
          {then.label && <Label x={cx} y={py - 50} size={52} weight={900} o={ease(t, then.at + 0.2, 0.4)}>{then.label}</Label>}
          <Panel x={cx - pw / 2} y={py} w={pw} h={ph} o={ease(t, then.at, 0.4)}>
            {range(cols * rows).map((k) => {
              const [col, row] = [k % cols, Math.floor(k / cols)];
              const q = clamp((t - then.at - 0.35 - k * 0.045) / 0.35);
              if (q <= 0.01) return null;
              const wave = 1 + 0.09 * Math.max(0, Math.sin(t * 2.6 - (col + row) * 0.55));
              const [x, y] = [24 + (col + 0.5) * cell, 24 + (row + 0.5) * cell];
              return then.thing.art ? (
                <div key={k} style={{position: 'absolute', left: x - cell * 0.43, top: y - cell * 0.43, width: cell * 0.86, height: cell * 0.86, transform: `scale(${settle(q) * wave})`}}>
                  <Picture art={then.thing.art} x={0} y={0} size={cell * 0.86} o={1} />
                </div>
              ) : (
                <div key={k} style={{position: 'absolute', left: x, top: y, transform: `scale(${((cell * 0.8) / 200) * settle(q) * wave})`, transformOrigin: '0 0'}}>
                  {then.thing.draw}
                </div>
              );
            })}
          </Panel>
        </>
      )}
    </Layer>
  );
};

// ---- Ask ----

/**
 * The closing question to the viewer: a big speech bubble with the `question` (short) that pops in on `at`, then a
 * comment card under it whose typing dots keep moving, in the channel's accent.
 */
export const Ask: React.FC<Box & {at: number; question: string}> = ({t, o = 1, at, question, ...box}) => {
  const a = useArea(box);
  const {hot} = useColors();
  const tall = a.tall;
  const q = clamp((t - at) / 0.55);
  const k = clamp((t - at - 0.7) / 0.5);
  const [bx, bw, by] = tall ? [a.x + 10, a.w - 20, a.y + 80] : [a.x + a.w * 0.08, a.w * 0.84, a.y + a.h * 0.08];
  const cy = tall ? a.y + a.h * 0.62 : a.y + a.h * 0.68;
  const [cx0, cx1] = tall ? [a.x + 40, a.right(cy + 170)] : [a.x + a.w * 0.36, a.x + a.w * 0.92];
  const ch = tall ? 160 : 170;
  return (
    <Layer o={o}>
      {q > 0.01 && (
        <div data-box="" style={{position: 'absolute', left: bx, top: by + Math.sin(t * 1.4) * 6, width: bw, boxSizing: 'border-box', padding: tall ? '48px 56px' : '56px 76px', borderRadius: 56, background: '#ffffff', border: `8px solid ${hot}`, boxShadow: '0 18px 50px rgba(0,0,0,.3)', font: `800 ${tall ? 64 : 76}px Montserrat, sans-serif`, color: K.ink, textAlign: 'center', lineHeight: 1.22, opacity: Math.min(1, q * 2), transform: `scale(${0.5 + 0.5 * settle(q)})`, transformOrigin: '20% 100%'}}>
          {question}
          <div style={{position: 'absolute', left: '18%', bottom: -34, width: 56, height: 56, background: '#ffffff', borderRight: `8px solid ${hot}`, borderBottom: `8px solid ${hot}`, transform: 'rotate(45deg)'}} />
        </div>
      )}
      {k > 0.01 && (
        <div style={{position: 'absolute', left: cx0, top: cy, width: cx1 - cx0, height: ch, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 28, padding: '0 34px', borderRadius: 40, background: '#ffffff', boxShadow: '0 14px 40px rgba(0,0,0,.28)', opacity: Math.min(1, k * 2), transform: `scale(${pop(t, at + 0.7, 0.5)})`}}>
          <div style={{position: 'relative', width: 104, height: 104, flex: 'none', borderRadius: 52, background: hot, boxShadow: `0 0 0 ${6 + 6 * Math.sin(t * 3) ** 2}px ${hot}55`}}>
            <svg viewBox="0 0 100 100" style={{position: 'absolute', inset: 0}}>
              <circle cx={50} cy={38} r={17} fill="#ffffff" />
              <path d="M18 86 C22 62 78 62 82 86 Z" fill="#ffffff" />
            </svg>
          </div>
          <div style={{flex: 1, height: 84, borderRadius: 42, background: '#eef0f3', display: 'flex', alignItems: 'center', gap: 18, paddingLeft: 36}}>
            {[0, 1, 2].map((d) => (
              <div key={d} style={{width: 24, height: 24, borderRadius: 12, background: K.muted, transform: `translateY(${-12 * Math.max(0, Math.sin(t * 6 - d * 0.9))}px)`}} />
            ))}
          </div>
          <svg viewBox="0 0 100 100" style={{width: 84, height: 84, flex: 'none'}}>
            <circle cx={50} cy={50} r={48} fill={hot} />
            <path d="M30 50 L70 50 M54 34 L70 50 L54 66" fill="none" stroke="#ffffff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </Layer>
  );
};
