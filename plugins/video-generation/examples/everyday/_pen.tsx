// A ballpoint pen for the cutaways: barrel, refill tube, ink, brass tip, and the ball in its socket. Units are
// centimetres along the pen, but the tip is drawn far too big (the ball here is 2 mm across, a real one well under
// 1 mm), so the socket can be seen: every close-up says "not to scale". The pen's axis is local +y, the tip at y = 0.
import React from 'react';
import * as THREE from 'three';
import {ACCENT, Lathe, Mat, P2, V3} from '../../kits/explainer';

export const RB = 0.1; // the ball
const TIP: P2[] = [[0.082, 0.04], [0.11, 0.04], [0.2, 0.9], [0.18, 1.25], [0.14, 1.25], [0.07, 0.9], [0.07, 0.2], [0.102, 0.17], [0.102, 0.06]];
const REFILL: P2[] = [[0.14, 1.25], [0.18, 1.25], [0.18, 11], [0.14, 11]];
const BARREL: P2[] = [[0.2, 0.6], [0.3, 0.6], [0.62, 2.4], [0.62, 13.4], [0.5, 14], [0.4, 14], [0.5, 13.4], [0.5, 2.4], [0.2, 0.85]];
const INK_TIP: P2[] = [[0, 0.2], [0.068, 0.2], [0.068, 0.9], [0.138, 1.25], [0, 1.25]];
const INK_LEN = 7.2; // the ink column in the refill
const SLACK = 11 - 1.25 - INK_LEN; // how far it can slide
const INK = '#1f3a9e';

const DISC = new THREE.CircleGeometry(1, 24);
const DROP = new THREE.SphereGeometry(1, 12, 8);
const Z = new THREE.Vector3(0, 0, 1);
/** The ball, with a few flat grey marks on it (not ink), so its turning shows. `spin` turns it about the pen's z axis. */
export const Ball: React.FC<{spin: number; glow?: number}> = ({spin, glow = 0}) => (
  <group position={[0, RB, 0]} rotation={[0, 0, -spin]}>
    <mesh castShadow>
      <sphereGeometry args={[RB, 64, 32]} />
      <Mat color="#d6dade" metal={0.95} rough={0.12} glow={ACCENT} heat={glow} />
    </mesh>
    {Array.from({length: 10}, (_, k) => {
      const a = k * 2.399;
      const b = Math.acos(1 - (2 * (k + 0.5)) / 10);
      const n = new THREE.Vector3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a));
      return (
        <mesh key={k} geometry={DISC} position={n.clone().multiplyScalar(RB * 1.003)} quaternion={new THREE.Quaternion().setFromUnitVectors(Z, n)} scale={RB * 0.16}>
          <meshStandardMaterial color="#7d848c" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
      );
    })}
  </group>
);

export type PenState = {
  open: number; // the cut: 0 closed, 1 a quarter removed (towards +z)
  barrel?: number; // 0..1, the outer barrel fades away
  spin?: number; // angle of the ball
  shift?: number; // 0 the ink rests on the tip, 1 it has slid to the far end (the pen held upside down)
  dry?: number; // 0..1, the ink film on the ball and in the tip is gone
  flow?: number; // 0..1, bright drops show the ink moving down the tip to the ball
  t?: number; // seconds, for the drops
  hi?: {refill?: number; ink?: number; ball?: number; socket?: number};
};

/** The pen, tip at the origin, pointing down its own -y. */
export const Pen: React.FC<PenState> = ({open, barrel = 0, spin = 0, shift = 0, dry = 0, flow = 0, t = 0, hi = {}}) => {
  const y0 = 1.25 + SLACK * shift;
  const tube: P2[] = [[0, y0], [0.138, y0], [0.138, y0 + INK_LEN], [0, y0 + INK_LEN]];
  const wet = 1 - dry;
  return (
    <group>
      <Lathe name="pen-barrel" pts={BARREL} open={open} color="#3f6fc4" cap="#e8ebee" rough={0.3} metal={0.05} ghost={barrel} />
      <Lathe name="pen-refill" pts={REFILL} open={open} color="#e9edf2" cap="#ffffff" rough={0.25} glow={ACCENT} heat={(hi.refill ?? 0) * 0.6} />
      <Lathe name={`pen-ink-${y0.toFixed(2)}`} pts={tube} open={open} ink={false} soft={0} color={INK} rough={0.35} glow={ACCENT} heat={(hi.ink ?? 0) * 0.5} />
      {wet > 0.02 && <Lathe name="pen-ink-tip" pts={INK_TIP} open={open} ink={false} soft={0} color={INK} rough={0.35} ghost={1 - wet} glow={ACCENT} heat={(hi.ink ?? 0) * 0.5} />}
      <Lathe name="pen-tip" pts={TIP} open={open} color="#c9934a" cap="#f1e2c6" metal={0.85} rough={0.25} soft={0.01} glow={ACCENT} heat={(hi.socket ?? 0) * 0.8} />
      {/* the film of ink on the top half of the ball, held by the socket */}
      {wet > 0.02 && (
        <mesh position={[0, RB, 0]}>
          <sphereGeometry args={[RB * 1.015, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={INK} roughness={0.3} transparent opacity={0.85 * wet} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Ball spin={spin} glow={(hi.ball ?? 0) * 0.8} />
      {flow > 0.01 &&
        Array.from({length: 5}, (_, k) => {
          const u = (t * 0.45 + k / 5) % 1;
          return (
            <mesh key={k} geometry={DROP} position={[0, 1.2 - 1.0 * u, 0.03]} scale={[0.02, 0.05, 0.02]}>
              <meshStandardMaterial color="#5b86e8" emissive="#3f6fe0" emissiveIntensity={0.9} transparent opacity={0.8 * flow} />
            </mesh>
          );
        })}
    </group>
  );
};

/** A pen whose ball rests on a point: `at` is where the ball touches, `lean` tilts the top towards +x, `turn` turns it over. */
export const PenAt: React.FC<PenState & {at: V3; lean?: number; turn?: number}> = ({at, lean = 0, turn = 0, ...p}) => (
  <group position={[at[0], at[1] + RB, at[2]]} rotation={[0, 0, -lean + turn]}>
    <group position={[0, -RB, 0]}>
      <Pen {...p} />
    </group>
  </group>
);

/** Paper with faint ruled lines, its top at y = 0, and the line of ink a ball has laid from x0 to x1. */
export const Paper: React.FC<{x0: number; x1: number}> = ({x0, x1}) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 40]} />
      <meshStandardMaterial color="#f6f3ea" roughness={0.95} />
    </mesh>
    {[-2.4, -1.2, 1.2, 2.4].map((z) => (
      <mesh key={z} position={[0, 0.001, z]}>
        <boxGeometry args={[60, 0.001, 0.03]} />
        <meshStandardMaterial color="#9fc2e8" roughness={0.9} />
      </mesh>
    ))}
    {x1 > x0 + 0.01 && (
      <mesh position={[(x0 + x1) / 2, 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[x1 - x0, RB * 1.1]} />
        <meshBasicMaterial color="#14246e" />
      </mesh>
    )}
  </group>
);
