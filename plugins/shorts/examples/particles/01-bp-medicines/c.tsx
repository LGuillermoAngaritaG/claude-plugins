// Scenes calcium, beta and daily in the 3D look (plan.md, section c.tsx; kits/particles.tsx; reference ace.tsx).
// calcium: the pill; a smooth muscle cell taking calcium in through its channels and squeezing, the drug plugging
// the channels so it relaxes; the artery widening. beta: a beating heart and its trace, slowing down. daily: the
// pill effect over three days with pills dropping on the day marks, a missed dose, then two pills together.
import React from 'react';
import {Cue, SceneProps, Word, said} from '../../../engine';
import {Artery, Big, BLUE, Cam, camAt, CamKey, Chip, clamp, CORAL, DIM, ease, Glow, Ground, hash, Header, Heart, INK, io, lerp, Mono, Pill, pop, project, SKY, Spindle, Swarm, V3, World, Anchor} from '../../../kits/particles';

/** When line i ends (its last word starts), in scene seconds. */
const lineEnd = (words: Word[][], i: number) => words[i][words[i].length - 1].at;

const Label: React.FC<{cam: Cam; at: V3; o: number; color: string; dy?: number; size?: number; children: string}> = ({cam, at, o, color, dy = 0, size, children}) => {
  const [x, y] = project(cam, at);
  return <Mono x={Math.min(1000, Math.max(80, x))} y={y + dy} o={o} color={color} size={size} align="center">{children}</Mono>;
};

// ---- calcium ----
const TILT = 0.5; // the cell lies on a slant so it fills the upright frame
const LEN = 6.4;
const RAD = 1.2;
const ART_Y = -16;
const ART_ROT = 0.45; // the artery runs a little into depth so both cut ends show
/** The channels: [x along the cell, angle around it] (angle pi/2 faces the camera). */
const PORES: [number, number][] = [
  [-2.1, 0.75],
  [-1.15, 2.35],
  [-0.2, 0.7],
  [0.75, 2.4],
  [1.7, 0.8],
  [2.35, 2.25],
];
/** A point given in the cell's own frame (x along it), in the world. */
const cellToWorld = (p: V3): V3 => [p[0] * Math.cos(TILT) - p[1] * Math.sin(TILT), p[0] * Math.sin(TILT) + p[1] * Math.cos(TILT), p[2]];
const cellR = (x: number) => RAD * Math.pow(Math.max(0, Math.sin(Math.PI * (x / LEN + 0.5))), 0.75);

const Calcium: React.FC<SceneProps> = ({t, b, words}) => {
  const [tChip, tAml] = [said(words, 0, 'calcium'), said(words, 0, 'amlodipine')];
  const [tMuscle, tCa, tSq] = [said(words, 1, 'muscle'), said(words, 1, 'calcium'), said(words, 1, 'squeeze')];
  const [tKeep, tRelax, tArt, tWide] = [said(words, 2, 'keeps'), said(words, 2, 'relaxes'), said(words, 2, 'artery'), said(words, 2, 'widens')];
  const tSwell = said(words, 3, 'swollen');
  const cell: [V3, V3, number] = [[1.2, 1.4, 19], [0, 0, 0], 35];
  const near: [V3, V3, number] = [[0.6, 0.9, 16.5], [0.1, 0.1, 0], 35];
  const art: [V3, V3, number] = [[-2.5, ART_Y + 6.5, 20], [0, ART_Y - 0.4, 0], 35];
  const keys: CamKey[] = [
    [0, [0.6, 10.2, 8.6], [0, 10, 0], 35],
    [b[1] - 0.5, [0, 10.1, 7.8], [0, 10, 0], 35],
    [b[1] + 0.5, ...cell],
    [tKeep - 0.4, ...cell],
    [tKeep + 0.4, ...near],
    [tRelax + 0.3, ...near],
    [tArt - 0.1, ...art],
    [99, [-1, ART_Y + 6, 18.5], [0, ART_Y - 0.4, 0], 35],
  ];
  const cam = camAt(t, keys);
  const sq = ease(t, tSq - 0.3, 0.6) * (1 - ease(t, tRelax - 0.3, 1.0));
  const k = 1 - 0.28 * sq; // the Spindle's own squeeze scale
  const pore = (g: number, out = 0): V3 => {
    const [x, th] = PORES[g];
    const rr = cellR(x) / Math.sqrt(k) + out;
    return [x * k, rr * Math.cos(th), rr * Math.sin(th)];
  };
  const plug = (g: number) => tKeep - 0.1 + g * 0.12; // when the drug sits in channel g
  // the drug: a small blue pill flies into every channel and stays
  const pills = PORES.map(([, th], g) => {
    const u = ease(t, plug(g) - 0.55, 0.55);
    if (u <= 0) return null;
    const to = pore(g, 0.2);
    const from: V3 = [to[0] + 2.5 - g * 0.6, to[1] + 3.5 * Math.cos(th), to[2] + 4];
    return <Pill key={g} p={[lerp(from[0], to[0], u), lerp(from[1], to[1], u), lerp(from[2], to[2], u)]} r={0.13} len={0.62} a={BLUE} b="#cfe0f7" rot={[th, (1 - u) * 3, Math.PI / 2]} />;
  });
  // calcium: dots stream along each channel's normal into it; once it is plugged they bounce off and drift away
  const calcium = (i: number, tt: number): V3 | null => {
    if (i >= 900) {
      // calcium floating around the cell
      const x = (hash(i, 1) - 0.5) * 8 + Math.sin(tt * 0.5 + i) * 0.2;
      const side = hash(i, 2) < 0.5 ? 1 : -1;
      const y = side * (cellR(x) + 0.6 + hash(i, 3) * 1.6) + Math.cos(tt * 0.6 + i) * 0.15;
      return [x, y, (hash(i, 4) - 0.5) * 1.5];
    }
    const g = i % PORES.length;
    const th = PORES[g][1];
    const P = 1.8;
    const u = (tt / P + hash(i, 1)) % 1;
    const start = tt - u * P;
    const D = 1.0 + hash(i, 2) * 1.2;
    const lat = [(hash(i, 3) - 0.5) * 0.8, (hash(i, 4) - 0.5) * 0.5];
    const n: V3 = [0, Math.cos(th), Math.sin(th)];
    const c = pore(g);
    if (start + P * 0.5 < plug(g)) {
      // gets in: vanishes at the channel
      if (u > 0.96) return null;
      const d = D * (1 - u);
      const l = 1 - u;
      return [c[0] + n[0] * d + lat[0] * l, c[1] + n[1] * d + lat[1] * l * Math.sin(th), c[2] + n[2] * d - lat[1] * l * Math.cos(th)];
    }
    // bounces off the plug and drifts away to the side
    const d = 0.55 + D * Math.abs(1 - 2 * u);
    const l = u < 0.5 ? 1 - 2 * u : (2 * u - 1) * 1.2;
    const sgn = u < 0.5 ? 1 : -1;
    return [c[0] + n[0] * d + sgn * lat[0] * l, c[1] + n[1] * d + lat[1] * l * Math.sin(th), c[2] + n[2] * d - lat[1] * l * Math.cos(th)];
  };
  const r = lerp(0.8, 1.3, ease(t, tWide - 0.3, 1.1));
  const cellO = 1 - ease(t, tArt + 0.4, 0.2); // drop the cell's calcium once the camera has left
  const top = cellToWorld([0, cellR(0) / Math.sqrt(k) + 0.25, 0]);
  return (
    <Ground dark={false}>
      <World cam={cam} dark={false}>
        <Pill p={[0, 10, 0]} r={0.4} len={1.9} rot={[0.3, t * 0.5, 0.5 + 0.1 * Math.sin(t)]} s={pop(t, 0, 0.5)} />
        <group rotation={[0, 0, TILT]}>
          <Spindle len={LEN} r={RAD} squeeze={sq} color="#f0c9c4" />
          {PORES.map(([, th], g) => (
            <mesh key={g} position={pore(g, -0.02)} rotation={[th - Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.17, 0.065, 16, 32]} />
              <meshStandardMaterial color="#5a2b33" roughness={0.6} />
            </mesh>
          ))}
          {pills}
        </group>
        <Artery p={[0, ART_Y, 0]} rot={[0, ART_ROT, 0]} r={r} len={11} inner="#8a3a44" />
      </World>
      <Glow cam={cam}>
        <group rotation={[0, 0, TILT]}>
          <Swarm n={1020} t={t} color={CORAL} size={0.07} tail={0.05} glow={false} at={calcium} opacity={ease(t, tMuscle, 0.6) * cellO} />
        </group>
        <group position={[0, ART_Y, 0]} rotation={[0, ART_ROT, 0]}>
        <Swarm
          n={1000}
          t={t}
          color={CORAL}
          size={0.06}
          tail={0.05}
          glow={false}
          opacity={ease(t, tRelax, 0.5)}
          at={(i, tt) => {
            const a = hash(i, 1) * Math.PI * 2;
            const rr = Math.sqrt(hash(i, 2)) * r * 0.9;
            const x = ((hash(i, 3) * 11 + tt * (2.2 + 1.2 * (1 - rr / r))) % 11) - 5.5;
            return [x, Math.cos(a) * rr, Math.sin(a) * rr];
          }}
        />
        </group>
      </Glow>
      <Anchor t={t} word="CALCIUM BLOCKERS" icon="pill" accent={BLUE} sub="4 / LIKE AMLODIPINE" source="NHLBI / NHS" dark={false} />
      <Label cam={cam} at={[0, 10 - 0.8, 0]} o={ease(t, tAml - 0.2, 0.3) * (1 - ease(t, b[1] - 0.3, 0.3))} color={BLUE} dy={40}>AMLODIPINE</Label>
      <Label cam={cam} at={top} o={ease(t, tMuscle, 0.3) * (1 - ease(t, tKeep - 0.3, 0.3))} color={INK} dy={-30}>SMOOTH MUSCLE CELL</Label>
      <Label cam={cam} at={[2.0, -1.7, 0]} o={ease(t, tCa, 0.3) * (1 - ease(t, tKeep - 0.3, 0.3))} color={CORAL}>CALCIUM</Label>
      <Label cam={cam} at={top} o={ease(t, tKeep + 0.4, 0.3) * (1 - ease(t, tRelax + 0.3, 0.3))} color={BLUE} dy={-30}>CHANNELS BLOCKED</Label>
      <Label cam={cam} at={[0.8, ART_Y - r * 1.32 - 0.2, 0.5]} o={ease(t, tArt, 0.3)} color={INK} dy={30}>ARTERY</Label>
      <Mono x={540} y={1320} o={ease(t, tSwell - 0.1, 0.3)} color={CORAL} align="center" size={34}>SOME PEOPLE: SWOLLEN ANKLES</Mono>
    </Ground>
  );
};

// ---- beta ----
const HEART: V3 = [0, 1.25, 0];
const HS = 1.2;
const EY = -0.85; // the trace's baseline
/** The heart trace (one beat, phase 0..1): a small bump, the tall spike at 0.22, a slow bump. */
const ecg = (f: number) => {
  const g = (c: number, w: number) => Math.exp(-(((f - c) / w) ** 2));
  return 0.12 * g(0.1, 0.03) - 0.12 * g(0.19, 0.012) + 0.9 * g(0.22, 0.014) - 0.22 * g(0.25, 0.012) + 0.22 * g(0.45, 0.05);
};

const Beta: React.FC<SceneProps> = ({t, words}) => {
  const [tBeta, tBlock, tSlow, tUK] = [said(words, 0, 'beta'), said(words, 0, 'blockers'), said(words, 0, 'slow'), said(words, 0, 'uk')];
  // beats per second: fast, then slower over 1 s from "slow"; the phase is its exact sum
  const [r1, r2] = [1.6, 0.95];
  const phase = (tt: number) => {
    if (tt < tSlow) return r1 * tt;
    const s = tt - tSlow;
    if (s < 1) return r1 * tSlow + r1 * s - ((r1 - r2) * s * s) / 2;
    return r1 * tSlow + (r1 + r2) / 2 + r2 * (s - 1);
  };
  const rate = (tt: number) => lerp(r1, r2, clamp((tt - tSlow) / 1));
  const since = (((phase(t) - 0.22) % 1) + 1) % 1 / rate(t); // seconds since the last spike
  const beat = Math.exp(-since * 7);
  const keys: CamKey[] = [
    [0, [1.2, 0.8, 14.5], [0, 0.35, 0], 35],
    [tSlow - 0.3, [0.5, 0.6, 13.6], [0, 0.35, 0], 35],
    [tSlow + 0.6, [0, 0.5, 12.6], [0, 0.35, 0], 35],
    [tUK - 0.2, [-0.2, 0.5, 12.4], [0, 0.35, 0], 35],
    [tUK + 0.8, [-1.4, 0.7, 14.5], [0, 0.35, 0], 35],
    [99, [-1.8, 0.7, 14.8], [0, 0.35, 0], 35],
  ];
  const cam = camAt(t, keys);
  const SPEED = 2.6;
  const X = 3;
  // the classic heart curve, about the size of the Heart shape: where the drug dots land
  const onHeart = (i: number): V3 => {
    let [x, y] = [0, 0];
    for (let j = 0; j < 12; j++) {
      [x, y] = [(hash(i, 5 + j) - 0.5) * 2.2, (hash(i, 30 + j) - 0.5) * 2.4 + 0.1];
      if ((x * x + y * y - 1) ** 3 - x * x * y ** 3 < 0) break; // inside the heart curve
    }
    return [HEART[0] + x * 0.8 * HS, HEART[1] + (y - 0.1) * 0.8 * HS, 0.55 * HS];
  };
  return (
    <Ground>
      <World cam={cam}>
        <Heart p={HEART} s={HS} beat={beat} rot={[0, Math.sin(t * 0.6) * 0.25, 0]} />
      </World>
      <Glow cam={cam}>
        {/* the heart trace, written at the right, scrolling left */}
        <Swarm
          n={900}
          t={t}
          color={SKY}
          size={0.05}
          tail={0}
          fade={(i) => 0.15 + 0.85 * (i / 900)}
          at={(i) => {
            const x = -X + (2 * X * i) / 899;
            const tt = t - (X - x) / SPEED;
            const f = (((phase(tt) % 1) + 1) % 1);
            return [x, EY + ecg(f), 0.6];
          }}
        />
        {/* a ring leaves the heart on every beat */}
        <Swarm
          n={260}
          t={t}
          color="#ffffff"
          size={0.04}
          tail={0}
          opacity={0.6 * Math.exp(-since * 1.8)}
          at={(i) => {
            const a = (i / 260) * Math.PI * 2;
            const rr = 1.9 * HS * 0.85 + since * 1.6;
            return [HEART[0] + Math.cos(a) * rr, HEART[1] + 0.1 + Math.sin(a) * rr, -0.3];
          }}
        />
        {/* the drug reaches the heart from "blockers" */}
        <Swarm
          n={420}
          t={t}
          color={SKY}
          size={0.06}
          tail={0.12}
          at={(i, tt) => {
            const u = io(clamp((tt - tBlock + 0.3 - hash(i, 1) * 0.8) / 1.1));
            if (u <= 0) return null;
            const to = onHeart(i);
            const a = hash(i, 2) * Math.PI * 2;
            const from: V3 = [Math.cos(a) * 5, HEART[1] + Math.sin(a) * 5, 2];
            const sw = Math.sin(u * Math.PI) * 0.8;
            return [lerp(from[0], to[0], u) - Math.sin(a) * sw, lerp(from[1], to[1], u) + Math.cos(a) * sw, lerp(from[2], to[2], u)];
          }}
        />
      </Glow>
      <Anchor t={t} word="BETA BLOCKERS" icon="heart" sub="OTHERS / NAMES END IN -OLOL" source="NHS / NICE" />
      <Label cam={cam} at={[-1.25, EY + 0.6, 0.6]} o={ease(t, 0.2, 0.3)} color={DIM} size={28}>HEARTBEAT</Label>
      <Label cam={cam} at={[1.35, EY + 0.75, 0.6]} o={ease(t, tSlow + 0.3, 0.3)} color={SKY} size={28}>SLOWER</Label>
      <Mono x={540} y={1340} o={ease(t, tUK, 0.3)} color="#ffffff" align="center" size={34}>UK GUIDELINES: USUALLY LATER</Mono>
    </Ground>
  );
};

// ---- daily: the pill effect over three days, a missed pill, and why we combine ----
const X0 = -2.7;
const DAYW = 1.8;
const Y0 = -1.7;
const Y1 = 1.7;
const PEAK = 0.88;
const BAND = [0.45, 0.85];
const PAIR_Y = -11;
const dx = (d: number) => X0 + d * DAYW;
const ey = (e: number) => Y0 + e * (Y1 - Y0);
/** The pill effect at day d (0..3): a pill at day 0 and day 1, none at day 2. Qualitative only. */
const effect = (d: number) => {
  const dec = (s: number) => PEAK * Math.exp(-0.55 * Math.max(0, s - 0.1));
  if (d < 1) return lerp(0, PEAK, io(clamp(d / 0.1))) * (d < 0.1 ? 1 : dec(d) / PEAK);
  if (d < 2) {
    const s = d - 1;
    return s < 0.1 ? lerp(dec(1), PEAK, io(s / 0.1)) : dec(s);
  }
  return dec(1) * Math.exp(-0.9 * (d - 2));
};
/** Blood pressure, high where the pill is not working. */
const pressure = (d: number) => 0.9 - 0.72 * clamp((effect(d) - 0.15) / 0.4);

const Daily: React.FC<SceneProps> = ({t, words}) => {
  const [tEvery, tEach, tTablet] = [said(words, 0, 'every'), said(words, 0, 'each'), said(words, 0, 'tablet')];
  const end0 = lineEnd(words, 0);
  const [tTake, tOut] = [said(words, 1, 'take'), said(words, 1, 'out')];
  const [tControl, tCure, tStop, tFine, tNever] = [said(words, 2, 'control'), said(words, 2, 'cure'), said(words, 2, 'if'), said(words, 2, 'fine'), said(words, 2, 'never')];
  const [tLine3, tTwo] = [said(words, 3, 'and'), said(words, 3, 'two')];
  const chart: [V3, V3, number] = [[-2.2, 0.2, 21], [0, -1.05, 0], 35];
  const keys: CamKey[] = [
    [0, ...chart],
    [tStop - 0.2, [0.6, -0.2, 20.5], [0, -1.05, 0], 35],
    [tNever, [1.2, 0, 20.8], [0, -1.05, 0], 35],
    [tLine3 - 0.2, [1.4, 0, 21], [0, -1.05, 0], 35],
    [tLine3 + 0.7, [0.6, PAIR_Y + 0.4, 13], [0, PAIR_Y - 0.6, 0], 35],
    [99, [-0.8, PAIR_Y + 0.4, 12.2], [0, PAIR_Y - 0.6, 0], 35],
  ];
  const cam = camAt(t, keys);
  const P = (x: number, y: number) => project(cam, [x, y, 0]);
  const path = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${P(x, y)[0].toFixed(1)} ${P(x, y)[1].toFixed(1)}`).join(' ');
  // how far the line is drawn, in days
  const head = ease(t, tEach, end0 + 0.5 - tEach) + ease(t, tTake, tOut + 0.4 - tTake) + ease(t, tStop + 0.2, tFine - tStop);
  const pShown = ease(t, tControl - 0.1, 0.9);
  const chartO = 1 - ease(t, tLine3 - 0.1, 0.4);
  const ax = ease(t, 0, 0.6);
  const bo = ease(t, tEvery, 0.4);
  const steps = (to: number, f: (d: number) => number): [number, number][] => {
    const m = Math.max(2, Math.ceil(to * 80));
    return Array.from({length: m}, (_, i) => [dx((to * i) / (m - 1)), ey(f((to * i) / (m - 1)))]);
  };
  const pend = Math.min(head, Math.max(pShown * 2, head > 2 ? head : 0));
  const PT = Y1 + 0.6; // where the day's pill lands
  const drop = (at: number) => {
    const u = clamp((t - at + 0.45) / 0.45);
    const s = t - at;
    return PT + 4 * (1 - u * u) + (s > 0 ? 0.3 * Math.abs(Math.sin(s * 7)) * Math.exp(-s * 6) : 0);
  };
  const missed = pop(t, tStop, 0.4) * (1 - ease(t, tStop + 0.6, 0.8));
  const [hx, hy] = P(dx(head), ey(effect(head)));
  const [px, py] = P(dx(pend), ey(pressure(Math.max(pend, 0.1))));
  const [mx, my] = P(dx(2), PT);
  const xo = ease(t, tStop + 0.25, 0.3) * (1 - ease(t, tStop + 1.4, 0.4));
  const two = ease(t, tLine3 + 0.1, 0.6);
  const s2 = ease(t, tTwo - 0.5, 0.7);
  const bob = Math.sin(t * 2.4) * 0.06;
  return (
    <Ground dark={false}>
      <World cam={cam} dark={false}>
        {[tTablet, tTake].map((at, k) =>
          t < at - 0.45 ? null : <Pill key={k} p={[dx(k), drop(at), 0.2]} r={0.28} len={1.05} rot={[0.3, 0.3 + 0.2 * Math.sin(t + k), -0.35]} s={chartO} />,
        )}
        {missed > 0.01 ? <Pill p={[dx(2), PT, 0.2]} r={0.28} len={1.05} a="#b9c2cf" b="#e6e9ee" rot={[0.3, 0.4, -0.3]} s={missed * chartO} /> : null}
        {two > 0 ? (
          <>
            <Pill p={[lerp(-5, lerp(-1.35, -1.05, s2), two), PAIR_Y + bob, 0]} r={0.36} len={1.5} rot={[0.4, 0.3 * Math.sin(t * 0.8), -0.25]} />
            <Pill p={[lerp(5, lerp(1.35, 1.05, s2), two), PAIR_Y - bob, 0]} r={0.36} len={1.5} a={SKY} b={INK} rot={[-0.4, -0.3 * Math.sin(t * 0.8), 0.25]} />
            <group position={[0, PAIR_Y, 0.3]} scale={pop(t, tTwo - 0.2, 0.4) || 0.001}>
              <mesh>
                <boxGeometry args={[0.5, 0.12, 0.12]} />
                <meshStandardMaterial color={INK} />
              </mesh>
              <mesh>
                <boxGeometry args={[0.12, 0.5, 0.12]} />
                <meshStandardMaterial color={INK} />
              </mesh>
            </group>
          </>
        ) : null}
      </World>
      {chartO > 0.01 ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: chartO}}>
          {/* the working band */}
          <path d={path([[dx(0), ey(BAND[0])], [dx(3 * bo), ey(BAND[0])], [dx(3 * bo), ey(BAND[1])], [dx(0), ey(BAND[1])]]) + 'Z'} fill="rgba(47,109,176,0.13)" />
          {/* axes, no numbers, and the day lines */}
          <path d={path([[dx(0), lerp(Y0, Y1 + 0.15, ax)], [dx(0), Y0], [dx(3 * ax), Y0]])} stroke={INK} strokeWidth={4} fill="none" />
          {[1, 2].map((d) => (
            <path key={d} d={path([[dx(d), Y0], [dx(d), Y1 + 0.1]])} stroke={INK} strokeWidth={2} strokeDasharray="6 10" opacity={0.45 * ax} />
          ))}
          {pShown > 0 && head > 0 ? (
            <>
              <path d={path(steps(pend, (d) => pressure(Math.max(d, 0.1))))} stroke={CORAL} strokeWidth={6} fill="none" strokeLinejoin="round" />
              <circle cx={px} cy={py} r={10 + 2 * Math.sin(t * 6)} fill={CORAL} />
            </>
          ) : null}
          {head > 0 ? (
            <>
              <path d={path(steps(head, effect))} stroke={BLUE} strokeWidth={10} fill="none" strokeDasharray="0.1 16" strokeLinecap="round" />
              <circle cx={hx} cy={hy} r={22} fill={BLUE} opacity={0.25 + 0.15 * Math.sin(t * 6)} />
              <circle cx={hx} cy={hy} r={11} fill={BLUE} />
            </>
          ) : null}
          {xo > 0 ? <path d={`M${mx - 30} ${my - 25} l${60 * xo} ${50 * xo} M${mx + 30} ${my - 25} l${-60 * xo} ${50 * xo}`} stroke={CORAL} strokeWidth={6} strokeLinecap="round" /> : null}
        </svg>
      ) : null}
      <Anchor t={t} word="EVERY DAY" icon="calendar" accent={BLUE} sub="CONTROL, NOT A CURE" source="NHS / MEDLINEPLUS" dark={false} />
      {[0, 1, 2].map((k) => (
        <Label key={k} cam={cam} at={[dx(k + 0.5), Y0 - 0.3, 0]} o={ease(t, 0.2, 0.4) * chartO} color={INK} size={28}>{`DAY ${k + 1}`}</Label>
      ))}
      <Label cam={cam} at={[dx(0.55), ey(0.49), 0]} o={ease(t, tEvery, 0.4) * chartO} color={BLUE} size={28} dy={-18}>WORKING</Label>
      <Mono x={120} y={1150} o={ease(t, tEach, 0.3) * chartO} color={BLUE} size={28}>● PILL EFFECT</Mono>
      <Mono x={960} y={1150} o={pShown * chartO} color={CORAL} size={28} align="right">● BLOOD PRESSURE</Mono>
      <Big y={1255} t={t} at={tCure} out={tNever - 0.15} color={CORAL} size={130}>not a cure</Big>
      <Mono x={540} y={1300} o={ease(t, tNever, 0.3) * chartO} color={INK} align="center" size={30}>NEVER STOP WITHOUT ASKING YOUR DOCTOR</Mono>
      <Big y={1250} t={t} at={tTwo} color={BLUE} size={140}>2 or more</Big>
    </Ground>
  );
};

export const scenes = {calcium: Calcium, beta: Beta, daily: Daily};

export const sounds: Record<string, (b: number[], dur: number, words: Word[][]) => Cue[]> = {
  calcium: (b, _dur, words) => [
    {at: said(words, 0, 'calcium'), name: 'pop', vol: 0.22},
    {at: b[1] + 0.1, name: 'whoosh', vol: 0.15},
    {at: said(words, 2, 'keeps'), name: 'hit', vol: 0.15},
    {at: said(words, 2, 'artery') - 0.2, name: 'whoosh', vol: 0.15},
  ],
  beta: (_b, _dur, words) => [
    {at: said(words, 0, 'beta'), name: 'pop', vol: 0.22},
    {at: said(words, 0, 'slow'), name: 'sweep', vol: 0.12},
    {at: said(words, 0, 'uk'), name: 'tick', vol: 0.2},
  ],
  daily: (_b, _dur, words) => [
    {at: said(words, 0, 'tablet'), name: 'pop', vol: 0.22},
    {at: said(words, 1, 'take'), name: 'pop', vol: 0.22},
    {at: said(words, 2, 'if') + 0.25, name: 'hit', vol: 0.15},
    {at: said(words, 3, 'two') - 0.5, name: 'whoosh', vol: 0.15},
  ],
};
