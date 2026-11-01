// Scenes hook, levers and end of "How daily blood pressure pills work", rebuilt in 3D (kits/particles.tsx). Plan: plan.md.
// hook: a big pill tumbling, a week of pills, the pill dissolving into light that streams through a body's vessels.
// levers: a cut-open artery; the heart pumping harder, more fluid, the artery squeezing; four kinds of pills pinned on it.
// end: three people (pictures), talk to your doctor, four pills orbiting.
import React from 'react';
import * as THREE from 'three';
import {Cue, SceneProps, Word, said} from '../../../engine';
import {Artery, Big, BLUE, Cam, camAt, CamKey, Chip, clamp, CORAL, Cutout, DIM, ease, Glow, Ground, hash, Header, Heart, INK, lerp, Mono, NIGHT, Pill, pop, preload, project, SKY, Swarm, V3, World, Anchor} from '../../../kits/particles';

const ART = 'art/cell-to-cure-particles/01-bp-medicines/';
const BODY_PNG = `${ART}body.png`;
const PEOPLE_PNG = [1, 2, 3].map((k) => `${ART}people-${k}.png`);
preload(BODY_PNG, ...PEOPLE_PNG);

const Label: React.FC<{cam: Cam; at: V3; o: number; color: string; dy?: number; children: string}> = ({cam, at, o, color, dy = 0, children}) => {
  const [x, y] = project(cam, at);
  return <Mono x={Math.min(1000, Math.max(80, x))} y={y + dy} o={o} color={color} align="center">{children}</Mono>;
};

/** A point along a polyline, `u` 0..1 by length. */
const along = (pts: number[][], lens: number[], u: number): number[] => {
  let d = u * lens[lens.length - 1];
  let k = 1;
  while (k < lens.length - 1 && lens[k] < d) k++;
  const v = (d - lens[k - 1]) / Math.max(1e-6, lens[k] - lens[k - 1]);
  return [lerp(pts[k - 1][0], pts[k][0], v), lerp(pts[k - 1][1], pts[k][1], v)];
};

// ---- hook: one pill, every day, through the whole body ----
const PILL: V3 = [0, 1.4, 0.5];
const BODY: V3 = [0, 0, -1]; // the body picture: 8 tall, 2.72 wide, feet at y -4
const H0 = [0.13, 1.8]; // the heart on the picture
// main arteries on the picture (body coordinates), each from the heart
const VESSELS = [
  [H0, [0.05, 2.2], [-0.13, 2.54], [-0.18, 3.1], [-0.1, 3.6]],
  [H0, [0.1, 2.2], [0.13, 2.54], [0.18, 3.1], [0.1, 3.6]],
  [H0, [-0.2, 2.15], [-0.58, 2.25], [-0.82, 1.07], [-1.08, -0.18], [-1.1, -0.55]],
  [H0, [0.3, 2.15], [0.58, 2.25], [0.82, 1.07], [1.08, -0.18], [1.1, -0.55]],
  [H0, [0, 1.39], [0, 0.34], [0, -0.13], [-0.37, -0.97], [-0.4, -1.75], [-0.45, -3.48], [-0.47, -3.75]],
  [H0, [0, 1.39], [0, 0.34], [0, -0.13], [0.37, -0.97], [0.4, -1.75], [0.45, -3.48], [0.47, -3.75]],
  [H0, [0, 1.39], [0, 0.76], [-0.4, 0.7]],
  [H0, [0, 1.39], [0, 0.76], [0.4, 0.7]],
];
const VLENS = VESSELS.map((pts) => pts.reduce<number[]>((acc, p, k) => [...acc, k ? acc[k - 1] + Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]) : 0], []));
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const day = (k: number): V3 => [(k - 3) * 0.48, -0.1, 0.5];
const pillRot = (t: number): V3 => [0.3, t * 0.5, 0.6 + 0.1 * Math.sin(t)];

const Hook: React.FC<SceneProps> = ({t, b, words}) => {
  const [tEvery, tTablet, tAll] = [said(words, 0, 'every'), said(words, 1, 'tablet'), said(words, 1, 'all')];
  const tGo = tTablet + 0.3; // the pill dissolves
  const keys: CamKey[] = [
    [0, [1.5, 1.9, 6.4], PILL, 35],
    [tEvery - 0.3, [0.4, 1.6, 6.2], PILL, 35],
    [tEvery + 0.6, [0, 0.9, 12], [0, 0.9, 0.5], 35],
    [b[1] - 0.2, [-0.3, 0.95, 11.5], [0, 0.9, 0.5], 35],
    [tGo, [0, 1.5, 7.2], PILL, 35],
    [tAll + 0.2, [0, -0.4, 27], [0, -0.4, -1], 35],
    [99, [0.6, -0.3, 25.5], [0, -0.4, -1], 35],
  ];
  const cam = camAt(t, keys);
  const week = 1 - ease(t, b[1] - 0.2, 0.4);
  // the pill's surface frozen at the moment it dissolves, for the particles that leave it
  const frozen = new THREE.Euler(...pillRot(tGo));
  const heart: V3 = [BODY[0] + H0[0], BODY[1] + H0[1], BODY[2] + 0.1];
  const grow = ease(t, tGo + 0.2, tAll - tGo + 0.4); // how far the streams have reached
  return (
    <Ground>
      <World cam={cam}>
        <Pill p={PILL} r={0.36} len={1.7} rot={pillRot(t)} s={1 - ease(t, tGo, 0.35) + 0.0001} />
        {DAYS.map((d, k) => {
          const s = pop(t, tEvery + k * 0.09, 0.35) * week;
          return s <= 0 ? null : <Pill key={d} p={day(k)} r={0.1} len={0.42} rot={[0.4, t * 0.6 + k, 0.7]} s={s} />;
        })}
        <Cutout src={BODY_PNG} h={8} aspect={0.34} p={BODY} opacity={ease(t, tGo + 0.1, 0.5)} />
      </World>
      <Glow cam={cam}>
        {/* dust for depth */}
        <Swarm n={260} t={t} color="#5d7cae" size={0.035} tail={0} opacity={0.7} at={(i, tt) => [(hash(i, 1) - 0.5) * 14, ((hash(i, 2) * 12 + tt * 0.08) % 12) - 6, (hash(i, 3) - 0.5) * 10 - 2]} />
        {/* the pill breaks into light that flies to the heart */}
        <Swarm
          n={700}
          t={t}
          color={SKY}
          size={0.05}
          tail={0.1}
          at={(i, tt) => {
            const u = clamp((tt - tGo - hash(i, 4) * 0.35) / 1.3);
            if (tt < tGo || u >= 1) return null;
            const a = hash(i, 5) * Math.PI * 2;
            const n = new THREE.Vector3(0, Math.cos(a), Math.sin(a)).applyEuler(frozen);
            const s = new THREE.Vector3((hash(i, 6) - 0.5) * 1.6, Math.cos(a) * 0.36, Math.sin(a) * 0.36).applyEuler(frozen);
            const out = 1.4 * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * (1 - u);
            const k = u * u;
            return [lerp(PILL[0] + s.x + n.x * out, heart[0], k), lerp(PILL[1] + s.y + n.y * out, heart[1], k), lerp(PILL[2] + s.z + n.z * out, heart[2], k)];
          }}
        />
        {/* the medicine streaming out from the heart through the body's arteries */}
        <Swarm
          n={1700}
          t={t}
          color={SKY}
          size={0.075}
          tail={0.12}
          at={(i, tt) => {
            const v = i % VESSELS.length;
            const u = (hash(i, 7) + tt * (0.22 + hash(i, 8) * 0.1)) % 1;
            if (u > grow) return null;
            const [x, y] = along(VESSELS[v], VLENS[v], u);
            return [BODY[0] + x + (hash(i, 9) - 0.5) * 0.08, BODY[1] + y + (hash(i, 10) - 0.5) * 0.08, BODY[2] + 0.1];
          }}
        />
      </Glow>
      <Anchor t={t} word="DAILY PILLS" icon="pill" accent={BLUE} sub="CELL TO CURE / BLOOD PRESSURE" />
      {DAYS.map((d, k) => (
        <Label key={d} cam={cam} at={day(k)} o={ease(t, tEvery + k * 0.09, 0.25) * week} color={DIM} dy={62}>{d}</Label>
      ))}
    </Ground>
  );
};

// ---- levers: heart, fluid, width ----
const DRUGS: [string, number, number, V3][] = [
  // chip, x, y, the point on the artery it acts on (blood for the diuretic, the wall for the others)
  // staggered so that no line crosses a chip: the bottom row's lines rise through the gap between the top two
  ['DIURETIC', 260, 1185, [-1.6, 0.1, 0]],
  ['ACE INHIBITOR', 830, 1185, [1.4, -1.05, 0.55]],
  ['ARB', 400, 1295, [-0.5, -1.05, 0.55]],
  ['CALCIUM BLOCKER', 700, 1295, [0.3, -1.05, 0.55]],
];
const HEART_X = -8.3;

const Levers: React.FC<SceneProps> = ({t, b, words}) => {
  const [tWalls, tHeart, tFluid, tNarrow] = [said(words, 0, 'walls'), said(words, 1, 'heart'), said(words, 1, 'fluid'), said(words, 1, 'narrower')];
  const tOne = said(words, 2, 'one');
  const mid: [V3, V3, number] = [[-1.5, 0.4, 8.2], [-1.5, 0, 0], 35];
  const keys: CamKey[] = [
    [0, [1.4, 0.9, 9], [0, 0, 0], 35],
    [b[1], [0.3, 0.5, 8.6], [0, 0, 0], 35],
    [tHeart - 0.3, [0.1, 0.5, 8.6], [0, 0, 0], 35],
    [tHeart + 0.5, [-7.6, 0.6, 9.2], [-7.95, 0, 0], 35],
    [tFluid - 0.5, [-7.8, 0.5, 9], [-7.95, 0, 0], 35],
    [tFluid + 0.3, ...mid],
    [tNarrow - 0.3, [-1.1, 0.35, 7.8], [-1.1, 0, 0], 35],
    [b[2] - 0.1, [-0.8, 0.3, 7.6], [-0.8, 0, 0], 35],
    [b[2] + 1.0, [0, 2.6, 15], [0, -1.2, 0], 35],
    [99, [0.7, 2.8, 14.5], [0, -1.2, 0], 35],
  ];
  const cam = camAt(t, keys);
  // the heart beats, faster once it "pumps more"; every beat pushes the wall out a little
  const phase = (tt: number) => 1.1 * tt + 0.6 * Math.max(0, tt - tHeart);
  const beat = (tt: number) => Math.max(0, Math.sin(phase(tt) * Math.PI * 2)) ** 3;
  const radius = (tt: number) => 1.0 * (1 + 0.035 * beat(tt)) - 0.45 * ease(tt, tNarrow - 0.2, 0.6) * (1 - ease(tt, b[2] + 0.2, 0.8));
  const r = radius(t);
  const travel = (tt: number) => 1.5 * tt + 1.8 * Math.max(0, tt - tHeart - 0.2);
  const more = ease(t, tFluid - 0.1, 0.7);
  return (
    <Ground dark={false}>
      <World cam={cam} dark={false}>
        <Artery p={[0, 0, 0]} r={r} len={14} thick={0.32} inner="#8a3a44" />
        <Heart p={[HEART_X, 0, 0]} rot={[0, 0.35, -0.25]} s={0.75 * (1 + 0.06 * beat(t))} beat={beat(t)} />
      </World>
      <Glow cam={cam}>
        <Swarm
          n={1900}
          t={t}
          glow={false}
          color={CORAL}
          size={0.07}
          tail={0.05}
          fade={(i) => (i < 1000 ? 1 : more)}
          at={(i, tt) => {
            const rr0 = radius(tt);
            const a = hash(i, 1) * Math.PI * 2;
            const rr = Math.sqrt(hash(i, 2)) * rr0 * 0.88;
            const x = ((hash(i, 3) * 14 + travel(tt) * (0.8 + 0.5 * (1 - rr / rr0))) % 14) - 7;
            return [x, Math.cos(a) * rr, Math.sin(a) * rr];
          }}
        />
      </Glow>
      <Anchor t={t} word="BLOOD PRESSURE" icon="vessel" sub="WHAT SETS IT" source="NIH" dark={false} />
      <Label cam={cam} at={[0.6, r + 0.3, 0]} o={ease(t, tWalls - 0.1, 0.3) * (1 - ease(t, tHeart - 0.4, 0.3))} color={INK} dy={-60}>ARTERY WALL</Label>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {DRUGS.map(([name, x, y, p], i) => {
          const [px, py] = project(cam, p);
          const u = ease(t, tOne + i * 0.15 + 0.1, 0.45);
          if (u <= 0) return null;
          return (
            <g key={name}>
              <line x1={x} y1={y - 28} x2={lerp(x, px, u)} y2={lerp(y - 28, py, u)} stroke={INK} strokeWidth={3} />
              <circle cx={px} cy={py} r={9 * clamp(u * 3 - 2)} fill={i === 0 ? CORAL : BLUE} stroke={INK} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      {DRUGS.map(([name, x, y], i) => (
        <Chip key={name} x={x} y={y} t={t} at={tOne + i * 0.15}>{name}</Chip>
      ))}
    </Ground>
  );
};

// ---- end: which one fits you, talk to your doctor, your pill? ----
// the three pictures: waist-up, their bottom edges below the frame
const PEOPLE: [string, number, number, V3, string, React.ReactNode][] = [
  [PEOPLE_PNG[0], 0.547, 4.4, [-1.75, -0.6, 0], 'age', 'AGE'],
  [PEOPLE_PNG[1], 0.665, 4.2, [0, -0.9, -0.8], 'ethnic', <>ETHNIC<br />BACKGROUND</>],
  [PEOPLE_PNG[2], 0.588, 4.6, [1.75, -0.4, 0.3], 'health', <>OTHER<br />CONDITIONS</>],
];
const KINDS: [string, string][] = [
  [BLUE, '#f4f4f4'],
  ['#f2c14e', '#f4f4f4'],
  [CORAL, '#26406a'],
  [SKY, BLUE],
];
const RING: V3 = [0, 9, 0];

const End: React.FC<SceneProps> = ({t, words}) => {
  const [tTalk, tDid, tTell] = [said(words, 1, 'talk'), said(words, 2, 'did'), said(words, 2, 'tell')];
  const at = PEOPLE.map(([, , , , w]) => said(words, 0, w));
  const up: [V3, V3, number] = [[0, 9.6, 11], [0, 8.2, 0], 35];
  const keys: CamKey[] = [
    [0, [-1.2, 0.2, 14.5], [0, -0.3, 0], 35],
    [tTalk, [0.6, 0.1, 13.8], [0, -0.3, 0], 35],
    [tDid - 0.3, [1, 0.1, 13.6], [0, -0.3, 0], 35],
    [tDid + 0.6, ...up],
    [99, [0.5, 9.8, 10.3], [0, 8.2, 0], 35],
  ];
  const cam = camAt(t, keys);
  const panel = ease(t, tTalk - 0.1, 0.35) * (1 - ease(t, tDid - 0.3, 0.4));
  return (
    <Ground>
      <World cam={cam}>
        {PEOPLE.map(([src, aspect, h, p], i) => (
          <Cutout key={src} src={src} h={h} aspect={aspect} p={[p[0], p[1] + 0.06 * Math.sin(t * 1.3 + i * 2), p[2]]} rot={[0, (i - 1) * -0.12, 0]} />
        ))}
        {KINDS.map(([a, c], i) => {
          const ang = (i / 4) * Math.PI * 2 + t * 0.7;
          return <Pill key={a} p={[RING[0] + Math.cos(ang) * 1.05, RING[1] + Math.sin(ang * 2 + i) * 0.12, RING[2] + Math.sin(ang) * 1.05]} r={0.24} len={0.95} a={a} b={c} rot={[0.4, t * 0.8 + i, 0.6 + i * 0.7]} s={pop(t, tDid + i * 0.12, 0.4)} />;
        })}
      </World>
      <Glow cam={cam}>
        <Swarm n={300} t={t} color="#5d7cae" size={0.04} tail={0} opacity={0.6} at={(i, tt) => [(hash(i, 1) - 0.5) * 12, ((hash(i, 2) * 16 + tt * 0.1) % 16) - 4, (hash(i, 3) - 0.5) * 8 - 3]} />
      </Glow>
      {/* the pictures are waist-up: their bottom edge fades into the ground */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1150, bottom: 0, background: `linear-gradient(to bottom, rgba(3,4,8,0) 0, #030408 280px)`}} />
      <Anchor t={t} word="WHICH ONE?" icon="pill" accent={BLUE} sub="ASK YOUR DOCTOR" source="NHS / NICE" />
      {PEOPLE.map(([src, , h, p, , label], i) => {
        const [x, y] = project(cam, [p[0], p[1] + h / 2 - 2.0, p[2]]);
        return (
          <Chip key={src} x={Math.min(860, Math.max(200, x))} y={y} t={t} at={at[i]} out={tTalk - 0.2} bg={i === 1 ? BLUE : '#26406a'}>
            <div style={{textAlign: 'center', lineHeight: 1.2}}>{label}</div>
          </Chip>
        );
      })}
      {panel > 0.01 ? (
        <div data-box="" style={{position: 'absolute', left: 540, top: 1190, transform: `translate(-50%, -50%) scale(${lerp(0.9, 1, panel)})`, opacity: panel, background: NIGHT, border: '3px solid #ffffff', padding: '22px 36px', font: `700 40px Menlo, monospace`, letterSpacing: 2, color: '#ffffff', textAlign: 'center', lineHeight: 1.4, whiteSpace: 'nowrap'}}>
          TALK TO YOUR DOCTOR<br />BEFORE CHANGING TREATMENT
        </div>
      ) : null}
      <Big y={1170} t={t} at={tDid + 0.2} color="#ffffff" size={130}>your pill?</Big>
      <Mono x={540} y={1320} o={ease(t, tTell, 0.3)} color={SKY} align="center">TELL US IN THE COMMENTS</Mono>
    </Ground>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {hook: Hook, levers: Levers, end: End};

export const sounds: Record<string, (b: number[], dur: number, words: Word[][]) => Cue[]> = {
  hook: (_b, _dur, words) => [
    {at: said(words, 0, 'every'), name: 'tick', vol: 0.2},
    {at: said(words, 1, 'tablet') + 0.3, name: 'whoosh', vol: 0.16},
    {at: said(words, 1, 'all'), name: 'sweep', vol: 0.12},
  ],
  levers: (_b, _dur, words) => [
    {at: said(words, 1, 'heart') - 0.1, name: 'pop', vol: 0.22},
    {at: said(words, 1, 'fluid') - 0.1, name: 'pop', vol: 0.22},
    {at: said(words, 1, 'narrower') - 0.2, name: 'hit', vol: 0.15},
    {at: said(words, 2, 'one') - 0.1, name: 'tick', vol: 0.2},
  ],
  end: (_b, _dur, words) => [
    {at: said(words, 0, 'age'), name: 'pop', vol: 0.2},
    {at: said(words, 1, 'talk') - 0.1, name: 'paper', vol: 0.15},
    {at: said(words, 2, 'did'), name: 'chime', vol: 0.15},
  ],
};
