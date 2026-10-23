import React from 'react';
import {SceneProps, VideoDef} from '../../../engine';
import {Arrow, C, Draw, Head, Recap, Svg, Tex, TitleCard, Txt, col, lerp, lin, line, op, ramp, rnd, span, step} from '../../../kit';
import script from './script.json';
import timing from './timing.json';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: number) => (v < -0.005 ? '−' : '') + Math.abs(v).toFixed(2);
const big = (v: number) => (v < 10 ? v.toFixed(2) : Math.round(v).toLocaleString('en-US'));

// ---- the scheme of the video: explicit first-order upwind. new = (1 - c) own + c upstream, inflow 0 ----
const upwind = (q: number[], c: number) => q.map((v, i) => (1 - c) * v + c * (i ? q[i - 1] : 0));
/** The first n + 1 time levels of a run at Courant number c. */
const run = (q0: number[], c: number, n: number) => {
  const out = [q0];
  for (let k = 0; k < n; k++) out.push(upwind(out[k], c));
  return out;
};
/** A run at a moment between two steps: n = 3.4 is 40 % of the way from level 3 to level 4. */
const between = (levels: number[][], n: number) => {
  const k = Math.min(Math.floor(n), levels.length - 2);
  return levels[k].map((v, i) => lerp(v, levels[k + 1][i], clamp(n - k, 0, 1)));
};

type Row = {x: number; y: number; dx: number; unit: number; lo: number; hi: number};
/** One bar per cell, on the baseline y. A value outside [0, 1] is drawn red, and cut at [lo, hi]. `grid` draws cell faces that high. */
const Bars: React.FC<{r: Row; q: number[]; o?: number; grid?: number}> = ({r, q, o = 1, grid}) => (
  <g opacity={o}>
    {grid && q.concat(0).map((_, i) => <line key={`g${i}`} x1={r.x + i * r.dx} y1={r.y} x2={r.x + i * r.dx} y2={r.y - grid} stroke={C.dim} strokeWidth={2} />)}
    {q.map((v, i) => {
      const h = clamp(v, r.lo, r.hi) * r.unit;
      return Math.abs(h) < 0.5 ? null : <rect key={i} x={r.x + i * r.dx + 1} y={r.y - Math.max(h, 0)} width={r.dx - 2} height={Math.abs(h)} fill={v > 1.05 || v < -0.05 ? C.red : C.blue} />;
    })}
    <line x1={r.x} y1={r.y} x2={r.x + q.length * r.dx} y2={r.y} stroke={C.grey} strokeWidth={3} />
  </g>
);

/** Short marks that drift to the right at v px per second: the flow. */
const Streaks: React.FC<{t: number; x: number[]; y: number[]; n: number; v: number; o?: number}> = ({t, x, y, n, v, o = 1}) => (
  <g opacity={o}>
    {Array.from({length: n}, (_, j) => {
      const px = x[0] + ((rnd(j, 'sx') * (x[1] - x[0]) + v * t) % (x[1] - x[0]));
      const py = lerp(y[0], y[1], rnd(j, 'sy'));
      const edge = clamp(Math.min(px - x[0], x[1] - px) / 60, 0, 1); // fades at both ends, so nothing pops
      return <line key={j} x1={Math.max(x[0], px - 36)} y1={py} x2={px} y2={py} stroke={C.blue} strokeWidth={4} strokeLinecap="round" opacity={0.5 * edge} />;
    })}
  </g>
);

type Box = {x0: number; x1: number; y0: number; y1: number};
/** A straight pipe from the side, with the flow drifting through `band`. `cells` draws the cell faces, cw px apart. */
const Pipe: React.FC<{t: number; box: Box; cw: number; v: number; band: number[]; o?: number; cells?: number}> = ({t, box: {x0, x1, y0, y1}, cw, v, band, o = 1, cells = 1}) => (
  <g opacity={o}>
    <Streaks t={t} x={[x0, x1]} y={band} n={16} v={v} />
    {Array.from({length: Math.round((x1 - x0) / cw) + 1}, (_, k) => (
      <Draw key={k} d={line([[x0 + k * cw, y0], [x0 + k * cw, y1]])} p={cells} color={C.grey} w={3} />
    ))}
    <Draw d={line([[x0, y0], [x1, y0]])} w={5} />
    <Draw d={line([[x0, y1], [x1, y1]])} w={5} />
  </g>
);

/** A width marked by two arrow heads, for the cell width. */
const Width: React.FC<{x0: number; x1: number; y: number; p: number}> = ({x0, x1, y, p}) => (
  <>
    <Arrow from={[(x0 + x1) / 2, y]} to={[x0 + 4, y]} p={p} color={C.blue} w={5} />
    <Arrow from={[(x0 + x1) / 2, y]} to={[x1 - 4, y]} p={p} color={C.blue} w={5} />
  </>
);

// ---- title: a pulse of dye moves over the cells ----
const TR: Row = {x: 1220, y: 680, dx: 40, unit: 300, lo: 0, hi: 1.2};
const Title: React.FC<SceneProps> = ({t}) => (
  <TitleCard t={t} kicker="Courant" title="The Courant number" sub="Why a flow simulation has a speed limit">
    <Svg>
      <Bars r={TR} q={Array.from({length: 15}, (_, i) => Math.exp(-(((i - 0.5 - 1.6 * t) / 1.7) ** 2)))} o={ramp(t, 0.2)} grid={330} />
    </Svg>
  </TitleCard>
);

// ---- the same test twice: a short time step (C = 0.5), and one three times longer (C = 1.5) ----
const BLOCK = Array.from({length: 76}, (_, i) => (i >= 4 && i <= 11 ? 1 : 0));
const SLOW = run(BLOCK, 0.5, 90);
const FAST = run(BLOCK, 1.5, 20);
const PEAK = FAST.map((q) => [Math.max(...q.map(Math.abs))]); // the largest value of each level
const RA: Row = {x: 200, y: 420, dx: 20, unit: 150, lo: -0.2, hi: 1.3};
const RB: Row = {x: 200, y: 800, dx: 20, unit: 100, lo: -1.6, hi: 2.2};

const Blowup: React.FC<SceneProps> = ({t, b}) => {
  const go = b[1] + 2.4; // the second run starts here. Both blocks move two cells a second.
  const nb = Math.max(0, (t - go) / 0.75);
  const done = Math.floor(nb) + ramp(nb % 1, 0.6, 0.4);
  const qb = between(FAST, done);
  const worst = between(PEAK, done)[0];
  const on = ramp(t, b[1]);
  const same = ramp(t, b[3] + 1.6);
  return (
    <>
      <Head t={t}>A test: a block of dye in a pipe</Head>
      <Svg>
        <Bars r={RA} q={between(SLOW, Math.max(0, (t - 0.8) / 0.25))} o={ramp(t, 0.2)} />
        <Bars r={RB} q={qb} o={0.3 * ramp(t, 0.2) + 0.7 * on} />
        <Arrow from={[1500, 215]} to={[1720, 215]} color={C.grey} w={4} o={ramp(t, 0.2)} />
        <Draw d={line([[200, 245], [462, 245]])} p={same} color={C.blue} w={4} />
        <Draw d={line([[200, 560], [690, 560]])} p={same} color={C.gold} w={4} />
      </Svg>
      <Txt x={200} y={215} size={40} color={C.blue} align="left" o={ramp(t, 0.2)}>
        short time step
      </Txt>
      <Txt x={1480} y={215} size={36} color={C.grey} align="right" o={ramp(t, 0.2)}>
        flow
      </Txt>
      <Txt x={200} y={530} size={40} color={C.gold} align="left" o={on}>
        time step three times longer
      </Txt>
      <Txt x={1720} y={530} size={40} color={worst > 1.05 ? C.red : C.white} align="right" o={ramp(t, b[2])}>
        largest value: {big(worst)}
      </Txt>
      <Txt x={960} y={1005} size={30} color={C.grey} o={ramp(t, 1)}>
        both runs computed with the scheme of this video: first-order upwind
      </Txt>
    </>
  );
};

// ---- space in cells, time in steps, and how far the fluid gets in one step ----
const GB: Box = {x0: 160, x1: 1760, y0: 230, y1: 470};
const GW = 200; // cell width
const GU = 75; // flow speed, px per second
const GT = 2; // seconds of video per time step
const GY = 350; // the parcel of fluid we follow
const TY = 690; // the time axis
const gx = (t: number) => 230 + GU * t;

const Grid: React.FC<SceneProps> = ({t, b}) => {
  const t0 = b[1] + 0.6; // the first time step
  const ticks = Array.from({length: 8}, (_, k) => t0 + GT * k).filter((s) => s <= t);
  const t1 = t0 + GT * Math.ceil((b[2] + 0.8 - t0) / GT); // the step that gets the gold arrow
  const flash = t < t0 ? 0 : Math.exp(-3 * ((t - t0) % GT));
  const seen = 1 - 0.7 * ramp(t, b[1] + 3) * (1 - flash); // between two steps the solver does not see the parcel
  const axis = ramp(t, b[1], 1);
  return (
    <>
      <Head t={t}>Cells in space, steps in time</Head>
      <Svg>
        <Pipe t={t} box={GB} cw={GW} v={GU} band={[310, 445]} o={ramp(t, 0.2)} cells={ramp(t, b[0] + 0.8, 1.2)} />
        <Width x0={360} x1={560} y={505} p={ramp(t, b[0] + 2.6)} />
        <Arrow from={[GB.x0, TY]} to={[GB.x1, TY]} p={axis} color={C.grey} w={4} />
        {ticks.map((s) => (
          <g key={s} opacity={ramp(t, s, 0.3)}>
            <line x1={gx(s)} y1={GY + 18} x2={gx(s)} y2={TY} stroke={C.dim} strokeWidth={3} strokeDasharray="8 8" />
            <line x1={gx(s)} y1={TY - 18} x2={gx(s)} y2={TY + 18} stroke={C.grey} strokeWidth={4} />
            <circle cx={gx(s)} cy={GY} r={18} fill="none" stroke={C.white} strokeWidth={3} />
          </g>
        ))}
        <circle cx={gx(t)} cy={TY} r={9} fill={C.white} opacity={axis} />
        <circle cx={gx(t)} cy={GY} r={18} fill={C.white} opacity={seen * ramp(t, 0.2)} />
        <Arrow from={[GB.x0, 195]} to={[GB.x0 + 170, 195]} p={ramp(t, b[2] + 0.5)} w={5} />
        {t > t1 && <Arrow from={[gx(t1), 505]} to={[Math.min(gx(t), gx(t1 + GT)), 505]} color={C.gold} w={7} />}
      </Svg>
      {Array.from({length: 8}, (_, k) => (
        <Tex key={k} x={GB.x0 + (k + 0.5) * GW} y={272} size={44} tex={`\\phi_{${k + 1}}`} o={ramp(t, b[0] + 4.3)} />
      ))}
      <Tex x={460} y={555} size={50} color={C.blue} tex="\Delta x" o={ramp(t, b[0] + 2.6)} />
      <Txt x={GB.x1} y={740} size={36} color={C.grey} align="right" o={axis}>
        time
      </Txt>
      <Tex x={gx(t0 + GT / 2)} y={745} size={50} tex="\Delta t" o={ramp(t, b[1] + 2.8)} />
      <Tex x={GB.x0 + 205} y={195} size={46} tex="u" o={ramp(t, b[2] + 1)} />
      <Tex x={gx(t1 + GT / 2)} y={555} size={50} color={C.gold} tex="u\,\Delta t" o={ramp(t, t1 + 0.6)} />
      <Tex x={960} y={900} size={76} tex={`\\text{distance in one step}=${col(C.gold, 'u\\,\\Delta t')}`} o={ramp(t, b[2] + 3.6)} />
    </>
  );
};

// ---- the ratio of the two lengths ----
const QB: Box = {x0: 260, x1: 1660, y0: 230, y1: 430};
const QW = 280;

const Ratio: React.FC<SceneProps> = ({t, b}) => {
  const c = 0.75 - 0.25 * ramp(t, b[2] + 0.2, 0.8) + 0.5 * ramp(t, b[2] + 1.9, 0.8) + 1.5 * ramp(t, b[2] + 3.6, 1.2);
  const tip = QB.x0 + c * QW;
  const trip = clamp((t % 1.6) / 1.1, 0, 1); // the fluid makes the trip of one step, again and again
  const on = ramp(t, 0.2);
  const count = ramp(t, b[1] + 0.3);
  return (
    <>
      <Head t={t}>The Courant number</Head>
      <Svg>
        <rect x={QB.x0} y={QB.y0} width={tip - QB.x0} height={QB.y1 - QB.y0} fill={C.gold} opacity={0.14 * on} />
        <Pipe t={t} box={QB} cw={QW} v={110} band={[355, 410]} o={on} />
        <Arrow from={[QB.x0, 330]} to={[tip, 330]} color={C.gold} w={8} o={on} />
        <circle cx={lerp(QB.x0, tip, trip)} cy={330} r={16} fill={C.white} opacity={on} />
        <g opacity={on}>
          <Width x0={QB.x0} x1={QB.x0 + QW} y={470} p={1} />
        </g>
      </Svg>
      <Tex x={(QB.x0 + tip) / 2} y={278} size={46} color={C.gold} tex="u\,\Delta t" o={on} />
      <Tex x={QB.x0 + QW / 2} y={520} size={50} color={C.blue} tex="\Delta x" o={on} />
      <Tex x={560} y={780} size={110} tex={`${col(C.yellow, 'C')}=\\dfrac{${col(C.gold, 'u\\,\\Delta t')}}{${col(C.blue, '\\Delta x')}}`} o={ramp(t, b[0] + 2.6)} />
      <Txt x={1340} y={730} size={120} color={C.yellow} o={count}>
        C = {c.toFixed(2)}
      </Txt>
      <Txt x={1340} y={845} size={40} color={C.grey} o={count}>
        cells crossed in one time step
      </Txt>
    </>
  );
};

// ---- four cells, and the update of cell i ----
const SX = 120;
const SW = 170;
const SY = 700;
const SU = 360;
const PHI = [0.3, 0.85, 0.35, 0.15]; // the cells i-2, i-1, i, i+1
const TONE = [C.grey, C.teal, C.blue, C.grey];
const NAME = ['\\phi_{i-2}', '\\phi_{i-1}', '\\phi_i', '\\phi_{i+1}'];
const mid = (k: number) => SX + (k + 0.5) * SW;
const top = (k: number) => SY - PHI[k] * SU;

/** `c` is the Courant number of the yellow marker. `box`, `mark`, `link` and `trav` are opacities of the parts. */
const Stencil: React.FC<{t: number; c: number; box?: number; mark?: number; link?: number; trav?: number}> = ({t, c, box = 0, mark = 0, link = 0, trav = 0}) => {
  const xd = mid(2) - c * SW; // where the fluid that arrives in cell i comes from
  const yn = lerp(top(2), top(1), c); // the new value: the straight line through the two old values, read at xd
  const on = ramp(t, 0.2);
  return (
    <>
      <Svg>
        <Streaks t={t} x={[SX, SX + 4 * SW]} y={[225, 270]} n={7} v={90} o={on} />
        {PHI.map((v, k) => (
          <rect key={k} x={SX + k * SW + 6} y={top(k)} width={SW - 12} height={v * SU} fill={TONE[k]} opacity={(k % 3 ? 0.9 : 0.45) * on} />
        ))}
        <line x1={SX} y1={SY} x2={SX + 4 * SW} y2={SY} stroke={C.grey} strokeWidth={3} opacity={on} />
        <rect x={SX + 2 * SW} y={285} width={SW} height={SY - 285} fill="none" stroke={C.white} strokeWidth={3} opacity={0.8 * box} />
        <g opacity={link}>
          <line x1={mid(1)} y1={top(1)} x2={mid(2)} y2={top(2)} stroke={C.white} strokeWidth={3} />
          {c > 1 && <line x1={mid(1)} y1={top(1)} x2={xd} y2={yn} stroke={C.white} strokeWidth={3} strokeDasharray="8 8" />}
          <line x1={xd} y1={yn} x2={SX + 2 * SW + 6} y2={yn} stroke={C.yellow} strokeWidth={2} strokeDasharray="6 8" opacity={mark} />
          <circle cx={xd} cy={yn} r={11} fill={C.yellow} opacity={mark} />
        </g>
        <line x1={SX + 2 * SW + 6} y1={yn} x2={SX + 3 * SW - 6} y2={yn} stroke={C.yellow} strokeWidth={8} opacity={mark} />
        <g opacity={trav}>
          <line x1={xd} y1={yn} x2={xd} y2={732} stroke={C.gold} strokeWidth={2} strokeDasharray="6 8" />
          <Arrow from={[xd, 732]} to={[mid(2), 732]} color={C.gold} w={6} />
        </g>
      </Svg>
      <Tex x={SX} y={190} size={36} align="left" color={C.grey} tex="\text{flow, speed }u" o={on} />
      {NAME.map((n, k) => (
        <Tex key={n} x={mid(k)} y={795} size={50} color={TONE[k]} tex={n} o={on} />
      ))}
      <Txt x={SX + 3 * SW + 14} y={yn} size={36} color={C.yellow} align="left" o={mark}>
        new
      </Txt>
      <Tex x={mid(2) + 22} y={736} size={40} align="left" color={C.gold} tex="u\,\Delta t" o={trav} />
    </>
  );
};

const PN = '\\phi_i^{\\text{new}}';
const PI = col(C.blue, '\\phi_i');
const PU = col(C.teal, '\\phi_{i-1}');
const CN = col(C.yellow, 'C');
const MIXED = `${PN}=(1-${CN})\\,${PI}+${CN}\\,${PU}`;
const RX = 1340; // centre of the right half

const Update: React.FC<SceneProps> = ({t, b}) => {
  const c = 0.5 - 0.4 * ramp(t, b[3] + 1.4, 1.2) + 0.8 * ramp(t, b[3] + 2.7, 1.4) - 0.4 * ramp(t, b[3] + 4.2, 1.1);
  return (
    <>
      <Head t={t}>How a cell gets its new value</Head>
      <Stencil t={t} c={c} box={ramp(t, b[0] + 2.2)} mark={ramp(t, b[1] + 3)} link={ramp(t, b[1] + 5.2)} />
      <Txt x={mid(1)} y={855} size={32} color={C.grey} o={ramp(t, b[1] + 5.2)}>
        upstream
      </Txt>
      <Txt x={RX} y={188} size={32} color={C.grey} o={ramp(t, b[0] + 4.6)}>
        the transport equation
      </Txt>
      <Tex x={RX} y={302} size={58} tex="\dfrac{\partial\phi}{\partial t}+u\,\dfrac{\partial\phi}{\partial x}=0" o={step(t, b[0] + 4.6, b[1] + 3)} />
      <Tex x={RX} y={482} size={58} tex={`\\dfrac{${PN}-${PI}}{\\Delta t}${op(ramp(t, b[1] + 5.2), `+\\,u\\,\\dfrac{${PI}-${PU}}{\\Delta x}=0`)}`} o={step(t, b[1] + 3, b[2] + 0.3)} />
      <Tex x={RX} y={708} size={58} tex={`${PN}=${PI}-${col(C.yellow, '\\underbrace{\\dfrac{u\\,\\Delta t}{\\Delta x}}_{C}')}\\,(${PI}-${PU})`} o={step(t, b[2] + 0.3, b[3] + 0.3)} />
      <Tex x={RX} y={918} size={72} tex={MIXED} o={ramp(t, b[3] + 0.3)} />
    </>
  );
};

// ---- the two weights, as C goes from below one to above one ----
const AX = (c: number) => 1000 + 340 * c; // the axis of C
const WX = 1340; // zero of the two weight bars
const WU = 200; // px per unit of weight

const Weights: React.FC<SceneProps> = ({t, b}) => {
  const c =
    0.5 - 0.35 * ramp(t, 0.6, 2) + 0.7 * ramp(t, 2.8, 2.4) - 0.35 * ramp(t, 5.4, 1.8) + 0.5 * ramp(t, b[1] + 0.2, 1.5) + 0.5 * ramp(t, b[2] + 0.3, 3) - 0.25 * ramp(t, b[2] + 5.6, 1.5) + 0.25 * ramp(t, b[2] + 7.3, 1.2);
  const on = ramp(t, 0.2);
  const own = 1 - c;
  return (
    <>
      <Head t={t}>Why the limit is one</Head>
      <Stencil t={t} c={c} box={0.6} mark={1} link={1} trav={on} />
      <Svg>
        <g opacity={on}>
          <line x1={AX(0)} y1={420} x2={AX(1)} y2={420} stroke={C.green} strokeWidth={8} />
          <line x1={AX(1)} y1={420} x2={AX(2)} y2={420} stroke={C.red} strokeWidth={8} />
          {[0, 0.5, 1, 1.5, 2].map((v) => (
            <line key={v} x1={AX(v)} y1={406} x2={AX(v)} y2={434} stroke={C.grey} strokeWidth={4} />
          ))}
          <circle cx={AX(c)} cy={420} r={15} fill={C.yellow} />
          <rect x={Math.min(WX, WX + own * WU)} y={582} width={Math.abs(own) * WU} height={56} fill={own < 0 ? C.red : C.blue} />
          <rect x={WX} y={712} width={c * WU} height={56} fill={C.teal} />
          <line x1={WX} y1={550} x2={WX} y2={800} stroke={C.grey} strokeWidth={3} />
        </g>
      </Svg>
      <Tex x={RX} y={225} size={56} tex={MIXED} o={on} />
      <Txt x={RX} y={335} size={56} color={C.yellow} o={on}>
        C = {c.toFixed(2)}
      </Txt>
      {[0, 0.5, 1, 1.5, 2].map((v) => (
        <Txt key={v} x={AX(v)} y={468} size={32} color={C.grey} o={on}>
          {v}
        </Txt>
      ))}
      <Txt x={1205} y={610} size={44} color={own < -0.005 ? C.red : C.blue} align="right" o={on}>
        cell: 1 − C = {num(own)}
      </Txt>
      <Txt x={1205} y={740} size={44} color={C.teal} align="right" o={on}>
        neighbour: C = {num(c)}
      </Txt>
      <Txt x={mid(0)} y={545} size={32} color={C.grey} o={ramp(t, b[2] + 3)}>
        not used
      </Txt>
      <Txt x={RX} y={905} size={40} color={C.green} o={span(t, b[0] + 1.5, b[1])}>
        both positive: new value between the old ones
      </Txt>
      <Txt x={RX} y={905} size={40} color={C.yellow} o={span(t, b[1] + 1.2, b[2])}>
        C = 1: exactly the value of the neighbour
      </Txt>
      <Txt x={RX} y={905} size={40} color={C.red} o={ramp(t, b[2] + 5.6)}>
        a negative weight: the new value overshoots
      </Txt>
    </>
  );
};

// ---- a zigzag error at C = 1.5: times minus two at every step ----
const ZX = 120;
const ZW = 64;
const ZY = 600;
const ZU = 30; // px for an error of 1
const ZMAX = 270;
const GX = 1315;

const Growth: React.FC<SceneProps> = ({t, b}) => {
  const n = lin(t, b[1] + 2.6, 0.5) + 3 * lin(t, b[2] + 0.3, 1.5) + 16 * lin(t, b[2] + 2, 2.6); // steps done, up to 20
  const k = Math.min(19, Math.floor(n));
  const px = ZU * lerp((-2) ** k, (-2) ** (k + 1), clamp(2 * (n - k), 0, 1)); // height of the cells that start at +1
  const over = n >= 4 || Math.abs(px) > ZMAX; // too big for the picture: a full red column
  const on = ramp(t, 0.2);
  const counted = ramp(t, b[1] + 2.6);
  // A frame around one cell and its upstream neighbour. It walks along the row: the same sum in every cell.
  const pair = 5 + ramp(t, b[0] + 5.4, 0.5) + ramp(t, b[0] + 6.3, 0.5) + ramp(t, b[0] + 7.2, 0.5);
  return (
    <>
      <Head t={t}>A small error at C = 1.5</Head>
      <Svg>
        <g opacity={on}>
          {Array.from({length: 10}, (_, j) => {
            const h = over ? ZMAX : (j % 2 ? -px : px) * ramp(t, 0.3 + 0.2 * j, 0.5);
            return <rect key={j} x={ZX + j * ZW + 4} y={over ? ZY - ZMAX : ZY - Math.max(h, 0)} width={ZW - 8} height={over ? 2 * ZMAX : Math.abs(h)} fill={over ? C.red : C.blue} />;
          })}
          <line x1={ZX} y1={ZY} x2={ZX + 10 * ZW} y2={ZY} stroke={C.grey} strokeWidth={3} />
          <rect x={ZX + pair * ZW} y={ZY - 100} width={2 * ZW} height={200} fill="none" stroke={C.white} strokeWidth={3} opacity={span(t, b[0] + 4.5, b[1] + 2.2)} />
        </g>
      </Svg>
      <Txt x={ZX + 2.5 * ZW} y={ZY - 64} size={36} o={span(t, b[0] + 2.2, b[1] + 2.2)}>
        +1
      </Txt>
      <Txt x={ZX + 3.5 * ZW} y={ZY + 64} size={36} o={span(t, b[0] + 3, b[1] + 2.2)}>
        −1
      </Txt>
      <Txt x={ZX + 4.5 * ZW} y={ZY - 64} size={36} o={span(t, b[0] + 3.7, b[1] + 2.2)}>
        +1
      </Txt>
      <Txt x={ZX + (pair + 1) * ZW} y={ZY - 128} size={30} color={C.grey} o={span(t, b[0] + 4.5, b[1] + 2.2)}>
        neighbour, cell
      </Txt>
      <Txt x={ZX + 5 * ZW} y={920} size={32} color={C.grey} o={on}>
        the error in each cell
      </Txt>
      <Tex x={GX} y={250} size={50} tex={MIXED} o={step(t, b[0] + 4.5, b[1] + 0.3)} />
      <Tex x={GX} y={385} size={52} tex={`=(1-${CN})\\,${col(C.blue, '(+1)')}+${CN}\\,${col(C.teal, '(-1)')}=1-2${CN}`} o={step(t, b[0] + 5.6, b[1] + 0.3)} />
      <Tex x={GX} y={545} size={72} tex={`${CN}=1.5:\\quad 1-2${CN}=${col(C.red, '-2')}`} o={ramp(t, b[1] + 0.3)} />
      <Txt x={GX} y={720} size={44} color={C.grey} o={counted}>
        after step {Math.floor(n + 1e-6)}
      </Txt>
      <Txt x={GX} y={830} size={84} color={C.red} o={counted}>
        error × {(2 ** Math.floor(n + 1e-6)).toLocaleString('en-US')}
      </Txt>
    </>
  );
};

// ---- a pipe with a throat: every cell has its own C, and the worst one sets the time step ----
const VX = 120;
const VY = 330;
const WID = [110, 100, 85, 70, 55, 40, 30, 30, 40, 55, 70, 85, 100, 110]; // cell widths, 980 px in all
const VEND = VX + 980;
const half = (x: number) => 110 - 65 * Math.exp(-(((x - 610) / 170) ** 2)); // half height of the pipe
const speed = (x: number) => 110 / half(x); // 1 at the inlet, faster where the pipe is narrow
const EDGE = WID.reduce((a, w) => a.concat(a[a.length - 1] + w), [VX]);
// The mesh after refining, every cell cut in two: [left, right, left of the coarse cell, right of the coarse cell].
const CELLS = WID.flatMap((w, k) => [
  [EDGE[k], EDGE[k] + w / 2, EDGE[k], EDGE[k] + w],
  [EDGE[k] + w / 2, EDGE[k] + w, EDGE[k], EDGE[k] + w],
]);
const raw = (a: number, z: number) => speed((a + z) / 2) / (z - a); // u over delta x
const KC = 2.4 / Math.max(...CELLS.map(([, , a, z]) => raw(a, z))); // the first time step gives the worst cell C = 2.4
// How long the flow takes from the inlet to each x, to move the streaks at the local speed.
const TX = Array.from({length: 197}, (_, k) => VX + 5 * k);
const TT = TX.reduce((a: number[], x, k) => a.concat(k ? a[k - 1] + 5 / speed(x - 2.5) : 0), []);
const where = (s: number) => {
  const k = Math.max(1, TT.findIndex((v) => v >= s));
  return TX[k - 1] + (5 * (s - TT[k - 1])) / (TT[k] - TT[k - 1]);
};
const CY = 930; // baseline of the chart
const CU = 150; // px for C = 1
const PX = 1500; // centre of the right panel

const Practice: React.FC<SceneProps> = ({t, b}) => {
  const dt = (1 - 0.625 * ramp(t, b[2] + 0.5, 3)) * (1 - 0.5 * ramp(t, b[3] + 2.2, 1.2));
  const fine = ramp(t, b[3] + 0.3, 0.8);
  const cs = CELLS.map(([a, z, pa, pz]) => KC * dt * lerp(raw(pa, pz), raw(a, z), fine));
  const worst = Math.max(...cs);
  const tone = (c: number) => (c > 1 ? C.red : C.blue);
  const on = ramp(t, 0.2);
  const chart = ramp(t, b[1] + 0.3, 1);
  const shown = ramp(t, b[1] + 5.6);
  return (
    <>
      <Head t={t}>The limit in practice</Head>
      <Svg>
        <g opacity={on}>
          {CELLS.map(([a, z], j) => (
            <path key={j} d={line([[a, VY - half(a)], [z, VY - half(z)], [z, VY + half(z)], [a, VY + half(a)]]) + 'Z'} fill={tone(cs[j])} opacity={0.4 * chart} />
          ))}
          {Array.from({length: 30}, (_, j) => {
            const s = (rnd(j, 'vx') * TT[196] + 90 * t) % TT[196];
            const [x1, x0] = [where(s), where(Math.max(0, s - 16))];
            const f = 0.8 * (2 * rnd(j, 'vy') - 1);
            return <line key={j} x1={x0} y1={VY + f * half(x0)} x2={x1} y2={VY + f * half(x1)} stroke={C.white} strokeWidth={4} strokeLinecap="round" opacity={0.5 * clamp(Math.min(x1 - VX, VEND - x1) / 60, 0, 1)} />;
          })}
          {CELLS.map(([a], j) => (
            <line key={j} x1={a} y1={VY - half(a)} x2={a} y2={VY + half(a)} stroke={C.grey} strokeWidth={3} opacity={j % 2 ? fine : 1} />
          ))}
          <line x1={VEND} y1={VY - 110} x2={VEND} y2={VY + 110} stroke={C.grey} strokeWidth={3} />
          <Draw d={line(TX.map((x) => [x, VY - half(x)]))} w={5} />
          <Draw d={line(TX.map((x) => [x, VY + half(x)]))} w={5} />
        </g>
        <g opacity={chart}>
          {CELLS.map(([a, z], j) => (
            <rect key={j} x={a} y={CY - cs[j] * CU * chart} width={z - a} height={cs[j] * CU * chart} fill={tone(cs[j])} />
          ))}
          {CELLS.map(([a], j) => (
            <line key={j} x1={a} y1={CY} x2={a} y2={CY - 380} stroke={C.bg} strokeWidth={3} opacity={j % 2 ? fine : 1} />
          ))}
          <line x1={VX} y1={CY} x2={VEND} y2={CY} stroke={C.grey} strokeWidth={3} />
          <line x1={VX} y1={CY - CU} x2={VEND} y2={CY - CU} stroke={C.white} strokeWidth={3} strokeDasharray="12 10" />
        </g>
        <Draw d="M1255,600H1745V805H1255Z" p={ramp(t, b[4] + 6.3)} color={C.yellow} w={4} />
      </Svg>
      <Txt x={610} y={195} size={36} color={C.red} o={ramp(t, b[1] + 3)}>
        small cells, fast flow
      </Txt>
      <Txt x={VX} y={487} size={32} color={C.grey} align="left" o={ramp(t, 1)}>
        illustration: a pipe with a narrow throat, meshed finer there
      </Txt>
      <Txt x={VX} y={560} size={34} color={C.grey} align="left" o={chart}>
        C in each cell
      </Txt>
      <Txt x={VEND} y={CY - CU - 32} size={34} align="right" o={chart}>
        limit: C = 1
      </Txt>
      <Tex x={PX} y={262} size={56} tex={`${CN}=\\dfrac{u\\,\\Delta t}{\\Delta x}\\le 1`} o={step(t, b[0] + 0.6, b[0] + 3.6)} />
      <Tex x={PX} y={478} size={80} tex="\Delta t\le\dfrac{\Delta x}{u}" o={ramp(t, b[0] + 3.6)} />
      <Txt x={PX} y={650} size={36} color={C.grey} o={shown}>
        largest C in the mesh
      </Txt>
      <Txt x={PX} y={740} size={100} color={worst > 1 ? C.red : C.green} o={shown}>
        {worst.toFixed(2)}
      </Txt>
      <Txt x={PX} y={860} size={40} o={ramp(t, b[2] + 0.5)}>
        time step × {dt.toFixed(2)}
      </Txt>
      <Txt x={PX} y={935} size={32} color={C.grey} o={ramp(t, b[4] + 0.3)}>
        explicit schemes: limits of this kind
      </Txt>
      <Txt x={PX} y={990} size={32} color={C.grey} o={ramp(t, b[4] + 2.6)}>
        implicit: can run above 1, less accurate
      </Txt>
    </>
  );
};

const Sum: React.FC<SceneProps> = ({t, b}) => (
  <Recap
    t={t}
    b={b}
    items={[
      [C.yellow, 'C = u Δt / Δx: the cells crossed in one step'],
      [C.teal, 'The solver mixes each cell with its upstream neighbour'],
      [C.red, 'Above 1, a weight turns negative and errors grow'],
      [C.blue, 'Small cells and fast flow set the time step'],
    ]}
  />
);

export const speedLimit: VideoDef = {
  id: '01-speed-limit',
  script,
  timing,
  scenes: {title: Title, blowup: Blowup, grid: Grid, ratio: Ratio, update: Update, weights: Weights, growth: Growth, practice: Practice, recap: Sum},
};
