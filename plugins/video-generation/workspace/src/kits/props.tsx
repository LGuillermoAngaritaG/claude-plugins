// Props for the explainer look: everyday objects drawn with detail (a filled body, thickness, a highlight, a soft
// shadow, the parts that make each one recognisable), so a scene places a person, a phone or a clock in one line and
// every video draws them the same way. Each prop sits in frame pixels: `x`, `y` its centre, `s` its height in px, `o`
// (0 to 1) its opacity and its entrance (it grows from 80 % with a small overshoot). Each draws its own absolutely
// placed <svg>, so it works anywhere in a scene (no Svg2D needed), and is a pure function of its props: drive its
// motion with t. Text inside a prop is real text in the look's font (`data-box`), checked by scripts/stills.mjs: give
// the prop a size that keeps it 28 px or more (the smallest `s` is named in each prop's comment). Text that is part
// of the drawing (a clock's numbers, a coin's mark, a calendar's month) is not checked: it is read as a picture.
import React from 'react';
import {K, SANS, clamp, lerp, settle, useTheme} from './explainer';

type P2 = [number, number];
const TAU = Math.PI * 2;
const f = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;
const smooth = (p: number) => {
  const q = clamp(p);
  return q * q * (3 - 2 * q);
};
const frac = (n: number) => n - Math.floor(n);

/** A colour mixed toward white (k > 0) or black (k < 0) by |k|: the lit and the shaded side of one fill. */
export const tint = (hex: string, k: number) => {
  const h = hex.length === 4 ? hex.replace(/\w/g, (c) => c + c) : hex;
  const n = parseInt(h.slice(1, 7), 16);
  return '#' + [16, 8, 0].map((b) => Math.round(lerp((n >> b) & 255, k > 0 ? 255 : 0, Math.abs(k))).toString(16).padStart(2, '0')).join('');
};

/** The outline of a prop `s` px tall, in its units (the prop is 100 units tall): about 3 px on screen. */
const line = (s: number) => (Math.min(4, Math.max(1.5, s / 100)) * 100) / s;
const LINE = 'rgba(29,31,34,.6)';

/** The box of a prop: `w` x 100 units, shown `s` px tall around x, y, with a soft shadow below it (`lift` = how far). */
const Shell: React.FC<{x: number; y: number; s: number; w: number; o: number; lift?: number; tf?: string; children: React.ReactNode}> = ({x, y, s, w, o, lift = 1, tf = '', children}) =>
  o <= 0.01 ? null : (
    <div style={{position: 'absolute', left: f(x - (s * w) / 200), top: f(y - s / 2), width: f((s * w) / 100), height: s, opacity: clamp(o), transform: `${tf} scale(${f(0.8 + 0.2 * settle(o))})`, filter: lift > 0 ? `drop-shadow(0 ${f(s * 0.022 * lift)}px ${f(s * 0.028 * lift)}px rgba(18,28,40,.32))` : undefined}}>
      {children}
    </div>
  );

/** One SVG layer of a prop in its units: 0, 0 is the centre, y runs from -50 (top) to 50 (bottom). */
const Layer: React.FC<{w: number; children: React.ReactNode}> = ({w, children}) => (
  <svg viewBox={`${-w / 2} -50 ${w} 100`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
    {children}
  </svg>
);

/** Text at x, y in a prop's units (k = px per unit), centred there, `size` units tall; `pic` for text that is part of the drawing. */
const Txt: React.FC<{k: number; x: number; y: number; size: number; color: string; weight?: number; o?: number; tf?: string; shadow?: string; pic?: boolean; children: React.ReactNode}> = ({k, x, y, size, color, weight = 800, o = 1, tf = '', shadow, pic, children}) => (
  <div data-box={pic ? undefined : ''} style={{position: 'absolute', left: `calc(50% + ${f(x * k)}px)`, top: `calc(50% + ${f(y * k)}px)`, transform: `translate(-50%, -50%) ${tf}`, font: `${weight} ${f(size * k)}px ${SANS}`, lineHeight: 1, color, whiteSpace: 'nowrap', opacity: o, textShadow: shadow}}>
    {children}
  </div>
);

/** A round-ended stroke through `pts` with a darker outline: a limb, a sleeve. */
const Stroke: React.FC<{pts: P2[]; w: number; c: string; ow: number}> = ({pts, w, c, ow}) => {
  const d = 'M' + pts.map(([px, py]) => `${f(px)},${f(py)}`).join(' L');
  return (
    <>
      <path d={d} fill="none" stroke={tint(c, -0.4)} strokeWidth={w + 2 * ow} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
};

/** Two bones from `at`: l1 long at angle a, then l2 at angle b (degrees from straight down, positive toward +x). */
const bones = (at: P2, a: number, l1: number, b: number, l2: number): P2[] => {
  const p: P2 = [at[0] + Math.sin(rad(a)) * l1, at[1] + Math.cos(rad(a)) * l1];
  return [at, p, [p[0] + Math.sin(rad(b)) * l2, p[1] + Math.cos(rad(b)) * l2]];
};

// ---- Person ----

const PANTS = '#3c4656';
const SHOE = '#2a2e35';
const HAIR = '#3a2a22';

/**
 * A friendly flat figure, `s` px from hair to soles (default 260; at phone size 150 or more). `color` = the shirt,
 * `skin`, `hair`. `walk` (any real number, one stride per 1) turns it side on, facing `dir` (1 right, -1 left), and
 * walks it on the spot: move x with it, about 0.45 s per step looks natural, `walk={t / 1.1}`. `wave` 0 to 1 plays
 * one wave (the arm goes up, the hand waves three times, it comes down). `slump` 0 upright and smiling, 1 sad: the
 * head drops, the shoulders sink, the mouth turns down.
 */
export const Person: React.FC<{x: number; y: number; s?: number; o?: number; color?: string; skin?: string; hair?: string; walk?: number; wave?: number; slump?: number; dir?: 1 | -1}> = ({x, y, s = 260, o = 1, color, skin = '#eebc94', hair = HAIR, walk, wave = 0, slump = 0, dir = 1}) => {
  const theme = useTheme();
  const shirt = color ?? theme?.accent ?? K.blue;
  const ow = line(s);
  const q = smooth(slump);
  const up = wave > 0 && wave < 1 ? smooth(wave / 0.18) * smooth((1 - wave) / 0.18) : 0;
  const swing = up * 26 * Math.sin(wave * TAU * 3);
  const mouth = lerp(3, -2.4, q) + 1.4 * up;
  const face = (cx: number, cy: number, side: boolean) => (
    <g>
      {(side ? [6.5] : [-4.4, 4.4]).map((ex) => (
        <g key={ex}>
          <circle cx={cx + ex} cy={cy - 1 + 1.4 * q} r={1.55} fill="#2b2420" />
          <path d={`M${f(cx + ex - 2.2)},${f(cy - 5 - (side ? 0 : Math.sign(ex) * 1.5 * q))} L${f(cx + ex + 2.2)},${f(cy - 5 - (side ? 1.5 * q : -Math.sign(ex) * 1.5 * q))}`} stroke={hair} strokeWidth={1.2} strokeLinecap="round" />
        </g>
      ))}
      {side ? (
        <path d={`M${f(cx + 6.2)},${f(cy + 5)} Q${f(cx + 8.2)},${f(cy + 5 + mouth * 0.7)} ${f(cx + 10.2)},${f(cy + 4.4)}`} fill="none" stroke="#7a3b2e" strokeWidth={1.2} strokeLinecap="round" />
      ) : (
        <path d={`M${f(cx - 3.6)},${f(cy + 5)} Q${f(cx)},${f(cy + 5 + mouth)} ${f(cx + 3.6)},${f(cy + 5)}`} fill="none" stroke="#7a3b2e" strokeWidth={1.25} strokeLinecap="round" />
      )}
      {(side ? [5] : [-7.4, 7.4]).map((bx) => (
        <circle key={bx} cx={cx + bx} cy={cy + 3} r={2.3} fill="#f0806e" opacity={0.45 * (1 - q)} />
      ))}
    </g>
  );
  const hand = (p: P2, k = 0) => <circle cx={f(p[0])} cy={f(p[1])} r={3.7} fill={tint(skin, k)} stroke={tint(skin, -0.38)} strokeWidth={ow} />;

  if (walk === undefined) {
    // Front on.
    const y0 = -21 + 3 * q; // the top of the shoulders
    const sw = 15 - 1.8 * q; // half the shoulder width
    const hy = -37 + 4.5 * q; // the centre of the head
    const left = bones([-(sw - 2.6), y0 + 4], -(10 - 5 * q), 14, -(6 - 5 * q), 13);
    const right = bones([sw - 2.6, y0 + 4], lerp(10 - 5 * q, 128, up), 14, lerp(6 - 5 * q, 168, up) + swing, 13);
    return (
      <Shell x={x} y={y} s={s} w={64} o={o} lift={0.35}>
        <Layer w={64}>
          <ellipse cx={0} cy={50} rx={19} ry={2.8} fill="rgba(18,28,40,.2)" />
          {[-1, 1].map((sd) => (
            <g key={sd}>
              <Stroke pts={[[sd * 6, 10], [sd * 6.4, 43]]} w={9.6} c={PANTS} ow={ow} />
              <path d={`M${sd * 6.4 - 6.8},50 C${sd * 6.4 - 7.2},45 ${sd * 6.4 - 4},42.6 ${sd * 6.4 + sd * 0.6},42.6 C${sd * 6.4 + 4.6},42.6 ${sd * 6.4 + 7.6},45 ${sd * 6.4 + 7},50 Z`} fill={SHOE} stroke="#15171b" strokeWidth={ow} strokeLinejoin="round" />
              <rect x={sd * 6.4 - 6.6} y={48.4} width={13.4} height={1.6} rx={0.8} fill="#6b717b" />
            </g>
          ))}
          <path d={`M-12.5,4 L12.5,4 L13,14 Q0,16 -13,14 Z`} fill={PANTS} stroke={tint(PANTS, -0.4)} strokeWidth={ow} strokeLinejoin="round" />
          <path d={`M${f(-sw + 4)},${f(y0)} Q${f(-sw)},${f(y0)} ${f(-sw)},${f(y0 + 5)} L-12.4,7 Q-12.4,9 -10,9 L10,9 Q12.4,9 12.4,7 L${f(sw)},${f(y0 + 5)} Q${f(sw)},${f(y0)} ${f(sw - 4)},${f(y0)} Z`} fill={shirt} stroke={tint(shirt, -0.4)} strokeWidth={ow} strokeLinejoin="round" />
          <path d={`M${f(sw - 5)},${f(y0 + 1.5)} Q${f(sw - 1)},${f(y0 + 2)} ${f(sw - 0.8)},${f(y0 + 6)} L11.2,8 L7,8 Z`} fill={tint(shirt, -0.14)} />
          <rect x={-12.4} y={5.6} width={24.8} height={2.6} fill={tint(shirt, -0.22)} />
          <rect x={-3.4} y={hy + 10} width={6.8} height={y0 - hy - 8} fill={tint(skin, -0.12)} />
          <path d={`M-4.6,${f(y0)} L0,${f(y0 + 5.5)} L4.6,${f(y0)} Z`} fill={tint(skin, -0.05)} stroke={tint(shirt, -0.4)} strokeWidth={ow * 0.8} strokeLinejoin="round" />
          {[left, right].map((arm, i) => (
            <g key={i}>
              <Stroke pts={arm} w={6.6} c={shirt} ow={ow} />
              {hand(arm[2])}
            </g>
          ))}
          <g transform={`rotate(${f(7 * q - 5 * up)} 0 ${f(hy + 12)})`}>
            {[-1, 1].map((sd) => (
              <circle key={sd} cx={sd * 11.8} cy={hy + 1} r={2.7} fill={skin} stroke={tint(skin, -0.38)} strokeWidth={ow} />
            ))}
            <circle cx={0} cy={hy} r={12} fill={skin} stroke={tint(skin, -0.38)} strokeWidth={ow} />
            <path d={`M-12.6,${f(hy + 2)} C-14,${f(hy - 10)} -8,${f(hy - 13.8)} 0,${f(hy - 13.6)} C8,${f(hy - 13.8)} 14,${f(hy - 10)} 12.6,${f(hy + 2)} C11.6,${f(hy - 3)} 10.4,${f(hy - 6.4)} 7.4,${f(hy - 7.6)} C3,${f(hy - 5.2)} -3,${f(hy - 6.4)} -6.8,${f(hy - 8.6)} C-9.6,${f(hy - 6.4)} -11.6,${f(hy - 3)} -12.6,${f(hy + 2)} Z`} fill={hair} stroke={tint(hair, -0.4)} strokeWidth={ow} strokeLinejoin="round" />
            <path d={`M-6,${f(hy - 11.4)} Q0,${f(hy - 13)} 5,${f(hy - 11.6)}`} fill="none" stroke={tint(hair, 0.35)} strokeWidth={1.2} strokeLinecap="round" />
            {face(0, hy, false)}
          </g>
        </Layer>
      </Shell>
    );
  }

  // Side on, facing +x (mirrored for dir = -1). The lowest ankle stands on the ground, which gives the bob.
  const ph = walk * TAU;
  const leg = (o: number) => {
    const th = 25 * Math.sin(ph + o);
    const kn = 5 + 48 * Math.max(0, Math.cos(ph + o - 0.35)) ** 2;
    const pts = bones([0, 10], th, 19, th - kn, 18);
    return {pts, foot: Math.max(0, Math.cos(ph + o - 0.6)) * -14 + Math.max(0, -th) * 0.5};
  };
  const near = leg(0);
  const far = leg(Math.PI);
  const bob = 47 - Math.max(near.pts[2][1], far.pts[2][1]);
  const lean = 4 + 12 * q;
  const arm = (o: number) => {
    const a = -21 * Math.sin(ph + o) * (1 - up);
    return bones([0, -16], lerp(a, 140, up), 13, lerp(a + 14 + Math.max(0, a) * 0.7, 172, up) + swing, 12);
  };
  const shoe = ({pts, foot}: {pts: P2[]; foot: number}, c: string) => {
    const [ax, ay] = pts[2];
    return (
      <g transform={`rotate(${f(foot)} ${f(ax)} ${f(ay)})`}>
        <path d={`M${f(ax - 3.6)},${f(ay - 1.6)} Q${f(ax - 4.2)},${f(ay + 3)} ${f(ax - 2)},${f(ay + 3)} L${f(ax + 9)},${f(ay + 3)} Q${f(ax + 10.8)},${f(ay + 3)} ${f(ax + 9.8)},${f(ay + 0.4)} Q${f(ax + 7.4)},${f(ay - 2)} ${f(ax + 2.6)},${f(ay - 2.4)} Z`} fill={c} stroke="#15171b" strokeWidth={ow} strokeLinejoin="round" />
        <path d={`M${f(ax - 3)},${f(ay + 2.6)} L${f(ax + 9.4)},${f(ay + 2.6)}`} stroke="#6b717b" strokeWidth={1.1} strokeLinecap="round" />
      </g>
    );
  };
  const nearArm = arm(0);
  const farArm = arm(Math.PI);
  const back = tint(shirt, -0.18);
  return (
    <Shell x={x} y={y} s={s} w={64} o={o} lift={0.35} tf={dir < 0 ? 'scaleX(-1)' : ''}>
      <Layer w={64}>
        <ellipse cx={2} cy={50} rx={17} ry={2.6} fill="rgba(18,28,40,.2)" />
        <g transform={`translate(0 ${f(bob)})`}>
          <g transform={`rotate(${f(-lean)} 0 10)`}>
            <Stroke pts={farArm} w={6.4} c={back} ow={ow} />
            {hand(farArm[2], -0.12)}
          </g>
          <Stroke pts={far.pts} w={9.4} c={tint(PANTS, -0.2)} ow={ow} />
          {shoe(far, '#202329')}
          <Stroke pts={near.pts} w={9.4} c={PANTS} ow={ow} />
          {shoe(near, SHOE)}
          <g transform={`rotate(${f(-lean)} 0 10)`}>
            <path d="M-8.6,6 L8.8,6 L9.4,15 Q0,16.4 -9,15 Z" fill={PANTS} stroke={tint(PANTS, -0.4)} strokeWidth={ow} strokeLinejoin="round" />
            <rect x={-1.8} y={-27} width={6} height={8} fill={tint(skin, -0.12)} />
            <path d="M-6,-21 Q5,-22.4 8,-16 Q9.6,-12 9.2,-4 L9,7 Q9,10 6,10 L-6.4,10 Q-9.4,10 -9.4,7 L-9,-14 Q-8.6,-21 -6,-21 Z" fill={shirt} stroke={tint(shirt, -0.4)} strokeWidth={ow} strokeLinejoin="round" />
            <path d="M-9,-12 Q-8.4,-19 -5,-20.4 L-5.4,9 L-9,8 Z" fill={tint(shirt, -0.14)} />
            <rect x={-9.2} y={5.6} width={18.4} height={2.4} fill={tint(shirt, -0.22)} />
            <g transform={`rotate(${f(16 * q)} 1 -26)`}>
              <path d="M12.2,-38.6 Q16.2,-36.2 12.6,-33.2 Z" fill={skin} stroke={tint(skin, -0.38)} strokeWidth={ow} strokeLinejoin="round" />
              <circle cx={1.4} cy={-37} r={11.6} fill={skin} stroke={tint(skin, -0.38)} strokeWidth={ow} />
              <path d="M11,-43.4 Q7,-51 -2.6,-50 Q-13.6,-48.6 -12.4,-36 Q-11.8,-29.4 -7.4,-26.6 L-5.6,-33.6 Q-3.6,-41.6 3.4,-42 Q8,-42.6 11,-43.4 Z" fill={hair} stroke={tint(hair, -0.4)} strokeWidth={ow} strokeLinejoin="round" />
              <circle cx={-2.4} cy={-35.4} r={2.6} fill={skin} stroke={tint(skin, -0.38)} strokeWidth={ow} />
              <path d="M-4.4,-46 Q1,-49.6 6.4,-47" fill="none" stroke={tint(hair, 0.35)} strokeWidth={1.2} strokeLinecap="round" />
              {face(1.4, -37, true)}
            </g>
            <Stroke pts={nearArm} w={6.6} c={shirt} ow={ow} />
            {hand(nearArm[2])}
          </g>
        </g>
      </Layer>
    </Shell>
  );
};

// ---- Phone ----

/** The screen of a Phone in its units (x, y, w, h; the phone is 50 x 100): times s / 100 for its px size. */
const SCREEN = [-21, -46.4, 42, 92.8] as const;
/** The px size of a Phone's screen when the phone is `s` px tall, to lay out its `children`. */
export const phoneScreen = (s: number) => ({w: (SCREEN[2] * s) / 100, h: (SCREEN[3] * s) / 100});

/**
 * A modern phone, `s` px tall (default 420): metal frame with side buttons, black glass, a camera island, a screen
 * with a glare. `children` are drawn on its screen, in an HTML box of the screen's size (`phoneScreen(s)` gives it
 * in px): HTML, or an <svg width="100%" height="100%">. `lift` 1 held upright (default), 0 lying on a table:
 * animate it 0 to 1 to pick the phone up. `buzz` 0 to 1 plays one notification buzz (a shake with marks beside it).
 */
export const Phone: React.FC<{x: number; y: number; s?: number; o?: number; lift?: number; buzz?: number; children?: React.ReactNode}> = ({x, y, s = 420, o = 1, lift = 1, buzz = 0, children}) => {
  const k = s / 100;
  const ow = line(s);
  const L = clamp(lift);
  const env = buzz > 0 && buzz < 1 ? Math.sin(Math.PI * buzz) : 0;
  const shake = env * Math.sin(buzz * TAU * 9) * 4;
  const tf = `translate(${f(env * Math.sin(buzz * TAU * 13) * s * 0.01)}px, ${f((1 - L) * s * 0.12)}px) perspective(${f(s * 3)}px) rotateX(${f((1 - settle(L)) * 62)}deg) rotateZ(${f((1 - L) * -12 + shake)}deg)`;
  const [sx, sy, sw, sh] = SCREEN;
  return (
    <Shell x={x} y={y} s={s} w={50} o={o} tf={tf} lift={0.35 + 0.65 * L}>
      <Layer w={50}>
        {[[-1, -31, 5], [-1, -22, 9], [-1, -11, 9], [1, -25, 13]].map(([sd, by, bh]) => (
          <rect key={by} x={sd < 0 ? -25.8 : 24.2} y={by} width={1.6} height={bh} rx={0.7} fill="#8f99a4" stroke="#4b535c" strokeWidth={ow * 0.7} />
        ))}
        <rect x={-24} y={-49.2} width={49} height={99.4} rx={8} fill="#3a414a" />
        <rect x={-24.5} y={-50} width={49} height={100} rx={8} fill="#a3adb7" stroke="#4b535c" strokeWidth={ow} />
        <path d="M-23.4,-40 Q-23.4,-48.6 -15,-48.9" fill="none" stroke="#e6ebf0" strokeWidth={0.9} strokeLinecap="round" />
        <rect x={-23.3} y={-48.8} width={46.6} height={97.6} rx={7} fill="#101317" />
        <rect x={sx} y={sy} width={sw} height={sh} rx={5} fill={children ? '#f4f6f9' : '#1c2733'} />
        {!children && (
          <g clipPath="url(#pp-phone-glass)">
            <circle cx={-9} cy={24} r={24} fill="#2c4f78" opacity={0.75} />
            <circle cx={13} cy={-14} r={17} fill="#3d3a74" opacity={0.6} />
            <circle cx={-2} cy={2} r={9} fill="#3f6fa6" opacity={0.5} />
          </g>
        )}
        <defs>
          <clipPath id="pp-phone-glass">
            <rect x={sx} y={sy} width={sw} height={sh} rx={5} />
          </clipPath>
        </defs>
      </Layer>
      {children && <div style={{position: 'absolute', left: f((25 + sx) * k), top: f((50 + sy) * k), width: f(sw * k), height: f(sh * k), borderRadius: f(5 * k), overflow: 'hidden'}}>{children}</div>}
      <Layer w={50}>
        <g clipPath="url(#pp-phone-glass)">
          <polygon points="-21,6 -21,-14 21,-46 21,-26" fill="#ffffff" opacity={0.1} />
          <polygon points="-21,16 -21,11 21,-21 21,-16" fill="#ffffff" opacity={0.07} />
        </g>
        <rect x={-7.4} y={-44.2} width={14.8} height={4.4} rx={2.2} fill="#05070a" />
        <circle cx={4.6} cy={-42} r={1.3} fill="#1d2b3b" />
        <circle cx={4.2} cy={-42.4} r={0.4} fill="#7fb2ff" />
        <rect x={-8} y={42.6} width={16} height={1.3} rx={0.65} fill={children ? '#1d1f22' : '#ffffff'} opacity={0.55} />
        {env > 0.02 &&
          [-1, 1].map((sd) => (
            <g key={sd} opacity={f(env)} fill="none" stroke={K.ink} strokeWidth={1.6} strokeLinecap="round" strokeOpacity={0.7}>
              <path d={`M${sd * 29},-8 Q${sd * 31.5},0 ${sd * 29},8`} />
              <path d={`M${sd * 33},-13 Q${sd * 36.5},0 ${sd * 33},13`} />
            </g>
          ))}
      </Layer>
    </Shell>
  );
};

// ---- Coin ----

const GOLD = {out: '#8c5c0b', edge: '#c38a1d', ridge: '#9e6c12', rim: '#e8ac2c', face: '#f6c845', light: '#fde68e', dark: '#c78f19', mark: '#9b6a07'};
const STAR = Array.from({length: 10}, (_, i) => {
  const r = i % 2 ? 8.6 : 20;
  const a = (i * Math.PI) / 5;
  return `${f(Math.sin(a) * r)},${f(-Math.cos(a) * r + 1)}`;
}).join(' ');

/**
 * A gold coin, `s` px tall (default 140): a raised rim, a ring of beads, an embossed star (or `label`, a short text
 * like "$", from s = 70), a shine, and its thickness below. `spin` turns it about its upright axis, 1 = one turn,
 * any real number (`spin={t / 2}`): the face narrows and the ridged edge shows as it turns.
 */
export const Coin: React.FC<{x: number; y: number; s?: number; o?: number; spin?: number; label?: string}> = ({x, y, s = 140, o = 1, spin = 0, label}) => {
  const k = s / 100;
  const ow = line(s);
  const th = spin * TAU;
  const c = Math.cos(th);
  const R = 44;
  const T = 10;
  const DY = 4;
  const a = Math.max(R * Math.abs(c), 0.05);
  const xv = (c >= 0 ? 1 : -1) * (T / 2) * Math.sin(th);
  const vf: P2 = [xv, -DY / 2];
  const vh: P2 = [-xv, DY / 2];
  const [dx, dy] = [vh[0] - vf[0], vh[1] - vf[1]];
  const t0 = Math.atan2(-R * dx, a * dy);
  const p1: P2 = [a * Math.cos(t0), R * Math.sin(t0)];
  const band = [
    [vf[0] + p1[0], vf[1] + p1[1]],
    [vh[0] + p1[0], vh[1] + p1[1]],
    [vh[0] - p1[0], vh[1] - p1[1]],
    [vf[0] - p1[0], vf[1] - p1[1]],
  ]
    .map(([px, py]) => `${f(px)},${f(py)}`)
    .join(' ');
  const ridges = Array.from({length: 64}, (_, i) => (i / 64) * TAU).filter((al) => R * Math.cos(al) * dx + a * Math.sin(al) * dy > 0.4);
  const sq = Math.max(Math.abs(c), 0.001);
  const big = label ? [50, 40, 30, 24][Math.min(label.length, 4) - 1] : 0;
  return (
    <Shell x={x} y={y} s={s} w={100} o={o}>
      <Layer w={100}>
        <g fill={GOLD.out} stroke={GOLD.out} strokeWidth={2 * ow} strokeLinejoin="round">
          <ellipse cx={f(vh[0])} cy={f(vh[1])} rx={f(a)} ry={R} />
          <polygon points={band} />
          <ellipse cx={f(vf[0])} cy={f(vf[1])} rx={f(a)} ry={R} />
        </g>
        <ellipse cx={f(vh[0])} cy={f(vh[1])} rx={f(a)} ry={R} fill={GOLD.edge} />
        <polygon points={band} fill={GOLD.edge} />
        {ridges.map((al) => {
          const [rx, ry] = [a * Math.cos(al), R * Math.sin(al)];
          return <line key={al} x1={f(vf[0] + rx)} y1={f(vf[1] + ry)} x2={f(vh[0] + rx)} y2={f(vh[1] + ry)} stroke={GOLD.ridge} strokeWidth={0.7} />;
        })}
        <g transform={`translate(${f(vf[0])} ${f(vf[1])}) scale(${f(sq)} 1)`}>
          <circle r={R} fill={GOLD.rim} />
          {sq > 0.06 && (
            <>
              <circle r={R * 0.8} fill={GOLD.dark} transform="translate(-0.9 -1.1)" />
              <circle r={R * 0.8} fill={GOLD.light} transform="translate(0.9 1.1)" />
              <circle r={R * 0.8} fill={GOLD.face} />
              <circle r={R * 0.9} fill="none" stroke={GOLD.dark} strokeWidth={1.6} strokeDasharray="0.1 3.2" strokeLinecap="round" opacity={0.8} />
              {!label && (
                <>
                  <polygon points={STAR} fill={GOLD.light} transform="translate(-0.7 -0.9)" />
                  <polygon points={STAR} fill={GOLD.dark} transform="translate(0.8 1)" />
                  <polygon points={STAR} fill="#efbb33" strokeLinejoin="round" />
                </>
              )}
              <g clipPath="url(#pp-coin-face)">
                <ellipse cx={f(-14 + 24 * Math.sin(th))} cy={-12} rx={5.5} ry={30} transform={`rotate(38 ${f(-14 + 24 * Math.sin(th))} -12)`} fill="#ffffff" opacity={0.32} />
                <ellipse cx={f(-1 + 24 * Math.sin(th))} cy={-2} rx={2} ry={30} transform={`rotate(38 ${f(-1 + 24 * Math.sin(th))} -2)`} fill="#ffffff" opacity={0.22} />
              </g>
              <defs>
                <clipPath id="pp-coin-face">
                  <circle r={R} />
                </clipPath>
              </defs>
            </>
          )}
        </g>
        <path d="M0,-7 Q0.8,-0.8 7,0 Q0.8,0.8 0,7 Q-0.8,0.8 -7,0 Q-0.8,-0.8 0,-7 Z" fill="#ffffff" transform={`translate(${f(vf[0] + a * 0.66)} ${f(vf[1] - R * 0.7)}) scale(${f(0.55 + 0.45 * Math.abs(c))})`} />
      </Layer>
      {label && (
        <Txt pic k={k} x={vf[0]} y={vf[1] + 1} size={big} color={GOLD.mark} weight={900} o={smooth((sq - 0.2) / 0.3)} tf={`scaleX(${f(sq)})`} shadow={`${f(-0.5 * k)}px ${f(-0.6 * k)}px 0 #b98516, ${f(0.5 * k)}px ${f(0.6 * k)}px 0 ${GOLD.light}`}>
          {label}
        </Txt>
      )}
    </Shell>
  );
};

// ---- Clock ----

/** An arc of radius r from angle a0 to a1, in degrees clockwise from 12 o'clock. */
const arc = (r: number, a0: number, a1: number) =>
  `M${f(r * Math.sin(rad(a0)))},${f(-r * Math.cos(rad(a0)))} A${r},${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${f(r * Math.sin(rad(a1)))},${f(-r * Math.cos(rad(a1)))}`;
/** A tapered hand pointing up: from `tail` below the centre to `len` above it, `wb` wide at the base, `wt` at the tip. */
const hand = (len: number, tail: number, wb: number, wt: number) => `M${-wb / 2},${tail} L${-wt / 2},${-len} Q0,${-len - wt} ${wt / 2},${-len} L${wb / 2},${tail} Z`;

/**
 * A wall clock, `s` px tall (default 280): a dark frame with a lit edge, a metal lip, a cream face, 60 ticks, hour and
 * minute hands with their shadows, a red second hand and a glass glare. `hours` is the time shown, any real number
 * (10.5 is half past ten), and every hand follows it: `hours={9 + t / 60}` runs a minute a second, `hours={9 + t / 3600}`
 * runs in real time (only the second hand moves). `numbers` writes 12, 3, 6 and 9 (from s = 240).
 */
export const Clock: React.FC<{x: number; y: number; s?: number; o?: number; hours?: number; numbers?: boolean}> = ({x, y, s = 280, o = 1, hours = 10 + 10 / 60, numbers}) => {
  const k = s / 100;
  const ow = line(s);
  const hands: [number, string, string][] = [
    [frac(hours / 12) * 360, hand(22, 6, 4.6, 2.2), '#22262b'],
    [frac(hours) * 360, hand(33, 7, 3.4, 1.4), '#22262b'],
  ];
  const sec = frac(hours * 60) * 360;
  return (
    <Shell x={x} y={y} s={s} w={100} o={o}>
      <Layer w={100}>
        <circle r={49} fill="#2f353d" stroke="#171a1f" strokeWidth={ow} />
        <path d={arc(46.6, 285, 345)} fill="none" stroke="#7d8793" strokeWidth={2} strokeLinecap="round" />
        <path d={arc(46.6, 110, 160)} fill="none" stroke="#1a1e23" strokeWidth={2} strokeLinecap="round" />
        <circle r={43.8} fill="#d7dce1" />
        <circle r={42.4} fill="#fbfaf5" />
        <path d={arc(40.6, 290, 430)} fill="none" stroke="#000000" strokeOpacity={0.08} strokeWidth={3.4} strokeLinecap="round" />
        {Array.from({length: 60}, (_, i) => {
          const hr = i % 5 === 0;
          const q = rad(i * 6);
          const r0 = hr ? 33.4 : 37;
          return <line key={i} x1={f(Math.sin(q) * r0)} y1={f(-Math.cos(q) * r0)} x2={f(Math.sin(q) * 39.6)} y2={f(-Math.cos(q) * 39.6)} stroke="#33383e" strokeWidth={hr ? 2.4 : 0.8} strokeLinecap="round" />;
        })}
        {hands.map(([deg, d], i) => (
          <path key={i} d={d} fill="#000000" opacity={0.16} transform={`translate(0.9 1.7) rotate(${f(deg)})`} />
        ))}
        {hands.map(([deg, d, c], i) => (
          <path key={i} d={d} fill={c} transform={`rotate(${f(deg)})`} />
        ))}
        <circle r={3.4} fill="#22262b" />
        <g transform={`rotate(${f(sec)})`}>
          <line x1={1} y1={10} x2={1} y2={-34} stroke="#000000" strokeOpacity={0.14} strokeWidth={1} transform="translate(0.4 1.4)" />
          <line x1={0} y1={10} x2={0} y2={-35} stroke={K.red} strokeWidth={0.95} strokeLinecap="round" />
          <circle cy={7.5} r={2.1} fill={K.red} />
        </g>
        <circle r={2.4} fill={K.red} />
        <circle r={0.9} fill="#5a1d14" />
        <path d={arc(36.5, 290, 335)} fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" />
        <path d="M-30,-22 Q-14,-36 8,-37 Q-12,-30 -24,-14 Z" fill="#ffffff" opacity={0.14} />
      </Layer>
      {numbers &&
        [12, 3, 6, 9].map((n, i) => (
          <Txt pic key={n} k={k} x={Math.sin((i * Math.PI) / 2) * 25.6} y={-Math.cos((i * Math.PI) / 2) * 25.6 + 0.6} size={12} color="#22262b">
            {n}
          </Txt>
        ))}
    </Shell>
  );
};

// ---- Calendar ----

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

/** One month page of the Calendar (units: x -42 to 42, y -40 to 46): a coloured header, the grid of days. */
const Page: React.FC<{m: number; day: number; head: string; k: number; ow: number; textO: number}> = ({m, day, head, k, ow, textO}) => {
  const first = (new Date(2026, m, 1).getDay() + 6) % 7; // Monday first
  const days = new Date(2026, m + 1, 0).getDate();
  const rows = Math.ceil((first + days) / 7);
  const rh = 55 / rows;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <svg viewBox="-42 -40 84 86" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
        <path d="M-42,-36.5 Q-42,-40 -38.5,-40 L38.5,-40 Q42,-40 42,-36.5 L42,42.5 Q42,46 38.5,46 L-38.5,46 Q-42,46 -42,42.5 Z" fill="#ffffff" stroke={LINE} strokeWidth={ow} />
        <path d="M-42,-36.5 Q-42,-40 -38.5,-40 L38.5,-40 Q42,-40 42,-36.5 L42,-18 L-42,-18 Z" fill={head} stroke={tint(head, -0.4)} strokeWidth={ow} strokeLinejoin="round" />
        <rect x={-41.4} y={-20.4} width={82.8} height={2} fill={tint(head, -0.22)} />
        {[-24, 24].map((hx) => (
          <circle key={hx} cx={hx} cy={-35.6} r={1.9} fill={tint(head, -0.55)} />
        ))}
        {Array.from({length: days}, (_, i) => {
          const col = (first + i) % 7;
          const row = Math.floor((first + i) / 7);
          const cx = -37 + col * (74 / 7) + 74 / 14;
          const cy = -13 + row * rh + rh / 2;
          const hot = i + 1 === day;
          const end = col > 4;
          const mark = hot ? '#ffffff' : end ? '#e39a8c' : '#a3abb4';
          return (
            <g key={i}>
              <rect x={f(cx - 4.6)} y={f(cy - rh / 2 + 0.8)} width={9.2} height={f(rh - 1.6)} rx={1.4} fill={hot ? K.red : end ? '#fdeeea' : '#eff2f5'} />
              <rect x={f(cx - 3.2)} y={f(cy - rh / 2 + 2)} width={i + 1 < 10 ? 1.6 : 3.6} height={1.4} rx={0.5} fill={mark} />
              {hot && <ellipse cx={f(cx)} cy={f(cy)} rx={7.4} ry={f(rh * 0.66)} fill="none" stroke={K.red} strokeWidth={1.3} transform={`rotate(-12 ${f(cx)} ${f(cy)})`} />}
            </g>
          );
        })}
      </svg>
      <Txt pic k={k} x={0} y={-32.5} size={9} color="#ffffff" o={textO}>
        {MONTHS[((m % 12) + 12) % 12]}
      </Txt>
    </div>
  );
};

/**
 * A wall calendar, `s` px tall (default 300, from s = 280 for the month to read): a dark board, two metal rings, a
 * stack of month pages with a coloured header (`color`) and a grid of days, `day` circled in red. `month` 0 is
 * January. `flips` (any real number from 0) flips that many pages, one month each: a whole number shows a page at
 * rest, the fraction between turns the page up and over the rings, `flips={(t - 1) / 1.2}`.
 */
export const Calendar: React.FC<{x: number; y: number; s?: number; o?: number; month?: number; day?: number; flips?: number; color?: string}> = ({x, y, s = 300, o = 1, month = 0, day = 0, flips = 0, color}) => {
  const theme = useTheme();
  const head = color ?? theme?.accent ?? K.blue;
  const k = s / 100;
  const ow = line(s);
  const n = Math.floor(Math.max(0, flips));
  const turn = Math.max(0, flips) - n;
  const phi = smooth(turn) * 230;
  const page = {position: 'absolute', left: f(2 * k), top: f(10 * k), width: f(84 * k), height: f(86 * k)} as const;
  return (
    <Shell x={x} y={y} s={s} w={88} o={o}>
      <Layer w={88}>
        <rect x={-44} y={-45} width={88} height={95} rx={4} fill="#323a45" stroke="#14181d" strokeWidth={ow} />
        <rect x={-42.6} y={-43.6} width={85.2} height={2} rx={1} fill="#56606c" />
        <rect x={-42} y={-38} width={84} height={87} rx={3.5} fill="#d6dbe0" stroke={LINE} strokeWidth={ow} />
        <rect x={-42} y={-39} width={84} height={86.6} rx={3.5} fill="#eceff2" stroke={LINE} strokeWidth={ow} />
      </Layer>
      <div style={page}>
        <Page m={month + n + (turn > 0 ? 1 : 0)} day={day} head={head} k={k} ow={ow} textO={turn > 0 ? clamp((phi - 78) / 20) : 1} />
      </div>
      {turn > 0 && (
        <div style={{...page, perspective: f(3 * s), perspectiveOrigin: '50% 60%', opacity: f(clamp((230 - phi) / 60))}}>
          <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 0', transform: `rotateX(${f(phi)}deg)`, transformStyle: 'preserve-3d'}}>
            <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden'}}>
              <Page m={month + n} day={day} head={head} k={k} ow={ow} textO={clamp((75 - phi) / 15)} />
              <div style={{position: 'absolute', inset: 0, borderRadius: f(3.5 * k), background: '#000000', opacity: f(0.3 * Math.sin(rad(Math.min(phi, 90))))}} />
            </div>
            <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateX(180deg)', borderRadius: f(3.5 * k), background: 'linear-gradient(#f3f5f7, #d9dee3)', border: `${f(ow * k)}px solid ${LINE}`, boxSizing: 'border-box'}} />
          </div>
        </div>
      )}
      <Layer w={88}>
        {[-24, 24].map((rx) => (
          <g key={rx}>
            <path d={`M${rx},-35.8 L${rx},-46.4`} stroke="#3b4148" strokeWidth={4.2 + 2 * ow} strokeLinecap="round" />
            <path d={`M${rx},-35.8 L${rx},-46.4`} stroke="#b8c0c9" strokeWidth={4.2} strokeLinecap="round" />
            <path d={`M${rx - 0.9},-37 L${rx - 0.9},-45.4`} stroke="#ffffff" strokeOpacity={0.8} strokeWidth={0.9} strokeLinecap="round" />
          </g>
        ))}
      </Layer>
    </Shell>
  );
};

// ---- Arrow ----

/**
 * An arrow that draws itself along `pts` (two or more frame points) as `p` goes 0 to 1, its head riding the tip.
 * `bow` bends each stretch sideways by that share of its length (0.2 a gentle arc, negative the other way). `w` is
 * the shaft in px (default 10), `color` (default the ink), `dash` for a dashed shaft, `o` its opacity.
 */
export const Arrow: React.FC<{pts: P2[]; p?: number; bow?: number; color?: string; w?: number; dash?: boolean; o?: number}> = ({pts, p = 1, bow = 0, color, w = 10, dash, o = 1}) => {
  const theme = useTheme();
  const c = color ?? theme?.ink ?? K.ink;
  if (p <= 0.001 || o <= 0.01 || pts.length < 2) return null;
  // The path as many short steps, so it can be cut at any length and the tip's direction read.
  const path: P2[] = [pts[0]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const m: P2 = [(a[0] + b[0]) / 2 - dy * bow, (a[1] + b[1]) / 2 + dx * bow];
    for (let j = 1; j <= 32; j++) {
      const t = j / 32;
      path.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * m[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * m[1] + t * t * b[1]]);
    }
  }
  const at = [0];
  for (let i = 1; i < path.length; i++) at.push(at[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const point = (d: number): P2 => {
    const i = Math.max(1, at.findIndex((v) => v >= d));
    const u = (d - at[i - 1]) / (at[i] - at[i - 1] || 1);
    return [lerp(path[i - 1][0], path[i][0], u), lerp(path[i - 1][1], path[i][1], u)];
  };
  const len = clamp(p) * at[at.length - 1];
  const hl = w * 3 * clamp(len / (w * 5) + 0.3);
  const tip = point(len);
  const back = point(Math.max(0, len - hl));
  const ang = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
  const [ux, uy] = [Math.cos(ang), Math.sin(ang)];
  const end = Math.max(0, len - hl * 0.7);
  const shaft = [...path.filter((_, i) => at[i] < end), point(end)];
  const d = 'M' + shaft.map(([px, py]) => `${f(px)},${f(py)}`).join(' L');
  const hw = hl * 0.52;
  const head = [tip, [tip[0] - ux * hl - uy * hw, tip[1] - uy * hl + ux * hw], [tip[0] - ux * hl * 0.82, tip[1] - uy * hl * 0.82], [tip[0] - ux * hl + uy * hw, tip[1] - uy * hl - ux * hw]]
    .map(([px, py]) => `${f(px)},${f(py)}`)
    .join(' ');
  const xs = path.map((q) => q[0]);
  const ys = path.map((q) => q[1]);
  const pad = w * 4;
  const [x0, y0] = [Math.min(...xs) - pad, Math.min(...ys) - pad];
  const [bw, bh] = [Math.max(...xs) + pad - x0, Math.max(...ys) + pad - y0];
  const dark = tint(c.startsWith('#') ? c : K.ink, -0.4);
  const dashes = dash ? `${f(w * 1.8)} ${f(w * 1.7)}` : undefined;
  return (
    <svg viewBox={`${f(x0)} ${f(y0)} ${f(bw)} ${f(bh)}`} style={{position: 'absolute', left: f(x0), top: f(y0), width: f(bw), height: f(bh), overflow: 'visible', opacity: clamp(o), filter: `drop-shadow(0 ${f(w * 0.35)}px ${f(w * 0.4)}px rgba(18,28,40,.28))`}}>
      <path d={d} fill="none" stroke={dark} strokeWidth={w + 4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashes} />
      <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashes} />
      <polygon points={head} fill={c} stroke={dark} strokeWidth={3} strokeLinejoin="round" />
    </svg>
  );
};

// ---- Bars ----

/**
 * A small bar chart of solid bars standing on a base, `s` px tall (default 300; labels read from s = 280), as wide as
 * its bars need (0.26 s a bar, more when a label is longer than its bar). `values` 0 to 1, `labels` short words under the bars, `colors` (default the accent),
 * `p` 0 to 1 grows them one after the other with a small overshoot. `show` writes a text above each bar ("40%") once
 * it has grown: only what the narration says, scripts/stills.mjs checks every number on screen.
 */
export const Bars: React.FC<{x: number; y: number; s?: number; o?: number; values: number[]; labels?: string[]; colors?: string[]; p?: number; show?: string[]}> = ({x, y, s = 300, o = 1, values, labels, colors, p = 1, show}) => {
  const theme = useTheme();
  const ink = theme?.ink ?? K.ink;
  const k = s / 100;
  const ow = line(s);
  const n = values.length;
  // A bar's slot: 26 units, or as wide as its label (about 0.6 of the font size a letter) and a gap.
  const sl = Math.max(26, ...(labels ?? []).map((l) => l.length * 6.2 + 6));
  const W = n * sl + 8;
  const B = 28;
  const H = 62;
  const D = 4;
  const st = n > 1 ? Math.min(0.15, 0.5 / (n - 1)) : 0;
  const grow = (i: number) => clamp((p - i * st) / (1 - (n - 1) * st));
  const bars = values.map((v, i) => {
    const g = grow(i);
    const fx = (i - (n - 1) / 2) * sl - 8 - D / 2;
    const h = H * clamp(v) * settle(g);
    return {fx, h, top: B - h, g, c: colors?.[i % colors.length] ?? theme?.accent ?? K.blue};
  });
  return (
    <Shell x={x} y={y} s={s} w={W} o={o}>
      <Layer w={W}>
        {[1, 2, 3, 4].map((j) => (
          <line key={j} x1={-W / 2 + D} x2={W / 2 + D} y1={B - 3 - (H * j) / 4} y2={B - 3 - (H * j) / 4} stroke={ink} strokeOpacity={0.14} strokeWidth={0.7} strokeDasharray="2 2" />
        ))}
        <polygon points={`${-W / 2},${B} ${-W / 2 + D},${B - 3} ${W / 2 + D},${B - 3} ${W / 2},${B}`} fill="#cfd5db" stroke={LINE} strokeWidth={ow} strokeLinejoin="round" />
        <rect x={-W / 2} y={B} width={W} height={3.6} fill="#9ba5af" stroke={LINE} strokeWidth={ow} />
        {bars.map(({fx, h, top, c}, i) =>
          h < 0.3 ? null : (
            <g key={i} stroke={tint(c, -0.45)} strokeWidth={ow} strokeLinejoin="round">
              <polygon points={`${f(fx + 16)},${f(top)} ${f(fx + 16 + D)},${f(top - 3)} ${f(fx + 16 + D)},${B - 3} ${f(fx + 16)},${B}`} fill={tint(c, -0.3)} />
              <polygon points={`${f(fx)},${f(top)} ${f(fx + D)},${f(top - 3)} ${f(fx + 16 + D)},${f(top - 3)} ${f(fx + 16)},${f(top)}`} fill={tint(c, 0.32)} />
              <rect x={f(fx)} y={f(top)} width={16} height={f(h)} fill={c} />
              {h > 8 && <rect x={f(fx + 2.4)} y={f(top + 2.4)} width={2.2} height={f(h - 4.8)} rx={1.1} fill="#ffffff" opacity={0.25} stroke="none" />}
            </g>
          ),
        )}
      </Layer>
      {show &&
        bars.map(({fx, top, g}, i) => (
          <Txt key={i} k={k} x={fx + 8 + D / 2} y={top - 10} size={10} color={ink} o={clamp((g - 0.75) / 0.25)}>
            {show[i]}
          </Txt>
        ))}
      {labels?.map((l, i) => (
        <Txt key={i} k={k} x={bars[i].fx + 8} y={B + 13} size={10} color={ink} weight={700}>
          {l}
        </Txt>
      ))}
    </Shell>
  );
};

// ---- Panel ----

/**
 * An opaque white panel with rounded corners and a soft shadow, to group things: `x`, `y` its top left, `w` x `h`.
 * `children` are placed inside it, from its top left (position them absolutely). Never see-through, so 3D behind it
 * does not show; it pops in with `o` like the other props.
 */
export const Panel: React.FC<{x: number; y: number; w: number; h: number; o?: number; children?: React.ReactNode}> = ({x, y, w, h, o = 1, children}) =>
  o <= 0.01 ? null : (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: clamp(o), transform: `scale(${f(0.8 + 0.2 * settle(o))})`, borderRadius: Math.min(30, Math.min(w, h) * 0.12), background: '#ffffff', border: '2px solid rgba(29,31,34,.12)', boxSizing: 'border-box', boxShadow: '0 18px 40px rgba(18,28,40,.22), 0 4px 10px rgba(18,28,40,.14), inset 0 -5px 0 rgba(29,31,34,.06)'}}>
      {children}
    </div>
  );
