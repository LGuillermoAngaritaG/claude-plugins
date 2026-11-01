// The diagram look (Signal Over Hype's Shorts, adopted 2026-10-31): one engineering diagram of the system the story is
// about, built up through the video. Nodes are dark cards with a line icon and a mono label; elbow edges with arrows
// carry dots and labelled packets; dashed group boxes show where each part lives (a service, a machine, an account);
// a camera pans and zooms over the diagram. Under it a slow slate ground (glow, signal lines, dust, plus grid); over
// it the spoken words popping in one by one (key words big and bold, numbers cyan) and a section heading at the top.
// Guide: the shorts plugin's diagram-video skill and its example (examples/diagram/01-deepseek-superagent).
import React from 'react';
import {Look, SceneProps, VideoDef, Word, frames, FPS} from '../engine';
import {SANS, clamp, ease, easeOut, settle} from './explainer';
import {Page, Shot} from './news';

// Signal Over Hype's colours (src/channels/signal-over-hype.json): teal accent, cyan for what is live, coral for risk.
export const TEAL = '#2bb5b1';
export const HOT = '#3ed0cc';
export const CORAL = '#ee7f5f';
export const INK = '#eef2f3';
export const GREY = '#8e989f';
export const MONO = 'Menlo, monospace';
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// ---- the words: the captions of the look, popping in under the diagram ----

/** Phrases shown in a shorter form than they are said, e.g. "eighty percent" as "80%". Words after the first are hidden. */
export type Swaps = Record<string, string>;
const key = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}%.]/gu, '').replace(/\.$/, '');
const STOP = new Set('a an the of to in on at is it its it\'s and or but for from by with as be this that there here what how so if can will just you your they their them we our do does not no than then when where which who'.split(' '));

type Shown = Word & {text: string; kind: 'stop' | 'plain' | 'hot' | 'num'};
type Group = Shown[];

/** The words of each line, with swaps applied and a kind each, cut into groups: a new group at a sentence end, at a comma once it has four words, and at nine words. */
const groupsOf = (words: Word[][], hot: Set<string>, swaps: Swaps): Group[] => {
  const out: Group[] = [];
  for (const line of words) {
    const shown: Shown[] = [];
    for (let i = 0; i < line.length; i++) {
      const swap = Object.entries(swaps).find(([p]) => {
        const ws = p.split(' ');
        return ws.every((w, j) => line[i + j] && key(line[i + j].w) === key(w));
      });
      if (swap) {
        const n = swap[0].split(' ').length;
        const tail = line[i + n - 1].w.match(/[.,;:?!]+$/)?.[0] ?? '';
        shown.push({...line[i], end: line[i + n - 1].end, text: swap[1] + tail, kind: 'num'});
        i += n - 1;
        continue;
      }
      const w = line[i];
      const k = key(w.w);
      shown.push({...w, text: w.w, kind: /\d/.test(k) ? 'num' : hot.has(k) ? 'hot' : STOP.has(k) ? 'stop' : 'plain'});
    }
    let g: Group = [];
    for (const w of shown) {
      g.push(w);
      if (/[.?!:]$/.test(w.text) || (/[,;]$/.test(w.text) && g.length >= 4) || g.length >= 9) {
        out.push(g);
        g = [];
      }
    }
    if (g.length) out.push(g);
  }
  return out;
};

const STYLE = {
  stop: {size: 46, weight: 400, color: '#8e989f'},
  plain: {size: 54, weight: 500, color: '#d3dade'},
  hot: {size: 68, weight: 800, color: '#ffffff'},
  num: {size: 72, weight: 800, color: HOT},
};

/**
 * The overlay of the look: the group of words being said, centred around y = 1240, each word popping in on its own
 * time (a small rise, a scale from 0.7 and a blur that clears); the group blurs out just before the next one starts.
 */
export const diagramWords = (hot: string[], swaps: Swaps = {}): React.FC<SceneProps> => ({t, words}) => {
  const groups = groupsOf(words, new Set(hot.map(key)), swaps);
  const k = groups.findIndex((g, i) => t >= g[0].at - 0.08 && (i === groups.length - 1 || t < groups[i + 1][0].at - 0.08));
  if (k < 0) return null;
  const g = groups[k];
  const next = groups[k + 1]?.[0].at;
  const gone = next === undefined ? 0 : ease(t, next - 0.2, 0.12);
  return (
    <div data-box="" style={{position: 'absolute', left: 90, width: 900, top: 1240, transform: 'translateY(-50%)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', columnGap: 16, rowGap: 4, font: `400 46px ${SANS}`, opacity: 1 - gone, filter: gone > 0 ? `blur(${(gone * 10).toFixed(1)}px)` : undefined, lineHeight: 1.12}}>
      {g.map((w, i) => {
        const p = easeOut(t, w.at - 0.08, 0.22);
        const s = STYLE[w.kind];
        return (
          <span key={i} style={{font: `${s.weight} ${s.size}px ${SANS}`, color: s.color, opacity: clamp(p * 1.6), transform: `translateY(${((1 - p) * 22).toFixed(1)}px) scale(${(0.7 + 0.3 * settle(p)).toFixed(3)})`, filter: p < 1 ? `blur(${((1 - p) * 8).toFixed(1)}px)` : undefined, display: 'inline-block', letterSpacing: s.weight > 700 ? -1 : 0}}>
            {w.text}
          </span>
        );
      })}
    </div>
  );
};


/** The look: upright, the words as the overlay. `hot` words show big and bold; `swaps` show a phrase shorter ("80%"). */
export const DIAGRAM = (hot: string[], swaps: Swaps = {}): Look => ({
  w: 1080,
  h: 1920,
  bg: BG,
  safe: [70, 220, 1010, 1520],
  minText: 28,
  fonts: [`800 40px ${SANS}`, `400 40px ${SANS}`, `700 32px ${MONO}`],
  cut: true,
  overlay: diagramWords(hot, swaps),
});

// ---- the ground ----

/** A faint grid of plus signs in the visual zone, fading out to the edges. */
const PLUS = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><path d="M36 30v12M30 36h12" stroke="#ffffff" stroke-opacity="0.06" stroke-width="2"/></svg>')}")`;
// Deep slate with a teal cast, lighter than the channel's near-black (the user found it too black, 2026-10-31).
// The channel's grounds replace a look's bg, so Ground paints this itself.
const BG = 'linear-gradient(180deg, #121a21 0%, #162229 45%, #111820 100%)';

/** One thin signal line across the frame: a few slow sines, flat at the sides. */
const wave = (t: number, y: number, amp: number, k: number, speed: number, seed: number) => {
  let d = '';
  for (let x = -20; x <= 1100; x += 20) {
    const env = Math.sin(Math.PI * clamp((x + 20) / 1120));
    const v = Math.sin(x * k + t * speed + seed) + 0.45 * Math.sin(x * k * 2.3 - t * speed * 0.7 + seed * 1.7);
    d += `${x < 0 ? 'M' : 'L'}${x} ${(y + amp * env * v).toFixed(1)}`;
  }
  return d;
};

const WAVES = [
  {y: 1600, amp: 46, k: 0.006, speed: 0.35, seed: 0, o: 0.22, w: 2.5},
  {y: 1620, amp: 34, k: 0.0075, speed: -0.28, seed: 2.1, o: 0.14, w: 2},
  {y: 1585, amp: 58, k: 0.0048, speed: 0.22, seed: 4.4, o: 0.09, w: 1.5},
  {y: 330, amp: 30, k: 0.0055, speed: -0.2, seed: 1.3, o: 0.08, w: 1.5},
];

/** Specks of dust rising slowly, a few in front, most far back. */
const MOTES = Array.from({length: 28}, (_, i) => {
  const r = (n: number) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1;
  const z = Math.abs(r(3));
  return {x: Math.abs(r(1)) * 1080, y0: Math.abs(r(2)) * 1920, z, rise: 8 + 22 * z, sway: 6 + 14 * Math.abs(r(4)), ph: Math.abs(r(5)) * 6.28};
});

/** The moving ground under every scene: a teal glow drifting, signal lines flowing, dust rising, the plus grid.
 *  Slow and dim so it never pulls the eye from the visual. `t` is the time in the whole video. */
export const Ground: React.FC<{t: number}> = ({t}) => {
  const gx = 540 + 160 * Math.sin(t * 0.07);
  const gy = 760 + 120 * Math.sin(t * 0.05 + 1);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: BG}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle 620px at ${gx.toFixed(0)}px ${gy.toFixed(0)}px, rgba(43,181,177,0.13), transparent 70%), radial-gradient(circle 520px at ${(1080 - gx).toFixed(0)}px 1580px, rgba(43,181,177,0.08), transparent 70%)`}} />
      <div style={{position: 'absolute', left: 0, top: 160, width: 1080, height: 1000, backgroundImage: PLUS, backgroundPosition: `${(t * 6) % 72}px 0`, WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 30%, transparent 75%)'}} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {WAVES.map((v, i) => (
          <path key={i} d={wave(t, v.y, v.amp, v.k, v.speed, v.seed)} fill="none" stroke={HOT} strokeOpacity={v.o} strokeWidth={v.w} strokeLinecap="round" />
        ))}
        {MOTES.map((m, i) => {
          const y = ((m.y0 - t * m.rise) % 1920 + 1920) % 1920;
          return <circle key={i} cx={m.x + m.sway * Math.sin(t * 0.3 + m.ph)} cy={y} r={1.2 + 2.6 * m.z} fill={HOT} opacity={(0.08 + 0.22 * m.z) * (0.6 + 0.4 * Math.sin(t * 0.5 + m.ph))} />;
        })}
      </svg>
    </div>
  );
};

// ---- icons: 24 x 24 line drawings ----

const ICON: Record<string, React.ReactNode> = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="1.5" /><rect x="9.5" y="9.5" width="5" height="5" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
  hub: <><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" /><path d="M12 7.5v4M12 11.5 6.8 17.2M12 11.5l5.2 5.7" /></>,
  repo: <><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="7" r="2" /><path d="M6 7v10M18 9c0 5-6 4-11 8.5" /></>,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  ticket: <><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5z" /><path d="M14 6v12" strokeDasharray="2 2" /></>,
  folder: <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  merge: <><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /><path d="M6 7v10M18 17V10a3 3 0 0 0-3-3h-4M13 4.5 10.5 7 13 9.5" /></>,
  monitor: <><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></>,
  terminal: <><rect x="2.5" y="4" width="19" height="16" rx="2" /><path d="m7 10 3 2.5L7 15M12 15h5" /></>,
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.7 12.3 20 3M15.5 7.5l3 3M18 5l2 2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  warning: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  flask: <path d="M9 3h6M10 3v6L4.3 18.5A2 2 0 0 0 6 21.5h12a2 2 0 0 0 1.7-3L14 9V3M7 15h10" />,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
};

export const Icon: React.FC<{name: string; size: number; color: string; draw?: number; width?: number}> = ({name, size, color, draw = 1, width = 1.8}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={{display: 'block', overflow: 'visible'}}>
    <g pathLength={1} strokeDasharray={draw < 1 ? `${draw * 80} 80` : undefined}>{ICON[name]}</g>
  </svg>
);

// ---- the camera over the diagram ----

/** Camera keys: [time, x, y, zoom]: the diagram point (x, y) at the middle of the stage (540, 790), scaled by zoom. */
export type View = [number, number, number, number];
export const viewAt = (t: number, keys: View[]) => {
  let i = keys.findIndex((k) => k[0] > t);
  if (i < 0) i = keys.length;
  const a = keys[Math.max(0, i - 1)];
  const b = keys[Math.min(keys.length - 1, i)];
  const u = b[0] === a[0] ? 1 : ease(t, a[0], b[0] - a[0]);
  // a slow drift so the picture is never still
  return {x: lerp(a[1], b[1], u) + Math.sin(t * 0.4) * 6, y: lerp(a[2], b[2], u) + Math.sin(t * 0.33 + 1) * 5, z: lerp(a[3], b[3], u)};
};

/** The camera now, for the parts that hide themselves outside the stage. */
const Cam = React.createContext({x: 0, y: 0, z: 1});
/** The stage on screen: between the heading and the words. */
const STAGE = {l: 60, r: 1020, t: 400, b: 1160};
/** 1 when the diagram box (centre x, y, size w, h) is on the stage, fading to 0 within 40 px outside it. */
const useShown = (x: number, y: number, w: number, h: number) => {
  const v = React.useContext(Cam);
  const sx = 540 + (x - v.x) * v.z;
  const sy = 790 + (y - v.y) * v.z;
  const m = Math.min(sx - (w * v.z) / 2 - STAGE.l, STAGE.r - sx - (w * v.z) / 2, sy - (h * v.z) / 2 - STAGE.t, STAGE.b - sy - (h * v.z) / 2);
  return clamp(1 + m / 40);
};

/** The slate ground, then the diagram world moved by the camera, seen through the stage (soft edges at the heading and
 *  the words). `T` is the time in the whole video, for the ground. */
export const Board: React.FC<{T: number; view: {x: number; y: number; z: number}; children: React.ReactNode}> = ({T, view, children}) => (
  <>
    <Ground t={T} />
    <div style={{position: 'absolute', inset: 0, WebkitMaskImage: `linear-gradient(to bottom, transparent ${STAGE.t - 30}px, #000 ${STAGE.t + 20}px, #000 ${STAGE.b - 20}px, transparent ${STAGE.b + 30}px)`}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `translate(${540 - view.x * view.z}px, ${790 - view.y * view.z}px) scale(${view.z})`, transformOrigin: '0 0'}}>
        <Cam.Provider value={view}>{children}</Cam.Provider>
      </div>
    </div>
  </>
);

/** The heading at the top, there for the whole scene: the key word of the section and a small mono line under it. */
export const Top: React.FC<{t: number; word: string; sub?: string}> = ({t, word, sub}) => {
  const p = settle(easeOut(t, -0.2, 0.45));
  return (
    <div style={{position: 'absolute', left: 80, top: 236, transform: `translateX(${(1 - p) * -60}px)`, opacity: Math.min(1, p)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 14, height: 64, borderRadius: 7, background: TEAL, boxShadow: `0 0 18px ${TEAL}`}} />
        <div data-box="" style={{font: `900 64px ${SANS}`, color: '#ffffff', letterSpacing: -1, lineHeight: 1, whiteSpace: 'nowrap'}}>{word}</div>
      </div>
      {sub && <div data-box="" style={{marginTop: 14, marginLeft: 32, font: `700 28px ${MONO}`, letterSpacing: 2, color: GREY, whiteSpace: 'nowrap'}}>{sub}</div>}
    </div>
  );
};

// ---- nodes ----

export type State = 'ghost' | 'idle' | 'on' | 'risk' | 'done' | 'off';
const tone = (s: State) => ({ghost: GREY, idle: '#b9c3c8', on: HOT, risk: CORAL, done: '#ffffff', off: '#5d676e'})[s];

/**
 * A node: a dark card with an icon and a mono label (and a smaller line under it), centred on x, y in the diagram. It
 * draws itself in from `at` (border, then icon, then text); `state` sets its colour and glow, `pulse` a beat of light.
 * `badge` puts a small round icon on its top-right corner from `badgeAt`.
 */
export const Node: React.FC<{t: number; x: number; y: number; at: number; icon: string; label: string; sub?: string; state?: State; w?: number; out?: number; badge?: string; badgeAt?: number; badgeColor?: string; children?: React.ReactNode}> = ({t, x, y, at, icon, label, sub, state = 'idle', w = 300, out = 1e9, badge, badgeAt = 1e9, badgeColor = CORAL, children}) => {
  const view = React.useContext(Cam);
  // as wide as its text needs (32 px mono label, 28 px mono line under it), never narrower than `w`
  w = Math.max(w, Math.ceil(120 + Math.max(label.length * 19.5, (sub?.length ?? 0) * 17)));
  const h = sub ? 150 : 120;
  const words = view.z >= 0.6; // zoomed far out the cards keep only their icons
  const shown = useShown(x, y, w + 40, h + 40);
  const p = easeOut(t, at, 0.5);
  if (p <= 0 || t > out + 0.4 || shown <= 0.02) return null;
  const gone = 1 - (1 - ease(t, out, 0.4)) * shown;
  const c = tone(state);
  const glow = state === 'on' || state === 'risk' ? 0.5 + 0.25 * Math.sin(t * 4 + x) : 0;
  const bp = settle(easeOut(t, badgeAt, 0.35));
  return (
    <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: Math.min(1, p * 2) * (1 - gone), transform: `scale(${(0.85 + 0.15 * settle(p)).toFixed(3)})`}}>
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={18} fill={state === 'ghost' ? 'rgba(20,28,34,.35)' : 'rgba(16,24,30,.92)'} stroke={c} strokeWidth={state === 'ghost' ? 2 : 3} strokeDasharray={state === 'ghost' ? '10 8' : `${(p * (w + h) * 2).toFixed(0)} ${(w + h) * 2}`} style={{filter: glow ? `drop-shadow(0 0 ${14 * glow}px ${c})` : undefined}} />
      </svg>
      <div style={{position: 'absolute', left: 22, top: 0, height: h, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 64, height: 64, borderRadius: 14, background: state === 'ghost' ? 'transparent' : `${c}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none'}}>
          <Icon name={icon} size={44} color={c} draw={clamp((t - at - 0.15) / 0.5)} />
        </div>
        {words && <div style={{opacity: clamp((t - at - 0.25) / 0.3)}}>
          <div data-box="" style={{font: `700 32px ${MONO}`, color: state === 'ghost' || state === 'off' ? GREY : INK, whiteSpace: 'nowrap'}}>{label}</div>
          {sub && <div data-box="" style={{marginTop: 6, font: `700 28px ${MONO}`, color: state === 'risk' ? CORAL : GREY, whiteSpace: 'nowrap'}}>{sub}</div>}
        </div>}
      </div>
      {children}
      {badge && bp > 0 && (
        <div style={{position: 'absolute', right: -18, top: -18, width: 48, height: 48, borderRadius: 24, background: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${bp.toFixed(3)})`, boxShadow: `0 0 16px ${badgeColor}aa`}}>
          <Icon name={badge} size={28} color="#0f171c" width={3} />
        </div>
      )}
    </div>
  );
};

/** A thin bar inside a node that fills from `at` over `len` seconds: a worker at work. */
export const Progress: React.FC<{t: number; at: number; len: number; w: number; done?: number}> = ({t, at, len, w, done = 1e9}) => {
  const v = t > done ? 1 : clamp((t - at) / len) * 0.92;
  return (
    <div style={{position: 'absolute', left: 22, right: 22, bottom: 14, height: 8, borderRadius: 4, background: '#26323a'}}>
      <div style={{width: `${(v * 100).toFixed(1)}%`, height: '100%', borderRadius: 4, background: t > done ? '#ffffff' : HOT, boxShadow: `0 0 10px ${HOT}88`}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: w, height: 8}} />
    </div>
  );
};

// ---- edges ----

type P = [number, number];
const segLens = (pts: P[]) => pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
/** The point `u` (0..1) of the way along the polyline. */
export const along = (pts: P[], u: number): P => {
  const L = segLens(pts);
  let d = clamp(u) * L.reduce((a, v) => a + v, 0);
  for (let i = 0; i < L.length; i++) {
    if (d <= L[i] || i === L.length - 1) {
      const k = L[i] ? Math.min(1, d / L[i]) : 0;
      return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)];
    }
    d -= L[i];
  }
  return pts[pts.length - 1];
};
const dOf = (pts: P[]) => pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]} ${q[1]}`).join('');

/**
 * An edge through `pts` (elbows), drawn in from `at`, with an arrow at its end. `flow` > 0 runs dots along it (that many
 * per second, from `flowAt`); `dash` makes it a dashed, marching line (polling). `label` sits at its middle.
 * `cut` from that time on: the line greys out and a cross sits at `cutAt` (0..1 along it).
 */
export const Edge: React.FC<{t: number; pts: P[]; at: number; color?: string; flow?: number; flowAt?: number; flowTo?: number; dash?: boolean; label?: string; labelAt?: number; labelOut?: number; labelU?: number; labelDy?: number; cut?: number; cutU?: number; out?: number; width?: number}> = ({t, pts, at, color = '#b9c3c8', flow = 0, flowAt, flowTo = 1e9, dash, label, labelAt, labelU = 0.5, labelDy = -34, cut = 1e9, cutU = 0.6, out = 1e9, width = 4, labelOut = 1e9}) => {
  const p = ease(t, at, 0.6);
  if (p <= 0 || t > out + 0.4) return null;
  const gone = ease(t, out, 0.4);
  const cutp = ease(t, cut, 0.3);
  const col = cutp > 0.5 ? '#4a555c' : color;
  const L = segLens(pts).reduce((a, v) => a + v, 0);
  const end = along(pts, 1);
  const prev = along(pts, 1 - 24 / L);
  const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
  const f0 = flowAt ?? at + 0.6;
  const dots: React.ReactNode[] = [];
  if (flow > 0 && t > f0 && cutp < 0.5) {
    const speed = 420; // px a second
    const n = Math.ceil((L / speed) * flow) + 1;
    for (let i = 0; i < n; i++) {
      const born = f0 + (Math.floor((t - f0) * flow) - i) / flow;
      if (born < f0 || born > flowTo) continue;
      const u = ((t - born) * speed) / L;
      if (u < 0 || u > 1) continue;
      const [x, y] = along(pts, u);
      dots.push(<circle key={i} cx={x} cy={y} r={7} fill={color} style={{filter: `drop-shadow(0 0 8px ${color})`}} />);
    }
  }
  const [lx, ly] = along(pts, labelU);
  const [cx, cy] = along(pts, cutU);
  const labelShown = useShown(lx, ly + labelDy, (label?.length ?? 0) * 17 + 40, 44) * (1 - ease(t, labelOut, 0.3)) * (React.useContext(Cam).z >= 0.6 ? 1 : 0);
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: 1 - gone}}>
      <path d={dOf(pts)} fill="none" stroke={col} strokeWidth={width} strokeLinejoin="round" pathLength={1} strokeDasharray={dash ? undefined : `${p} 1`} opacity={0.85} />
      {dash && <path d={dOf(pts)} fill="none" stroke={TEAL} strokeWidth={width} strokeDasharray="14 14" strokeDashoffset={-t * 40} opacity={p} />}
      {p > 0.95 && <path d="M-16 -10 L0 0 L-16 10" transform={`translate(${end[0]} ${end[1]}) rotate(${(ang * 180) / Math.PI})`} fill="none" stroke={col} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />}
      {dots}
      {cutp > 0 && (
        <g transform={`translate(${cx} ${cy}) scale(${settle(cutp)})`}>
          <circle r={24} fill={CORAL} />
          <path d="M-9 -9 9 9M9 -9 -9 9" stroke="#0f171c" strokeWidth={5} strokeLinecap="round" />
        </g>
      )}
      {label && labelShown > 0.02 && (labelAt === undefined || t > labelAt) && (
        <foreignObject x={lx - 300} y={ly + labelDy - 22} width={600} height={44} opacity={(labelAt === undefined ? p : ease(t, labelAt, 0.3)) * labelShown}>
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <span data-box="" style={{font: `700 28px ${MONO}`, color: cutp > 0.5 ? GREY : color, background: 'rgba(14,20,26,.85)', padding: '2px 10px', borderRadius: 8, whiteSpace: 'nowrap'}}>{label}</span>
          </div>
        </foreignObject>
      )}
    </svg>
  );
};

/** A labelled packet riding along `pts` from `at` for `len` seconds; `stop` (0..1) halts it there and turns it coral, refused. */
export const Packet: React.FC<{t: number; pts: P[]; at: number; len?: number; text: string; color?: string; stop?: number}> = ({t, pts, at, len = 1.1, text, color = HOT, stop}) => {
  const u0 = clamp((t - at) / len);
  if (t < at || (stop === undefined && u0 >= 1 && t > at + len + 0.3)) return null;
  const e = u0 * u0 * (3 - 2 * u0);
  const u = stop === undefined ? e : Math.min(e, stop);
  const refused = stop !== undefined && e >= stop;
  const fall = refused ? clamp((t - at - len * 0.75) / 0.6) : 0;
  if (fall >= 1) return null;
  const [x, y] = along(pts, u);
  const far = React.useContext(Cam).z < 0.6; // zoomed far out: a glowing dot, no words
  const shown = useShown(x, y, far ? 40 : text.length * 17 + 60, far ? 40 : 50);
  if (shown <= 0.02) return null;
  const c = refused ? CORAL : color;
  if (far) return <div style={{position: 'absolute', left: x - 16, top: y - 16 + fall * 60, width: 32, height: 32, borderRadius: 16, background: c, opacity: (1 - fall) * shown, boxShadow: `0 0 24px ${c}`}} />;
  return (
    <div style={{position: 'absolute', left: x, top: y + fall * 60, transform: 'translate(-50%, -50%)', opacity: (1 - fall) * shown, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 22, background: '#0f171c', border: `3px solid ${c}`, boxShadow: `0 0 18px ${c}88`, whiteSpace: 'nowrap'}}>
      {refused && <Icon name="x" size={24} color={CORAL} width={3.5} />}
      <span data-box="" style={{font: `700 28px ${MONO}`, color: c}}>{text}</span>
    </div>
  );
};

/** A dashed group box with a mono name in its top-left corner, drawn in from `at`. */
export const Group: React.FC<{t: number; x: number; y: number; w: number; h: number; at: number; label: string; color?: string; out?: number; right?: boolean; bottom?: boolean}> = ({t, x, y, w, h, at, label, color = GREY, out = 1e9, right, bottom}) => {
  const p = ease(t, at, 0.9);
  const labelShown = useShown(right ? x + w - 26 - label.length * 9 : x + 26 + label.length * 9, bottom ? y + h : y, label.length * 18 + 30, 44) * (React.useContext(Cam).z >= 0.6 ? 1 : 0);
  if (p <= 0 || t > out + 0.4) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: 1 - ease(t, out, 0.4)}}>
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <rect x={0} y={0} width={w} height={h} rx={28} fill={`${color}0d`} stroke={color} strokeWidth={3} strokeDasharray="16 12" strokeDashoffset={-t * 12} opacity={p} />
      </svg>
      <div data-box="" style={{position: 'absolute', ...(right ? {right: 26} : {left: 26}), top: bottom ? h - 20 : -20, padding: '2px 12px', background: '#152027', borderRadius: 8, font: `700 28px ${MONO}`, letterSpacing: 2, color, opacity: clamp(p * 2), whiteSpace: 'nowrap'}}>{labelShown > 0.02 ? label : ''}</div>
    </div>
  );
};


// ---- time: a diagram keeps its state across scenes, so its events are placed in whole-video seconds ----

type Clip = {dur: number; gap?: number; words?: [string, number, number][]};
type ScriptLike = {pace?: number[]; scenes: {id: string}[]};
/**
 * The clock of one video: `T0[scene]` (when a scene starts), `line(scene, i)` (when its line i starts) and
 * `W(scene, i, word, n)` (when `word` is said, its n-th time, in line i), all in whole-video seconds.
 */
export const clock = (script: ScriptLike, timing0: Record<string, Clip[]>) => {
  // a new video has no timing until the voice step: count its scenes as empty rather than fail at import
  const timing = Object.fromEntries(script.scenes.map((s) => [s.id, timing0[s.id] ?? []]));
  const T0: Record<string, number> = Object.fromEntries(script.scenes.map((s, i) => [s.id, frames({script: {...script, scenes: script.scenes.slice(0, i)}, timing} as unknown as VideoDef) / FPS]));
  const [lead, gap] = script.pace ?? [0.2, 0.15];
  const line = (sc: string, i: number) => T0[sc] + lead + timing[sc].slice(0, i).reduce((a, c) => a + c.dur + (c.gap ?? gap), 0);
  const k = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const W = (sc: string, i: number, word: string, n = 0) => {
    const hits = (timing[sc][i].words ?? []).filter((x) => k(x[0]).startsWith(k(word)));
    if (!hits[n]) throw new Error(`${sc} line ${i} does not say "${word}"${n ? ` ${n + 1} times` : ''}`);
    return line(sc, i) + hits[n][1];
  };
  return {T0, line, W};
};

/** A real page (scripts/shots.mjs) on a card tilted in 3D over a dimmed diagram, from `at` to `off` (whole-video seconds). */
export const Proof: React.FC<{G: number; at: number; off: number; shot: Shot; date: string; mark?: number}> = ({G, at, off, shot, date, mark}) => {
  if (G < at - 0.05 || G > off + 0.05) return null;
  const p = easeOut(G, at, 0.4);
  const gone = ease(G, off - 0.2, 0.2);
  const swing = 1 - easeOut(G, at, 2.5);
  return (
    <div style={{position: 'absolute', inset: 0, background: `rgba(14,22,28,${(0.55 * Math.min(p, 1 - gone)).toFixed(2)})`}}>
      <div style={{position: 'absolute', inset: 0, opacity: Math.min(p, 1 - gone), filter: gone > 0 ? `blur(${(gone * 16).toFixed(1)}px)` : undefined, transform: `perspective(1800px) translateY(${60 + (1 - p) * 120}px) rotateX(${(6 + 8 * swing).toFixed(2)}deg) rotateY(${(-14 * swing - 3).toFixed(2)}deg) scale(0.94)`, transformOrigin: '540px 560px'}}>
        <Page shot={shot} t={G} date={date} mark={mark} />
      </div>
    </div>
  );
};

/**
 * A scene of a diagram video: the board with the whole diagram (drawn at whole-video time G), the camera from `view`,
 * then `extra(G)` (real pages) and the section heading. Every scene of a video draws the same diagram.
 */
export const sceneOf = (T0: Record<string, number>, id: string, word: string, sub: string, Diagram: React.FC<{G: number}>, view: View[], extra: (G: number) => React.ReactNode = () => null): React.FC<SceneProps> => ({t}) => {
  const G = T0[id] + t;
  return (
    <>
      <Board T={G} view={viewAt(G, view)}>
        <Diagram G={G} />
      </Board>
      {extra(G)}
      <Top t={t} word={word} sub={sub} />
    </>
  );
};

/** A quiet whoosh before every camera move of a scene (moves that start inside it). */
export const whooshes = (T0: Record<string, number>, view: View[]) => (id: string) => {
  const ids = Object.keys(T0).sort((a, b) => T0[a] - T0[b]);
  const end = ids.indexOf(id) < ids.length - 1 ? T0[ids[ids.indexOf(id) + 1]] : 1e9;
  return view
    .filter(([at], i) => i > 0 && at >= T0[id] && at < end && view[i - 1][0] < at - 0.5 && (view[i - 1][1] !== view[i][1] || view[i - 1][2] !== view[i][2]))
    .map(([at]) => ({at: Math.max(0, at - 0.6 - T0[id]), name: 'whoosh', vol: 0.1}));
};
