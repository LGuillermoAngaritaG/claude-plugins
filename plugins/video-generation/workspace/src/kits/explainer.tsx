// The explainer look: a light, clean frame where each moment uses the medium that explains it best. 3D cutaways drawn
// with three.js (models cut open, a camera that glides, parts that light up when named), Codex pictures in a white
// frame, clips (AI clips from the ai-clips skill, real footage) placed on the timeline, and 2D labels, counters and bars. Landscape 1920 x 1080 (EXPLAIN) or upright 1080 x 1920 for Shorts (EXPLAIN_V). Skill: explainer-video.
// 3D units are whatever the model uses (the examples use centimetres), y up.
import React, {useContext, useMemo} from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {Video} from '@remotion/media';
import {Img, Sequence, staticFile} from 'remotion';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {Bloom, EffectComposer, N8AO, ToneMapping} from '@react-three/postprocessing';
import {ToneMappingMode} from 'postprocessing';
import {Canvas, Live, Look, Seed, Theme, pick} from '../engine';
import {lerp} from '../kit';
import {captions, font} from './shared';

font('Montserrat', 'Montserrat.ttf', '100 900');
export const SANS = 'Montserrat, sans-serif';
export const TAU = Math.PI * 2;
/** The colour a named part glows in, and of the spoken word in the captions. */
export const ACCENT = '#ffb000';
/** Colours with a meaning, the same in every explainer: blue cold or low, red hot or high or wrong, green right. */
export const K = {ink: '#1d1f22', muted: '#5b6672', blue: '#2f7de1', red: '#e8513a', green: '#2a9d55', water: '#3f8fd8', dark: '#1f2731'};

// The ground behind the 3D differs a little from one video to the next.
const GROUNDS = ['#d9dde2', '#dcdcd6', '#d5dde0', '#e0dbd5'];
const shadow = '0 0 10px rgba(0,0,0,.85), 0 3px 14px rgba(0,0,0,.7), 0 0 2px #000';
const CaptionW = captions({x: 960, y: 1008, size: 50, family: SANS, weight: 800, color: '#ffffff', hot: (_, theme) => theme?.caption_hot ?? '#ffd23f', shadow, max: 34});
const CaptionV = captions({x: 540, y: 1440, size: 70, family: SANS, weight: 900, color: '#ffffff', hot: (_, theme) => theme?.caption_hot ?? '#ffd23f', shadow, max: 18});
const fonts = ['800 60px Montserrat', '700 60px Montserrat', '900 60px Montserrat', '600 60px Montserrat'];
const vary = (seed: string): Partial<Look> => ({bg: pick(seed, 'ground', GROUNDS)});
/** Landscape, 1920 x 1080: the captions sit at the bottom. */
export const EXPLAIN: Look = {w: 1920, h: 1080, bg: GROUNDS[0], safe: [90, 50, 1830, 1050], minText: 28, fonts, cut: true, overlay: CaptionW, vary};
/** Upright for Shorts, Reels and TikTok, 1080 x 1920: text between y = 220 and 1520, the captions own 1380 to 1500. */
export const EXPLAIN_V: Look = {w: 1080, h: 1920, bg: GROUNDS[0], safe: [70, 220, 1010, 1520], minText: 28, fonts, cut: true, overlay: CaptionV, vary};
/** The ground colour of this video, for a Stage that should match it. */
export const useGround = () => pick(useContext(Seed), 'ground', useContext(Theme)?.grounds ?? GROUNDS);
/**
 * The channel of this video (src/channels/<name>.json), or null. It does not reach inside a Stage (three.js has its own
 * React tree): a 3D part takes the channel's colour from the scene, `glow={channel.accent}`.
 */
export const useTheme = () => useContext(Theme);

// ---- time ----

export const clamp = (x: number) => Math.min(1, Math.max(0, x));
/** 0 before `at`, 1 after `at + len`, an S-curve between. */
export const ease = (t: number, at: number, len = 0.8) => {
  const p = clamp((t - at) / len);
  return p * p * (3 - 2 * p);
};
/** On at `at`, off at `off` (both eased): a thing shown during part of a scene. */
export const span = (t: number, at: number, off: number, len = 0.4) => ease(t, at, len) * (1 - ease(t, off, len));
/** A part lights up when it is named: up fast at `at`, held, and gone 1.4 s later. */
export const flash = (t: number, at: number) => ease(t, at, 0.25) * (1 - ease(t, at + 1.4, 0.5));
export {lerp};
/** A repeatable pseudo-random number in [0, 1) for item `k`. */
export const hash = (k: number, salt: string) => {
  const x = Math.sin(k * 127.1 + salt.length * 311.7 + salt.charCodeAt(0) * 74.7 + salt.charCodeAt(salt.length - 1) * 13.3) * 43758.5453;
  return x - Math.floor(x);
};

type Clip = {dur: number; gap?: number; words?: (string | number)[][]};
type Script = {pace?: number[]; scenes: {id: string}[]};
/**
 * Time in the whole video, for things that carry on across scenes (a wheel that keeps turning): `start[id]` is when a
 * scene starts, `when(scene, line, word)` the second a word is said, `turn(g, speed, flips)` the angle at second g of
 * something turning at `speed` rad/s that reverses at each second listed in `flips`.
 */
export const timeline = (script: Script, timing: unknown) => {
  const T = timing as Record<string, Clip[]>;
  const [lead, gap, tail] = script.pace ?? [0.4, 0.3, 0.7];
  const start: Record<string, number> = {};
  const line: Record<string, number[]> = {};
  script.scenes.reduce((acc, s) => {
    start[s.id] = acc;
    let at = lead;
    let last = 0;
    line[s.id] = (T[s.id] ?? []).map((c) => {
      const here = at;
      last = c.gap ?? gap;
      at += c.dur + last;
      return here;
    });
    return acc + Math.round((at - last + tail) * 30) / 30;
  }, 0);
  const when = (scene: string, i: number, word: string) => start[scene] + line[scene][i] + Number(T[scene][i].words!.find((w) => String(w[0]).toLowerCase().startsWith(word))![1]);
  const turn = (g: number, speed: number, flips: number[] = []) => {
    let a = 0;
    for (let x = 0; x < g; x += 1 / 60) a += (speed * flips.reduce((s, at) => s * (1 - 2 * ease(x, at, 1.6)), 1)) / 60;
    return a;
  };
  return {start, when, turn};
};

// ---- camera ----

/** Where the camera looks from: target x, y, z, azimuth and elevation in degrees, distance, field of view. */
export type Pose = number[];
export type V3 = [number, number, number];
/** The pose at `t`, from `start` through each move [at, len, pose] in turn. */
export const glide = (t: number, start: Pose, moves: [number, number, Pose][]) =>
  moves.reduce((p, [at, len, to]) => {
    const k = ease(t, at, len);
    return p.map((v, i) => v + (to[i] - v) * k);
  }, start);
/** A slow turn of the camera around its target: `deg` degrees of azimuth per second. */
export const drift = (pose: Pose, t: number, deg: number): Pose => pose.map((v, i) => (i === 3 ? v + deg * t : v));

const place = (cam: THREE.PerspectiveCamera, [x, y, z, az, el, d, fov]: Pose, aspect: number) => {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  cam.fov = fov;
  cam.aspect = aspect;
  cam.near = d / 200;
  cam.far = d * 40;
  cam.position.set(x + d * Math.sin(a) * Math.cos(e), y + d * Math.sin(e), z + d * Math.cos(a) * Math.cos(e));
  cam.lookAt(x, y, z);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
};
const probe = new THREE.PerspectiveCamera();
/** Where a point of the 3D world lands on a frame of `f` (the video's frame unless given). */
export const screen = (pose: Pose, p: V3, f: {w: number; h: number}): [number, number] => {
  place(probe, pose, f.w / f.h);
  const v = new THREE.Vector3(...p).project(probe);
  return [((v.x + 1) / 2) * f.w, ((1 - v.y) / 2) * f.h];
};
/** The frame of this video: {w, h}. */
export const useFrame = () => useContext(Canvas);
/**
 * True when the frame is upright. A scene of a long video that a Short may be cut from (scripts/short.py) lays out for
 * both shapes with it: `const tall = useTall();` then `pin={tall ? [90, 420] : [1240, 230]}`, a camera further back,
 * a picture above the object instead of beside it. It only reads the frame, so the scene stays a pure function of time.
 */
export const useTall = () => {
  const f = useContext(Canvas);
  return f.h > f.w;
};

const Rig: React.FC<{pose: Pose; aspect: number}> = ({pose, aspect}) => {
  place(useThree((s) => s.camera) as THREE.PerspectiveCamera, pose, aspect);
  return null;
};
// Reflections from a soft room, so metal reads as metal.
const Room: React.FC = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
  }, [gl, scene]);
  return null;
};

/**
 * The 3D picture of a scene, seen from `pose`. `size` is the half width of the area the sun's shadow covers and `ao`
 * the reach of the soft corner shadows (both in model units); `sky` a background colour (the ground of the look shows
 * when it is left out); `lamps` small lights near parts that would sit in the dark. `w`, `h` make it smaller than the
 * frame, for an Inset. Where scripts/stills.mjs walks the scenes without drawing them, it leaves a marker that changes
 * with the camera, so a moving camera counts as motion there.
 */
export const Stage: React.FC<{pose: Pose; size?: number; ao?: number; sky?: string; sun?: number; lamps?: [V3, number][]; w?: number; h?: number; children: React.ReactNode}> = ({pose, size = 90, ao = 2.5, sky, sun = 2.1, lamps = [], w: wIn, h: hIn, children}) => {
  const f = useFrame();
  const w = wIn ?? f.w;
  const h = hIn ?? f.h;
  if (!useContext(Live)) return <div data-stage={pose.map((v) => v.toFixed(1)).join(' ')} style={{position: 'absolute'}} />;
  return (
    <ThreeCanvas width={w} height={h} shadows style={{position: 'absolute', inset: 0}}>
      {sky && <color attach="background" args={[sky]} />}
      <Rig pose={pose} aspect={w / h} />
      <Room />
      <hemisphereLight args={['#fff8ee', '#8a7f70', 0.8]} />
      <directionalLight position={[size * 0.6, size * 1.2, size * 0.9]} intensity={sun} castShadow shadow-mapSize={[4096, 4096]} shadow-camera-left={-size} shadow-camera-right={size} shadow-camera-top={size} shadow-camera-bottom={-size} shadow-camera-near={size * 0.05} shadow-camera-far={size * 5} shadow-bias={-0.0004} />
      <directionalLight position={[-size, size * 0.4, size * 0.8]} intensity={0.6} />
      {lamps.map(([p, i], k) => (
        <pointLight key={k} position={p} intensity={i} color="#fff4e2" />
      ))}
      {children}
      <EffectComposer multisampling={4}>
        <N8AO aoRadius={ao} distanceFalloff={1} intensity={3} quality="high" />
        <Bloom luminanceThreshold={1} intensity={0.8} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </ThreeCanvas>
  );
};

// ---- 2D over the picture ----

/**
 * A white pill that names a part, joined by a line to the point `at` of the 3D model. `pin` is where the pill sits on
 * the screen: its left edge and its middle height. The line ends on the pill's edge, so it never crosses the text.
 */
export const Tag: React.FC<{pose: Pose; at: V3; pin: [number, number]; o: number; dot?: string; children: string}> = ({pose, at, pin: [left, mid], o, dot, children}) => {
  const f = useFrame();
  const theme = useTheme();
  if (o <= 0.01) return null;
  const [x, y] = screen(pose, at, f);
  const w = 64 + 0.6 * 38 * children.length;
  const ex = Math.min(left + w - 36, Math.max(left + 36, x));
  const ey = mid + (y > mid ? 33 : -33);
  const k = Math.min(1, o * 1.3);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: o}}>
      <svg width={f.w} height={f.h} style={{position: 'absolute', inset: 0}}>
        <line data-tag-line={children} x1={x} y1={y} x2={x + (ex - x) * k} y2={y + (ey - y) * k} stroke="#ffffff" strokeWidth={3.5} />
        <circle cx={x} cy={y} r={8} fill="#ffffff" stroke={K.ink} strokeWidth={3} />
      </svg>
      <div data-box="" style={{position: 'absolute', top: mid, left, transform: `translateY(-50%) scale(${0.85 + 0.15 * o})`, transformOrigin: 'left center', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px 10px 18px', borderRadius: 999, background: 'rgba(255,255,255,.96)', boxShadow: '0 8px 24px rgba(0,0,0,.25)', font: `700 38px ${SANS}`, color: K.ink, whiteSpace: 'nowrap'}}>
        <span style={{width: 20, height: 20, borderRadius: 10, background: dot ?? theme?.accent ?? K.blue, flex: 'none'}} />
        {children}
      </div>
    </div>
  );
};

/** A white card at `x`, `y` (its top left), `w` wide: a title and a little content. Use sparingly: pictures beat words. */
export const Card: React.FC<{x: number; y: number; w: number; o: number; title?: string; accent?: string; children?: React.ReactNode}> = ({x, y, w, o, title, accent, children}) => {
  const theme = useTheme();
  return o <= 0.01 ? null : (
    <div data-box="" style={{position: 'absolute', left: x, top: y, width: w, opacity: o, transform: `translateY(${(1 - o) * 18}px)`, padding: '24px 30px', borderRadius: 26, background: 'rgba(255,255,255,.95)', boxShadow: '0 10px 30px rgba(0,0,0,.22)', font: `600 34px ${SANS}`, color: K.ink, lineHeight: 1.3, boxSizing: 'border-box'}}>
      {title && <div style={{font: `800 40px ${SANS}`, color: accent ?? theme?.accent ?? K.blue, marginBottom: 8}}>{title}</div>}
      {children}
    </div>
  );
};

/** Words on the screen, in the sans of the look, centred on `x`, `y` unless `align` says otherwise. */
export const Label: React.FC<{x: number; y: number; size?: number; color?: string; weight?: number; o?: number; align?: 'left' | 'center' | 'right'; shadow?: boolean; children: React.ReactNode}> = ({x, y, size = 44, color, weight = 800, o = 1, align = 'center', shadow: sh, children}) => {
  const ink = useTheme()?.ink ?? K.ink;
  return o <= 0.01 ? null : (
    <div data-box="" style={{position: 'absolute', left: x, top: y, opacity: o, whiteSpace: 'nowrap', transform: `translate(${align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0'}, -50%)`, font: `${weight} ${size}px ${SANS}`, color: color ?? ink, textShadow: sh ? '0 3px 16px rgba(0,0,0,.6)' : undefined}}>
      {children}
    </div>
  );
};

/** A number that counts up from `from` to `to` as `p` goes 0 to 1, with `digits` decimals and a unit after it. */
export const Counter: React.FC<{x: number; y: number; p: number; from?: number; to: number; digits?: number; unit?: string; size?: number; color?: string; o?: number}> = ({x, y, p, from = 0, to, digits = 0, unit = '', size = 96, color, o = 1}) => (
  <Label x={x} y={y} size={size} color={color} weight={900} o={o}>
    {lerp(from, to, clamp(p)).toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits})}
    {unit && <span style={{fontSize: size * 0.5, marginLeft: 10}}>{unit}</span>}
  </Label>
);

/** A bar that fills to `value` (0 to 1) as `p` goes 0 to 1, at `x`, `y` (top left), `w` wide, with a label above it. */
export const Bar: React.FC<{x: number; y: number; w: number; p: number; value: number; color?: string; label?: string; o?: number}> = ({x, y, w, p, value, color, label, o = 1}) => {
  const theme = useTheme();
  const ink = theme?.ink ?? K.ink;
  return o <= 0.01 ? null : (
    <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o}}>
      {label && <div data-box="" style={{font: `800 36px ${SANS}`, color: ink, marginBottom: 10, whiteSpace: 'nowrap'}}>{label}</div>}
      <div style={{height: 34, borderRadius: 17, background: theme ? 'rgba(127,127,127,.25)' : 'rgba(0,0,0,.1)', overflow: 'hidden'}}>
        <div style={{width: `${(100 * clamp(value) * clamp(p)).toFixed(1)}%`, height: '100%', borderRadius: 17, background: color ?? theme?.accent ?? K.blue}} />
      </div>
    </div>
  );
};

/** An SVG as big as the frame, for 2D drawing: paths, arrows (Draw and Arrow of the kit work inside it), shapes. */
export const Svg2D: React.FC<{children: React.ReactNode; o?: number}> = ({children, o = 1}) => {
  const f = useFrame();
  return (
    <svg width={f.w} height={f.h} viewBox={`0 0 ${f.w} ${f.h}`} style={{position: 'absolute', inset: 0, opacity: o}}>
      {children}
    </svg>
  );
};

/** A dimension line between two screen points with a label beside it, drawn as `p` goes 0 to 1. */
export const Measure: React.FC<{a: [number, number]; b: [number, number]; p: number; label: string; color?: string}> = ({a, b, p, label, color = '#ffffff'}) => {
  const f = useFrame();
  if (p <= 0.01) return null;
  const bx = a[0] + (b[0] - a[0]) * p;
  const by = a[1] + (b[1] - a[1]) * p;
  return (
    <>
      <svg width={f.w} height={f.h} style={{position: 'absolute', inset: 0}}>
        <line x1={a[0]} y1={a[1]} x2={bx} y2={by} stroke={color} strokeWidth={4} />
        {[a, [bx, by]].map(([x, y], i) => (
          <line key={i} x1={x - 16} y1={y} x2={x + 16} y2={y} stroke={color} strokeWidth={4} />
        ))}
      </svg>
      <div data-box="" style={{position: 'absolute', left: Math.max(a[0], b[0]) + 26, top: (a[1] + b[1]) / 2, transform: 'translateY(-50%)', opacity: p, font: `800 40px ${SANS}`, color, textShadow: '0 2px 10px rgba(0,0,0,.6)'}}>{label}</div>
    </>
  );
};

/** Pressure, temperature or any low-to-high value as a colour: 0 blue, 1 red, through green and yellow. */
export const heatColor = (p: number) => {
  const stops = ['#2f6fe0', '#2bb3c9', '#5cc46a', '#f2c94c', '#e8513a'];
  const x = clamp(p) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return new THREE.Color(stops[i]).lerp(new THREE.Color(stops[i + 1]), x - i);
};
/** The key to heatColor: a bar from low to high with a word for what it measures, at `x`, `y` (top left). */
export const Legend: React.FC<{x: number; y: number; o: number; what?: string}> = ({x, y, o, what = 'Pressure'}) =>
  o <= 0.01 ? null : (
    <div data-box="" style={{position: 'absolute', left: x, top: y, opacity: o, padding: '14px 22px', borderRadius: 18, background: 'rgba(255,255,255,.93)', font: `700 30px ${SANS}`, color: K.ink, display: 'flex', alignItems: 'center', gap: 16}}>
      <span>{what}</span>
      <span style={{color: '#2f6fe0'}}>low</span>
      <span style={{width: 220, height: 20, borderRadius: 10, background: 'linear-gradient(90deg, #2f6fe0, #2bb3c9, #5cc46a, #f2c94c, #e8513a)'}} />
      <span style={{color: '#e8513a'}}>high</span>
    </div>
  );

// ---- pictures and clips ----

/**
 * A picture of art.json (a Codex drawing) in a white frame at `x`, `y` (top left), `size` wide, with a short label
 * under it. It comes in with a small rise as `o` goes 0 to 1.
 */
export const Picture: React.FC<{art: {src: string}; x: number; y: number; size: number; o: number; label?: string}> = ({art, x, y, size, o, label}) => {
  // Img holds the frame until the picture is loaded; it only works in a real frame, not in the stills' scan.
  const Pic = useContext(Live) ? Img : 'img';
  return o <= 0.01 ? null : (
    <div data-box="" style={{position: 'absolute', left: x, top: y, width: size, opacity: Math.min(1, o * 1.5), transform: `scale(${0.88 + 0.12 * o}) translateY(${(1 - o) * 24}px)`, padding: 12, borderRadius: 26, background: '#ffffff', boxShadow: '0 14px 40px rgba(0,0,0,.28)', fontSize: 34}}>
      <Pic src={staticFile(art.src)} style={{display: 'block', width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 16}} />
      {label && <div style={{font: `800 34px ${SANS}`, color: K.ink, textAlign: 'center', marginTop: 10}}>{label}</div>}
    </div>
  );
};

/**
 * A picture of art.json that fills the frame while the camera moves slowly, for a person or a place the voice talks
 * about (an idea shown as a moment of someone's day). `p` goes 0 to 1 over its time on screen, `move` is the direction.
 * Draw it wide: "ar": "16:9" in `images` (and "9:16" for a scene of a Short run).
 */
export const FullPicture: React.FC<{art: {src: string}; p: number; move?: 'in' | 'out' | 'left' | 'right'; o?: number}> = ({art, p, move = 'in', o = 1}) => {
  const f = useFrame();
  const Pic = useContext(Live) ? Img : 'img';
  if (o <= 0.01) return null;
  const [s0, s1, dx] = {in: [1.04, 1.14, 0], out: [1.14, 1.04, 0], left: [1.1, 1.1, 40], right: [1.1, 1.1, -40]}[move];
  return <Pic src={staticFile(art.src)} style={{position: 'absolute', inset: 0, width: f.w, height: f.h, objectFit: 'cover', opacity: o, transform: `translateX(${lerp(-dx, dx, p).toFixed(2)}px) scale(${lerp(s0, s1, p).toFixed(4)})`}} />;
};

/**
 * Where a claim comes from, small, in the lower left above the captions: "Source: WHO, 2024". For a claim a viewer
 * could act on (health, money), shown while the voice says it. Give the claim its "date" in facts.json, so the year is
 * not taken for an unsaid number.
 */
export const Source: React.FC<{o: number; children: string}> = ({o, children}) => {
  const f = useFrame();
  const ink = useTheme()?.ink ?? K.muted;
  const tall = f.h > f.w;
  return o <= 0.01 ? null : (
    <div data-box="" style={{position: 'absolute', left: tall ? 70 : 90, top: tall ? 1290 : 922, opacity: Math.min(1, o * 1.5), font: `600 30px ${SANS}`, color: ink, whiteSpace: 'nowrap'}}>
      {children}
    </div>
  );
};

/**
 * A video file under public/ on the timeline of a scene: an AI clip (scripts/clips.py), real footage. It starts `at` seconds into the scene, `from` seconds into the file, and fills the frame unless a box
 * (`x`, `y`, `w`, `h`, `round` for its corners) is given. Its own sound is off unless `vol` is given. A clip only covers
 * its own length: plan the scene around it.
 */
export const Clip: React.FC<{src: string; at?: number; from?: number; o?: number; vol?: number; x?: number; y?: number; w?: number; h?: number; round?: number}> = ({src, at = 0, from = 0, o = 1, vol = 0, x = 0, y = 0, w, h, round = 0}) => {
  const f = useFrame();
  const style: React.CSSProperties = {position: 'absolute', left: x, top: y, width: w ?? f.w, height: h ?? f.h, opacity: o, borderRadius: round, overflow: 'hidden', boxShadow: round ? '0 14px 40px rgba(0,0,0,.3)' : undefined};
  if (o <= 0) return null;
  // The dead-screen check walks scenes outside the player: there the clip is a plain box.
  if (!useContext(Live)) return <div data-clip={src} style={style} />;
  return (
    <Sequence from={Math.round(at * 30)} layout="none">
      <div style={style}>
        <Video src={staticFile(src)} trimBefore={Math.round(from * 30)} volume={vol} objectFit="cover" style={{width: '100%', height: '100%'}} />
      </div>
    </Sequence>
  );
};

/** A small round window with its own 3D scene (a Stage with its own `w`, `h`), `size` pixels across, top left at `x`, `y`. */
export const Inset: React.FC<{x: number; y: number; size: number; o: number; label?: string; children: React.ReactNode}> = ({x, y, size, o, label, children}) => {
  const ground = useGround();
  const theme = useTheme();
  return o <= 0.01 ? null : (
    <div style={{position: 'absolute', left: x, top: y, width: size, opacity: Math.min(1, o * 1.5), transform: `scale(${0.88 + 0.12 * o})`}}>
      <div style={{position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden', border: '10px solid #ffffff', boxShadow: '0 14px 40px rgba(0,0,0,.35)', background: theme ? ground : '#d9dde2'}}>{children}</div>
      {label && <div data-box="" style={{width: 'fit-content', margin: '14px auto 0', padding: '8px 22px', borderRadius: 999, background: 'rgba(255,255,255,.96)', boxShadow: '0 8px 24px rgba(0,0,0,.25)', font: `800 34px ${SANS}`, color: K.ink}}>{label}</div>}
    </div>
  );
};

// ---- solids cut open ----

export type P2 = [number, number]; // radius, height along the axis
/** The angle half-width of the wedge cut away (centred on +z, towards the camera): `open` 0 = whole, 1 = a quarter. */
const half = (open: number) => (open * Math.PI) / 4;
/** True if angle `a` (from +z towards +x) is in the part cut away. */
export const removed = (a: number, open: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < half(open) - 1e-6;
/** The parts of the angle range [a, b] that the cut keeps, each with flags for ends made by the cut (they get caps). */
export const clip = (a: number, b: number, open: number): {from: number; to: number; capA: boolean; capB: boolean}[] => {
  const w = half(open);
  if (w < 1e-3) return [{from: a, to: b, capA: false, capB: false}];
  const out: {from: number; to: number; capA: boolean; capB: boolean}[] = [];
  for (let k = Math.floor((a - w) / TAU) - 1; k <= Math.ceil(b / TAU) + 1; k++) {
    const lo = w + TAU * k;
    const hi = TAU - w + TAU * k;
    const from = Math.max(a, lo);
    const to = Math.min(b, hi);
    if (to - from > 1e-4) out.push({from, to, capA: from === lo, capB: to === hi});
  }
  return out;
};

/** Every corner cut by `d`, so edges catch the light the way real parts do. */
export const chamfer = (pts: P2[], d = 0.12): P2[] =>
  pts.flatMap((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length];
    const b = pts[(i + 1) % pts.length];
    const to = (q: P2) => {
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const l = Math.hypot(dx, dy);
      const k = Math.min(d, l / 3) / l;
      return [p[0] + dx * k, p[1] + dy * k] as P2;
    };
    return [to(a), to(b)];
  });

const INK = new LineMaterial({color: 0x15171a, linewidth: 2.2, resolution: new THREE.Vector2(1920, 1080)});
type Built = {body: THREE.BufferGeometry; band: THREE.BufferGeometry | null; caps: THREE.BufferGeometry | null; ink: LineSegments2};
const built = new Map<string, Built>();
const at3 = (r: number, y: number, a: number) => [r * Math.sin(a), y, r * Math.cos(a)];

/**
 * A section `profile(angle)` (closed outline of radius, height) swept around the y axis over [a, b], cut open by
 * `open`. Edges listed in `bandEdges` (edge i joins point i and i + 1) are cut faces of their own and take the cap
 * colour. Built once per key and cut, then reused.
 */
const sweep = (key: string, profile: (a: number) => P2[], a: number, b: number, open: number, bandEdges: number[] = []): Built => {
  const q = Math.round(open * 50) / 50;
  const id = `${key}|${a.toFixed(3)}|${b.toFixed(3)}|${q}`;
  let g = built.get(id);
  if (g) return g;
  const parts = clip(a, b, q);
  const bodyPos: number[] = [];
  const bodyIdx: number[] = [];
  const bandPos: number[] = [];
  const bandIdx: number[] = [];
  const capPos: number[] = [];
  const capIdx: number[] = [];
  const ink: number[] = [];
  for (const {from, to, capA, capB} of parts) {
    const n = Math.max(6, Math.ceil(((to - from) / TAU) * 160));
    const rings = Array.from({length: n + 1}, (_, i) => {
      const ang = from + ((to - from) * i) / n;
      return {ang, pts: profile(ang)};
    });
    const m = rings[0].pts.length;
    for (let e = 0; e < m; e++) {
      const isBand = bandEdges.includes(e);
      const pos = isBand ? bandPos : bodyPos;
      const idx = isBand ? bandIdx : bodyIdx;
      const base = pos.length / 3;
      // One strip per edge, so normals stay smooth around and sharp across corners.
      for (const {ang, pts} of rings) {
        const p0 = pts[e];
        const p1 = pts[(e + 1) % m];
        pos.push(...at3(p0[0], p0[1], ang), ...at3(p1[0], p1[1], ang));
      }
      for (let i = 0; i < n; i++) {
        const v = base + i * 2;
        idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      }
    }
    for (let j = 0; j < m; j++) {
      if (rings[0].pts[j][0] < 0.01) continue;
      for (let i = 0; i < n; i++) ink.push(...at3(rings[i].pts[j][0], rings[i].pts[j][1], rings[i].ang), ...at3(rings[i + 1].pts[j][0], rings[i + 1].pts[j][1], rings[i + 1].ang));
    }
    for (const [cap, ring] of [[capA, rings[0]], [capB, rings[n]]] as const) {
      if (!cap) continue;
      const contour = ring.pts.map(([r, y]) => new THREE.Vector2(r, y));
      const tri = THREE.ShapeUtils.triangulateShape(contour, []);
      const base = capPos.length / 3;
      ring.pts.forEach(([r, y]) => capPos.push(...at3(r, y, ring.ang)));
      tri.forEach(([i0, i1, i2]) => capIdx.push(base + i0, base + i1, base + i2));
      ring.pts.forEach(([r, y], j) => {
        const [r2, y2] = ring.pts[(j + 1) % m];
        ink.push(...at3(r, y, ring.ang), ...at3(r2, y2, ring.ang));
      });
    }
  }
  const make = (pos: number[], idx: number[]) => {
    if (!idx.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };
  g = {body: make(bodyPos, bodyIdx)!, band: make(bandPos, bandIdx), caps: make(capPos, capIdx), ink: new LineSegments2(new LineSegmentsGeometry().setPositions(ink.length ? ink : [0, 0, 0, 0, 0, 0]), INK)};
  built.set(id, g);
  return g;
};

export type Finish = {color: string; metal?: number; rough?: number; cap?: string; glow?: string; heat?: number; ghost?: number; env?: number};
/** A surface: `ghost` 0..1 fades it to nothing, so what is behind it shows; `glow` and `heat` light it from inside. */
export const Mat: React.FC<Finish & {side?: THREE.Side; map?: THREE.Texture}> = ({color, metal = 0.1, rough = 0.6, glow, heat = 0, ghost = 0, env = 1, side = THREE.DoubleSide, map}) => {
  const o = 1 - 0.97 * ghost;
  return <meshStandardMaterial color={color} map={map} metalness={metal} roughness={rough} side={side} emissive={glow ?? '#000000'} emissiveIntensity={heat} envMapIntensity={env} transparent={o < 1} opacity={o} depthWrite={o >= 0.999} visible={o > 0.04} />;
};

/** A swept solid: its surfaces, its cut faces in the cap colour, and dark lines on its corners. `name` must be unique. */
export const Sweep: React.FC<Finish & {name: string; profile: (a: number) => P2[]; from?: number; to?: number; open: number; band?: number[]; ink?: boolean}> = ({name, profile, from = 0, to = TAU, open, band, ink = true, cap, ...finish}) => {
  const g = sweep(name, profile, from, to, open, band);
  const faded = (finish.ghost ?? 0) > 0.02;
  return (
    <group>
      {ink && !faded && <primitive object={g.ink} />}
      <mesh geometry={g.body} castShadow={!faded} receiveShadow>
        <Mat {...finish} />
      </mesh>
      {g.band && (
        <mesh geometry={g.band} receiveShadow>
          <Mat {...finish} color={cap ?? finish.color} rough={0.75} metal={0.05} />
        </mesh>
      )}
      {g.caps && (
        <mesh geometry={g.caps} receiveShadow>
          <Mat {...finish} color={cap ?? finish.color} rough={0.75} metal={0.05} glow={undefined} heat={0} />
        </mesh>
      )}
    </group>
  );
};

/**
 * A solid of revolution around the y axis from its outline `pts` (radius, height), corners softened by `soft`, cut open
 * by `open`: the cut faces show in `cap`. Turned bodies, shafts, rings, casings, cups, pipes: most machine parts.
 */
export const Lathe: React.FC<Finish & {name: string; pts: P2[]; open: number; ink?: boolean; soft?: number}> = ({name, pts, soft = 0.12, ...rest}) => {
  const p = useMemo(() => (soft > 0 ? chamfer(pts, soft) : pts), [pts, soft]);
  return <Sweep name={name} profile={() => p} {...rest} />;
};

/** A ring of copper winding: a torus around the y axis at height `y`, cut open like the rest; `heat` makes it glow. */
export const Coil: React.FC<{r: number; tube: number; y: number; open: number; heat?: number}> = ({r, tube, y, open, heat = 0}) => (
  <>
    {clip(0, TAU, open).map(({from, to}) => (
      <group key={from} position={[0, y, 0]} rotation={[0, from - Math.PI / 2, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[r, tube, 16, 96, to - from]} />
          <Mat color="#c26a2c" metal={0.7} rough={0.35} glow="#ff7a2a" heat={heat} />
        </mesh>
      </group>
    ))}
  </>
);

let stripes: THREE.CanvasTexture | null = null;
/** Skewed bars, for a rotor or a wheel whose turning should show. */
export const barSkin = () => {
  if (!stripes) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#8b939c';
    g.fillRect(0, 0, 256, 128);
    g.strokeStyle = '#5f666e';
    g.lineWidth = 7;
    for (let x = -128; x < 384; x += 22) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 40, 128);
      g.stroke();
    }
    stripes = new THREE.CanvasTexture(c);
    stripes.colorSpace = THREE.SRGBColorSpace;
    stripes.wrapS = THREE.RepeatWrapping;
    stripes.repeat.set(4, 1);
  }
  return stripes;
};
