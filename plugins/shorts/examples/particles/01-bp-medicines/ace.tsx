// The ACE inhibitor scene rebuilt in 3D (kits/particles.tsx): the reference for the other scenes of the rebuild.
// Shots: the pill; the enzyme making angiotensin II, which sticks to the artery and squeezes it; the drug plugging the
// enzyme, the artery relaxing; a person with a dry cough.
import React from 'react';
import {Cue, SceneProps, said} from '../../../engine';
import {Artery, Ball, Beads, BLUE, Cam, camAt, CamKey, Chip, clamp, CORAL, Cutout, DIM, ease, Glow, Ground, hash, Header, lerp, Mono, Pill, pop, preload, project, SKY, Swarm, V3, World} from '../../../kits/particles';

const COUGH = 'art/cell-to-cure-particles/01-bp-medicines/cough.png';
preload(COUGH);

const ENZ: V3 = [0.2, 1.7, 0];
const NOTCH: V3 = [-0.75, 1.7, 0];
const ART_Y = -2;
const SITES = 9; // where angiotensin II sticks on the artery's top wall

/** A small molecule as a wiggly chain of `k` beads, its head at `p`, heading along `dir`. */
const chain = (p: V3, dir: V3, k: number, t: number, seed: number): V3[] =>
  Array.from({length: k}, (_, j) => [p[0] - dir[0] * j * 0.2 + Math.sin(t * 4 + j + seed) * 0.03, p[1] - dir[1] * j * 0.2 + Math.cos(t * 3.3 + j * 1.7 + seed) * 0.05, p[2] - dir[2] * j * 0.2]);

const Label: React.FC<{cam: Cam; at: V3; o: number; color: string; dy?: number; children: string}> = ({cam, at, o, color, dy = 0, children}) => {
  const [x, y] = project(cam, at);
  return <Mono x={Math.min(1000, Math.max(80, x))} y={y + dy} o={o} color={color} align="center">{children}</Mono>;
};

const Ace: React.FC<SceneProps> = ({t, b, words}) => {
  const [tAce, tRam] = [said(words, 0, 'ace'), said(words, 0, 'ramipril')];
  const [tBody, tHorm, tTight] = [said(words, 1, 'body'), said(words, 1, 'hormone'), said(words, 1, 'tighten')];
  const [tBlocks, tEnz, tRelax] = [said(words, 2, 'blocks'), said(words, 2, 'enzyme'), said(words, 2, 'relax')];
  const tCough = said(words, 3, 'dry');
  const wide: [V3, V3, number] = [[0, -0.8, 19.5], [0, -0.8, 0], 35];
  const close: [V3, V3, number] = [[-0.5, 1.9, 8.2], [-0.5, 1.9, 0], 35];
  const keys: CamKey[] = [
    [0, [0.6, 6.2, 8.6], [0, 6, 0], 35],
    [b[1] - 0.5, [0, 6.1, 7.6], [0, 6, 0], 35],
    [b[1] + 0.6, ...wide],
    [tBlocks - 0.3, ...wide],
    [tBlocks + 0.6, ...close],
    [tRelax - 0.4, ...close],
    [tRelax + 0.4, ...wide],
    [b[3] - 0.5, ...wide],
    [b[3] + 0.4, [-9.5, 6.9, 11], [-9.5, 6.9, 0], 35],
    [99, [-9.5, 6.9, 10], [-9.5, 6.9, 0], 35],
  ];
  const cam = camAt(t, keys);
  // the story in numbers: hormone made from "body" until the drug blocks; the artery squeezes, then relaxes
  const made = (k: number) => tBody + 0.2 + k * 0.42; // when molecule k leaves the enzyme
  const blocked = ease(t, tBlocks + 0.25, 0.5);
  const r = lerp(1.15, 0.72, ease(t, tTight - 0.3, 0.9)) + (1.35 - 0.72) * ease(t, tRelax - 0.1, 1.0) * ease(t, tTight - 0.3, 0.01);
  const site = (k: number): V3 => [-1.6 + ((k % SITES) / (SITES - 1)) * 3.6 + (hash(k, 3) - 0.5) * 0.2, ART_Y + r * 1.32 + 0.12, 0.25 + (hash(k, 4) - 0.5) * 0.4];
  const out: V3 = [0.2, 0.8, 0.3]; // where angiotensin II leaves the enzyme
  const mols: React.ReactNode[] = [];
  for (let k = 0; k < 14; k++) {
    const e = made(k);
    if (e > tBlocks + 0.3 || t < e) continue; // no more are made once the enzyme is plugged
    const u = clamp((t - e) / 1.3);
    const s = site(k);
    const w = Math.sin(u * Math.PI) * 0.6;
    const head: V3 = [lerp(out[0], s[0], u) + w * (k % 2 ? 0.6 : -0.6), lerp(out[1], s[1], u * u * (3 - 2 * u)), lerp(out[2], s[2], u)];
    // once the drug works, the stuck molecules let go and drift away
    const go = ease(t, tRelax - 0.6 + hash(k, 5) * 0.6, 1.2);
    const p: V3 = [head[0] + go * (hash(k, 6) - 0.5) * 3, head[1] + go * 2.6, head[2] - go * 1.5];
    if (go < 1) mols.push(<Beads key={`m${k}`} pts={chain(p, [0, -1, 0], 4, t, k)} r={0.11} color={CORAL} emissive={0.25} s={1 - go} />);
  }
  // angiotensin I: grey chains drifting in from the left into the notch, until it is plugged
  for (let k = 0; k < 16; k++) {
    const e = tBody - 1.2 + k * 0.42;
    const u = clamp((t - e) / 1.6);
    if (u <= 0 || u >= 1 || e > tBlocks) continue;
    const p: V3 = [lerp(-3.4, NOTCH[0] + 0.3, u), lerp(1.7 + (hash(k, 7) - 0.5) * 2.2, NOTCH[1], u), lerp(0.4, 0, u)];
    mols.push(<Beads key={`a${k}`} pts={chain(p, [-1, 0, 0], 5, t, k + 30)} r={0.1} color="#9aa6bb" emissive={0} s={1 - 0.6 * clamp((u - 0.8) / 0.2)} />);
  }
  // the drug: blue molecules fly into the notch and stay there
  const drugs = [0, 1, 2].map((k) => {
    const u = ease(t, tBlocks - 0.35 + k * 0.12, 0.7);
    const from: V3 = [-3.5, 3.2 - k * 0.6, 1.2];
    const to: V3 = [NOTCH[0] + 0.25 + k * 0.05, NOTCH[1] + (k - 1) * 0.28, 0.15];
    return u <= 0 ? null : <Pill key={`d${k}`} p={[lerp(from[0], to[0], u), lerp(from[1], to[1], u), lerp(from[2], to[2], u)]} r={0.12} len={0.5} a={BLUE} b="#cfe0f7" rot={[0, 0, 0.4 + k * 0.5 + (1 - u) * 4]} />;
  });
  const cough = clamp((t - tCough) / 2);
  return (
    <Ground>
      <World cam={cam}>
        <Pill p={[0, 6, 0]} r={0.36} len={1.7} rot={[0.3, t * 0.5, 0.6 + 0.1 * Math.sin(t)]} s={pop(t, 0, 0.5)} />
        <Ball p={ENZ} r={0.95} notch={1.3} color={blocked > 0.5 ? '#8f9bb0' : '#ffffff'} rot={[0.25, 0.5, Math.sin(t * 0.8) * 0.06]} />
        <Artery p={[0, ART_Y, 0]} r={r} len={14} inner="#8a3a44" />
        {mols}
        {drugs}
        <Cutout src={COUGH} h={2.6} aspect={0.615} p={[-9, 7.0, 0]} />
      </World>
      <Glow cam={cam}>
        {/* blood cells streaming through the artery */}
        <Swarm
          n={1400}
          t={t}
          color={CORAL}
          size={0.06}
          tail={0.06}
          at={(i, tt) => {
            const a = hash(i, 1) * Math.PI * 2;
            const rr = Math.sqrt(hash(i, 2)) * r * 0.9;
            const x = ((hash(i, 3) * 14 + tt * (2.2 + 1.2 * (1 - rr / r))) % 14) - 7;
            return [x, ART_Y + Math.cos(a) * rr, Math.sin(a) * rr];
          }}
        />
        {/* the cough: a puff of air from the mouth */}
        <Swarm
          n={260}
          t={t}
          color="#dfe9f7"
          size={0.05}
          tail={0.1}
          at={(i, tt) => {
            const a = tt - tCough - hash(i, 8) * 0.6;
            if (a <= 0 || a > 1.6) return null;
            const d = 1.7 * (0.25 + 0.75 * hash(i, 11)) * (1 - Math.exp(-2.5 * a));
            const sp = (hash(i, 9) - 0.5) * 0.9;
            return [-9.56 - d * Math.cos(sp), 7.5 + d * Math.sin(sp) + a * 0.15, 0.3 + (hash(i, 10) - 0.5) * 0.5];
          }}
          opacity={1 - clamp((cough - 0.6) / 0.4)}
        />
      </Glow>
      <Header t={t} left="2 / ACE INHIBITORS" right="-PRIL" source="NHS / DAILYMED" />
      <Chip x={540} y={430} t={t} at={tAce} out={b[1] - 0.2}>ACE INHIBITOR</Chip>
      <Label cam={cam} at={[0, 6 - 0.75, 0]} o={ease(t, tRam - 0.2, 0.3) * (1 - ease(t, b[1] - 0.3, 0.3))} color={SKY} dy={40}>RAMIPRIL</Label>
      <Label cam={cam} at={[ENZ[0], ENZ[1] + 1.05, 0]} o={ease(t, tHorm, 0.3) * (1 - ease(t, b[3] - 0.4, 0.3))} color={DIM} dy={-20}>{blocked > 0.5 ? 'ACE: BLOCKED' : 'ACE (ENZYME)'}</Label>
      <Label cam={cam} at={[-2.3, 0.75, 0]} o={ease(t, tBody, 0.3) * (1 - ease(t, tBlocks, 0.3))} color="#9aa6bb">ANGIOTENSIN I</Label>
      <Label cam={cam} at={[1.4, 0.55, 0]} o={ease(t, tHorm + 0.6, 0.3) * (1 - ease(t, tBlocks, 0.3))} color={CORAL}>ANGIOTENSIN II</Label>
      <Label cam={cam} at={[NOTCH[0] - 0.2, NOTCH[1] - 0.75, 0]} o={ease(t, tEnz, 0.3) * (1 - ease(t, tRelax - 0.4, 0.3))} color={SKY}>RAMIPRIL</Label>
      <Mono x={540} y={1345} o={ease(t, tCough - 0.5, 0.3)} color={CORAL} align="center">COMMON SIDE EFFECT: DRY COUGH</Mono>
    </Ground>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ace: Ace};
export const sounds: Record<string, (b: number[], dur: number, words: SceneProps['words']) => Cue[]> = {
  ace: (b, _dur, words) => [
    {at: said(words, 0, 'ace') - 0.1, name: 'pop', vol: 0.22},
    {at: b[1] + 0.1, name: 'whoosh', vol: 0.15},
    {at: said(words, 2, 'blocks') + 0.25, name: 'hit', vol: 0.15},
    {at: b[3] - 0.1, name: 'whoosh', vol: 0.15},
  ],
};
