import React from 'react';
import {SceneProps, VideoDef, said} from '../../../engine';
import {Arrow, Draw} from '../../../kit';
import {EXPLAIN_V, K, Label, Picture, Pose, SANS, Stage, Svg2D, Tag, ease, flash, glide, span} from '../../../kits/explainer';
import {Paper, PenAt, RB} from '../_pen';
import art from './art.json';
import script from './script.json';
import timing from './timing.json';

// Camera poses: target x, y, z, azimuth, elevation, distance, field of view. The paper is the plane y = 0; a pen that
// writes moves along +x with its top leaning towards +x, as a right hand drags it.
const LEAN = 0.5;
const SPEED = 0.38; // how fast the pen moves over the paper, cm/s
const PEN_V: Pose = [0, 3.5, 0, 22, 8, 13, 30]; // the lower half of the pen, standing: the refill wide enough to see
const TIP_V: Pose = [0, 0.25, 0, 20, 6, 3.6, 30]; // its tip, close, the ball at mid-height
const LAMPS: [[number, number, number], number][] = [[[1.5, 1.2, 3], 6], [[-1.5, 3, 2.5], 4]];
// Near paper level, from the side: the whole ball shows under the tip as it rolls.
const side = (x: number, d: number, el = 3, az = -10): Pose => [x, 0.12, 0, az, el, d, 30];

/** A pen writing: its ball at x on the paper, the ink line behind it, the camera following. */
const Writing: React.FC<{t: number; x0: number; pose: (x: number) => Pose}> = ({t, x0, pose}) => {
  const x = x0 + SPEED * t;
  return (
    <Stage pose={pose(x)} size={4} ao={0.3} sky="#ece8dd" lamps={[[[x + 1, 1.5, 2], 5]]}>
      <Paper x0={x0 - 1.5} x1={x} />
      <PenAt at={[x, 0, 0]} lean={LEAN} open={0} spin={(x - x0) / RB} />
    </Stage>
  );
};
/** A short note in a white pill, centred on x, y. */
const Pill: React.FC<{x: number; y: number; o: number; size?: number; color?: string; children: string}> = ({x, y, o, size = 40, color = K.ink, children}) =>
  o <= 0.01 ? null : (
    <div data-box="" style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', opacity: o, padding: '8px 22px', borderRadius: 999, background: 'rgba(255,255,255,.94)', boxShadow: '0 6px 18px rgba(0,0,0,.18)', font: `800 ${size}px ${SANS}`, color, whiteSpace: 'nowrap'}}>
      {children}
    </div>
  );
const Scale: React.FC<{o: number}> = ({o}) => <Pill x={540} y={270} size={36} color={K.muted} o={o}>drawn larger than real</Pill>;

const Hook: React.FC<SceneProps> = ({t, words}) => {
  const pose = (x: number) => glide(t, side(x, 3.2, 8, -24), [[0.1, 4, side(x, 1.2)]]);
  const x = -1.2 + SPEED * t;
  const tag = said(words, 0, 'ball');
  return (
    <>
      <Writing t={t} x0={-1.2} pose={pose} />
      <Label x={540} y={430} size={84} weight={900} o={1 - ease(t, said(words, 0, 'paper'), 0.5)}>How a pen writes</Label>
      <Tag pose={pose(x)} at={[x - 0.03, 0.03, 0.08]} pin={[90, 1180]} o={ease(t, tag, 0.4)}>A tiny metal ball</Tag>
      <Scale o={ease(t, tag + 0.6, 0.4)} />
    </>
  );
};

const Parts: React.FC<SceneProps> = ({t, b, words}) => {
  const pose = glide(t, PEN_V, [[b[1], 2.2, TIP_V]]);
  const spin = 4 * Math.max(0, t - said(words, 1, 'spin'));
  const hi = {refill: flash(t, said(words, 0, 'refill')), ink: flash(t, said(words, 0, 'ink')), ball: flash(t, said(words, 1, 'ball')), socket: flash(t, said(words, 1, 'socket'))};
  return (
    <>
      <Stage pose={pose} size={8} ao={0.4} lamps={LAMPS}>
        <PenAt at={[0, 0, 0]} open={1} barrel={ease(t, 0.3, 1.2) * 0.85 + ease(t, b[1], 1) * 0.15} spin={spin} hi={hi} />
      </Stage>
      <Tag pose={pose} at={[-0.139, 5, 0.08]} pin={[90, 520]} o={span(t, said(words, 0, 'refill'), b[1])}>Refill tube</Tag>
      <Tag pose={pose} at={[0.04, 3, 0.11]} pin={[600, 1100]} o={span(t, said(words, 0, 'ink'), b[1])} dot={K.blue}>Thick, oily ink</Tag>
      <Tag pose={pose} at={[-0.02, RB, 0.095]} pin={[90, 960]} o={ease(t, said(words, 1, 'ball'), 0.4)}>Ball</Tag>
      <Tag pose={pose} at={[0.078, RB, 0.078]} pin={[640, 960]} o={ease(t, said(words, 1, 'socket'), 0.4)} dot="#c9934a">Socket</Tag>
      <Scale o={ease(t, b[1] + 1.5, 0.5)} />
    </>
  );
};

// The 2D close-up of the tip: the ball in its socket over the paper. The paper moves left under the ball, so the ball
// turns clockwise; ink coats its top, is carried round its right side, and is laid on the paper as a line that trails left.
const C = {x: 540, y: 860, r: 190};
const How: React.FC<SceneProps> = ({t, b, words}) => {
  const go = said(words, 0, 'paper');
  const moved = 150 * Math.max(0, t - go); // px the paper has moved
  const turn = (moved / C.r) * (180 / Math.PI);
  const line = Math.min(560, 150 * Math.max(0, t - said(words, 1, 'bottom')));
  const film = 0.6 + 0.4 * flash(t, said(words, 1, 'dips'));
  const carry = ease(t, said(words, 1, 'dips'), 0.6);
  // The arc of ink the turning ball carries, from the top round the right side down to the paper.
  const a0 = -100 * (Math.PI / 180);
  const a1 = 88 * (Math.PI / 180);
  const R = C.r + 9;
  const arc = `M${C.x + R * Math.cos(a0)},${C.y + R * Math.sin(a0)} A${R},${R} 0 0 1 ${C.x + R * Math.cos(a1)},${C.y + R * Math.sin(a1)}`;
  const labels = 1 - ease(t, b[1], 0.4);
  return (
    <>
      <Svg2D o={ease(t, 0, 0.4)}>
        {/* paper, its lines moving left */}
        <rect x={0} y={C.y + C.r} width={1080} height={110} fill="#f6f3ea" />
        {Array.from({length: 14}, (_, k) => {
          const x = (((k * 90 - moved) % 1260) + 1260) % 1260 - 90;
          return <rect key={k} x={x} y={C.y + C.r + 70} width={50} height={6} fill="#9fc2e8" />;
        })}
        <rect x={C.x - line} y={C.y + C.r} width={line} height={10} fill="#14246e" />
        {/* the brass tip with its ink channel */}
        <polygon points={`${C.x - 300},300 ${C.x + 300},300 ${C.x + 215},${C.y + 60} ${C.x - 215},${C.y + 60}`} fill="#c9934a" stroke="#6b4a1e" strokeWidth={4} />
        <rect x={C.x - 42} y={300} width={84} height={C.y - C.r - 300 + 10} fill="#1f3a9e" />
        {/* the ball, turning: grey marks show the turn */}
        <g transform={`rotate(${turn.toFixed(2)} ${C.x} ${C.y})`}>
          <circle cx={C.x} cy={C.y} r={C.r} fill="#d6dade" stroke="#5f666e" strokeWidth={4} />
          {Array.from({length: 8}, (_, k) => {
            const a = (k * Math.PI) / 4;
            return <circle key={k} cx={C.x + 0.72 * C.r * Math.cos(a)} cy={C.y + 0.72 * C.r * Math.sin(a)} r={12} fill="#9aa1a9" />;
          })}
        </g>
        <path d={`M${C.x - C.r * 0.97},${C.y - C.r * 0.25} A${C.r},${C.r} 0 0 1 ${C.x + C.r * 0.97},${C.y - C.r * 0.25}`} fill="none" stroke="#1f3a9e" strokeWidth={14} opacity={film} />
        <path d={arc} fill="none" stroke="#1f3a9e" strokeWidth={9} strokeDasharray="34 16" strokeDashoffset={-moved * 0.6} opacity={carry} />
        {/* arrows: the paper moves left, the ball turns */}
        <Arrow from={[760, 1190]} to={[420, 1190]} p={ease(t, go, 0.6)} color={K.ink} w={6} />
        <Draw d={`M${C.x + C.r + 40},${C.y - 80} A${C.r + 40},${C.r + 40} 0 0 1 ${C.x + C.r + 40},${C.y + 90}`} p={ease(t, said(words, 0, 'turns'), 0.6)} color={K.red} w={7} />
        <polygon points={`${C.x + C.r + 22},${C.y + 82} ${C.x + C.r + 58},${C.y + 82} ${C.x + C.r + 36},${C.y + 118}`} fill={K.red} opacity={ease(t, said(words, 0, 'turns') + 0.5, 0.2)} />
      </Svg2D>
      <Label x={590} y={1250} size={40} o={ease(t, go, 0.4) * labels}>The paper moves</Label>
      <Label x={1000} y={C.y + 160} size={40} color={K.red} align="right" o={ease(t, said(words, 0, 'turns'), 0.4) * labels}>The ball turns</Label>
      <Pill x={C.x + 140} y={360} o={ease(t, said(words, 1, 'ink'), 0.4)} color="#1f3a9e">Ink</Pill>
      <Pill x={250} y={C.y + C.r - 60} o={ease(t, said(words, 1, 'line'), 0.4)} color="#14246e">A thin line</Pill>
    </>
  );
};

const Gravity: React.FC<SceneProps> = ({t, b, words}) => {
  const away = said(words, 1, 'away');
  const flip = ease(t, away, 1.2);
  const shift = 0.12 * ease(t, away + 0.8, 2.5); // a small gap opens behind the ball: thick ink moves slowly
  const dry = ease(t, said(words, 1, 'runs'), 1.4);
  const pic = span(t, said(words, 1, 'upside'), away, 0.4);
  const flow = span(t, said(words, 0, 'pulls'), b[1], 0.4);
  return (
    <>
      <div style={{position: 'absolute', inset: 0, opacity: 1 - pic}}>
        <Stage pose={TIP_V} size={3} ao={0.3} lamps={LAMPS}>
          <PenAt at={[0, 0, 0]} open={1} barrel={1} turn={Math.PI * flip} shift={shift} dry={dry} flow={flow} t={t} hi={{ink: flash(t, said(words, 0, 'pulls'))}} />
        </Stage>
      </div>
      <Svg2D o={ease(t, said(words, 0, 'gravity'), 0.4) * (1 - pic)}>
        <Arrow from={[880, 420]} to={[880, 820]} p={ease(t, said(words, 0, 'gravity'), 0.6)} color={K.red} w={8} />
      </Svg2D>
      <Label x={880} y={370} size={44} color={K.red} o={ease(t, said(words, 0, 'gravity'), 0.4) * (1 - pic)}>Gravity</Label>
      <Picture art={art.upside} x={240} y={300} size={600} o={pic} label="Writing upside down" />
      <Tag pose={TIP_V} at={[-0.02, RB, 0.095]} pin={[90, 800]} o={ease(t, said(words, 1, 'dry'), 0.4)} dot={K.red}>The ball runs dry</Tag>
    </>
  );
};

const End: React.FC<SceneProps> = ({t, words}) => {
  const pose = (x: number) => glide(t, side(x, 1.2), [[0.2, 4.5, side(x, 1.9, 5, -16)]]);
  return (
    <>
      <Writing t={t} x0={-0.6} pose={pose} />
      <Label x={90} y={290} size={84} weight={900} align="left" o={ease(t, said(words, 0, 'rolls'), 0.5)}>It rolls</Label>
      <Label x={90} y={390} size={84} weight={900} align="left" o={ease(t, said(words, 0, 'rolls'), 0.5)}>the line.</Label>
    </>
  );
};

export const ballpointPen: VideoDef = {
  id: '01-ballpoint-pen',
  look: EXPLAIN_V,
  art,
  script,
  timing,
  scenes: {hook: Hook, parts: Parts, how: How, gravity: Gravity, end: End},
  sounds: {
    hook: (b, dur) => [{at: 0.2, name: 'pencil-long', vol: 0.12, len: dur - 0.2}],
    gravity: (b, dur, words) => [{at: said(words, 1, 'stops'), name: 'pop', vol: 0.25}],
    end: (b, dur) => [{at: 0, name: 'pencil-long', vol: 0.12, len: dur}],
  },
};
