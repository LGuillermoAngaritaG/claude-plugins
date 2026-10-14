import React from 'react';
import {SceneProps, VideoDef} from '../../../engine';
import {Arrow, C, Draw, Head, Recap, Svg, Tex, TitleCard, Txt, col, lerp, line, op, ramp, span} from '../../../kit';
import {ASTAR, Cell, FLOOD, FREE, GOAL, Grid, START, STEPS, View, box, guess, guessLine, key, lin, mid, pathTo, upTo} from '../_shared';
import script from './script.json';
import timing from './timing.json';

const NA = ASTAR.order.length; // squares A* opens
const NF = FLOOD.order.length; // squares the flood opens
const MV: View = {x: 100, y: 230, s: 68}; // the big map, on the left
const PX = 1510; // centre of the panel on its right

/** A colour sample with its name. */
const Key: React.FC<{y: number; color: string; o: number; hollow?: boolean; children: React.ReactNode}> = ({y, color, o, hollow, children}) => (
  <>
    <div style={{position: 'absolute', left: 1290, top: y - 20, width: 40, height: 40, borderRadius: 6, boxSizing: 'border-box', background: hollow ? 'none' : color, border: hollow ? `4px solid ${color}` : 'none', opacity: o}} />
    <Txt x={1352} y={y} size={40} align="left" o={o}>
      {children}
    </Txt>
  </>
);

const TV: View = {x: 1100, y: 320, s: 44};
const Title: React.FC<SceneProps> = ({t}) => {
  const o = ramp(t, 0.2, 1);
  return (
    <TitleCard t={t} kicker="Pathfinding · Part 1" title="The A* algorithm" sub="How a game character finds the shortest path">
      <Svg>
        <Grid v={TV} grid={o} walls={o} start={o} goal={o} s={ASTAR} n={NA * lin(t, 1.2, 5.6)} cursor path={ramp(t, 5.8, 1.2)} walk={ramp(t, 7, 2.4)} />
      </Svg>
    </TitleCard>
  );
};

/** How many squares the flood has opened when it has done every square up to k steps away. */
const ring = (k: number) => FLOOD.order.filter((c) => FLOOD.g[key(c)] <= k).length;

const Flood: React.FC<SceneProps> = ({t, b}) => {
  const n =
    lin(t, b[1] + 0.4, b[1] + 1) +
    (ring(1) - 1) * lin(t, b[1] + 2.6, b[1] + 3.6) +
    (ring(2) - ring(1)) * lin(t, b[1] + 4.4, b[1] + 5.4) +
    (NF - ring(2)) * lin(t, b[1] + 5.8, b[3] - 0.3);
  const many = ramp(t, b[3] + 2.2);
  return (
    <>
      <Head t={t}>The simple way: search like water</Head>
      <Svg>
        <Grid v={MV} grid={ramp(t, b[0], 1.6)} start={ramp(t, b[0] + 2)} goal={ramp(t, b[0] + 3.5)} walls={ramp(t, b[0] + 4.8)} s={FLOOD} n={n} num="g" cursor path={ramp(t, b[3], 1.5)} />
      </Svg>
      <Key y={290} color={C.green} o={ramp(t, b[0] + 2)}>start</Key>
      <Key y={360} color={C.gold} o={ramp(t, b[0] + 3.5)}>goal</Key>
      <Key y={430} color={C.grey} o={ramp(t, b[0] + 4.8)}>wall</Key>
      <Txt x={PX} y={560} size={34} color={C.grey} o={ramp(t, b[1] + 2.6)}>in each square: steps from the start</Txt>
      <Txt x={PX} y={690} size={38} color={C.grey} o={ramp(t, b[1])}>squares checked</Txt>
      <Txt x={PX} y={790} size={110} color={C.blue} o={ramp(t, b[1]) * (1 - many)}>{Math.round(n)}</Txt>
      <Txt x={PX} y={790} size={110} color={C.red} o={many}>{Math.round(n)}</Txt>
      <Txt x={PX} y={880} size={34} color={C.grey} o={many}>of {FREE} free squares</Txt>
      <Txt x={PX} y={965} size={40} color={C.yellow} o={ramp(t, b[3] + 0.8)}>shortest path: {STEPS} steps</Txt>
    </>
  );
};

// The square whose score we work out, then one that leads away from the goal, then one on the way.
const P1: Cell = [6, 6];
const P2: Cell = [1, 7];
const P3: Cell = [6, 4];
const COLX = [PX - 220, PX - 110, PX, PX + 110, PX + 220]; // f = g + h, one symbol per column, its number below

const Score: React.FC<SceneProps> = ({t, b}) => {
  const m1 = ramp(t, b[4] + 0.3, 1.4);
  const m2 = ramp(t, b[4] + 3, 1.4);
  const cell = [0, 1].map((i) => Math.round(lerp(lerp(P1[i], P2[i], m1), P3[i], m2))) as Cell;
  const walked = pathTo(FLOOD, cell).map((c) => mid(MV, c));
  const left = guessLine(cell).map((c) => mid(MV, c));
  const gp = ramp(t, b[1] + 1, 2.2);
  const hp = ramp(t, b[2] + 2.8, 2.6);
  const g = Math.round(gp * (walked.length - 1));
  const h = Math.round(hp * (left.length - 1));
  const go = ramp(t, b[1] + 0.4);
  const ho = ramp(t, b[2] + 0.4);
  const fo = ramp(t, b[3] + 0.8);
  return (
    <>
      <Head t={t}>A score for every square</Head>
      <Svg>
        <Grid v={MV}>
          <path d={line(upTo(left, hp))} stroke={C.gold} strokeWidth={7} strokeDasharray="16 14" strokeLinecap="round" fill="none" opacity={hp > 0 ? 1 : 0} />
          {left.slice(1, h + 1).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={9} fill={C.gold} />
          ))}
          <Draw d={line(upTo(walked, gp))} color={C.green} w={9} p={gp > 0 ? 1 : 0} />
          {walked.slice(1, g + 1).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={11} fill={C.green} />
          ))}
          <rect {...box(MV, cell, 0)} fill="none" stroke={C.white} strokeWidth={6} opacity={ramp(t, b[0] + 1.8)} />
        </Grid>
      </Svg>
      <Txt x={PX} y={300} size={40} color={C.grey} o={span(t, b[0] + 1.8, b[1])}>the score of this square?</Txt>
      <Tex x={COLX[0]} y={290} size={90} tex="f" color={C.yellow} o={fo} />
      <Tex x={COLX[1]} y={290} size={80} tex="=" o={fo} />
      <Tex x={COLX[2]} y={290} size={90} tex="g" color={C.green} o={go} />
      <Tex x={COLX[3]} y={290} size={80} tex="+" o={ramp(t, b[3])} />
      <Tex x={COLX[4]} y={290} size={90} tex="h" color={C.gold} o={ho} />
      <Txt x={COLX[0]} y={410} size={70} color={C.yellow} o={fo}>{g + h}</Txt>
      <Txt x={COLX[1]} y={410} size={64} o={fo}>=</Txt>
      <Txt x={COLX[2]} y={410} size={70} color={C.green} o={ramp(t, b[1] + 1)}>{g}</Txt>
      <Txt x={COLX[3]} y={410} size={64} o={ramp(t, b[3])}>+</Txt>
      <Txt x={COLX[4]} y={410} size={70} color={C.gold} o={ramp(t, b[2] + 2.8)}>{h}</Txt>
      <Tex x={1285} y={570} size={50} tex="g" color={C.green} o={go} />
      <Txt x={1330} y={575} size={38} align="left" o={go}>steps walked from the start</Txt>
      <Tex x={1285} y={670} size={50} tex="h" color={C.gold} o={ho} />
      <Txt x={1330} y={675} size={38} align="left" o={ho}>a guess of the steps left</Txt>
      <Txt x={1330} y={728} size={30} align="left" color={C.grey} o={ramp(t, b[2] + 2.8)}>count the squares, ignore the walls</Txt>
      <Tex x={1285} y={825} size={50} tex="f" color={C.yellow} o={ramp(t, b[3] + 3.2)} />
      <Txt x={1330} y={830} size={38} align="left" o={ramp(t, b[3] + 3.2)}>a guess for the whole trip</Txt>
      <Txt x={PX} y={950} size={40} color={C.red} o={span(t, b[4] + 1.5, b[4] + 3)}>leads away from the goal: high f</Txt>
      <Txt x={PX} y={950} size={40} color={C.green} o={ramp(t, b[4] + 4.2)}>on the way to the goal: low f</Txt>
    </>
  );
};

// How many squares A* has opened when it stands at the wall: the start, and the straight run after it.
const HIT = ASTAR.order.findIndex((c) => ASTAR.g[key(c)] + guess(c) > guess(START));

const Rule: React.FC<SceneProps> = ({t, b}) => {
  const n = ramp(t, b[0] + 1.3, 0.6) + (HIT - 1) * lin(t, b[1] + 0.3, b[1] + 3.6) + (NA - HIT) * lin(t, b[2] + 1, b[3] - 0.3);
  return (
    <>
      <Head t={t}>One rule: open the lowest f</Head>
      <Svg>
        <Grid v={MV} s={ASTAR} n={n} num="f" cursor path={ramp(t, b[3] + 0.3, 2)} walk={ramp(t, b[3] + 3, 2.4)}>
          <rect {...box(MV, ASTAR.order[1], 0)} fill="none" stroke={C.yellow} strokeWidth={7} opacity={span(t, b[0] + 4.3, b[1] + 0.3)} />
        </Grid>
      </Svg>
      <Tex x={PX} y={280} size={76} tex={`${col(C.yellow, 'f')}=${col(C.green, 'g')}+${col(C.gold, 'h')}`} o={ramp(t, 0.3)} />
      <Txt x={PX} y={390} size={42} color={C.yellow} o={ramp(t, b[0] + 3.6)}>always open the lowest f</Txt>
      <Txt x={PX} y={448} size={30} color={C.grey} o={ramp(t, b[1])}>on a tie: the one nearer the goal</Txt>
      <Key y={560} color={C.teal} hollow o={ramp(t, b[0] + 1.3)}>on the edge of the search</Key>
      <Key y={630} color={C.blue} o={ramp(t, b[1])}>opened</Key>
      <Txt x={PX} y={750} size={38} color={C.grey} o={ramp(t, b[1])}>squares opened</Txt>
      <Txt x={PX} y={845} size={110} color={C.blue} o={ramp(t, b[1])}>{Math.round(n)}</Txt>
      <Txt x={PX} y={965} size={40} color={C.yellow} o={ramp(t, b[3] + 1.5)}>path: {STEPS} steps</Txt>
    </>
  );
};

const LV: View = {x: 100, y: 260, s: 52};
const RV: View = {x: 988, y: 260, s: 52};
const LX = LV.x + 8 * LV.s;
const RX = RV.x + 8 * RV.s;

const Compare: React.FC<SceneProps> = ({t, b}) => {
  const steps = NF * lin(t, b[0] + 1.2, b[1] + 1.4); // both open squares at the same rate
  const few = ramp(t, b[1] + 2.4);
  const walk = ramp(t, b[1] + 2.6, 2.4);
  const hp = ramp(t, b[2] + 5.4, 1.4);
  const from = mid(RV, START);
  return (
    <>
      <Head t={t}>Side by side</Head>
      <Txt x={LX} y={212} size={44} o={ramp(t, 0.4)}>search like water</Txt>
      <Txt x={RX} y={212} size={44} color={C.yellow} o={ramp(t, 0.4)}>A*: lowest f first</Txt>
      <Svg>
        <Grid v={LV} s={FLOOD} n={steps} cursor path={ramp(t, b[1] + 1.4, 0.8)} walk={walk} />
        <Grid v={RV} s={ASTAR} n={Math.min(NA, steps)} cursor={steps < NA} path={lin(steps, NA, NA + 30)} walk={walk}>
          <Arrow from={[from[0] + 40, from[1]]} to={[from[0] + 250, from[1]]} p={ramp(t, b[1] + 4.6)} color={C.gold} w={9} o={span(t, b[1] + 4.6, b[2])} />
          <path d={line(upTo(guessLine(START).map((c) => [mid(RV, c)[0], mid(RV, c)[1] + 13]), hp))} stroke={C.gold} strokeWidth={7} strokeDasharray="16 14" strokeLinecap="round" fill="none" opacity={hp > 0 ? 1 : 0} />
        </Grid>
      </Svg>
      <Txt x={LX} y={832} size={44} color={C.blue} o={1 - few}>{Math.round(steps)} squares checked</Txt>
      <Txt x={LX} y={832} size={44} color={C.red} o={few}>{Math.round(steps)} squares checked</Txt>
      <Txt x={RX} y={832} size={44} color={C.blue} o={1 - few}>{Math.round(Math.min(NA, steps))} squares checked</Txt>
      <Txt x={RX} y={832} size={44} color={C.green} o={few}>{NA} squares checked</Txt>
      <Txt x={LX} y={892} size={36} color={C.yellow} o={ramp(t, b[1] + 1.6)}>path: {STEPS} steps</Txt>
      <Txt x={RX} y={892} size={36} color={C.yellow} o={ramp(t, b[1] + 1.6)}>path: {STEPS} steps</Txt>
      <Tex
        x={960}
        y={980}
        size={46}
        tex={`${col(C.gold, 'h')}\\;\\le\\;\\text{the real steps left}${op(ramp(t, b[2] + 6.8), `\\qquad\\text{from the start: }${col(C.gold, String(guess(START)))}\\le${col(C.yellow, String(STEPS))}`)}`}
        o={ramp(t, b[2] + 1.2)}
      />
    </>
  );
};

const SV: View = {x: 1110, y: 290, s: 44};
const Sum: React.FC<SceneProps> = ({t, b}) => (
  <>
    <Recap t={t} b={b} items={[[C.green, 'g: the steps already walked'], [C.gold, 'h: a guess of the steps left'], [C.yellow, 'Always open the lowest f = g + h']]} />
    <Svg>
      <Grid v={SV} s={ASTAR} n={NA * lin(t, 0.6, b[2] + 2.5)} cursor path={ramp(t, b[2] + 2.6, 1.2)} walk={ramp(t, b[3], 3)} />
    </Svg>
  </>
);

export const aStar: VideoDef = {
  id: '01-a-star',
  script,
  timing,
  scenes: {title: Title, flood: Flood, score: Score, search: Rule, compare: Compare, recap: Sum},
};
