// The diuretic and ARB scenes in 3D (kits/particles.tsx), after the pattern of ace.tsx.
// water: a kidney fed by the renal artery from the aorta, salt and water leaving down the ureter; then the aorta
// close, with less blood in it. arb: a slab of artery wall with receptor cups; angiotensin II binds and squeezes it,
// then the drug plugs the cups and the hormone bounces off; then ACE inhibitor -> ARB if cough, but not both.
import React from 'react';
import * as THREE from 'three';
import {Cue, SceneProps, said} from '../../../engine';
import {Artery, Beads, BLUE, Cam, camAt, CamKey, Chip, clamp, CORAL, Cup, DIM, ease, Glow, Ground, hash, Header, Kidney, lerp, Mono, MONO, Pill, Pipe, pop, project, SKY, Swarm, V3, World, Anchor} from '../../../kits/particles';

const Label: React.FC<{cam: Cam; at: V3; o: number; color: string; dy?: number; children: string}> = ({cam, at, o, color, dy = 0, children}) => {
  const [x, y] = project(cam, at);
  return <Mono x={Math.min(1000, Math.max(80, x))} y={y + dy} o={o} color={color} align="center">{children}</Mono>;
};
const curve = (pts: V3[]) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)));
const at = (c: THREE.CatmullRomCurve3, u: number): V3 => c.getPoint(clamp(u)).toArray() as V3;

// ---- water: a left kidney seen from the front (hilum facing the midline, -x), the aorta and vena cava beside it ----
const KC: V3 = [1.7, 0.9, 0]; // kidney centre
const KS = 1.5;
const AX = -0.5; // aorta axis x
const AR = 0.5;
const IVC = -1.9;
const RA: V3[] = [[AX + 0.6, 1.25, -0.1], [0.7, 1.2, -0.05], [1.3, 1.1, 0]]; // renal artery: aorta to hilum
const RV: V3[] = [[1.3, 0.8, 0.15], [0.5, 0.72, 0.8], [AX, 0.7, 0.88], [-1.5, 0.7, 0.3], [IVC, 0.7, -0.2]]; // renal vein, in front of the aorta
const UR: V3[] = [[1.3, 0.55, -0.05], [1.45, -0.3, 0], [1.35, -1.6, 0], [1.15, -3.2, 0], [1.0, -6, 0]]; // ureter
const raC = curve(RA);
const urC = curve(UR);
/** A point in the kidney's outer part (the cortex), from two seeds. */
const inKidney = (i: number): V3 => {
  const a = (hash(i, 21) - 0.5) * 2.6;
  const rr = 0.45 + hash(i, 22) * 0.45;
  return [KC[0] + KS * 0.55 * rr * Math.cos(a), KC[1] + KS * 0.95 * rr * Math.sin(a), 0.2];
};

const Water: React.FC<SceneProps> = ({t, b, words}) => {
  const [tDi, tInda, tKid, tRid, tSalt, tWater, tLess] = [said(words, 0, 'diuretics'), said(words, 0, 'indapamide'), said(words, 1, 'kidneys'), said(words, 1, 'rid'), said(words, 1, 'salt'), said(words, 1, 'water'), said(words, 2, 'less')];
  const tPush = said(words, 2, 'push');
  const kClose: [V3, V3, number] = [[1.3, 1.3, 9.5], [1.3, 0.8, 0], 35];
  const kWide: [V3, V3, number] = [[1.3, 1.2, 14.2], [0.85, 0.15, 0], 35];
  const kAorta: [V3, V3, number] = [[0.2, -7.4, 6.6], [AX, -8, 0], 35];
  const keys: CamKey[] = [
    [0, [1.8, 1.5, 10.6], [1.4, 0.85, 0], 35],
    [b[1] - 0.3, ...kClose],
    [b[1] + 0.7, ...kWide],
    [b[2] - 0.4, [1.2, 1.0, 13.6], [0.85, 0.1, 0], 35],
    [b[2] + 0.7, ...kAorta],
    [99, [0.0, -8.4, 5.6], [AX, -8.4, 0], 35],
  ];
  const cam = camAt(t, keys);
  const less = ease(t, tLess, 1.0); // part of the blood fades: less fluid
  const press = 1 - 0.7 * ease(t, tPush - 0.3, 0.8);
  const r = AR * (1 + 0.05 * press * Math.max(0, Math.sin(t * 7)));
  const urine = lerp(0.18, 1, ease(t, tRid - 0.2, 1.4)); // share of the urine particles that flow
  const blood = (i: number, tt: number): V3 => {
    const a = hash(i, 1) * Math.PI * 2;
    const rr = Math.sqrt(hash(i, 2)) * r * 0.85;
    const y = 6 - ((hash(i, 3) * 26 + tt * (2.4 + 1.2 * (1 - rr / r))) % 26);
    return [AX + Math.cos(a) * rr, y, Math.sin(a) * rr];
  };
  // blood into the kidney: down the aorta, along the renal artery, fanning into the kidney
  const renal = (i: number, tt: number): V3 | null => {
    const u = (hash(i, 4) + tt * 0.3) % 1;
    const j = (k: number) => (hash(i, k) - 0.5) * 0.12;
    if (u < 0.2) return [AX + j(5) * 3, lerp(4, 1.25, u / 0.2), j(6) * 3];
    if (u < 0.4) {
      const p = at(raC, (u - 0.2) / 0.2);
      return [p[0] + j(5), p[1] + j(6), p[2]];
    }
    if (u > 0.75) return null;
    const v = (u - 0.4) / 0.35;
    const q = inKidney(i);
    return [lerp(RA[2][0], q[0], v), lerp(RA[2][1], q[1], v) + Math.sin(v * Math.PI) * 0.2 * (hash(i, 7) - 0.5), q[2]];
  };
  // urine: from the kidney to the hilum, then down the ureter
  const pee = (i: number, tt: number): V3 | null => {
    if (hash(i, 11) > urine) return null;
    const u = (hash(i, 12) + tt * 0.28) % 1;
    const j = (k: number) => (hash(i, k) - 0.5) * 0.12;
    if (u < 0.3) {
      const q = inKidney(i + 500);
      const v = u / 0.3;
      return [lerp(q[0], UR[0][0], v), lerp(q[1], UR[0][1], v), q[2]];
    }
    const p = at(urC, ((u - 0.3) / 0.7) * 0.85);
    return [p[0] + j(13), p[1], p[2] + j(14)];
  };
  return (
    <Ground>
      <World cam={cam}>
        <Kidney p={KC} s={KS} rot={[0, Math.PI, 0.05 * Math.sin(t * 0.5)]} />
        <Artery p={[AX, -7, 0]} r={r} len={26} rot={[0, 0, Math.PI / 2]} inner="#8a3a44" />
        <Pipe pts={[[IVC, 6, -0.2], [IVC, -20, -0.2]]} r={0.42} color="#6f6488" />
        <Pipe pts={RA} r={0.14} color="#d98a8a" />
        <Pipe pts={RV} r={0.16} color="#8b7fa6" />
        <Pipe pts={UR} r={0.11} color="#e8dcb8" />
      </World>
      <Glow cam={cam}>
        <Swarm n={1400} t={t} color={CORAL} size={0.06} tail={0.06} at={blood} fade={(i) => (hash(i, 9) < 0.4 ? 1 : 1 - less)} />
        <Swarm n={500} t={t} color={CORAL} size={0.055} tail={0.06} at={renal} />
        <Swarm n={260} t={t} color="#ffffff" size={0.05} tail={0.08} at={(i, tt) => pee(i, tt)} />
        <Swarm n={420} t={t} color={SKY} size={0.06} tail={0.08} at={(i, tt) => pee(i + 260, tt)} />
      </Glow>
      <Anchor t={t} word="WATER PILLS" icon="drop" accent={SKY} sub="1 / DIURETICS · INDAPAMIDE" source="MEDLINEPLUS / NHLBI" />
      <Label cam={cam} at={[KC[0] + 0.4, KC[1] + KS * 1.05, 0]} o={ease(t, tKid - 0.2, 0.3) * (1 - ease(t, b[2] - 0.3, 0.3))} color={DIM} dy={-30}>KIDNEY</Label>
      <Label cam={cam} at={[2.3, -1.0, 0]} o={ease(t, tSalt, 0.3) * (1 - ease(t, b[2] - 0.3, 0.3))} color="#ffffff" dy={-25}>SALT</Label>
      <Label cam={cam} at={[2.3, -1.0, 0]} o={ease(t, tWater, 0.3) * (1 - ease(t, b[2] - 0.3, 0.3))} color={SKY} dy={25}>WATER</Label>
    </Ground>
  );
};

// ---- arb: a slab of artery wall with receptor cups on top ----
const CUPS = 5;
const CX = (k: number) => -1.6 + k * 0.8;
const CS = 1.4; // cup scale
/** A small molecule as a wiggly chain of `k` beads, its head at `p`, the rest above it. */
const chain = (p: V3, k: number, t: number, seed: number): V3[] =>
  Array.from({length: k}, (_, j) => [p[0] + Math.sin(t * 4 + j + seed) * 0.03, p[1] + j * 0.2 + Math.cos(t * 3.3 + j * 1.7 + seed) * 0.03, p[2]]);

const Arb: React.FC<SceneProps> = ({t, b, words}) => {
  const [tArb, tSar, tHorm, tBlocks, tSpots, tAttach, tCant] = [said(words, 0, 'arbs'), said(words, 0, 'sartan'), said(words, 1, 'hormone'), said(words, 1, 'blocks'), said(words, 1, 'spots'), said(words, 1, 'attach'), said(words, 1, 'cant')];
  const [tSwitch, tBut, tComb] = [said(words, 2, 'switch'), said(words, 2, 'but'), said(words, 2, 'combine')];
  const PILL: V3 = [0, 9, 0];
  const wide: [V3, V3, number] = [[0, 3.2, 12.6], [0, 0.8, 0], 35];
  const close: [V3, V3, number] = [[0.3, 2.8, 9.6], [0, 0.7, 0], 35];
  const back: [V3, V3, number] = [[0, 4.2, 18.5], [0, -1.3, 0], 35];
  const keys: CamKey[] = [
    [0, [0.6, 9.2, 8.2], [0, 9, 0], 35],
    [b[1] - 0.6, [0, 9.1, 7.4], [0, 9, 0], 35],
    [b[1] + 0.5, ...wide],
    [tBlocks - 0.3, ...wide],
    [tBlocks + 0.5, ...close],
    [tCant - 0.3, ...close],
    [tCant + 0.5, ...wide],
    [b[2] - 0.3, ...wide],
    [b[2] + 0.6, ...back],
    [99, [0, 4.0, 17.5], [0, -1.3, 0], 35],
  ];
  const cam = camAt(t, keys);
  const sq = ease(t, tHorm + 0.8, 0.9) * (1 - ease(t, tBlocks + 0.4, 1.0)); // the wall tightens while the hormone binds
  const top = 0.6 * (1 + 0.15 * sq);
  const cy = top + 0.175 * CS; // cup base
  const seat = (k: number): V3 => [CX(k), cy + 0.15, 0.2];
  const mols: React.ReactNode[] = [];
  // first wave: angiotensin II falls into every cup and binds; when the drug comes, it lets go
  for (let k = 0; k < CUPS; k++) {
    const e = tHorm + k * 0.2;
    if (t < e) continue;
    const u = ease(t, e, 0.9);
    const s = seat(k);
    const from: V3 = [s[0] + (hash(k, 1) - 0.5) * 1.6, 3.0, 0.6];
    const go = ease(t, tBlocks - 0.15 + hash(k, 2) * 0.3, 1.1);
    const p: V3 = [lerp(from[0], s[0], u) + go * (hash(k, 3) - 0.5) * 3, lerp(from[1], s[1], u) + go * 2.6, lerp(from[2], s[2], u) - go * 1.5];
    if (go < 1) mols.push(<Beads key={`h${k}`} pts={chain(p, 4, t, k)} r={0.11} color={CORAL} emissive={0.25} s={1 - go} />);
  }
  // second wave: the hormone is still made, but meets plugged cups and bounces off
  for (let k = 0; k < 14; k++) {
    const e = tAttach - 0.9 + k * 0.42;
    const a = t - e;
    if (a < 0 || a > 2.3) continue;
    const s = seat((k * 3 + 2) % CUPS);
    const from: V3 = [s[0] + (hash(k, 4) - 0.5) * 1.6, 3.0, 0.6];
    const rim = s[1] + 0.55;
    const side = hash(k, 5) < 0.5 ? -1 : 1;
    const v = clamp((a - 0.8) / 1.5);
    const u = ease(a, 0, 0.8);
    const p: V3 = a < 0.8 ? [lerp(from[0], s[0], u), lerp(from[1], rim, u), lerp(from[2], s[2], u)] : [s[0] + side * v * 1.6, rim + Math.sin(v * 2.2) * 1.2, s[2] - v * 1.2];
    mols.push(<Beads key={`b${k}`} pts={chain(p, 4, t, k + 20)} r={0.11} color={CORAL} emissive={0.25} s={1 - clamp((v - 0.6) / 0.4)} />);
  }
  // the drug: one blue molecule drops into each cup and stays
  const drugs = Array.from({length: CUPS}, (_, k) => {
    const u = ease(t, tBlocks + 0.1 + k * 0.09, 0.6);
    const s = seat(k);
    const from: V3 = [s[0] - 1.5, 3.4, 1.2];
    return u <= 0 ? null : <Pill key={`d${k}`} p={[lerp(from[0], s[0], u), lerp(from[1], s[1] + 0.16, u), lerp(from[2], s[2], u)]} r={0.14} len={0.56} a={BLUE} b="#cfe0f7" rot={[0, 0.3, 0.15 * (k % 2 ? 1 : -1) + (1 - u) * 4]} />;
  });
  const arrow = ease(t, tSwitch - 0.3, 0.5);
  const away = 1 - ease(t, tBut - 0.1, 0.3);
  const cross = ease(t, tComb - 0.1, 0.3);
  return (
    <Ground>
      <World cam={cam}>
        <Pill p={PILL} r={0.36} len={1.7} a={BLUE} rot={[0.3, t * 0.5, 0.6 + 0.1 * Math.sin(t)]} s={pop(t, 0, 0.5)} />
        <mesh position={[0, 0, 0]} scale={[1 - 0.04 * sq, 1 + 0.15 * sq, 1]}>
          <boxGeometry args={[11, 1.2, 3]} />
          <meshStandardMaterial color="#c98b8f" roughness={0.6} />
        </mesh>
        {Array.from({length: CUPS}, (_, k) => (
          <Cup key={k} p={[CX(k), cy, 0.2]} s={CS} />
        ))}
        {mols}
        {drugs}
      </World>
      <Anchor t={t} word="ARBs" icon="pill" accent={BLUE} sub="3 / NAMES END IN -SARTAN" source="NICE / STATPEARLS" />
      <Label cam={cam} at={[-1.3, 2.7, 0.6]} o={ease(t, tHorm, 0.3) * (1 - ease(t, tBlocks, 0.3))} color={CORAL}>ANGIOTENSIN II</Label>
      <Label cam={cam} at={[0, top - 0.3, 1.5]} o={ease(t, b[1] + 0.3, 0.3) * (1 - ease(t, tSpots - 0.3, 0.3))} color="#ffffff">ARTERY WALL</Label>
      <Label cam={cam} at={[0, top - 0.3, 1.5]} o={ease(t, tSpots, 0.3)} color="#ffffff">RECEPTORS</Label>
      <Chip x={290} y={1190} t={t} at={b[2] + 0.2}>ACE INHIBITOR</Chip>
      <Chip x={860} y={1190} t={t} at={tSwitch + 0.3}>ARB</Chip>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: away}}>
        <line x1={490} y1={1190} x2={490 + 270 * arrow} y2={1190} stroke={DIM} strokeWidth={5} />
        {arrow > 0.95 ? <path d="M 760 1190 l -24 -14 v 28 z" fill={DIM} /> : null}
      </svg>
      <Mono x={625} y={1135} o={ease(t, tSwitch - 0.2, 0.3) * away} color={DIM} align="center">IF COUGH</Mono>
      {t > tBut - 0.1 ? (
        <div style={{position: 'absolute', left: 625, top: 1190, transform: `translate(-50%, -50%) scale(${pop(t, tBut - 0.1, 0.4)})`, font: `700 120px ${MONO}`, color: '#ffffff'}}>+</div>
      ) : null}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {cross > 0 ? <line x1={570} y1={1250} x2={570 + 110 * cross} y2={1250 - 120 * cross} stroke={CORAL} strokeWidth={10} strokeLinecap="round" /> : null}
      </svg>
      <Mono x={625} y={1290} o={ease(t, tComb, 0.3)} color={CORAL} size={40} align="center">NOT BOTH</Mono>
    </Ground>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {water: Water, arb: Arb};
export const sounds: Record<string, (b: number[], dur: number, words: SceneProps['words']) => Cue[]> = {
  water: (b, _dur, words) => [
    {at: said(words, 0, 'diuretics') - 0.1, name: 'pop', vol: 0.22},
    {at: b[1] + 0.1, name: 'whoosh', vol: 0.15},
    {at: said(words, 1, 'rid'), name: 'sweep', vol: 0.12},
    {at: b[2] + 0.1, name: 'whoosh', vol: 0.15},
  ],
  arb: (b, _dur, words) => [
    {at: said(words, 0, 'arbs') - 0.1, name: 'pop', vol: 0.22},
    {at: said(words, 1, 'blocks') + 0.5, name: 'hit', vol: 0.15},
    {at: said(words, 2, 'switch'), name: 'whoosh', vol: 0.16},
    {at: said(words, 2, 'combine'), name: 'tick', vol: 0.2},
  ],
};
