import React from 'react';
import {C, Draw, lerp, line} from '../../kit';

// The one map of the series, and the two searches on it. Moves are up, down, left and right, one step each.
// S = start, G = goal, # = wall.
const ROWS = [
  '................',
  '................',
  '.......##.......',
  '........#.......',
  '..S.....#....G..',
  '........#.......',
  '........#.......',
  '.....####.......',
  '................',
  '................',
];
export type Cell = [number, number]; // column, row
export const COLS = ROWS[0].length;
export const NROWS = ROWS.length;
const CELLS: Cell[] = ROWS.flatMap((r, y) => [...r].map((_, x): Cell => [x, y]));
const cellOf = (ch: string): Cell => {
  const y = ROWS.findIndex((r) => r.includes(ch));
  return [ROWS[y].indexOf(ch), y];
};
export const START = cellOf('S');
export const GOAL = cellOf('G');
export const FREE = ROWS.join('').replace(/#/g, '').length;
export const key = ([x, y]: Cell) => y * COLS + x;
const isWall = ([x, y]: Cell) => ROWS[y][x] === '#';
/** h: the steps to the goal if there were no walls. */
export const guess = ([x, y]: Cell) => Math.abs(x - GOAL[0]) + Math.abs(y - GOAL[1]);

export const clamp = (v: number) => Math.min(1, Math.max(0, v));
/** Straight 0 to 1 between the seconds a and b. */
export const lin = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

/** order = the squares in the order they were opened. Per square: g, the step at which it was first seen, the step at which it was opened, and the square it was reached from. */
export type Search = {order: Cell[]; g: number[]; seen: number[]; opened: number[]; from: number[]};

/** Opens the square with the lowest g + h until it opens the goal. On a tie: the one nearer the goal, then the newest. */
const search = (h: (c: Cell) => number): Search => {
  const blank = () => Array<number>(COLS * NROWS).fill(Infinity);
  const [g, seen, opened] = [blank(), blank(), blank()];
  const from = blank().fill(-1);
  const order: Cell[] = [];
  const rank = (c: Cell) => (g[key(c)] + h(c)) * 1000 + h(c);
  let open: Cell[] = [START];
  g[key(START)] = seen[key(START)] = 0;
  while (open.length) {
    const best = open.reduce((a, c) => (rank(c) <= rank(a) ? c : a));
    open = open.filter((c) => c !== best);
    opened[key(best)] = order.length;
    order.push(best);
    if (key(best) === key(GOAL)) break;
    for (const [dx, dy] of [[1, 0], [0, -1], [0, 1], [-1, 0]]) {
      const c: Cell = [best[0] + dx, best[1] + dy];
      if (c[0] < 0 || c[1] < 0 || c[0] >= COLS || c[1] >= NROWS || isWall(c) || opened[key(c)] < Infinity) continue;
      if (g[key(best)] + 1 < g[key(c)]) {
        if (g[key(c)] === Infinity) {
          open.push(c);
          seen[key(c)] = opened[key(best)];
        }
        g[key(c)] = g[key(best)] + 1;
        from[key(c)] = key(best);
      }
    }
  }
  return {order, g, seen, opened, from};
};
export const ASTAR = search(guess);
/** The same search with no guess: it spreads like water, one ring of steps at a time. */
export const FLOOD = search(() => 0);

/** The squares from the start to c, along the way the search reached c. */
export const pathTo = (s: Search, c: Cell): Cell[] => {
  const out = [c];
  for (let k = s.from[key(c)]; k >= 0; k = s.from[k]) out.unshift([k % COLS, Math.floor(k / COLS)]);
  return out;
};
/** The squares the guess counts: across to the goal's column, then up or down, through any wall. */
export const guessLine = (c: Cell): Cell[] => {
  const out = [c];
  let [x, y] = c;
  while (x !== GOAL[0]) out.push([(x += Math.sign(GOAL[0] - x)), y]);
  while (y !== GOAL[1]) out.push([x, (y += Math.sign(GOAL[1] - y))]);
  return out;
};
export const STEPS = pathTo(ASTAR, GOAL).length - 1;
// The videos say that both searches find a shortest path. Fail the build if a new map breaks that.
if (STEPS !== pathTo(FLOOD, GOAL).length - 1) throw new Error('A* and the flood disagree on the path length');

/** Where a map is drawn: its top left corner and the size of one square. */
export type View = {x: number; y: number; s: number};
export const mid = (v: View, [cx, cy]: Cell): [number, number] => [v.x + (cx + 0.5) * v.s, v.y + (cy + 0.5) * v.s];
export const box = (v: View, [cx, cy]: Cell, pad = 2) => ({x: v.x + cx * v.s + pad, y: v.y + cy * v.s + pad, width: v.s - 2 * pad, height: v.s - 2 * pad, rx: v.s * 0.12});
/** The first part of a polyline: p = 0 is its first point, p = 1 is all of it. */
export const upTo = (pts: number[][], p: number) => {
  const f = clamp(p) * (pts.length - 1);
  const i = Math.floor(f);
  const head = pts.slice(0, i + 1);
  return i + 1 < pts.length ? [...head, [lerp(pts[i][0], pts[i + 1][0], f - i), lerp(pts[i][1], pts[i + 1][1], f - i)]] : head;
};

/**
 * The map, for use inside an `<Svg>`. `grid`, `walls`, `start`, `goal` fade those parts in.
 * With a search `s`, the first `n` opened squares are filled (n may be a fraction) and the squares on the
 * edge get an outline; `num` writes g or f in them, `cursor` marks the square opened last.
 * `path` draws the found path back from the goal (the numbers under it fade), `walk` moves a dot along it from the start.
 * Children are drawn above the squares and below the start and the goal.
 */
export const Grid: React.FC<{
  v: View;
  grid?: number;
  walls?: number;
  start?: number;
  goal?: number;
  s?: Search;
  n?: number;
  num?: 'g' | 'f';
  cursor?: boolean;
  path?: number;
  walk?: number;
  children?: React.ReactNode;
}> = ({v, grid = 1, walls = 1, start = 1, goal = 1, s, n = 0, num, cursor, path = 0, walk = 0, children}) => {
  const cells = s ? pathTo(s, GOAL) : [];
  const route = cells.map((c) => mid(v, c));
  const onRoute = new Set(cells.map(key));
  const last = s && cursor && n > 0 && n < s.order.length ? s.order[Math.ceil(n) - 1] : null;
  const dot = upTo(route, walk).pop();
  return (
    <g>
      {CELLS.map((c) => {
        const k = key(c);
        const sweep = clamp(grid * 2 - (c[0] + c[1]) / (COLS + NROWS));
        if (isWall(c)) {
          return (
            <g key={k}>
              <rect {...box(v, c)} fill="none" stroke={C.dim} strokeWidth={2} opacity={sweep} />
              <rect {...box(v, c, 1)} fill={C.grey} opacity={0.75 * walls} />
            </g>
          );
        }
        const open = s ? clamp(n - s.opened[k]) : 0;
        const edge = s ? clamp(n - s.seen[k]) : 0;
        const ends = k === key(START) || k === key(GOAL);
        return (
          <g key={k} opacity={sweep}>
            <rect {...box(v, c)} fill="none" stroke={C.dim} strokeWidth={2} />
            <rect {...box(v, c)} fill={C.blue} fillOpacity={0.38 * open} stroke={C.teal} strokeWidth={3} strokeOpacity={edge * (1 - open)} />
            {s && num && !ends && edge > 0 && (
              <text x={mid(v, c)[0]} y={mid(v, c)[1]} fontSize={v.s * 0.44} fontFamily="KaTeX_Main, serif" textAnchor="middle" dominantBaseline="central" fill={open > 0.5 ? C.white : C.teal} opacity={edge * (onRoute.has(k) ? 1 - path : 1)}>
                {num === 'g' ? s.g[k] : s.g[k] + guess(c)}
              </text>
            )}
          </g>
        );
      })}
      {children}
      <Draw d={line([...route].reverse())} p={path} color={C.yellow} w={v.s * 0.13} />
      <rect {...box(v, START)} fill={C.green} opacity={start} />
      <rect {...box(v, GOAL)} fill={C.gold} opacity={goal} />
      {last && <rect {...box(v, last, 0)} fill="none" stroke={C.white} strokeWidth={v.s * 0.07} />}
      {dot && walk > 0 && <circle cx={dot[0]} cy={dot[1]} r={v.s * 0.27} fill={C.white} stroke={C.bg} strokeWidth={v.s * 0.06} />}
    </g>
  );
};
