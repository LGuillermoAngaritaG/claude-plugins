// The particle look (Cell to Cure's Shorts): real 3D objects (three.js) printed as a dot screen, glowing particles with
// depth above them, a camera that always moves, and HTML text on top (a header with the source, a few mono labels, a
// drug chip, captions). People are never 3D shapes: they are Codex pictures on a plane (`Cutout`). Upright, 1080 x 1920.
// Guide: the shorts plugin's particle-video skill and its example (examples/particles/01-bp-medicines).
// Colours: blue = the medicine, coral = what raises the risk (a hormone, calcium, a squeeze), white/pink = the body.
import React, {useContext, useLayoutEffect, useMemo, useRef} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {EffectComposer} from '@react-three/postprocessing';
import {BlendFunction, Effect, EffectAttribute} from 'postprocessing';
import {Live, Look} from '../engine';
import {captions, font} from './shared';

font('Montserrat', 'Montserrat.ttf', '100 900');
export const W = 1080;
export const H = 1920;
export const BOLD = 'Montserrat, sans-serif';
export const MONO = 'Menlo, monospace';
export const BLUE = '#2f6db0'; // the medicine (Cell to Cure's accent)
export const SKY = '#7fb2ec'; // a light blue that reads on the dark ground
export const GREEN = '#2a9d55'; // sources, "good"
export const INK = '#1d3c6e'; // text on paper
export const NIGHT = '#0b1322'; // the dark ground
export const PAPER = '#f5f2ed'; // the light "lab sheet" ground
export const CORAL = '#ee7f5f'; // what raises the pressure (hormone, calcium, squeeze), the only warm colour
export const DIM = '#8fa3c4'; // mono labels on the dark ground

// Captions as in our other Shorts: white, the spoken word in coral, at the usual height. Scene text stays above y 1360.
const Caption = captions({x: 540, y: 1440, size: 70, family: BOLD, weight: 900, color: '#ffffff', hot: () => CORAL, shadow: '0 0 4px #000, 0 0 4px #000, 0 4px 0 #000, 0 0 10px #000', max: 18});
export const PARTICLES: Look = {w: W, h: H, bg: NIGHT, safe: [70, 220, 1010, 1520], minText: 28, fonts: ['900 60px Montserrat', '700 30px Menlo'], cut: true, overlay: Caption};

// ---- time ----
export const clamp = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const io = (u: number) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);
/** 0 before `at`, 1 after `at + len`, eased in between. */
export const ease = (t: number, at: number, len: number) => io(clamp((t - at) / len));
/** 0 to 1 with a small overshoot: for things that pop on. */
export const pop = (t: number, at: number, len = 0.4) => {
  const u = clamp((t - at) / len);
  return u <= 0 ? 0 : 1 + Math.sin(u * Math.PI) * 0.16 * (1 - u) - (1 - u) ** 3;
};
/** A fixed random number in [0, 1) for particle `i` and property `s`: the same in every frame. */
export const hash = (i: number, s = 0) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// ---- canvas ----
export type Ctx = CanvasRenderingContext2D;
/** One canvas the size of the frame, redrawn every frame by `draw`. Pass `deps={[t]}`. */
export const Paint: React.FC<{draw: (c: Ctx) => void; deps: unknown[]}> = ({draw, deps}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, W, H);
    draw(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', inset: 0}} />;
};
/** A slow push-in for the whole canvas: call first in `draw`, with `u` = t / dur. */
export const drift = (c: Ctx, u: number, from = 1, to = 1.04) => {
  const z = lerp(from, to, u);
  c.setTransform(z, 0, 0, z, (W * (1 - z)) / 2, (H * (1 - z)) / 2);
};

/**
 * A sphere printed in dots: a dot grid inside the circle, each dot sized by how much light that point gets (`lit`,
 * for the dark ground) or how much shadow (`!lit`, ink on paper). `spin` turns the grid so the print crawls.
 */
export const dotSphere = (c: Ctx, x: number, y: number, r: number, color: string, cell: number, lit: boolean, spin = 0, a = 1) => {
  if (r <= 0.5 || a <= 0.01) return;
  const L = [-0.45, -0.55, 0.7];
  const n = Math.ceil(r / cell) + 1;
  const [cs, sn] = [Math.cos(spin), Math.sin(spin)];
  c.fillStyle = color;
  c.globalAlpha = a;
  c.beginPath();
  for (let i = -n; i <= n; i++)
    for (let j = -n; j <= n; j++) {
      const u = (i + (j % 2 ? 0.5 : 0)) * cell;
      const v = j * cell * 0.87;
      const dx = u * cs - v * sn;
      const dy = u * sn + v * cs;
      const q = (dx * dx + dy * dy) / (r * r);
      if (q >= 1) continue;
      const light = clamp((dx / r) * L[0] + (dy / r) * L[1] + Math.sqrt(1 - q) * L[2]);
      const rad = cell * 0.5 * (lit ? 0.12 + 0.88 * light : 0.15 + 0.85 * (1 - light));
      c.moveTo(x + dx + rad, y + dy);
      c.arc(x + dx, y + dy, rad, 0, Math.PI * 2);
    }
  c.fill();
  c.globalAlpha = a * 0.9;
  c.strokeStyle = color;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.stroke();
  c.globalAlpha = 1;
};

/**
 * Any closed shape printed in dots (a kidney, a heart, a cell): `inside(x, y)` says whether a point is in the shape,
 * `shade(x, y)` gives 0..1 light there. Dots on a grid of `cell` over the box [x0, y0, x1, y1].
 */
export const dotShape = (c: Ctx, box: number[], inside: (x: number, y: number) => boolean, shade: (x: number, y: number) => number, color: string, cell: number, a = 1) => {
  if (a <= 0.01) return;
  c.fillStyle = color;
  c.globalAlpha = a;
  c.beginPath();
  for (let y = box[1], j = 0; y <= box[3]; y += cell * 0.87, j++)
    for (let x = box[0] + (j % 2 ? cell / 2 : 0); x <= box[2]; x += cell) {
      if (!inside(x, y)) continue;
      const rad = cell * 0.5 * (0.12 + 0.88 * clamp(shade(x, y)));
      c.moveTo(x + rad, y);
      c.arc(x, y, rad, 0, Math.PI * 2);
    }
  c.fill();
  c.globalAlpha = 1;
};

/**
 * Particle streaks: for i in 0..n, `at(i, t)` gives [x, y] or null (not there). Each is drawn as a short line from
 * where it was `tail` seconds ago, with a soft wide pass under a sharp one. `glow` adds light on the dark ground.
 */
export const streaks = (c: Ctx, n: number, t: number, at: (i: number, t: number) => number[] | null, color: string, {a = 0.8, width = 2.2, tail = 0.07, glow = true} = {}) => {
  if (a <= 0.01) return;
  c.save();
  if (glow) c.globalCompositeOperation = 'lighter';
  c.strokeStyle = color;
  c.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    c.lineWidth = pass ? width : width * 2.3;
    c.globalAlpha = pass ? a : a * 0.15;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const p = at(i, t);
      const q = p && at(i, t - tail);
      if (!p || !q) continue;
      c.moveTo(q[0], q[1]);
      c.lineTo(p[0] + 0.5, p[1] + 0.5);
    }
    c.stroke();
  }
  c.restore();
};

/**
 * An artery seen from the side: two wall lines with a dotted muscle layer, from x0 to x1 around centre y `cy`, inner
 * half-width `r` (narrow it to show a squeeze), and blood cells streaming through left to right at `speed` px/s.
 * The walls wobble a little with the heartbeat. Returns nothing; draws on `c`.
 */
export const artery = (c: Ctx, t: number, x0: number, x1: number, cy: number, r: number, {wall = '#ffffff', blood = CORAL, speed = 260, cells = 900, a = 1, dark = true} = {}) => {
  if (a <= 0.01) return;
  const beat = 1 + 0.025 * Math.max(0, Math.sin(t * 7));
  const rr = r * beat;
  // the muscle layer: dots in the wall, thicker where the wall is squeezed
  const thick = 26 + Math.max(0, 140 - r) * 0.25;
  for (const s of [-1, 1]) {
    dotShape(c, [x0, cy + s * rr - (s < 0 ? thick : 0), x1, cy + s * rr + (s > 0 ? thick : 0)], () => true, (x, y) => 0.35 + 0.4 * Math.sin(x * 0.05 + y * 0.03), wall, 9, a * (dark ? 0.55 : 0.45));
    c.globalAlpha = a;
    c.strokeStyle = wall;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x0, cy + s * rr);
    c.lineTo(x1, cy + s * rr);
    c.stroke();
  }
  // blood cells flowing: each keeps its lane, wraps round at the ends
  const len = x1 - x0;
  streaks(
    c,
    cells,
    t,
    (i, tt) => {
      const lane = (hash(i, 31) * 2 - 1) * 0.85;
      const v = speed * (0.7 + 0.6 * (1 - lane * lane)); // faster in the middle of the vessel
      const x = x0 + ((((hash(i, 32) * len + v * tt) % len) + len) % len);
      return [x, cy + lane * rr + Math.sin(tt * 3 + i) * 3];
    },
    blood,
    {a: a * 0.8, width: 3, tail: 0.05, glow: dark},
  );
};

// ---- text on top ----
type Align = 'left' | 'right' | 'center';
/** A small mono label, placed by its left, right or centre point. */
export const Mono: React.FC<{x: number; y: number; o: number; color: string; size?: number; align?: Align; children: React.ReactNode}> = ({x, y, o, color, size = 30, align = 'left', children}) =>
  o <= 0.01 ? null : (
    <div data-box="" style={{position: 'absolute', left: x, top: y, transform: `translate(${align === 'left' ? 0 : align === 'right' ? -100 : -50}%, -50%)`, opacity: o, font: `700 ${size}px ${MONO}`, letterSpacing: 2, color, whiteSpace: 'nowrap'}}>
      {children}
    </div>
  );
/** The one big word of a moment: it rises out of a mask at `at` and leaves at `out`. Keep `y` + size * 0.6 under 1360. */
export const Big: React.FC<{y: number; t: number; at: number; out?: number; color: string; size?: number; children: string}> = ({y, t, at, out = 1e9, color, size = 150, children}) => {
  const p = pop(t, at, 0.45);
  const o = 1 - ease(t, out, 0.25);
  return p <= 0 || o <= 0 ? null : (
    <div style={{position: 'absolute', left: 0, right: 0, top: y - size * 0.62, height: size * 1.24, overflow: 'hidden', textAlign: 'center', opacity: o}}>
      <div data-box="" style={{transform: `translateY(${(1 - p) * size * 1.1}px)`, font: `900 ${size}px ${BOLD}`, lineHeight: 1.24, letterSpacing: -2, color, whiteSpace: 'nowrap'}}>{children}</div>
    </div>
  );
};
/** A rounded chip with mono text (a drug family, a dose): pops on at `at`, centred on x, y. */
export const Chip: React.FC<{x: number; y: number; t: number; at: number; out?: number; bg?: string; color?: string; children: React.ReactNode}> = ({x, y, t, at, out = 1e9, bg = BLUE, color = '#ffffff', children}) => {
  const p = pop(t, at, 0.4) * (1 - ease(t, out, 0.25));
  return p <= 0.01 ? null : (
    <div data-box="" style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${p})`, padding: '12px 30px', borderRadius: 999, background: bg, color, font: `700 34px ${MONO}`, letterSpacing: 2, whiteSpace: 'nowrap'}}>
      {children}
    </div>
  );
};
/** The two mono header labels of a scene, top left and top right, and a "SOURCE: ..." line under the right one. */
export const Header: React.FC<{t: number; left: string; right: string; source?: string; dark?: boolean}> = ({t, left, right, source, dark = true}) => (
  <>
    {/* a soft band of the ground behind the header, so particles and objects passing the top never cover it */}
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 440, background: `linear-gradient(to bottom, ${dark ? 'rgba(4,7,14,.9)' : 'rgba(245,242,237,.92)'} 0%, ${dark ? 'rgba(4,7,14,.75)' : 'rgba(245,242,237,.8)'} 70%, transparent 100%)`}} />
    <Mono x={90} y={300} o={ease(t, 0, 0.3)} color={dark ? DIM : INK}>{left}</Mono>
    <Mono x={990} y={300} o={ease(t, 0, 0.3)} color={dark ? DIM : INK} align="right">{right}</Mono>
    {source ? <Mono x={990} y={350} o={ease(t, 0.2, 0.3)} color={dark ? '#5d8f74' : GREEN} align="right" size={28}>{`SOURCE: ${source}`}</Mono> : null}
  </>
);
/** The dark ground with a soft light in the middle, or the paper ground with faint graph lines. */
export const Ground: React.FC<{dark?: boolean; children: React.ReactNode}> = ({dark = true, children}) => (
  <div style={{position: 'absolute', inset: 0, background: dark ? `radial-gradient(ellipse at 50% 42%, #13213a 0%, ${NIGHT} 70%)` : `repeating-linear-gradient(0deg, rgba(29,60,110,.07) 0 1px, transparent 1px 41px), repeating-linear-gradient(90deg, rgba(29,60,110,.07) 0 1px, transparent 1px 41px), ${PAPER}`}}>
    {children}
  </div>
);

// ---- the 3D world ----

export type V3 = [number, number, number];
/** Where the camera is, what it looks at, and its vertical field of view in degrees. */
export type Cam = {pos: V3; at: V3; fov: number};
/** Camera keys: [time, position, target, fov]. The camera eases from key to key; two equal keys hold. */
export type CamKey = [number, V3, V3, number];
const mix3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
/** The camera at time `t` along `keys`, with a small hand-held float so it is never dead still (`float` in world units). */
export const camAt = (t: number, keys: CamKey[], float = 0.04): Cam => {
  let i = keys.findIndex((k) => k[0] > t);
  if (i < 0) i = keys.length;
  const a = keys[Math.max(0, i - 1)];
  const b = keys[Math.min(keys.length - 1, i)];
  const u = b[0] === a[0] ? 1 : io(clamp((t - a[0]) / (b[0] - a[0])));
  const pos = mix3(a[1], b[1], u);
  const at = mix3(a[2], b[2], u);
  const d = Math.hypot(pos[0] - at[0], pos[1] - at[1], pos[2] - at[2]);
  const f = float * d;
  return {pos: [pos[0] + f * Math.sin(t * 0.7), pos[1] + f * Math.sin(t * 0.53 + 1), pos[2]], at, fov: lerp(a[3], b[3], u)};
};

const probe = new THREE.PerspectiveCamera();
const aim = (c: THREE.PerspectiveCamera, cam: Cam) => {
  c.fov = cam.fov;
  c.aspect = W / H;
  c.near = 0.05;
  c.far = 400;
  c.position.set(...cam.pos);
  c.lookAt(...cam.at);
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
};
/** Where a 3D point lands on the 1080 x 1920 frame, and how far it is from the camera: [x, y, depth]. For labels. */
export const project = (cam: Cam, p: V3): [number, number, number] => {
  aim(probe, cam);
  const v = new THREE.Vector3(...p);
  const depth = v.distanceTo(probe.position);
  v.project(probe);
  return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H, depth];
};
const Rig: React.FC<{cam: Cam}> = ({cam}) => {
  aim(useThree((s) => s.camera) as THREE.PerspectiveCamera, cam);
  return null;
};

// ---- the dot screen ----
const HALFTONE = /* glsl */ `
uniform float cell;
uniform float paper;
uniform vec3 ground;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = uv * resolution;
  float h = cell * 0.8660254;
  float row = floor(px.y / h);
  float off = mod(row, 2.0) * 0.5 * cell;
  vec2 c = vec2((floor((px.x - off) / cell) + 0.5) * cell + off, (row + 0.5) * h);
  vec3 s = texture2D(inputBuffer, c / resolution).rgb;
  float d = length(px - c);
  vec3 bg = ground;
  if (paper < 0.5) {
    // dark ground with a soft light in the middle; light parts of the picture become big bright dots
    bg = mix(ground * 1.7, ground, smoothstep(0.0, 0.75, length((uv - vec2(0.5, 0.58)) * vec2(1.0, 1.6))));
    float lum = max(max(s.r, s.g), s.b);
    float r = 0.52 * cell * sqrt(clamp(lum, 0.0, 1.0));
    float m = 1.0 - smoothstep(r - 0.9, r + 0.9, d);
    vec3 hue = s / max(lum, 0.001);
    outputColor = vec4(mix(bg, hue * mix(0.55, 1.0, lum), m), 1.0);
  } else {
    // paper: shadow becomes ink; dots take the colour of the object
    float lum = dot(s, vec3(0.299, 0.587, 0.114));
    float ink = clamp(1.0 - lum, 0.0, 1.0);
    float r = 0.55 * cell * sqrt(ink);
    float m = 1.0 - smoothstep(r - 0.9, r + 0.9, d);
    vec2 g = mod(px, 41.0);
    float grid = (1.0 - step(1.0, g.x)) + (1.0 - step(1.0, g.y));
    bg = mix(ground, vec3(0.114, 0.235, 0.431), 0.07 * clamp(grid, 0.0, 1.0));
    outputColor = vec4(mix(bg, s * 0.85, m), 1.0);
  }
}`;
class Halftone extends Effect {
  constructor() {
    super('Halftone', HALFTONE, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['cell', new THREE.Uniform(9)],
        ['paper', new THREE.Uniform(0)],
        ['ground', new THREE.Uniform(new THREE.Color())],
      ]),
    });
  }
}
const Screen: React.FC<{cell: number; dark: boolean}> = ({cell, dark}) => {
  const fx = useMemo(() => new Halftone(), []);
  fx.uniforms.get('cell')!.value = cell;
  fx.uniforms.get('paper')!.value = dark ? 0 : 1;
  (fx.uniforms.get('ground')!.value as THREE.Color).set(dark ? '#0b1322' : '#f5f2ed').convertSRGBToLinear();
  return <primitive object={fx} dispose={null} />;
};

/** A marker for scripts/stills.mjs when it walks the scenes without drawing them: it changes with the camera. */
const Marker: React.FC<{cam: Cam}> = ({cam}) => <div data-stage={[...cam.pos, ...cam.at].map((v) => v.toFixed(2)).join(' ')} style={{position: 'absolute'}} />;

/**
 * The solid objects of a scene, lit from the upper left (with a rim light from behind) and printed as dots of `cell`
 * pixels. `dark` = light dots on the dark ground; otherwise ink dots on paper. It fills the frame and paints the ground.
 */
export const World: React.FC<{cam: Cam; dark?: boolean; cell?: number; children: React.ReactNode}> = ({cam, dark = true, cell = 9, children}) => {
  if (!useContext(Live)) return <Marker cam={cam} />;
  return (
    <ThreeCanvas width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <color attach="background" args={[dark ? '#000000' : '#ffffff']} />
      <Rig cam={cam} />
      <hemisphereLight args={['#ffffff', '#202838', dark ? 0.35 : 0.9]} />
      <directionalLight position={[-4, 6, 6]} intensity={dark ? 2.6 : 2.2} />
      <directionalLight position={[3, -2, -5]} intensity={dark ? 1.2 : 0.3} />
      {children}
      <EffectComposer multisampling={0}>
        <Screen cell={cell} dark={dark} />
      </EffectComposer>
    </ThreeCanvas>
  );
};

/** The layer of particles above the World, seen by the same camera: crisp, with depth, glowing on the dark ground. */
export const Glow: React.FC<{cam: Cam; children: React.ReactNode}> = ({cam, children}) => {
  if (!useContext(Live)) return null;
  return (
    <ThreeCanvas width={W} height={H} style={{position: 'absolute', inset: 0}} gl={{alpha: true, premultipliedAlpha: false}}>
      <Rig cam={cam} />
      {children}
    </ThreeCanvas>
  );
};

// ---- particles ----
const SPRITE_V = /* glsl */ `
attribute float alpha;
attribute float scale;
varying float vAlpha;
uniform float size;
uniform float px;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = size * scale * (px / -mv.z);
  vAlpha = alpha;
}`;
const SPRITE_F = /* glsl */ `
uniform vec3 color;
uniform float glow;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float core = 1.0 - smoothstep(0.35, 0.55, d);
  float halo = (1.0 - smoothstep(0.0, 1.0, d)) * glow;
  float a = max(core, halo * 0.35) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(mix(color, vec3(1.0), core * 0.25 * glow), a);
}`;
/**
 * `n` particles: `at(i, t)` gives the 3D point of particle i (or null where it is not there). Each is a soft round dot
 * (bigger when near the camera) with a streak to where it was `tail` seconds ago. `size` is the dot's diameter in
 * world units (try 0.04 to 0.15), `fade(i)` an optional 0..1 per particle. `glow` for the dark ground (additive light).
 */
export const Swarm: React.FC<{n: number; t: number; at: (i: number, t: number) => V3 | null; color: string; size?: number; tail?: number; opacity?: number; glow?: boolean; fade?: (i: number) => number}> = ({n, t, at, color, size = 0.2, tail = 0.08, opacity = 1, glow = true, fade}) => {
  const {pts, segs, ptMat, segMat} = useMemo(() => {
    const pts = new THREE.BufferGeometry();
    pts.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    pts.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(n), 1));
    pts.setAttribute('scale', new THREE.BufferAttribute(new Float32Array(n), 1));
    const segs = new THREE.BufferGeometry();
    segs.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    segs.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 8), 4));
    const blending = glow ? THREE.AdditiveBlending : THREE.NormalBlending;
    const ptMat = new THREE.ShaderMaterial({vertexShader: SPRITE_V, fragmentShader: SPRITE_F, transparent: true, depthWrite: false, blending, uniforms: {color: {value: new THREE.Color()}, size: {value: 1}, px: {value: 1000}, glow: {value: 1}}});
    const segMat = new THREE.LineBasicMaterial({vertexColors: true, transparent: true, depthWrite: false, blending});
    return {pts, segs, ptMat, segMat};
  }, [n, glow]);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const col = new THREE.Color(color);
  ptMat.uniforms.color.value.copy(col);
  ptMat.uniforms.size.value = size * (glow ? 2.2 : 1.2); // the glow sprite is about twice the dot; on paper only the dot shows
  ptMat.uniforms.px.value = H / (2 * Math.tan((camera.fov * Math.PI) / 360));
  ptMat.uniforms.glow.value = glow ? 1 : 0;
  const P = pts.attributes.position.array as Float32Array;
  const A = pts.attributes.alpha.array as Float32Array;
  const S = pts.attributes.scale.array as Float32Array;
  const L = segs.attributes.position.array as Float32Array;
  const C = segs.attributes.color.array as Float32Array;
  for (let i = 0; i < n; i++) {
    const p = at(i, t);
    const q = p && tail > 0 ? at(i, t - tail) : null;
    const a = p ? opacity * (fade ? fade(i) : 1) : 0;
    const pp = p ?? [0, 0, -1e4];
    const qq = q ?? pp;
    P.set(pp, i * 3);
    A[i] = a;
    S[i] = 0.6 + 0.8 * (((i * 0.6180339) % 1) as number);
    L.set(qq, i * 6);
    L.set(pp, i * 6 + 3);
    C.set([col.r, col.g, col.b, 0], i * 8);
    C.set([col.r, col.g, col.b, a * 0.7], i * 8 + 4);
  }
  pts.attributes.position.needsUpdate = true;
  pts.attributes.alpha.needsUpdate = true;
  pts.attributes.scale.needsUpdate = true;
  segs.attributes.position.needsUpdate = true;
  segs.attributes.color.needsUpdate = true;
  return (
    <>
      <lineSegments geometry={segs} material={segMat} frustumCulled={false} />
      <points geometry={pts} material={ptMat} frustumCulled={false} />
    </>
  );
};

// ---- shapes (inside <World>) ----
type Place = {p?: V3; rot?: V3; s?: number | V3};
const placeProps = ({p = [0, 0, 0], rot = [0, 0, 0], s = 1}: Place) => ({position: p, rotation: rot, scale: (typeof s === 'number' ? [s, s, s] : s) as V3});
const mat = (color: string, opts: {rough?: number; emissive?: number} = {}) => (
  <meshStandardMaterial color={color} roughness={opts.rough ?? 0.55} metalness={0} side={THREE.DoubleSide} emissive={color} emissiveIntensity={opts.emissive ?? 0} />
);

/**
 * An artery cut open toward the camera: a thick wall (inner radius `r`, `thick`) along the x axis from -len/2 to
 * len/2, with a window of `gap` radians cut out of its front (+z) so the inside shows. Squeeze it by changing `r`.
 */
export const Artery: React.FC<Place & {r: number; len: number; thick?: number; gap?: number; color?: string; inner?: string}> = ({r, len, thick, gap = 2.2, color = '#e9d6d2', inner = '#d97f86', ...pl}) => {
  const th = thick ?? r * 0.32;
  const geo = useMemo(() => {
    const a0 = Math.PI / 2 + gap / 2;
    const a1 = Math.PI / 2 - gap / 2 + 2 * Math.PI;
    const s = new THREE.Shape();
    s.absarc(0, 0, r + th, a0, a1, false);
    s.absarc(0, 0, r, a1, a0, true);
    const g = new THREE.ExtrudeGeometry(s, {depth: len, bevelEnabled: false, curveSegments: 64, steps: 1});
    g.translate(0, 0, -len / 2);
    g.rotateY(Math.PI / 2); // extruded along z, now along x
    g.rotateX(Math.PI / 2); // the window (shape's +y) now faces +z, the camera
    return g;
  }, [r, th, len, gap]);
  const lining = useMemo(() => {
    const g = new THREE.CylinderGeometry(r * 0.995, r * 0.995, len, 64, 1, true, gap / 2, 2 * Math.PI - gap);
    g.rotateZ(Math.PI / 2);
    return g;
  }, [r, len, gap]);
  return (
    <group {...placeProps(pl)}>
      <mesh geometry={geo}>{mat(color)}</mesh>
      <mesh geometry={lining}>{mat(inner, {rough: 0.8})}</mesh>
    </group>
  );
};

/** A two-colour capsule pill along x: `r` radius, `len` total length, halves `a` (left) and `b` (right). */
export const Pill: React.FC<Place & {r?: number; len?: number; a?: string; b?: string}> = ({r = 0.5, len = 2.2, a = '#2f6db0', b = '#f4f4f4', ...pl}) => {
  const half = len / 2 - r;
  return (
    <group {...placeProps(pl)}>
      {[
        [a, -1],
        [b, 1],
      ].map(([c, sd]) => (
        <group key={String(sd)}>
          <mesh position={[((sd as number) * half) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r, r, half, 48, 1, true]} />
            {mat(c as string, {rough: 0.35})}
          </mesh>
          <mesh position={[(sd as number) * half, 0, 0]} rotation={[0, 0, ((sd as number) * -Math.PI) / 2]}>
            <sphereGeometry args={[r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {mat(c as string, {rough: 0.35})}
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** A ball; `notch` (radians) bites a wedge out of its left side (-x), for an enzyme with an active site. */
export const Ball: React.FC<Place & {r?: number; color?: string; notch?: number; emissive?: number}> = ({r = 1, color = '#ffffff', notch = 0, emissive, ...pl}) => (
  <mesh {...placeProps(pl)}>
    <sphereGeometry args={[r, 64, 48, notch / 2, Math.PI * 2 - notch]} />
    {mat(color, {emissive})}
  </mesh>
);

/** A smooth muscle cell: a long spindle along x (`len`, widest radius `r`), `squeeze` 0..1 makes it shorter and fatter. */
export const Spindle: React.FC<Place & {len?: number; r?: number; squeeze?: number; color?: string}> = ({len = 6, r = 0.9, squeeze = 0, color = '#c9d6ea', ...pl}) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let k = 0; k <= 40; k++) {
      const u = k / 40;
      pts.push(new THREE.Vector2(r * Math.pow(Math.sin(Math.PI * u), 0.75) + 0.001, (u - 0.5) * len));
    }
    const g = new THREE.LatheGeometry(pts, 64);
    g.rotateZ(Math.PI / 2);
    return g;
  }, [len, r]);
  const k = 1 - 0.28 * squeeze;
  return (
    <group {...placeProps(pl)}>
      <mesh geometry={geo} scale={[k, 1 / Math.sqrt(k), 1 / Math.sqrt(k)]}>
        {mat(color)}
      </mesh>
    </group>
  );
};

/** A kidney: a bean with its dent (the hilum) facing +x. About 2 tall. */
export const Kidney: React.FC<Place & {color?: string}> = ({color = '#b5585a', ...pl}) => {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 64, 48);
    const v = g.attributes.position;
    for (let i = 0; i < v.count; i++) {
      let [x, y, z] = [v.getX(i), v.getY(i), v.getZ(i)];
      const dent = Math.max(0, x) * Math.exp(-y * y * 3.2) * 0.75; // the hilum
      x = x * 0.68 - dent * 0.55;
      y = y * 1.05;
      z = z * 0.5;
      v.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} {...placeProps(pl)}>
      {mat(color)}
    </mesh>
  );
};

/** A puffy heart shape (a rounded 3D heart icon, not anatomy), about 2 wide. `beat` 0..1 swells it. */
export const Heart: React.FC<Place & {color?: string; beat?: number}> = ({color = '#e06666', beat = 0, ...pl}) => {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.9);
    s.bezierCurveTo(-0.15, -0.65, -1, -0.2, -1, 0.25);
    s.bezierCurveTo(-1, 0.75, -0.45, 0.95, 0, 0.55);
    s.bezierCurveTo(0.45, 0.95, 1, 0.75, 1, 0.25);
    s.bezierCurveTo(1, -0.2, 0.15, -0.65, 0, -0.9);
    const g = new THREE.ExtrudeGeometry(s, {depth: 0.3, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.3, bevelSegments: 12, curveSegments: 48});
    g.translate(0, 0, -0.15);
    return g;
  }, []);
  const k = 1 + 0.08 * beat;
  return (
    <group {...placeProps(pl)}>
      <mesh geometry={geo} scale={[k, k, k]}>
        {mat(color)}
      </mesh>
    </group>
  );
};

/** A simple person: a rounded body and a head. About 2 tall, feet at y = 0. */
export const Person: React.FC<Place & {color?: string}> = ({color = '#2f6db0', ...pl}) => (
  <group {...placeProps(pl)}>
    <mesh position={[0, 0.55, 0]} scale={[1, 0.9, 0.7]}>
      <capsuleGeometry args={[0.45, 0.4, 12, 32]} />
      {mat(color)}
    </mesh>
    <mesh position={[0, 1.38, 0]}>
      <sphereGeometry args={[0.34, 48, 32]} />
      {mat(color)}
    </mesh>
  </group>
);

/** A chain of beads (a small molecule, like a hormone) through `pts`, each bead radius `r`. */
export const Beads: React.FC<Place & {pts: V3[]; r?: number; color?: string; emissive?: number}> = ({pts, r = 0.12, color = '#ee7f5f', emissive = 0.15, ...pl}) => (
  <group {...placeProps(pl)}>
    {pts.map((q, i) => (
      <mesh key={i} position={q}>
        <sphereGeometry args={[r, 24, 16]} />
        {mat(color, {emissive})}
      </mesh>
    ))}
  </group>
);

/** A tube along a smooth path through `pts` (a ureter, a vessel branch), radius `r`. */
export const Pipe: React.FC<Place & {pts: V3[]; r?: number; color?: string}> = ({pts, r = 0.08, color = '#d9c9c4', ...pl}) => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 96, r, 16, false), [JSON.stringify(pts), r]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh geometry={geo} {...placeProps(pl)}>
      {mat(color)}
    </mesh>
  );
};

/** A receptor: a small cup opening upward (+y) on a short stem, about 0.5 wide. */
export const Cup: React.FC<Place & {color?: string}> = ({color = '#ffffff', ...pl}) => (
  <group {...placeProps(pl)}>
    <mesh rotation={[0, 0, Math.PI]} position={[0, 0.25, 0]}>
      <sphereGeometry args={[0.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      {mat(color)}
    </mesh>
    <mesh position={[0, 0, 0]}>
      <cylinderGeometry args={[0.06, 0.06, 0.25, 12]} />
      {mat(color)}
    </mesh>
  </group>
);

const PICS = new Map<string, THREE.Texture>();
/**
 * Load pictures before any frame is drawn: call once at the top of a scene file, outside the components, with every
 * picture its Cutouts use. A texture that arrives after a frame was drawn would be missing from that frame.
 */
export const preload = (...srcs: string[]) => {
  for (const src of srcs) {
    if (PICS.has(src)) continue;
    const handle = delayRender(`picture ${src}`);
    const t = new THREE.TextureLoader().load(staticFile(src), () => continueRender(handle), undefined, () => continueRender(handle));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    PICS.set(src, t);
  }
};
/**
 * A picture drawn by Codex (a person: people are never built from 3D shapes) on a flat plane in the world, so it gets
 * the same dot print and moves with the camera. `src` under public/ (art/<series>/<id>/<name>.png), `h` its height in
 * world units, `aspect` = width / height (from sprites.json). The picture keeps its own shading (no lights on it).
 * The scene file must `preload(src)` at its top.
 */
export const Cutout: React.FC<Place & {src: string; h: number; aspect: number; opacity?: number}> = ({src, h, aspect, opacity = 1, ...pl}) => {
  const tex = PICS.get(src);
  if (!tex) throw new Error(`picture ${src} was not preloaded: call preload('${src}') at the top of the scene file`);
  return (
    <mesh {...placeProps(pl)}>
      <planeGeometry args={[h * aspect, h]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.4} opacity={opacity} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ---- the section anchor ----
/** Small flat icons for an Anchor: what the section is about, drawn in two colours. */
const ICONS: Record<string, (a: string, b: string) => React.ReactNode> = {
  pill: (a, b) => (
    <g transform="rotate(-35 50 50)">
      <rect x="14" y="36" width="72" height="28" rx="14" fill={b} />
      <path d="M50 36 H28 a14 14 0 0 0 0 28 H50 Z" fill={a} />
    </g>
  ),
  drop: (a) => <path d="M50 12 C 50 12 22 46 22 62 a28 28 0 0 0 56 0 C 78 46 50 12 50 12 Z" fill={a} />,
  heart: (a) => <path d="M50 84 C 18 62 12 46 12 34 a19 19 0 0 1 38 -6 a19 19 0 0 1 38 6 c0 12 -6 28 -38 50 Z" fill={a} />,
  kidney: (a) => <path d="M60 14 C 30 10 14 34 16 56 C 18 80 40 92 60 84 C 72 78 70 66 62 60 C 54 54 54 44 62 38 C 72 30 76 16 60 14 Z" fill={a} />,
  vessel: (a, b) => (
    <g>
      <rect x="10" y="30" width="80" height="40" rx="6" fill={b} />
      <rect x="10" y="40" width="80" height="20" fill={a} />
    </g>
  ),
  dna: (a, b) => (
    <g strokeWidth="7" strokeLinecap="round" fill="none">
      <path d="M32 14 C 72 34, 28 66, 68 86" stroke={a} />
      <path d="M68 14 C 28 34, 72 66, 32 86" stroke={b} />
      <path d="M40 26 H60 M36 50 H64 M40 74 H60" stroke={b} strokeWidth="5" />
    </g>
  ),
  calendar: (a, b) => (
    <g>
      <rect x="16" y="22" width="68" height="62" rx="8" fill={b} />
      <rect x="16" y="22" width="68" height="18" rx="8" fill={a} />
      <circle cx="38" cy="58" r="6" fill={a} />
      <circle cx="62" cy="58" r="6" fill={a} />
    </g>
  ),
};
/**
 * The key thing of a section, kept on screen for the whole scene (the user, 2026-10-31: "something that keeps the key
 * thing of what we are talking about"): an icon and the key word at the top, with a small mono line under it (its number,
 * the drug names). Use it in place of the Header's left and right labels; the Header keeps the source.
 */
export const Anchor: React.FC<{t: number; word: string; icon?: string; sub?: string; source?: string; dark?: boolean; accent?: string}> = ({t, word, icon, sub, source, dark = true, accent = CORAL}) => {
  const p = pop(t, -0.2, 0.45); // already in on the first frame of a scene
  if (p <= 0) return null;
  const size = Math.min(70, 760 / (word.length * 0.72));
  return (
    <>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 470, background: `linear-gradient(to bottom, ${dark ? 'rgba(4,7,14,.9)' : 'rgba(245,242,237,.92)'} 0%, ${dark ? 'rgba(4,7,14,.75)' : 'rgba(245,242,237,.8)'} 75%, transparent 100%)`}} />
    <div style={{position: 'absolute', left: 78, top: 228, display: 'flex', alignItems: 'center', gap: 24, transform: `translateX(${(1 - p) * -60}px)`, opacity: Math.min(1, p)}}>
      {icon && ICONS[icon] && (
        <svg width={112} height={112} viewBox="0 0 100 100" style={{flex: 'none', filter: dark ? 'drop-shadow(0 0 14px rgba(127,178,236,.45))' : undefined}}>
          <circle cx="50" cy="50" r="48" fill={dark ? 'rgba(255,255,255,.08)' : 'rgba(29,60,110,.07)'} stroke={dark ? 'rgba(255,255,255,.3)' : 'rgba(29,60,110,.25)'} strokeWidth="2" />
          {ICONS[icon](accent, dark ? '#e9eef6' : '#ffffff')}
        </svg>
      )}
      <div>
        <div data-box="" style={{font: `900 ${size}px ${BOLD}`, lineHeight: 1, letterSpacing: -1, color: dark ? '#ffffff' : INK, whiteSpace: 'nowrap'}}>{word}</div>
        {sub && <div data-box="" style={{marginTop: 12, font: `700 28px ${MONO}`, letterSpacing: 2, color: dark ? DIM : INK, whiteSpace: 'nowrap'}}>{sub}</div>}
        {source && <div data-box="" style={{marginTop: 8, font: `700 28px ${MONO}`, letterSpacing: 2, color: dark ? '#5d8f74' : GREEN, whiteSpace: 'nowrap'}}>{`SOURCE: ${source}`}</div>}
      </div>
    </div>
    </>
  );
};
