import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Cue, SceneProps, VideoDef, Word, said } from '../../../engine';
import { CUTOUT, Cam, Drop, Eyes, INK, Key, Layer, Mouth, Pic, Pose, Puffs, Sprite, Svg, blink, breath, camAt, clamp, ease, lerp, out3, pop, shake, swapAt } from '../../../kits/cutout';
import script from './script.json';
import sprites from './sprites.json';
import timing from './timing.json';

const S = sprites as unknown as Record<string, Sprite>;
// The arm stretched out to the side shrinks the measured head a little: use the head of the other poses.
S.reach = {
  ...S.reach,
  head: [S.reach.head[0], S.reach.head[1], S.hero.head[2]],
};
// Hands on the face and arms over the head fool the measure too: these heads were measured from the top and the width
// of the hair instead (the same head size as the hero; the stretch picture draws her a little smaller).
S.bored = { ...S.bored, head: [425, 335, S.hero.head[2]] };
S.shocked = { ...S.shocked, head: [431, 305, 277.1] };
S.stretch = { ...S.stretch, head: [511, 436, 261.1] };
const SFX = (n: string) => `art/inner-mechanics-cutout/01-procrastination/sfx/${n}.wav`;
// The channel's colours: indigo and amber on warm sand.
const C = {
  indigo: '#29315a',
  amber: '#e3a23b',
  sand: '#efe3c8',
  card: '#fbf6ea',
  grey: '#8d8f9c',
};

const HX = 540;
const HY = 760;
const HR = 230;
const TOP = 1300; // front edge of the desk top
const LAPTOP = { x: 540, w: 520, bottom: 1318 };
const STACK = { x: 190, w: 230, bottom: 1300 };
const PHONE = { x: 870, w: 170, bottom: 1300 };
const DRAWER = { x: 860, y: 1630, w: 300, h: 170 };

const beats = (w: Word[][]) => ({
  holding: said(w, 0, 'holding'),
  work: said(w, 0, 'work'),
  procras: said(w, 1, 'procrastination'),
  clear: said(w, 2, 'clear'),
  there: said(w, 4, 'there'),
  simply: said(w, 9, 'simply'),
  not: said(w, 9, 'not'),
  three10: said(w, 10, 'three'),
  ten: said(w, 0, 'ten'),
  putting: said(w, 1, 'putting'),
  meant: said(w, 1, 'meant'),
  cost: said(w, 1, 'cost'),
  review: said(w, 2, 'review'),
  hundreds: said(w, 2, 'hundreds'),
  pattern: said(w, 2, 'pattern'),
  worse: said(w, 2, 'worse'),
  off2: said(w, 2, 'off'),
  mood: said(w, 3, 'mood'),
  better: said(w, 3, 'better'),
  still: said(w, 4, 'still'),
  guilt: said(w, 4, 'guilt'),
  three: said(w, 5, 'three'),
  help: said(w, 5, 'help'),
  tiny: said(w, 6, 'tiny'),
  open: said(w, 6, 'open'),
  line: said(w, 6, 'line'),
  start7: said(w, 7, 'start'),
  stopped: said(w, 7, 'stopped'),
  back: said(w, 7, 'back'),
  phone8: said(w, 8, 'phone'),
  reach: said(w, 8, 'reach'),
  drawer: said(w, 8, 'drawer'),
  goals: said(w, 9, 'goals'),
  trying: said(w, 9, 'trying'),
  temptations: said(w, 9, 'temptations'),
  resist: said(w, 9, 'resist'),
  slip: said(w, 10, 'slip'),
  forgive: said(w, 10, 'forgive'),
  students: said(w, 11, 'students'),
  forgave: said(w, 11, 'forgave'),
  exam: said(w, 11, 'exam'),
  less: said(w, 11, 'less'),
  next: said(w, 11, 'next'),
  today: said(w, 12, 'today'),
  pick: said(w, 12, 'pick'),
  step: said(w, 12, 'step'),
});
type B = ReturnType<typeof beats>;

/** The wall: a clock that ticks (and races through "ten seconds"), and a calendar that flips its days while she
 * waits. */
const Wall: React.FC<{ t: number; b: B }> = ({ t, b }) => {
  // Ten seconds race past in half a second; otherwise one tick a second.
  const sec = Math.floor(t) + 9 * ease(t, b.ten, 0.6);
  const flips = [b.putting, b.putting + 0.45, b.putting + 0.9].filter((a) => t > a).length; // pages that have started to turn
  const flip = [b.putting, b.putting + 0.45, b.putting + 0.9].reduce((o, a) => (t > a && t < a + 0.3 ? (t - a) / 0.3 : o), 0);
  return (
    <Svg>
      <rect x={-700} y={-900} width={2480} height={2400} fill={C.sand} />
      {/* a framed picture of hills */}
      <rect x={410} y={200} width={260} height={200} rx={10} fill="#f7efd9" stroke={INK} strokeWidth={9} />
      <clipPath id="frame">
        <rect x={415} y={205} width={250} height={190} />
      </clipPath>
      <g clipPath="url(#frame)">
        <circle cx={610} cy={250} r={22} fill={C.amber} stroke={INK} strokeWidth={6} />
      </g>
      <path d="M420 390 L510 290 L570 350 L620 300 L660 390 Z" fill="#9aa6d6" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      {/* the calendar: one page per day she puts it off */}
      <rect x={745} y={215} width={150} height={170} rx={10} fill="#fff" stroke={INK} strokeWidth={8} />
      <rect x={745} y={215} width={150} height={44} rx={10} fill="#d9534f" stroke={INK} strokeWidth={8} />
      <text x={820} y={345} textAnchor="middle" style={{ font: '900 72px Montserrat' }} fill={INK}>
        {12 + flips}
      </text>
      {flip > 0 && (
        <g>
          {/* the turning page, with yesterday's number on it, lifts away from the bottom */}
          <clipPath id="page">
            <rect x={746} y={259} width={148} height={124 * (1 - flip)} />
          </clipPath>
          <g clipPath="url(#page)">
            <rect x={749} y={260} width={142} height={122} fill="#fff" />
            <text x={820} y={345} textAnchor="middle" style={{ font: '900 72px Montserrat' }} fill={INK}>
              {11 + flips}
            </text>
          </g>
          <line x1={749} x2={891} y1={259 + 124 * (1 - flip)} y2={259 + 124 * (1 - flip)} stroke={INK} strokeWidth={5} />
        </g>
      )}
      {/* the clock */}
      <circle cx={180} cy={600} r={62} fill="#fff" stroke={INK} strokeWidth={8} />
      <line x1={180} y1={600} x2={180 + Math.sin((sec / 60) * Math.PI * 2) * 48} y2={600 - Math.cos((sec / 60) * Math.PI * 2) * 48} stroke="#d9534f" strokeWidth={5} strokeLinecap="round" />
      <line x1={180} y1={600} x2={180 + 30} y2={600 - 14} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <circle cx={180} cy={600} r={7} fill={INK} />
      {/* the plant */}
      <g>
        <path d="M890 640 Q860 540 930 510 Q950 590 910 640 Z M930 640 Q970 540 1030 550 Q1000 620 940 645 Z" fill="#6f9a6a" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      </g>
      <rect x={880} y={635} width={90} height={80} rx={12} fill={C.amber} stroke={INK} strokeWidth={8} />
      <rect x={830} y={715} width={190} height={18} rx={6} fill="#b98a5c" stroke={INK} strokeWidth={6} />
    </Svg>
  );
};

const Desk: React.FC<{ open: number }> = ({ open }) => (
  <Svg>
    <rect x={-600} y={TOP - 50} width={2280} height={70} fill="#e7c08f" stroke={INK} strokeWidth={8} />
    <rect x={-600} y={TOP + 20} width={2280} height={1400} fill="#c99563" stroke={INK} strokeWidth={8} />
    <line x1={-600} x2={1680} y1={TOP + 70} y2={TOP + 70} stroke="#b37f4d" strokeWidth={8} />
    {/* the drawer: its box behind, its front slides down-forward when open */}
    <rect x={DRAWER.x - DRAWER.w / 2} y={DRAWER.y - DRAWER.h / 2} width={DRAWER.w} height={DRAWER.h} rx={10} fill="#5b3b22" stroke={INK} strokeWidth={8} />
    <g transform={`translate(${DRAWER.x} ${DRAWER.y + open * 26}) scale(${1 + open * 0.1}) translate(${-DRAWER.x} ${-DRAWER.y})`}>
      <rect x={DRAWER.x - DRAWER.w / 2 - 6} y={DRAWER.y - DRAWER.h / 2} width={DRAWER.w + 12} height={DRAWER.h} rx={12} fill="#d9a873" stroke={INK} strokeWidth={8} />
      <rect x={DRAWER.x - 50} y={DRAWER.y - 12} width={100} height={24} rx={12} fill={C.indigo} stroke={INK} strokeWidth={6} />
    </g>
  </Svg>
);

/** A screen-space card that pops in and shrinks away, for the studies. */
const Card: React.FC<{ p: number; children: React.ReactNode }> = ({ p, children }) => {
  if (p <= 0.001) return null;
  return (
    <Svg>
      <g transform={`translate(540 760) scale(${p}) translate(-540 -760)`}>
        <rect x={100} y={370} width={880} height={800} rx={40} fill={INK} transform="translate(10 14)" />
        <rect x={100} y={370} width={880} height={800} rx={40} fill={C.card} stroke={INK} strokeWidth={10} />
        {children}
      </g>
    </Svg>
  );
};
const cardP = (t: number, a: number, b: number) => pop(t, a, 0.4) * (1 - ease(t, b - 0.35, 0.35));

/** A small task page with a face: the icon for "a task". */
const Page: React.FC<{
  x: number;
  y: number;
  s: number;
  mood: 'happy' | 'grumpy';
}> = ({ x, y, s, mood }) =>
  s <= 0.001 ? null : (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-40 -55 H25 L40 -40 V55 H-40 Z" fill="#fff" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <Eyes x={0} y={-8} r={9} mood={mood === 'happy' ? 'open' : 'angry'} />
      <Mouth x={0} y={22} w={26} kind={mood === 'happy' ? 'smile' : 'frown'} />
    </g>
  );
const Clock: React.FC<{ x: number; y: number; r: number; t: number }> = ({ x, y, r, t }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#fff" stroke={INK} strokeWidth={6} />
    <line x1={x} y1={y} x2={x + Math.sin(t * 3) * r * 0.7} y2={y - Math.cos(t * 3) * r * 0.7} stroke={INK} strokeWidth={6} strokeLinecap="round" />
    <line x1={x} y1={y} x2={x} y2={y - r * 0.45} stroke={INK} strokeWidth={6} strokeLinecap="round" />
  </g>
);
const rand = (i: number) => {
  const v = Math.sin(i * 91.7 + 17.3) * 43758.5453;
  return v - Math.floor(v);
};

/** The review: hundreds of results fly in, line up, and the worse the task feels, the longer the delay. */
const Review: React.FC<{ t: number; b: B }> = ({ t, b }) => {
  const dots = Array.from({ length: 110 }, (_, i) => {
    const fx = 260 + rand(i) * 600;
    const fy = 1010 - (fx - 260) * 0.72 + (rand(i + 50) - 0.5) * 170;
    const a = rand(i + 7) * Math.PI * 2;
    const u = out3(clamp((t - b.hundreds - rand(i + 3) * 1.1) / 0.6));
    return {
      x: lerp(540 + Math.cos(a) * 900, fx, u),
      y: lerp(760 + Math.sin(a) * 900, fy, u),
      on: u > 0,
    };
  });
  const line = ease(t, b.pattern, 0.8);
  return (
    <g>
      <line x1={220} y1={1060} x2={900} y2={1060} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <line x1={220} y1={1060} x2={220} y2={450} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      {dots.map((d, i) => d.on && <circle key={i} cx={d.x} cy={d.y} r={9} fill={C.indigo} opacity={0.75} />)}
      {line > 0 && <line x1={260} y1={1010} x2={lerp(260, 870, line)} y2={lerp(1010, 1010 - 610 * 0.72, line)} stroke={C.amber} strokeWidth={22} strokeLinecap="round" />}
      {t > b.hundreds + 1 && t < b.worse && (() => {
        const u = ease(t, b.hundreds + 1, b.worse - b.hundreds - 1.2);
        const x = lerp(280, 850, u);
        const y = 1010 - (x - 260) * 0.72;
        return (
          <g>
            <line x1={x + 50} y1={y + 50} x2={x + 95} y2={y + 95} stroke={INK} strokeWidth={14} strokeLinecap="round" />
            <circle cx={x} cy={y} r={70} fill="#ffffff55" stroke={INK} strokeWidth={10} />
          </g>
        );
      })()}
      <Page x={300} y={1125} s={1.15 * pop(t, b.worse - 0.1)} mood="happy" />
      <Page x={840} y={1125} s={1.15 * pop(t, b.worse + 0.25)} mood="grumpy" />
      {pop(t, b.off2 - 0.3) > 0 && (
        <g transform={`translate(160 470) scale(${pop(t, b.off2 - 0.3)}) translate(-160 -470)`}>
          <Clock x={160} y={470} r={42} t={t * 3} />
        </g>
      )}
    </g>
  );
};

/** The exam study: delay before exam 1, a little self-kindness, less delay before exam 2. */
const Exams: React.FC<{ t: number; b: B }> = ({ t, b }) => {
  const bar1 = ease(t, b.students, 0.9, out3) * 380;
  const bar2 = ease(t, b.less - 0.2, 0.7, out3) * 190;
  const heart = pop(t, b.forgave);
  return (
    <g>
      <line x1={180} y1={1000} x2={900} y2={1000} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      {[
        [330, bar1, '1'],
        [750, bar2, '2'],
      ].map(([x, h, n]) => (
        <g key={n as string}>
          <rect x={(x as number) - 70} y={1000 - (h as number)} width={140} height={h as number} rx={14} fill={C.indigo} stroke={INK} strokeWidth={7} />
          {(h as number) > 30 && <Clock x={x as number} y={1000 - (h as number) - 52} r={36} t={t} />}
          <path d={`M${(x as number) - 46} 1030 H${(x as number) + 30} L${(x as number) + 46} 1046 V1140 H${(x as number) - 46} Z`} fill="#fff" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <text x={x as number} y={1112} textAnchor="middle" style={{ font: '900 60px Montserrat' }} fill={INK}>
            {n}
          </text>
        </g>
      ))}
      {['#3b2a20', '#7a4a2a', '#1f1d1b', '#c58b3c', '#5a3a6a'].map((hair, i) => (
        <Student key={i} x={300 + i * 120} y={450} s={pop(t, b.students - 0.1 + i * 0.1)} hair={hair} />
      ))}
      {t > b.less && <path d="M400 560 C520 520 620 600 690 760" fill="none" stroke={C.amber} strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray={`${ease(t, b.less, 0.6)} 1`} />}
      {t > b.less + 0.5 && <path transform={`translate(690 770) scale(${pop(t, b.less + 0.5)})`} d="M-18 -20 L0 4 L18 -20" fill="none" stroke={C.amber} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />}
      {heart > 0 && (
        <g transform={`translate(540 760) scale(${heart * 1.6 * (1 + 0.08 * Math.sin(t * 8))})`}>
          <path d="M0 18 C-38 -8 -30 -40 -8 -36 C0 -34 0 -28 0 -24 C0 -28 0 -34 8 -36 C30 -40 38 -8 0 18 Z" fill="#e2566a" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};

/** A small page above the laptop, written line by line: `p` 0..2 is how many lines are done. */
const Writing: React.FC<{ s: number; p: number; done: number }> = ({ s, p, done }) => {
  if (s <= 0) return null;
  return (
    <g transform={`translate(0 140) translate(880 450) scale(${s}) translate(-880 -450)`}>
      <rect x={760} y={300} width={240} height={300} rx={18} fill="#fff" stroke={INK} strokeWidth={8} />
      {[0, 1].map((i) => {
        const u = clamp(p - i);
        return u > 0 && <line key={i} x1={795} y1={370 + i * 60} x2={795 + 165 * u} y2={370 + i * 60} stroke={C.indigo} strokeWidth={14} strokeLinecap="round" />;
      })}
      {[2, 3].map((i) => (
        <line key={i} x1={795} y1={370 + i * 60} x2={960} y2={370 + i * 60} stroke="#e7e1d2" strokeWidth={14} strokeLinecap="round" />
      ))}
      {/* a tick when the first line is written */}
      {done > 0.001 && <path transform={`translate(975 325) scale(${done})`} d="M-22 0 L-6 16 L24 -18" fill="none" stroke="#5aa469" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  );
};

/** The number of the tip being told, top left. */
const Badge: React.FC<{ n: number; s: number }> = ({ n, s }) =>
  s <= 0 ? null : (
    <g transform={`translate(170 330) scale(${s})`}>
      <circle r={70} fill={C.amber} stroke={INK} strokeWidth={9} />
      <text y={26} textAnchor="middle" style={{ font: '900 78px Montserrat' }} fill={INK}>
        {n}
      </text>
    </g>
  );

// A transform with scale 0 cannot be inverted, which breaks the layout check of stills.mjs: draw nothing instead.
const Heart: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) =>
  s <= 0.001 ? null : (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 18 C-38 -8 -30 -40 -8 -36 C0 -34 0 -28 0 -24 C0 -28 0 -34 8 -36 C30 -40 38 -8 0 18 Z"
      fill="#e2566a"
      stroke={INK}
      strokeWidth={6}
      strokeLinejoin="round"
    />
  );

/** The mood meter: a half dial whose needle swings from a frown to a smile. */
const Gauge: React.FC<{ x: number; y: number; s: number; v: number }> = ({ x, y, s, v }) =>
  s <= 0.001 ? null : (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-90 0 A90 90 0 0 1 90 0 Z" fill="#fff" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <path d="M-90 0 A90 90 0 0 1 -45 -78 L0 0 Z" fill="#9fb4e0" />
      <path d="M45 -78 A90 90 0 0 1 90 0 L0 0 Z" fill="#f2c46b" />
      <path d="M-90 0 A90 90 0 0 1 90 0 Z" fill="none" stroke={INK} strokeWidth={7} />
      <Mouth x={-62} y={-22} w={22} kind="frown" />
      <Mouth x={62} y={-28} w={22} kind="smile" />
      <line x1={0} y1={0} x2={Math.sin(v) * 74} y2={-Math.cos(v) * 74} stroke="#d9534f" strokeWidth={9} strokeLinecap="round" />
      <circle r={10} fill={INK} />
    </g>
  );
/** Temptations orbiting her head: a phone, a donut, a TV and a game pad. Each pops away at its own time. */
const Temptation: React.FC<{ kind: number; x: number; y: number; s: number }> = ({ kind, x, y, s }) =>
  s <= 0.001 ? null : (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r={46} fill="#fff" stroke={INK} strokeWidth={6} />
      {kind === 0 && <rect x={-14} y={-24} width={28} height={48} rx={6} fill="#8fd3ff" stroke={INK} strokeWidth={5} />}
      {kind === 1 && (
        <>
          <circle r={24} fill="#e9a3c0" stroke={INK} strokeWidth={5} />
          <circle r={9} fill="#fff" stroke={INK} strokeWidth={4} />
        </>
      )}
      {kind === 2 && (
        <>
          <rect x={-26} y={-18} width={52} height={34} rx={5} fill="#9aa6d6" stroke={INK} strokeWidth={5} />
          <path d="M-10 -30 L0 -18 L10 -30" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        </>
      )}
      {kind === 3 && (
        <>
          <rect x={-28} y={-14} width={56} height={28} rx={14} fill="#c9c3e8" stroke={INK} strokeWidth={5} />
          <circle cx={-12} r={4} fill={INK} />
          <circle cx={12} r={4} fill={INK} />
        </>
      )}
    </g>
  );
/** A small padlock. */
const Lock: React.FC<{ x: number; y: number; s: number; rot?: number }> = ({ x, y, s, rot = 0 }) =>
  s <= 0.001 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M-18 -6 V-22 A18 18 0 0 1 18 -22 V-6" fill="none" stroke={INK} strokeWidth={8} />
      <rect x={-28} y={-8} width={56} height={46} rx={8} fill={C.amber} stroke={INK} strokeWidth={6} />
      <circle cy={12} r={6} fill={INK} />
    </g>
  );
/** A play or a pause sign in a circle. */
const Sign: React.FC<{ x: number; y: number; s: number; pause?: boolean }> = ({ x, y, s, pause }) =>
  s <= 0.001 ? null : (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r={44} fill={pause ? '#d9534f' : '#5aa469'} stroke={INK} strokeWidth={7} />
      {pause ? (
        <>
          <rect x={-16} y={-18} width={11} height={36} rx={3} fill="#fff" />
          <rect x={5} y={-18} width={11} height={36} rx={3} fill="#fff" />
        </>
      ) : (
        <path d="M-12 -20 L20 0 L-12 20 Z" fill="#fff" />
      )}
    </g>
  );
/** A small student head for the exam study. */
const Student: React.FC<{ x: number; y: number; s: number; hair: string }> = ({ x, y, s, hair }) =>
  s <= 0.001 ? null : (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r={30} fill="#e8b48a" stroke={INK} strokeWidth={5} />
      <path d="M-30 -2 A30 30 0 0 1 30 -2 Q18 -16 0 -12 Q-18 -16 -30 -2 Z" fill={hair} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <circle cx={-10} cy={6} r={3.5} fill={INK} />
      <circle cx={10} cy={6} r={3.5} fill={INK} />
    </g>
  );

const toDrawerAt = (b: B) => b.phone8 + 0.8; // when the phone lands in the drawer

const All: React.FC<SceneProps> = ({ t, words }) => {
  const b = beats(words);
  const keys: Key[] = [
    [0, 540, 960, 1],
    [b.ten - 0.1, 540, 950, 1.02],
    [b.ten + 0.5, 450, 880, 1.12],
    [b.holding - 0.2, 480, 900, 1.1],
    [b.holding + 1.2, 470, 900, 1.18],
    [b.cost - 0.1, 470, 900, 1.18],
    [b.cost + 0.3, 400, 960, 1.3],
    [b.review - 0.3, 440, 920, 1.2],
    [b.mood - 0.2, 470, 900, 1.18],
    [b.mood + 0.9, 540, 800, 1.5],
    [b.still - 0.2, 540, 800, 1.5],
    [b.still + 0.8, 440, 930, 1.12],
    [b.three - 0.2, 440, 930, 1.12],
    [b.three + 0.8, 540, 960, 1],
    [b.tiny - 0.2, 540, 960, 1],
    [b.tiny + 0.8, 580, 900, 1.1],
    [b.phone8 - 0.2, 580, 900, 1.1],
    [b.phone8 + 0.6, 640, 1060, 1.1],
    [b.phone8 + 1.1, 700, 1150, 1.22],
    [b.goals - 0.3, 620, 1020, 1.06],
    [b.goals + 0.8, 540, 960, 1],
    [b.slip - 0.2, 540, 960, 1],
    [b.slip + 0.8, 540, 820, 1.35],
    [b.today - 0.3, 540, 820, 1.35],
    [b.today + 0.7, 540, 960, 1],
    [999, 540, 960, 1],
  ];
  const base = camAt(t, keys);
  // A slow drift on top of every move: the frame is never quite still.
  const cam = { x: base.x + 8 * Math.sin(t * 0.45), y: base.y + 6 * Math.sin(t * 0.31 + 1), z: base.z + 18 * Math.sin(t * 0.27) };
  const [shx, shy] = shake(t, [
    [b.cost, 6],
    [toDrawerAt(b), 5],
    [b.slip, 4],
    [b.drawer, 7],
    [b.step, 5],
  ]);

  // The phone: on the desk, in her hands, in the drawer, out again on the slip, back on the desk.
  const toDrawer = b.phone8 + 0.25;
  const fromDrawer = b.slip - 0.1;
  // About thirty poses, one change every two seconds or so, each on a word.
  const swaps: [number, string][] = [
    [0, 'type'],
    [1.5, 'surprised'], // the phone rings
    [b.holding, 'phone'],
    [b.putting, 'laugh'], // enjoying the phone while she puts the task off
    [b.cost, 'shocked'], // the pile grows
    [b.review, 'think'],
    [b.worse, 'bored'],
    [b.mood, 'phone'],
    [b.better, 'laugh'],
    [b.still, 'shocked'], // the task is still there
    [b.guilt, 'guilt'],
    [b.three, 'thumbs'], // the pointing hand would hide behind the tall pile here
    [b.tiny + 0.3, 'point'],
    [b.open, 'type'],
    [b.stopped, 'surprised'],
    [b.back, 'type'],
    [b.phone8, 'reach'],
    [b.drawer + 0.6, 'thumbs'],
    [b.goals, 'type'],
    [b.temptations, 'think'],
    [b.trying, 'type'],
    [b.not, 'facepalm'],
    [b.three10, 'point'],
    [fromDrawer + 0.55, 'phone'],
    [b.forgive, 'forgive'],
    [b.today, 'point'],
    [b.pick, 'type'],
    [b.step, 'proud'],
    [b.step + 1.1, 'stretch'],
  ];
  const her = swapAt(t, swaps);
  // Her body language on top of the poses: a slow sway, a nod on each key word, a jiggle while she types,
  // a shiver when shocked or guilty, a hop on the cheer, and a lean that fits each pose.
  const nods = [b.work, b.procras, b.cost, b.clear, b.mood, b.better, b.there, b.help, b.tiny, b.line, b.back, b.reach, b.drawer, b.simply, b.not, b.forgive, b.less, b.today, b.step];
  const nod = nods.reduce((o, at, i) => {
    const d = t - at;
    return d > 0 && d < 0.45 ? { dy: o.dy + 10 * Math.sin((Math.PI * d) / 0.45), rot: o.rot + (i % 2 ? 2.5 : -2.5) * Math.sin((Math.PI * d) / 0.45) } : o;
  }, { dy: 0, rot: 0 });
  const LEAN: Record<string, number> = { think: 3, bored: -4, laugh: -2, phone: -1.5, point: 2, facepalm: -3, thumbs: 2, surprised: 1.5 };
  const typing = her.name === 'type' ? 2.5 * Math.abs(Math.sin(t * 17)) : 0;
  const shiver = her.name === 'shocked' || her.name === 'guilt' ? 3 * Math.sin(t * 55) : 0;
  const hop = t > b.step ? 30 * Math.abs(Math.sin((t - b.step) * 6)) * Math.exp(-(t - b.step) * 1.5) : 0;
  const body = { dx: shiver, dy: nod.dy + typing - hop, rot: 1.2 * Math.sin(t * 0.9) + nod.rot + (LEAN[her.name] ?? 0) };
  const phoneOnDesk = t < b.holding || (t >= b.three && t < toDrawer);
  const inHand = her.name === 'phone' || her.name === 'laugh';
  // The laptop lid is open only while she works: she shuts it to look at the phone, so her hands show.
  const lid = (
    [
      [-1, b.holding - 0.15],
      [b.open - 0.2, b.phone8 + 0.2],
      [b.goals - 0.3, b.slip - 0.3],
      [b.pick - 0.3, 999],
    ] as const
  ).reduce((o, [a, z]) => Math.max(o, ease(t, a, 0.25) * (1 - ease(t, z, 0.25))), 0);
  // Flights: desk -> drawer, drawer -> hands. Gravity arcs in rest px.
  const arc = (u: number, x0: number, y0: number, x1: number, y1: number, h: number) => [lerp(x0, x1, u), lerp(y0, y1, u) - h * 4 * u * (1 - u)];
  const deskPhoneY = PHONE.bottom - (PHONE.w * S.phone_prop.h) / S.phone_prop.w / 2;
  const flyIn = clamp((t - toDrawer) / 0.55);
  const flyOut = clamp((t - fromDrawer) / 0.55);
  const flyBack = clamp((t - b.forgive) / 0.6); // forgiven: the phone goes back in the drawer
  const drawerOpen = Math.max(
    ease(t, toDrawer - 0.15, 0.2) * (1 - ease(t, toDrawer + 0.5, 0.15)),
    ease(t, fromDrawer - 0.15, 0.15) * (1 - ease(t, fromDrawer + 0.5, 0.2)),
    0.25 * ease(t, b.resist - 0.1, 0.12) * (1 - ease(t, b.resist + 0.5, 0.1)),
    0.2 * ease(t, b.goals - 0.05, 0.1) * (1 - ease(t, b.goals + 0.45, 0.1)),
    0.2 * ease(t, b.temptations + 0.45, 0.1) * (1 - ease(t, b.temptations + 0.95, 0.1)),
    ease(t, b.forgive + 0.2, 0.15) * (1 - ease(t, b.forgive + 0.6, 0.15)),
  );
  const rattle = t > b.temptations && t < b.temptations + 0.9 ? Math.sin(t * 70) * 5 : 0;

  // The task stack: grows while ignored, shrinks to a small pile on "tiny".
  const grow = 1 + 0.25 * pop(t, b.cost, 0.4) + 0.3 * ease(t, b.still, 0.5, out3);
  const stackScale = lerp(grow, 0.45, ease(t, b.tiny, 0.45, out3)) * (1 + 0.06 * Math.sin(Math.max(0, t - b.pick) * 18) * Math.exp(-Math.max(0, t - b.pick) * 4) * (t > b.pick ? 1 : 0));
  const stackH = (STACK.w * S.stack.h) / S.stack.w;
  const pileBreath = 1 + 0.015 * Math.sin(t * 2.2);
  const pileBlinks = [2.5, 5.1, 8.4, 9.2, 13.2, 18.9, 20.6, 24.0, 26.2, 29.0, 33.5, 37.2, 41.0, 45.3, 49.2, 53.0, 58.5, 62.2, 65.0];
  // where the pile looks: at the phone, then at her, at the viewer for the tips, up at her when she starts
  const pileLook: [number, number] = t < b.holding ? [0.9, -0.1] : t < b.three ? [0.7, -0.6] : t < b.tiny ? [0, 0] : t < b.step ? [0.6, -0.7] : [0, -0.3];
  const pileMood = t < b.tiny ? 'angry' : 'open';
  const pileMouth = t > b.holding && t < b.holding + 1 ? 'o' : t > b.still && t < b.still + 0.8 ? 'grin' : t < b.tiny ? 'frown' : t > b.step ? 'grin' : 'smile';
  const pileShake = t > b.cost && t < b.cost + 0.8 ? 4 * Math.sin(t * 60) : 0;

  // Writing: one line on "line", stopped on "stopped", picked up on "back".
  const written = Math.min(clamp((t - b.line) / 1.4), 0.55 + clamp((t - b.back) / 1.0) * 0.45) + clamp((t - b.back - 1.0) / 1.2);
  const writing = pop(t, b.open, 0.35) * (1 - ease(t, b.phone8 - 0.3, 0.3));

  const review = cardP(t, b.review - 0.1, b.mood);
  const exams = cardP(t, b.students - 0.3, b.today);
  const badge = (n: number, a: number, z: number) => (t >= a && t < z ? pop(t, a, 0.3) : 0);
  const dof = Math.max(review, exams) * 3;

  return (
    <AbsoluteFill style={{ transform: `translate(${shx}px, ${shy}px)` }}>
      <Layer cam={cam} z={1600} blur={2 + dof}>
        <Wall t={t} b={b} />
      </Layer>
      <Layer cam={cam} z={1000} blur={dof}>
        {/* forgiving herself: a warm ring opens behind her head */}
        {her.name === 'forgive' && (
          <Svg>
            <circle cx={HX} cy={HY - 40} r={260 * pop(t, b.forgive, 0.5) + 8 * Math.sin(t * 3)} fill="#f8e3b5" stroke={C.amber} strokeWidth={10} />
          </Svg>
        )}
        <Pose s={S[her.name]} hx={HX + body.dx} hy={HY + body.dy} hr={HR} sx={her.sx} sy={her.sy * breath(t)} rot={body.rot} />
        <Svg>
          {/* feel better: hearts float up from the phone */}
          {inHand &&
            t > b.better - 0.2 &&
            t < b.still + 0.6 &&
            [0, 1, 2, 3].map((i) => {
              const d = (t - b.better + 0.2 - i * 0.35) % 1.4;
              if (d < 0) return null;
              return <Heart key={i} x={HX + (i % 2 ? 240 : -240) + Math.sin(d * 5) * 15} y={HY + 230 - d * 260} s={Math.sin(Math.PI * Math.min(1, d / 1.4)) * 1.1} />;
            })}
          {/* the mood meter swings from a frown to a smile when the phone "makes you feel better" */}
          <Gauge x={HX - 250} y={HY - 310} s={pop(t, b.mood - 0.1) * (1 - ease(t, b.still - 0.3, 0.3))} v={lerp(-1.05, 1.05, ease(t, b.better - 0.2, 0.9, out3)) + 0.06 * Math.sin(t * 9)} />
          {/* the temptations: they circle her head, then pop away one by one ("fewer temptations") */}
          {t > b.goals - 0.7 &&
            t < b.trying &&
            [0, 1, 2, 3].map((i) => {
              // spread over the upper arc (22, 67, 112 and 157 degrees), each bobbing a little
              const a = (Math.PI * (i + 0.5)) / 4 + 0.12 * Math.sin(t * 1.6 + i * 1.7);
              const sz = pop(t, b.goals - 0.7 + i * 0.12) * (1 - ease(t, b.temptations - 0.3 + i * 0.28, 0.18));
              return <Temptation key={i} kind={i} x={HX + Math.cos(a) * 360} y={HY - 120 - Math.sin(a) * 190} s={1.5 * sz} />;
            })}
          {/* guilt: a small grey cloud over her head and a sweat drop */}
          {her.name === 'guilt' && (
            <>
              <Puffs t={t} from={[HX - 30, HY - 300]} to={[HX + 30, HY - 330]} start={b.guilt} end={b.three} every={0.2} life={1.3} r={30} spread={150} color="#b9bcc8" />
            </>
          )}
          {her.name === 'forgive' && [0, 1, 2].map((i) => <Heart key={i} x={HX + (i - 1) * 140} y={HY - 270 - (i % 2) * 30} s={0.9 * pop(t, b.forgive + 0.2 + i * 0.12)} />)}
        </Svg>
      </Layer>
      <Layer cam={cam} z={900}>
        <Desk open={drawerOpen} />
        <Pic s={S.laptop} x={LAPTOP.x} y={LAPTOP.bottom - (LAPTOP.w * S.laptop.h) / S.laptop.w / 2} w={LAPTOP.w} sy={lerp(0.1, 1, lid)} />
        <Pic s={S.stack} x={STACK.x + pileShake} y={STACK.bottom - stackH / 2} w={STACK.w} sx={stackScale} sy={stackScale * pileBreath} />
        {phoneOnDesk && <Pic s={S.phone_prop} x={PHONE.x} y={deskPhoneY - (t > 1.5 && t < b.holding ? 22 * Math.abs(Math.sin((t - 1.5) * 9)) : 0)} w={PHONE.w} sy={1 + 0.06 * Math.sin(t * 6) * (t < b.holding ? 1 : 0)} />}
        {flyIn > 0 &&
          flyIn < 1 &&
          (() => {
            const [x, y] = arc(flyIn, PHONE.x, deskPhoneY, DRAWER.x, DRAWER.y - 40, 260);
            return (
              <>
                <Pic s={S.phone_prop} x={x} y={y} w={PHONE.w} rot={flyIn * 360} origin={[0.5, 0.5]} />
                <Svg>
                  <g transform={`rotate(${flyIn * 360} ${x} ${y})`}>
                    <Eyes x={x} y={y - 20} r={13} mood="squeeze" />
                    <Mouth x={x} y={y + 25} w={30} kind="o" />
                  </g>
                </Svg>
              </>
            );
          })()}
        {flyBack > 0 &&
          flyBack < 1 &&
          (() => {
            const [x, y] = arc(flyBack, HX + 10, HY + 300, DRAWER.x, DRAWER.y - 40, 300);
            return <Pic s={S.phone_prop} x={x} y={y} w={PHONE.w} rot={flyBack * 360} origin={[0.5, 0.5]} />;
          })()}
        {flyOut > 0 &&
          flyOut < 1 &&
          !inHand &&
          (() => {
            const [x, y] = arc(flyOut, DRAWER.x, DRAWER.y - 40, HX + 10, HY + 300, 360);
            return <Pic s={S.phone_prop} x={x} y={y} w={PHONE.w * lerp(1, 0.8, flyOut)} rot={-flyOut * 360} origin={[0.5, 0.5]} />;
          })()}
        {/* the last line: one sheet hops from the small pile into the laptop */}
        {(() => {
          const u = clamp((t - b.pick - 0.1) / 0.5);
          if (u <= 0 || u >= 1) return null;
          const x = lerp(STACK.x, LAPTOP.x, u);
          const y = lerp(STACK.bottom - 60, 1040, u) - 50 * Math.sin(Math.PI * u);
          return (
            <Svg>
              <rect x={x - 40} y={y - 50} width={80} height={100} rx={6} fill="#fff" stroke={INK} strokeWidth={6} transform={`rotate(${u * 360} ${x} ${y})`} />
            </Svg>
          );
        })()}
        <Svg>
          {/* the phone lights up and rings before she grabs it */}
          {t > 1.5 &&
            t < b.holding &&
            [0, 1].map((i) => {
              const u = ((t - 1.5) * 1.6 + i * 0.5) % 1;
              return <path key={i} d={`M${PHONE.x - 80 - u * 40} ${deskPhoneY - 60} q${-20 - u * 30} ${50} 0 ${110}`} fill="none" stroke={C.amber} strokeWidth={7} strokeLinecap="round" opacity={1 - u} />;
            })}
          {t < b.holding && pop(t, 1.5) > 0 && (
            <g transform={`translate(${PHONE.x - 62} ${deskPhoneY - 105}) scale(${pop(t, 1.5)})`}>
              <circle r={32} fill="#d9534f" stroke={INK} strokeWidth={5} />
              <text y={15} textAnchor="middle" style={{ font: '900 44px Montserrat' }} fill="#fff">
                1
              </text>
            </g>
          )}
          {/* the pile gets angry on "cost" */}
          {t > b.cost && t < b.cost + 1.4 &&
            [-1, 1].map((side) => (
              <path key={side} transform={`translate(${STACK.x + side * 120} ${STACK.bottom - stackH * stackScale - 10}) scale(${pop(t, b.cost, 0.25) * (1 - ease(t, b.cost + 1.1, 0.3)) + 0.001})`} d={`M0 0 l${side * 14} -16 l${side * 4} 22 l${side * 14} -16`} fill="none" stroke="#e0402a" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          {/* a padlock snaps on the drawer: out of reach */}
          {t > b.drawer && t < b.slip + 0.4 && (() => {
            const off = ease(t, b.slip - 0.35, 0.6, out3);
            return <Lock x={DRAWER.x + 105 + off * 160} y={DRAWER.y - 10 - off * 260 + rattle} s={pop(t, b.drawer, 0.3) * (1 - off)} rot={rattle * 2 + off * 200} />;
          })()}
          {/* the task's face: grumpy, and louder the longer it waits */}
          {(() => {
            const h = stackH * stackScale;
            const y = STACK.bottom - h * 0.45;
            return (
              <g>
                <Eyes x={STACK.x + pileShake} y={y} r={22 * stackScale} mood={pileMood} open={blink(t, pileBlinks)} look={pileLook} />
                <Mouth x={STACK.x + pileShake} y={y + 55 * stackScale} w={40 * stackScale} kind={pileMouth} />
              </g>
            );
          })()}
          {/* the phone's face: it winks at her */}
          {phoneOnDesk && (() => {
            const hopY = t > 1.5 && t < b.holding ? 22 * Math.abs(Math.sin((t - 1.5) * 9)) : 0;
            return (
              <g>
                <Eyes x={PHONE.x} y={deskPhoneY - 8 - hopY} r={13} open={blink(t, [1.2, 3.0, 30.5, 36.0, 39.5])} look={t < b.holding ? [-0.9, -0.3] : [-0.6, -0.8]} />
                <Mouth x={PHONE.x} y={deskPhoneY + 30 - hopY} w={30} kind={t > 1.5 && t < b.holding ? 'grin' : 'smile'} />
              </g>
            );
          })()}
          {/* the phone buzzing in the drawer */}
          {t > b.temptations &&
            t < b.temptations + 0.9 &&
            [-1, 1].map((side) => (
              <path
                key={side}
                transform={`translate(${DRAWER.x + side * 190 + rattle} ${DRAWER.y - 20})`}
                d={`M0 0 l${side * 14} -16 l${side * 4} 22 l${side * 14} -16`}
                fill="none"
                stroke="#e0402a"
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          {t > b.resist - 0.1 && t < b.resist + 0.6 && <Eyes x={DRAWER.x} y={DRAWER.y - DRAWER.h / 2 + 8} r={12} look={[-0.5, -1]} s={pop(t, b.resist - 0.05, 0.2)} />}
          {/* the phone tries the drawer twice more before it gives up */}
          {[b.goals, b.temptations + 0.5].map((at, i) =>
            t > at && t < at + 0.6 ? <Eyes key={i} x={DRAWER.x + (i ? 60 : -60)} y={DRAWER.y - DRAWER.h / 2 + 8} r={12} look={[i ? -1 : 1, -1]} s={pop(t, at, 0.2) * (1 - ease(t, at + 0.4, 0.2))} /> : null,
          )}
        </Svg>
      </Layer>
      <Svg>
        <Writing s={writing} p={written} done={pop(t, b.line + 1.4)} />
        <Sign x={880} y={830} s={pop(t, b.start7 - 0.1) * (1 - ease(t, b.stopped - 0.05, 0.15))} />
        <Sign x={880} y={830} pause s={t < b.back ? pop(t, b.stopped - 0.05) : 1 - ease(t, b.back, 0.2)} />
        {t > b.back - 0.1 && t < b.phone8 - 0.3 && (
          <g>
            {/* back to the task: an arrow from the laptop up to the page */}
            <path d="M790 1040 C860 1010 940 940 930 785" fill="none" stroke="#5aa469" strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray={`${ease(t, b.back - 0.1, 0.5)} 1`} />
            {t > b.back + 0.35 && <path transform={`translate(930 775) scale(${pop(t, b.back + 0.35)})`} d="M-22 18 L0 -8 L22 18" fill="none" stroke="#5aa469" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        )}
        <Badge n={1} s={badge(1, b.tiny - 0.9, b.phone8 - 0.4)} />
        <Badge n={2} s={badge(2, b.phone8 - 0.4, b.slip - 0.7)} />
        <Badge n={3} s={badge(3, b.slip - 0.7, b.today - 0.3)} />
        {/* "three things that help": three badges pop in a row */}
        {t > b.three &&
          t < b.tiny - 0.9 &&
          [1, 2, 3].map((n) => (
            <g key={n} transform={`translate(${n * 270 - 270} ${-60})`}>
              <Badge n={n} s={pop(t, b.help - 0.3 + n * 0.15)} />
            </g>
          ))}
      </Svg>
      <Card p={review}>
        <Review t={t} b={b} />
      </Card>
      <Card p={exams}>
        <Exams t={t} b={b} />
      </Card>
    </AbsoluteFill>
  );
};

export const procrastination: VideoDef = {
  id: '01-procrastination',
  look: CUTOUT,
  art: S,
  script,
  timing,
  scenes: { all: All },
  bed: {name: 'music/pluck.wav', vol: 0.13},
  sounds: {
    all: (_, __, w) => {
      const b = beats(w);
      const c = (at: number, n: string, vol: number): Cue => ({
        at,
        name: SFX(n),
        vol,
      });
      return [
        { at: 0.3, name: 'key', vol: 0.12 },
        { at: 1.0, name: 'key', vol: 0.1 },
        { at: 1.5, name: 'pop', vol: 0.12 },
        { at: b.ten, name: 'whoosh', vol: 0.08 },
        { at: b.holding - 0.1, name: 'pop', vol: 0.12 },
        { at: b.putting, name: 'paper', vol: 0.12 },
        { at: b.drawer, name: 'key', vol: 0.15 },
        { at: b.temptations - 0.3, name: 'pop', vol: 0.08 },
        { at: b.temptations + 0.25, name: 'pop', vol: 0.08 },
        { at: b.start7, name: 'tick', vol: 0.1 },
        { at: b.stopped, name: 'tick', vol: 0.1 },
        { at: b.pick + 0.1, name: 'whoosh', vol: 0.08 },
        { at: b.review - 0.1, name: 'whoosh', vol: 0.12 },
        { at: b.pattern, name: 'sweep', vol: 0.08 },
        { at: b.mood - 0.3, name: 'whoosh', vol: 0.1 },
        { at: b.guilt, name: 'pop', vol: 0.1 },
        { at: b.help - 0.15, name: 'pop', vol: 0.12 },
        { at: b.tiny, name: 'paper', vol: 0.2 },
        { at: b.line, name: 'key', vol: 0.12 },
        { at: b.back, name: 'key', vol: 0.12 },
        c(b.phone8 + 0.25, 'drawer', 0.3),
        c(b.temptations, 'buzz', 0.2),
        c(b.slip - 0.15, 'drawer', 0.25),
        c(b.forgive + 0.2, 'drawer', 0.2),
        { at: b.forgive, name: 'chime', vol: 0.1 },
        { at: b.students - 0.4, name: 'whoosh', vol: 0.1 },
        { at: b.forgave, name: 'pop', vol: 0.12 },
        { at: b.today - 0.3, name: 'whoosh', vol: 0.1 },
        { at: b.step, name: 'chime', vol: 0.12 },
      ];
    },
  },
};
