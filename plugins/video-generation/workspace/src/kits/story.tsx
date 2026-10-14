// The story look: painted frames with a slow camera, captions that follow the voice, upright, 1080 x 1920.
// Guide: STORIES.md.
import React, {useContext} from 'react';
import {staticFile} from 'remotion';
import {Cue, Look, SceneProps, Seed, pick} from '../engine';
import {lerp, lin, ramp} from '../kit';
import {captions, font} from './shared';

export const W = 1080;
export const H = 1920;
export const S = {
  bg: '#07080a',
  white: '#f3efe8',
  grey: '#a9a59c',
  amber: '#f0b541',
  red: '#cf3a2e',
};
const TITLE = 'Bebas Neue, sans-serif';
const TYPE = 'Special Elite, monospace';
font('Bebas Neue', 'BebasNeue.ttf');
font('Montserrat', 'Montserrat.ttf', '100 900');
font('Special Elite', 'SpecialElite.ttf');

const Caption = captions({y: 1390, size: 82, family: 'Montserrat, sans-serif', weight: 900, color: S.white, hot: (seed) => pick(seed, 'hot', [S.amber, '#ff6a55', '#8fd8ff', '#f3efe8']), upper: true, shadow: '0 0 14px #000, 0 4px 26px #000, 0 0 3px #000'});
// Over every scene: darker edges, so the eye stays in the middle and the captions read on any picture.
// The colour of the light differs from one video to the next: cold, sepia, green or none.
const GRADES = ['rgba(30,60,110,.22)', 'rgba(120,70,20,.2)', 'rgba(20,80,60,.2)', 'transparent'];
const Over: React.FC<SceneProps> = (p) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: pick(useContext(Seed), 'grade', GRADES), mixBlendMode: 'soft-light'}} />
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(75% 60% at 50% 45%, transparent 55%, rgba(0,0,0,.55) 100%), linear-gradient(180deg, rgba(0,0,0,.5) 0%, transparent 16%, transparent 60%, rgba(0,0,0,.5) 76%, rgba(0,0,0,.62) 100%)'}} />
    <Caption {...p} />
  </>
);

export const STORY: Look = {
  w: W,
  h: H,
  bg: S.bg,
  // Phone apps cover the top, the bottom and the right edge of an upright video.
  safe: [70, 220, 1010, 1520],
  minText: 44,
  fonts: ['60px Bebas Neue', '900 60px Montserrat', '60px Special Elite'],
  cut: true,
  overlay: Over,
};

type Art = {src: string; w: number; h: number};
const MOVES = {in: [1.06, 1.2, 0, 0], out: [1.22, 1.06, 0, 0], left: [1.16, 1.16, 45, 0], right: [1.16, 1.16, -45, 0], up: [1.16, 1.16, 0, 45], down: [1.16, 1.16, 0, -45]};
/**
 * A picture of art.json that fills the screen while the camera moves slowly: `move` is the direction, `p` goes 0 to 1 over
 * the time it is on screen (`lin(t, 0, dur)`), `o` fades it in over the one before it.
 */
export const Shot: React.FC<{art: Art; p: number; move?: keyof typeof MOVES; o?: number}> = ({art, p, move = 'in', o = 1}) => {
  if (o <= 0) return null;
  const [s0, s1, dx, dy] = MOVES[move];
  return (
    <img
      src={staticFile(art.src)}
      style={{position: 'absolute', inset: 0, width: W, height: H, objectFit: 'cover', opacity: o, transform: `translate(${lerp(-dx, dx, p).toFixed(2)}px, ${lerp(-dy, dy, p).toFixed(2)}px) scale(${lerp(s0, s1, p).toFixed(4)})`}}
    />
  );
};

/** A photo as a piece of evidence: a white-edged print that drops onto the screen. `x`, `y` is its centre, `w` its width. */
export const Photo: React.FC<{art: Art; x: number; y: number; w: number; p: number; rot?: number}> = ({art, x, y, w, p, rot = -4}) =>
  p <= 0 ? null : (
    <div style={{position: 'absolute', left: x, top: y, width: w, padding: w * 0.04, paddingBottom: w * 0.16, background: '#ece7dc', boxShadow: '0 30px 80px rgba(0,0,0,.7)', opacity: Math.min(1, p * 3), transform: `translate(-50%, -50%) rotate(${lerp(rot * 3, rot, p)}deg) scale(${lerp(1.25, 1, p)})`}}>
      <img src={staticFile(art.src)} style={{display: 'block', width: '100%', aspectRatio: '1', objectFit: 'cover', filter: 'saturate(.7) contrast(1.05)'}} />
    </div>
  );

type Pos = {x?: number; y: number; size?: number; color?: string};
const text = (x: number, y: number, size: number, color: string, family: string): React.CSSProperties => ({position: 'absolute', left: x, top: y, font: `${size}px ${family}`, color, whiteSpace: 'nowrap', transform: 'translate(-50%, -50%)', textShadow: '0 0 18px #000, 0 3px 30px #000'});

/** A case-file line (a place, a date, an hour) typed letter by letter from `at`. Pair it with `keys(at, text)`. */
export const Stamp: React.FC<Pos & {t: number; at: number; children: string}> = ({x = W / 2, y, size = 50, color = S.white, t, at, children}) => {
  const n = Math.floor(lin(t, at, children.length * 0.055) * children.length);
  return n <= 0 ? null : (
    <div data-box="" style={text(x, y, size, color, TYPE)}>
      {children.slice(0, n)}
      <span style={{opacity: 0}}>{children.slice(n)}</span>
    </div>
  );
};

/** A few big words in the middle of the screen: a name, an hour, a number. They land hard at `at`. */
export const Big: React.FC<Pos & {t: number; at: number; children: React.ReactNode}> = ({x = W / 2, y, size = 190, color = S.white, t, at, children}) =>
  t < at ? null : (
    <div data-box="" style={{...text(x, y, size, color, TITLE), letterSpacing: 2, transform: `translate(-50%, -50%) scale(${lerp(1.25, 1, ramp(t, at, 0.18)).toFixed(3)})`, opacity: lin(t, at, 0.08)}}>
      {children}
    </div>
  );

/** The opening: `kind` is the small line that says what the story is ("A true story", "A fictional story"), then the title, one line per entry. */
export const StoryTitle: React.FC<{t: number; kind: string; title: string[]; at?: number}> = ({t, kind, title, at = 0.3}) => (
  <>
    <Stamp t={t} at={at} y={750 - title.length * 105} size={46} color={S.amber}>
      {kind.toUpperCase()}
    </Stamp>
    {title.map((row, i) => (
      <Big key={row} t={t} at={at + 0.7 + i * 0.35} y={900 - (title.length - 1) * 105 + i * 210}>
        {row}
      </Big>
    ))}
  </>
);

/** Typewriter keys for a `Stamp` of the same `at` and text: one key for every second letter, quiet. */
export const keys = (at: number, stamp: string, vol = 0.16): Cue[] => Array.from({length: Math.ceil(stamp.length / 2)}, (_, i) => ({at: at + i * 0.11, name: 'key', vol}));
