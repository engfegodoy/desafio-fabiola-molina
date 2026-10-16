import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface SharkPose {
  pos: THREE.Vector3;
  yaw: number;
  pitch: number;
  /** 0..1 — boca aberta. */
  mouth: number;
  /** Intensidade da natação (rabo). */
  swim: number;
  visible: boolean;
  /** Olhar bravo/engraçado. */
  grumpy: number;
}

interface Props {
  drive: (pose: SharkPose, t: number, dt: number) => void;
  castShadow?: boolean;
}

function finShape(w: number, h: number, sweep: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.quadraticCurveTo(-w * 0.1 + sweep * 0.3, h * 0.6, sweep, h);
  s.quadraticCurveTo(w * 0.15 + sweep * 0.2, h * 0.45, w / 2, 0);
  s.lineTo(-w / 2, 0);
  return s;
}

/** Tubarão cartunesco: olhos enormes, sorriso exagerado e nada assustador. */
export function Shark3D({ drive, castShadow = true }: Props) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const jaw = useRef<THREE.Group>(null);
  const pupils = useRef<THREE.Group>(null);
  const brows = useRef<THREE.Group>(null);
  const finL = useRef<THREE.Group>(null);
  const finR = useRef<THREE.Group>(null);

  const pose = useMemo<SharkPose>(
    () => ({ pos: new THREE.Vector3(), yaw: 0, pitch: 0, mouth: 0.4, swim: 1, visible: true, grumpy: 0 }),
    [],
  );

  const m = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: '#6f93bd', roughness: 0.45 }),
      belly: new THREE.MeshStandardMaterial({ color: '#f4f8ff', roughness: 0.5 }),
      mouth: new THREE.MeshStandardMaterial({ color: '#7a1830', roughness: 0.6 }),
      tongue: new THREE.MeshStandardMaterial({ color: '#ff7f9a', roughness: 0.6 }),
      tooth: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 }),
      eye: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.15 }),
      pupil: new THREE.MeshStandardMaterial({ color: '#11131c', roughness: 0.2 }),
      dark: new THREE.MeshStandardMaterial({ color: '#3d5d85', roughness: 0.5 }),
      cheek: new THREE.MeshStandardMaterial({ color: '#ff9db0', roughness: 0.8, transparent: true, opacity: 0.55 }),
    }),
    [],
  );

  const g = useMemo(() => {
    const ext = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 10 };
    const dorsal = new THREE.ExtrudeGeometry(finShape(0.9, 0.85, 0.45), ext);
    dorsal.translate(0, 0, -0.04);
    const tailUp = new THREE.ExtrudeGeometry(finShape(0.45, 0.85, 0.5), ext);
    const pect = new THREE.ExtrudeGeometry(finShape(0.5, 0.6, 0.3), ext);
    return {
      body: new THREE.SphereGeometry(1, 32, 24),
      eye: new THREE.SphereGeometry(0.27, 20, 16),
      pupil: new THREE.SphereGeometry(0.13, 14, 10),
      glint: new THREE.SphereGeometry(0.045, 8, 6),
      tooth: new THREE.ConeGeometry(0.06, 0.16, 6),
      brow: new THREE.CapsuleGeometry(0.035, 0.22, 3, 8),
      gill: new THREE.CapsuleGeometry(0.018, 0.22, 2, 6),
      dorsal,
      tailUp,
      pect,
    };
  }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    drive(pose, t, dt);
    if (!root.current) return;
    root.current.visible = pose.visible;
    root.current.position.copy(pose.pos);
    root.current.rotation.y = pose.yaw;
    root.current.rotation.x = pose.pitch;
    const sw = pose.swim;
    if (body.current) {
      body.current.rotation.y = Math.sin(t * 5) * 0.08 * sw;
      body.current.position.y = Math.sin(t * 2.2) * 0.05;
    }
    if (tail.current) tail.current.rotation.y = Math.sin(t * 5 - 0.8) * 0.55 * Math.max(0.3, sw);
    if (jaw.current) {
      const target = pose.mouth + Math.sin(t * 9) * 0.08 * pose.mouth;
      jaw.current.rotation.x += (target * 0.55 - jaw.current.rotation.x) * Math.min(1, dt * 10);
    }
    if (pupils.current) {
      pupils.current.position.x = Math.sin(t * 1.3) * 0.03;
      pupils.current.position.y = Math.cos(t * 0.9) * 0.02;
    }
    if (brows.current) brows.current.rotation.x = pose.grumpy * 0.2;
    if (finL.current) finL.current.rotation.z = 0.5 + Math.sin(t * 4) * 0.15;
    if (finR.current) finR.current.rotation.z = -0.5 - Math.sin(t * 4) * 0.15;
  });

  const shadow = castShadow;
  // Frente do tubarão = -Z
  const upperTeeth = Array.from({ length: 11 }, (_, i) => {
    const a = -1 + (i / 10) * 2;
    return [a * 0.5, -0.02, -1.45 + Math.abs(a) * 0.38] as const;
  });
  const lowerTeeth = Array.from({ length: 9 }, (_, i) => {
    const a = -1 + (i / 8) * 2;
    return [a * 0.42, 0.04, -1.25 + Math.abs(a) * 0.3] as const;
  });

  return (
    <group ref={root}>
      <group ref={body} scale={1.2}>
        {/* corpo */}
        <mesh geometry={g.body} material={m.skin} scale={[0.85, 0.72, 1.75]} castShadow={shadow} />
        <mesh geometry={g.body} material={m.belly} position={[0, -0.22, -0.15]} scale={[0.72, 0.5, 1.55]} />
        {/* cabeça arredondada */}
        <mesh geometry={g.body} material={m.skin} position={[0, 0.05, -1.05]} scale={[0.82, 0.68, 0.75]} castShadow={shadow} />
        {/* boca: parte de cima */}
        <group position={[0, -0.12, 0]}>
          <mesh geometry={g.body} material={m.mouth} position={[0, -0.02, -1.25]} scale={[0.6, 0.12, 0.42]} />
          {upperTeeth.map((p, i) => (
            <mesh key={i} geometry={g.tooth} material={m.tooth} position={p} rotation={[Math.PI, 0, 0]} />
          ))}
        </group>
        {/* mandíbula */}
        <group ref={jaw} position={[0, -0.18, -0.55]}>
          <group position={[0, 0, 0.55]}>
            <mesh geometry={g.body} material={m.belly} position={[0, -0.12, -1.0]} scale={[0.62, 0.22, 0.55]} />
            <mesh geometry={g.body} material={m.mouth} position={[0, 0.0, -1.12]} scale={[0.52, 0.1, 0.38]} />
            <mesh geometry={g.body} material={m.tongue} position={[0, 0.03, -1.05]} scale={[0.28, 0.06, 0.22]} />
            {lowerTeeth.map((p, i) => (
              <mesh key={i} geometry={g.tooth} material={m.tooth} position={p} />
            ))}
          </group>
        </group>
        {/* olhos enormes */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.38, 0.42, -1.3]}>
            <mesh geometry={g.eye} material={m.eye} scale={[1, 1.15, 0.9]} />
          </group>
        ))}
        <group ref={pupils}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.36, 0.42, -1.53]}>
              <mesh geometry={g.pupil} material={m.pupil} scale={[1, 1.2, 0.6]} />
              <mesh geometry={g.glint} material={m.eye} position={[0.04, 0.06, -0.06]} />
            </group>
          ))}
        </group>
        <group ref={brows} position={[0, 0.78, -1.35]}>
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={g.brow} material={m.dark} position={[s * 0.36, 0, 0]} rotation={[0, 0, Math.PI / 2 - s * 0.3]} />
          ))}
        </group>
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={g.body} material={m.cheek} position={[s * 0.62, 0.05, -1.25]} scale={[0.08, 0.08, 0.06]} />
        ))}
        {/* guelras */}
        {[-1, 1].map((s) =>
          [0, 1, 2].map((i) => (
            <mesh key={`${s}${i}`} geometry={g.gill} material={m.dark} position={[s * 0.78, 0.05, -0.55 + i * 0.16]} rotation={[0.2, 0, 0]} />
          )),
        )}
        {/* barbatana dorsal */}
        <mesh geometry={g.dorsal} material={m.skin} position={[0, 0.6, 0.1]} rotation={[0, Math.PI / 2, 0]} castShadow={shadow} />
        {/* nadadeiras peitorais */}
        <group ref={finL} position={[0.62, -0.3, -0.5]}>
          <mesh geometry={g.pect} material={m.skin} rotation={[0, Math.PI / 2, -Math.PI / 2]} />
        </group>
        <group ref={finR} position={[-0.62, -0.3, -0.5]}>
          <mesh geometry={g.pect} material={m.skin} rotation={[0, -Math.PI / 2, Math.PI / 2]} />
        </group>
        {/* rabo */}
        <group ref={tail} position={[0, 0, 1.55]}>
          <mesh geometry={g.body} material={m.skin} position={[0, 0, 0.3]} scale={[0.32, 0.32, 0.6]} />
          <mesh geometry={g.tailUp} material={m.skin} position={[0, 0.05, 0.75]} rotation={[0, Math.PI / 2, -0.5]} />
          <mesh geometry={g.tailUp} material={m.skin} position={[0, -0.05, 0.75]} rotation={[0, Math.PI / 2, Math.PI + 0.5]} scale={[1, 0.7, 1]} />
        </group>
      </group>
    </group>
  );
}
