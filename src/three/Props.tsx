import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { bannerTexture, checkerTexture, glowTexture } from './textures';

/* ---------------- Palmeira ---------------- */
export function PalmTree({ position, scale = 1, lean = 0.15 }: { position: [number, number, number]; scale?: number; lean?: number }) {
  const leaves = useRef<THREE.Group>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame((s) => {
    if (leaves.current) leaves.current.rotation.z = Math.sin(s.clock.elapsedTime * 1.2 + seed) * 0.05;
  });
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9b6b43', roughness: 0.9 }), []);
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2fb85a', roughness: 0.7, side: THREE.DoubleSide }), []);
  const leafGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.5, 0.35, 1.9, -0.25);
    s.quadraticCurveTo(0.6, -0.05, 0, 0);
    return new THREE.ShapeGeometry(s, 8);
  }, []);
  const segs = 6;
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: segs }, (_, i) => (
        <mesh key={i} material={trunkMat} position={[Math.sin((i / segs) * lean * 6) * lean * i * 0.4, i * 0.55 + 0.27, 0]} castShadow>
          <cylinderGeometry args={[0.16 - i * 0.012, 0.19 - i * 0.012, 0.58, 8]} />
        </mesh>
      ))}
      <group ref={leaves} position={[Math.sin(lean * 6) * lean * segs * 0.4, segs * 0.55 + 0.1, 0]}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} geometry={leafGeo} material={leafMat} rotation={[0, (i / 8) * Math.PI * 2, -0.2]} />
        ))}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos(i * 2) * 0.15, -0.1, Math.sin(i * 2) * 0.15]}>
            <sphereGeometry args={[0.13, 8, 6]} />
            <meshStandardMaterial color="#6b4a2a" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ---------------- Nuvem fofinha ---------------- */
export function Cloud({ position, scale = 1, color = '#ffffff', opacity = 1 }: { position: [number, number, number]; scale?: number; color?: string; opacity?: number }) {
  const g = useRef<THREE.Group>(null);
  const seed = useMemo(() => Math.random() * 100, []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 1, emissive: color, emissiveIntensity: 0.35, transparent: opacity < 1, opacity }),
    [color, opacity],
  );
  const puffs = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        p: [(i - 2.5) * 1.1 + Math.random() * 0.4, Math.random() * 0.6 + (i % 2) * 0.4, Math.random() * 0.8] as [number, number, number],
        r: 1 + Math.random() * 0.9 - Math.abs(i - 2.5) * 0.18,
      })),
    [],
  );
  useFrame((s) => {
    if (g.current) g.current.position.x = position[0] + Math.sin(s.clock.elapsedTime * 0.05 + seed) * 3;
  });
  return (
    <group ref={g} position={position} scale={scale}>
      {puffs.map((p, i) => (
        <mesh key={i} position={p.p} material={mat}>
          <sphereGeometry args={[p.r, 14, 10]} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- Ilha / morro estilo Pão de Açúcar ---------------- */
export function Island({ position, scale = 1, rock = '#5f7d6a', green = '#3fae5c', sand = '#f7dc9a', palms = 3, night = false }: {
  position: [number, number, number];
  scale?: number;
  rock?: string;
  green?: string;
  sand?: string;
  palms?: number;
  night?: boolean;
}) {
  const shape = useMemo(() => Math.random(), []);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, -0.6, 0]} scale={[1, 0.15, 1]}>
        <sphereGeometry args={[6, 24, 12]} />
        <meshStandardMaterial color={sand} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0]} scale={[1, 1.5 + shape * 0.6, 0.9]}>
        <sphereGeometry args={[3.8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={rock} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.4, 0]} scale={[1.05, 0.65, 0.95]}>
        <sphereGeometry args={[4.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={green} roughness={0.85} />
      </mesh>
      {!night &&
        Array.from({ length: palms }, (_, i) => {
          const a = (i / palms) * Math.PI * 2 + 0.5;
          return <PalmTree key={i} position={[Math.cos(a) * 4.6, -0.2, Math.sin(a) * 4.6]} scale={0.9} />;
        })}
    </group>
  );
}

/* ---------------- Boia ---------------- */
export function Buoy({ color, neon = false, cone = false }: { color: string; neon?: boolean; cone?: boolean }) {
  const glow = useMemo(() => glowTexture(), []);
  return (
    <group>
      {cone ? (
        <>
          <mesh position={[0, 0.35, 0]} castShadow={!neon}>
            <coneGeometry args={[0.32, 0.9, 16]} />
            <meshStandardMaterial color={color} emissive={neon ? color : '#000'} emissiveIntensity={neon ? 1.6 : 0} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.45, 0.25, 16]} />
            <meshStandardMaterial color={neon ? '#1b1f3a' : '#ffffff'} roughness={0.4} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.15, 0]} castShadow={!neon}>
            <sphereGeometry args={[0.42, 18, 14]} />
            <meshStandardMaterial color={color} roughness={0.3} emissive={neon ? color : '#000'} emissiveIntensity={neon ? 1.4 : 0} />
          </mesh>
          <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.42, 0.06, 8, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
        </>
      )}
      {neon && (
        <sprite position={[0, 0.45, 0]} scale={[2.6, 2.6, 1]}>
          <spriteMaterial map={glow} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.85} />
        </sprite>
      )}
    </group>
  );
}

/* ---------------- Arco inflável de largada/chegada ---------------- */
export function Arch({ z, width = 9, text = 'CHEGADA', color = '#ff5d4d', neon = false }: { z: number; width?: number; text?: string; color?: string; neon?: boolean }) {
  const banner = useMemo(() => bannerTexture(text, color, '#ffffff', { w: 1024, h: 200 }), [text, color]);
  const checker = useMemo(() => checkerTexture(), []);
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 2.2, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[width / 2, 0.45, 14, 40, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.35} emissive={neon ? color : '#000'} emissiveIntensity={neon ? 0.7 : 0} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (width / 2), 1.0, 0]}>
          <cylinderGeometry args={[0.45, 0.55, 2.4, 14]} />
          <meshStandardMaterial color={color} roughness={0.35} emissive={neon ? color : '#000'} emissiveIntensity={neon ? 0.6 : 0} />
        </mesh>
      ))}
      <mesh position={[0, 2.2 + width / 2 - 0.5, 0.48]}>
        <planeGeometry args={[width * 0.75, width * 0.15]} />
        <meshBasicMaterial map={banner} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.2 + width / 2 - 0.5, -0.48]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width * 0.75, width * 0.15]} />
        <meshBasicMaterial map={banner} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.2 + width / 2 - 1.25, 0.47]}>
        <planeGeometry args={[width * 0.6, 0.35]} />
        <meshBasicMaterial map={checker} />
      </mesh>
    </group>
  );
}

/* ---------------- Barco ---------------- */
export function Boat({ position }: { position: [number, number, number] }) {
  const hullGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.3, 0);
    s.lineTo(1.3, 0);
    s.quadraticCurveTo(1.6, 0.9, 1.5, 1.0);
    s.lineTo(-1.5, 1.0);
    s.quadraticCurveTo(-1.6, 0.9, -1.3, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 4.2, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.2, bevelSegments: 3 });
    g.translate(0, 0, -2.1);
    return g;
  }, []);
  const flag = useMemo(() => bannerTexture('FM', '#ff5d4d', '#ffffff', { w: 256, h: 160 }), []);
  return (
    <group position={position}>
      <mesh geometry={hullGeo} position={[0, -0.6, 0]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.25, 0]} scale={[1.02, 1, 1.02]}>
        <boxGeometry args={[3.25, 0.18, 4.6]} />
        <meshStandardMaterial color="#1f6fe5" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[2.9, 0.08, 4.1]} />
        <meshStandardMaterial color="#d9a066" roughness={0.8} />
      </mesh>
      {/* proa */}
      <mesh position={[0, 0.0, -2.6]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.6]}>
        <coneGeometry args={[1.6, 1.2, 4, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.35} />
      </mesh>
      {/* mastro e bandeira */}
      <mesh position={[-1.1, 1.6, 1.4]}>
        <cylinderGeometry args={[0.05, 0.05, 2.4, 8]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.6, 2.4, 1.4]}>
        <planeGeometry args={[1, 0.6]} />
        <meshBasicMaterial map={flag} side={THREE.DoubleSide} />
      </mesh>
      {/* boia salva-vidas */}
      <mesh position={[1.55, 0.2, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.35, 0.11, 10, 20]} />
        <meshStandardMaterial color="#ff5d4d" />
      </mesh>
      {/* casca de banana (o motivo da queda!) */}
      <group position={[0.7, 0.5, -0.4]} rotation={[0, 0.6, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3, 1.2]} position={[0, 0.02, 0]}>
            <capsuleGeometry args={[0.04, 0.18, 2, 6]} />
            <meshStandardMaterial color="#ffd23f" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ---------------- Guarda-sol ---------------- */
export function Umbrella({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 2.2, 6]} />
        <meshStandardMaterial color="#eee" />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <coneGeometry args={[1.3, 0.55, 10, 1, true]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ---------------- Céu em gradiente (cartunesco) ---------------- */
export function SkyDome({ top, horizon, bottom, sunDir, sunColor, sunSize = 0.05, radius = 420 }: {
  top: string;
  horizon: string;
  bottom: string;
  sunDir: [number, number, number];
  sunColor: string;
  sunSize?: number;
  radius?: number;
}) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uHorizon: { value: new THREE.Color(horizon) },
          uBottom: { value: new THREE.Color(bottom) },
          uSun: { value: new THREE.Vector3(...sunDir).normalize() },
          uSunColor: { value: new THREE.Color(sunColor) },
          uSunSize: { value: sunSize },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; }`,
        fragmentShader: `
          uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; uniform vec3 uSun; uniform vec3 uSunColor; uniform float uSunSize;
          varying vec3 vDir;
          void main(){
            float h = vDir.y;
            vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h,0.0,1.0), 0.55)) : mix(uHorizon, uBottom, clamp(-h*4.0,0.0,1.0));
            float d = dot(normalize(vDir), uSun);
            float sun = smoothstep(1.0 - uSunSize * 0.02, 1.0 - uSunSize * 0.015, d);
            float halo = pow(max(d, 0.0), 24.0) * 0.45 + pow(max(d,0.0), 4.0) * 0.12;
            c += uSunColor * (sun * 1.2 + halo);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [top, horizon, bottom, sunDir, sunColor, sunSize],
  );
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) ref.current.position.copy(s.camera.position);
  });
  return (
    <mesh ref={ref} material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[radius, 32, 16]} />
    </mesh>
  );
}

/* ---------------- Torcida instanciada ---------------- */
export interface CrowdSeat {
  x: number;
  y: number;
  z: number;
  facing: number;
}

const FAN_COLORS = ['#ff5d4d', '#ffd23f', '#22d3ee', '#1f6fe5', '#ffffff', '#ff8fc7', '#7bd88f', '#ffa53f', '#9b7bff'];
const SKIN = ['#f3c39b', '#e0a37a', '#c68457', '#8d5a3b', '#f7d6b8'];

export function Crowd({ seats, excited = 1 }: { seats: CrowdSeat[]; excited?: number }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const arms = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(
    () =>
      seats.map(() => ({
        phase: Math.random() * Math.PI * 2,
        speed: 3 + Math.random() * 4,
        jumpy: Math.random() < 0.45,
        waving: Math.random() < 0.5,
      })),
    [seats],
  );
  const bodyGeo = useMemo(() => new THREE.CapsuleGeometry(0.2, 0.32, 3, 8), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.17, 10, 8), []);
  const armGeo = useMemo(() => {
    const g = new THREE.CapsuleGeometry(0.05, 0.34, 2, 5);
    g.translate(0, 0.2, 0);
    return g;
  }, []);
  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
      head: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
    }),
    [],
  );

  const colorsSet = useRef(false);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const b = bodies.current;
    const h = heads.current;
    const a = arms.current;
    if (!b || !h || !a) return;
    if (!colorsSet.current) {
      const c = new THREE.Color();
      seats.forEach((_, i) => {
        c.set(FAN_COLORS[i % FAN_COLORS.length]);
        b.setColorAt(i, c);
        c.set(SKIN[(i * 7) % SKIN.length]);
        h.setColorAt(i, c);
        a.setColorAt(i * 2, c);
        a.setColorAt(i * 2 + 1, c);
      });
      b.instanceColor!.needsUpdate = true;
      h.instanceColor!.needsUpdate = true;
      a.instanceColor!.needsUpdate = true;
      colorsSet.current = true;
    }
    for (let i = 0; i < seats.length; i++) {
      const st = seats[i];
      const d = data[i];
      const jump = d.jumpy ? Math.max(0, Math.sin(t * d.speed + d.phase)) * 0.25 * excited : Math.sin(t * 2 + d.phase) * 0.03;
      dummy.position.set(st.x, st.y + 0.36 + jump, st.z);
      dummy.rotation.set(0, st.facing, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.42;
      dummy.updateMatrix();
      h.setMatrixAt(i, dummy.matrix);
      const wave = d.waving ? Math.sin(t * d.speed * 1.5 + d.phase) * 0.5 * excited : 0;
      for (let k = 0; k < 2; k++) {
        const side = k ? 1 : -1;
        dummy.position.set(st.x, st.y + 0.62 + jump, st.z);
        dummy.rotation.set(0, st.facing, side * (d.waving ? 2.6 + wave : 0.3));
        dummy.translateX(side * 0.2);
        dummy.updateMatrix();
        a.setMatrixAt(i * 2 + k, dummy.matrix);
      }
    }
    b.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    a.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={bodies} args={[bodyGeo, mats.body, seats.length]} frustumCulled={false} />
      <instancedMesh ref={heads} args={[headGeo, mats.head, seats.length]} frustumCulled={false} />
      <instancedMesh ref={arms} args={[armGeo, mats.head, seats.length * 2]} frustumCulled={false} />
    </>
  );
}
