import React from 'react';
import {SceneProps, VideoDef, said} from '../../../engine';
import {lin} from '../../../kit';
import {Arrow, K, Note, SKETCH, Sketch, Svg, Underline, scratch, useAccent} from '../../../kits/sketch';
import art from './art.json';
import script from './script.json';
import timing from './timing.json';

// A heart that beats: two quick pushes, then a rest.
const beat = (t: number) => {
  const p = (t * 1.15) % 1;
  return 1 + 0.05 * Math.exp(-(((p - 0.1) / 0.06) ** 2)) + 0.03 * Math.exp(-(((p - 0.32) / 0.06) ** 2));
};
const Beating: React.FC<{
  t: number;
  x: number;
  y: number;
  w: number;
  p: number;
}> = ({t, x, y, w, p}) => (
  <g transform={`translate(${x} ${y}) scale(${p < 1 ? 1 : beat(t)}) translate(${-x} ${-y})`}>
    <Sketch art={art.heart} x={x} y={y} w={w} p={p} />
  </g>
);

const Hook: React.FC<SceneProps> = ({t, b, words}) => {
  const hot = useAccent();
  return (
    <>
      <Note x={540} y={300} size={120} p={lin(t, 0.2, 0.7)}>
        Your heart
      </Note>
      <Svg>
        <Beating t={t} x={420} y={730} w={640} p={lin(t, 0.3, 2.2)} />
        <Sketch art={art.fist} x={800} y={1090} w={400} p={lin(t, said(words, 0, 'size'), 1.2)} />
        <Underline x={230} y={1345} w={620} p={lin(t, b[1] + 1.6, 0.5)} />
      </Svg>
      <Note x={540} y={1285} size={92} color={hot} p={lin(t, b[1] + 0.5, 1.1)}>
        100,000 beats a day
      </Note>
    </>
  );
};

const Pumps: React.FC<SceneProps> = ({t, b}) => (
  <>
    <Note x={540} y={1290} size={84} p={lin(t, 0.5, 0.9)}>
      two pumps, side by side
    </Note>
    <Svg>
      <Beating t={t} x={540} y={900} w={600} p={lin(t, 0.2, 1.6)} />
      <Sketch art={art.lungs} x={280} y={480} w={380} p={lin(t, b[1] + 0.3, 1.5)} />
      <Arrow from={[400, 790]} to={[300, 680]} color={K.blue} p={lin(t, b[1] + 1.2, 0.6)} bow={-20} />
      <Sketch art={art.body} x={820} y={480} w={380} p={lin(t, b[2] + 0.3, 1.5)} />
      <Arrow from={[690, 790]} to={[790, 680]} color={K.red} p={lin(t, b[2] + 1.2, 0.6)} bow={20} />
    </Svg>
    <Note x={280} y={262} size={68} color={K.blue} p={lin(t, b[1] + 1.6, 0.7)}>
      to the lungs
    </Note>
    <Note x={820} y={262} size={68} color={K.red} p={lin(t, b[2] + 1.6, 0.7)}>
      to the body
    </Note>
  </>
);

const Valves: React.FC<SceneProps> = ({t, b, words}) => (
  <>
    <Note x={540} y={310} size={130} p={lin(t, said(words, 0, 'valves'), 0.6)}>
      valves
    </Note>
    <Svg>
      <Sketch art={art.door} x={540} y={760} w={700} p={lin(t, 0.3, 2.4)} />
      <Arrow from={[220, 1170]} to={[860, 1170]} color={K.green} p={lin(t, b[1] + 0.3, 0.8)} bow={24} />
    </Svg>
    <Note x={540} y={1280} size={88} color={K.green} p={lin(t, b[1] + 1, 0.8)}>
      one way only
    </Note>
  </>
);

const Sound: React.FC<SceneProps> = ({t, words}) => (
  <>
    <Svg>
      <Sketch art={art.stethoscope} x={540} y={720} w={760} p={lin(t, 0.2, 1.5)} />
    </Svg>
    <Note x={340} y={1230} size={170} color={K.red} rot={-5} p={lin(t, said(words, 0, 'lub'), 0.25)}>
      lub
    </Note>
    <Note x={740} y={1230} size={170} color={K.red} rot={4} p={lin(t, said(words, 0, 'dub'), 0.25)}>
      dub
    </Note>
  </>
);

// "Body, heart, lungs, heart, and body again": words 8 to 13 of the first line.
const Loop: React.FC<SceneProps> = ({t, b, words}) => {
  const at = (i: number) => words[0][i].at;
  return (
    <>
      <Note x={540} y={290} size={110} p={lin(t, 0.3, 0.8)}>
        one short trip
      </Note>
      <Svg>
        <Sketch art={art.body} x={240} y={560} w={340} p={lin(t, at(8) - 0.2, 0.8)} />
        <Beating t={t} x={540} y={900} w={400} p={lin(t, at(9) - 0.2, 0.8)} />
        <Sketch art={art.lungs} x={840} y={560} w={340} p={lin(t, at(10) - 0.2, 0.8)} />
        <Arrow from={[300, 740]} to={[410, 820]} color={K.blue} p={lin(t, at(9), 0.4)} bow={-20} />
        <Arrow from={[640, 790]} to={[760, 720]} color={K.blue} p={lin(t, at(10), 0.4)} bow={-20} />
        <Arrow from={[900, 770]} to={[750, 940]} color={K.red} p={lin(t, at(11), 0.4)} bow={30} />
        <Arrow from={[340, 950]} to={[180, 780]} color={K.red} p={lin(t, at(13), 0.4)} bow={30} />
        <Underline x={250} y={1340} w={580} p={lin(t, b[1] + 0.7, 0.4)} />
      </Svg>
      <Note x={540} y={1280} size={92} p={lin(t, b[1] + 0.1, 0.6)}>
        never takes a break
      </Note>
    </>
  );
};

export const heartbeat: VideoDef = {
  id: '01-heartbeat',
  look: SKETCH,
  art,
  script,
  timing,
  scenes: {
    hook: Hook,
    pumps: Pumps,
    valves: Valves,
    sound: Sound,
    loop: Loop,
  },
  // The pen is heard whenever it draws; a page turns between scenes; the two heart sounds get a soft thump each.
  sounds: {
    hook: (b, _, w) => [scratch(0.3, 2.2), scratch(said(w, 0, 'size'), 1.2), scratch(b[1] + 0.5, 1.1, 0.16)],
    pumps: (b) => [{at: 0, name: 'paper', vol: 0.2}, scratch(0.2, 1.6), scratch(b[1] + 0.3, 1.5), scratch(b[2] + 0.3, 1.5)],
    valves: (b) => [{at: 0, name: 'paper', vol: 0.2}, scratch(0.3, 2.4), scratch(b[1] + 0.3, 0.8, 0.16)],
    sound: (_, __, w) => [{at: 0, name: 'paper', vol: 0.2}, scratch(0.2, 1.5), {at: said(w, 0, 'lub'), name: 'pop', vol: 0.4}, {at: said(w, 0, 'dub'), name: 'pop', vol: 0.4}],
    loop: (b, _, w) => [{at: 0, name: 'paper', vol: 0.2}, scratch(0.3, 0.8, 0.16), scratch(w[0][8].at - 0.2, 2.2, 0.18), scratch(b[1] + 0.1, 0.6, 0.16)],
  },
};
