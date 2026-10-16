import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Arch, Boat, Buoy, Cloud, Island, PalmTree, SkyDome, Umbrella } from '../Props';
import { WaterSurface, type WaterLook } from '../Water';
import { bannerTexture, glowTexture, streakTexture } from '../textures';
import type { Wave } from '../../game/waves';
import { waterHeight } from '../../game/waves';

export type SeaVariant = 'day' | 'night' | 'sunset';

export const SEA_LOOKS: Record<SeaVariant, { water: WaterLook; sky: { top: string; horizon: string; bottom: string; sunColor: string; sunSize: number } }> = {
  day: {
    water: { deep: '#0868b0', shallow: '#2fd3d0', foam: '#ffffff', sky: '#bdeeff', sunDir: [0.35, 0.6, -0.75], sunColor: '#fff6d0', opacity: 1, glint: 2.6, sparkle: 0.45 },
    sky: { top: '#1f7ff0', horizon: '#c9f3ff', bottom: '#2a9fd0', sunColor: '#fff3c4', sunSize: 0.9 },
  },
  night: {
    water: { deep: '#040c2c', shallow: '#143e80', foam: '#7fb8ff', sky: '#2a2e78', sunDir: [0.15, 0.15, -1], sunColor: '#fff2cf', opacity: 1, glint: 2.6, sparkle: 0.18, foamAmount: 0.4 },
    sky: { top: '#060a26', horizon: '#3a2f7a', bottom: '#0b1236', sunColor: '#fff6dc', sunSize: 0 },
  },
  sunset: {
    water: { deep: '#0d5795', shallow: '#3cbccc', foam: '#fff4e0', sky: '#ffbe94', sunDir: [-0.25, 0.14, -1], sunColor: '#ffd27a', opacity: 1, glint: 3, sparkle: 0.4 },
    sky: { top: '#3d5bd6', horizon: '#ffb46b', bottom: '#2a7fb0', sunColor: '#ffcf6a', sunSize: 1.4 },
  },
};

const NEON = ['#38bdf8', '#a855f7', '#22e58b', '#ff4fd8'];

interface Props {
  variant: SeaVariant;
  distance: number;
  quality: 'high' | 'low';
  ambient: number;
  getWaves: () => Wave[];
  followZ: () => number;
  /** Fase do tubarão: praia de chegada e barco na largada. */
  beach?: boolean;
  arch?: boolean;
}

function FloatingBuoys({ distance, variant, ambient, getWaves }: { distance: number; variant: SeaVariant; ambient: number; getWaves: () => Wave[] }) {
  const items = useMemo(() => {
    const out: { x: number; z: number; color: string }[] = [];
    const dayColors = ['#ff5d4d', '#ffd23f', '#ff8a3d'];
    let k = 0;
    for (let z = 0; z >= -distance; z -= 5) {
      for (const x of [-4.4, 4.4]) {
        out.push({ x, z, color: variant === 'night' ? NEON[k % NEON.length] : dayColors[k % dayColors.length] });
        k++;
      }
    }
    return out;
  }, [distance, variant]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const ws = getWaves();
    items.forEach((it, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.y = waterHeight(it.x, it.z, t, ambient, ws) - 0.08;
      g.rotation.z = Math.sin(t * 1.3 + i) * 0.12;
      g.rotation.x = Math.cos(t * 1.1 + i) * 0.1;
    });
  });
  const neon = variant === 'night';
  return (
    <>
      {items.map((it, i) => (
        <group key={i} ref={(r) => (refs.current[i] = r)} position={[it.x, 0, it.z]}>
          <Buoy color={it.color} neon={neon} cone={neon || i % 4 === 0} />
        </group>
      ))}
    </>
  );
}

/** Cordinha de flutuadores entre as boias. */
function FloatLine({ distance, color }: { distance: number; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const per = Math.floor(distance / 0.9);
  const count = per * 2;
  const geo = useMemo(() => new THREE.SphereGeometry(0.09, 6, 5), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.2 }), [color]);
  useFrame((s) => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const t = s.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const side = i < per ? -4.4 : 4.4;
      const z = -(i % per) * 0.9;
      d.position.set(side, Math.sin(t * 1.4 + z * 0.4) * 0.06, z);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />;
}

function Moon() {
  const glow = useMemo(() => glowTexture(), []);
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.position.set(s.camera.position.x + 38, 40, s.camera.position.z - 260);
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[22, 32, 24]} />
        <meshBasicMaterial color="#fff4d6" toneMapped={false} fog={false} />
      </mesh>
      {[[-6, 5, 3], [7, -4, 4], [2, 9, 2.5]].map(([x, y, r], i) => (
        <mesh key={i} position={[x, y, 20]}>
          <circleGeometry args={[r, 20]} />
          <meshBasicMaterial color="#efe0b8" toneMapped={false} fog={false} />
        </mesh>
      ))}
      <sprite scale={[140, 140, 1]}>
        <spriteMaterial map={glow} color="#bfc8ff" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
    </group>
  );
}

function ReflectionStreak({ color, opacity }: { color: string; opacity: number }) {
  const tex = useMemo(() => streakTexture(), []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) {
      ref.current.position.set(s.camera.position.x + 2, 0.06, s.camera.position.z - 70);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = opacity * (0.85 + Math.sin(s.clock.elapsedTime * 3) * 0.15);
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[9, 130]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

function CityLights({ z, width }: { z: number; width: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 260;
  const geo = useMemo(() => new THREE.BoxGeometry(0.8, 0.8, 0.8), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, fog: false }), []);
  const done = useRef(false);
  useFrame(() => {
    const m = ref.current;
    if (!m || done.current) return;
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    const cols = ['#ffe58a', '#ffd0a0', '#9be7ff', '#ff9bd8', '#ffffff'];
    for (let i = 0; i < n; i++) {
      d.position.set((Math.random() - 0.5) * width, 1 + Math.random() * Math.random() * 14, z + (Math.random() - 0.5) * 20);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      c.set(cols[i % cols.length]);
      m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor!.needsUpdate = true;
    done.current = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, n]} />;
}

function FollowCamera({ children, factor = 1 }: { children: React.ReactNode; factor?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.position.z = s.camera.position.z * factor;
  });
  return <group ref={ref}>{children}</group>;
}

function Beach({ z }: { z: number }) {
  const sign = useMemo(() => bannerTexture('PRAIA SEGURA', '#ffd23f', '#0b2a6b', { w: 512, h: 160, stroke: 'rgba(255,255,255,0.6)' }), []);
  const umbrellas = ['#ff5d4d', '#22d3ee', '#ffd23f', '#1f6fe5', '#ff8fc7'];
  return (
    <group position={[0, 0, z]}>
      {/* areia em rampa */}
      <mesh position={[0, -0.9, -1.25]} rotation={[0.08, 0, 0]} receiveShadow>
        <boxGeometry args={[220, 2, 32]} />
        <meshStandardMaterial color="#f6d998" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.03, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[220, 3]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.55} roughness={0.5} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <PalmTree key={i} position={[(i - 7) * 9 + 4, 0.4, -10 - (i % 3) * 4]} scale={1.3 + (i % 3) * 0.2} lean={0.12 + (i % 2) * 0.1} />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <Umbrella key={i} position={[(i - 4) * 6 + 2, 0.2, -4 - (i % 2) * 2]} color={umbrellas[i % umbrellas.length]} />
      ))}
      {/* posto de salva-vidas */}
      <group position={[13, 0.2, -6]}>
        {[[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].map(([x, zz], i) => (
          <mesh key={i} position={[x, 1.2, zz]}>
            <cylinderGeometry args={[0.08, 0.08, 2.4, 6]} />
            <meshStandardMaterial color="#d9a066" />
          </mesh>
        ))}
        <mesh position={[0, 2.8, 0]}>
          <boxGeometry args={[2.2, 1.4, 2.2]} />
          <meshStandardMaterial color="#ff5d4d" />
        </mesh>
        <mesh position={[0, 3.8, 0]}>
          <coneGeometry args={[1.9, 0.8, 4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 2.8, 1.11]}>
          <planeGeometry args={[1.9, 0.6]} />
          <meshBasicMaterial map={sign} />
        </mesh>
      </group>
      {/* morros ao fundo (estilo Rio) */}
      <mesh position={[-40, 0, -60]} scale={[1, 2.2, 1]}>
        <sphereGeometry args={[14, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4a8a5e" roughness={0.9} />
      </mesh>
      <mesh position={[-22, 0, -70]} scale={[1, 1.4, 1]}>
        <sphereGeometry args={[12, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5c9b6c" roughness={0.9} />
      </mesh>
      <mesh position={[45, 0, -75]} scale={[1.6, 1.1, 1]}>
        <sphereGeometry args={[16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3e7c55" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function SeaScene({ variant, distance, quality, ambient, getWaves, followZ, beach = false, arch = true }: Props) {
  const look = SEA_LOOKS[variant];
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    if (variant === 'night') scene.fog = new THREE.FogExp2('#1f2259', 0.0105);
    else if (variant === 'sunset') scene.fog = new THREE.Fog('#ffc89a', 90, 420);
    else scene.fog = new THREE.Fog('#c9f3ff', 110, 460);
    return () => {
      scene.fog = null;
    };
  }, [scene, variant]);

  const farLook = useMemo<WaterLook>(() => ({ ...look.water, sparkle: 0 }), [look]);

  return (
    <group>
      <SkyDome top={look.sky.top} horizon={look.sky.horizon} bottom={look.sky.bottom} sunDir={look.water.sunDir} sunColor={look.sky.sunColor} sunSize={look.sky.sunSize} />
      {variant === 'night' && (
        <FollowCamera>
          <Stars radius={180} depth={60} count={quality === 'high' ? 4000 : 1500} factor={5} saturation={0.4} fade speed={0.6} />
        </FollowCamera>
      )}
      {variant === 'night' && <Moon />}
      {variant === 'night' && <ReflectionStreak color="#fff2c8" opacity={0.55} />}
      {variant === 'sunset' && <ReflectionStreak color="#ffc46b" opacity={0.45} />}

      {/* água próxima, detalhada, acompanhando o jogador */}
      <WaterSurface
        look={look.water}
        width={110}
        length={150}
        segX={quality === 'high' ? 90 : 48}
        segZ={quality === 'high' ? 220 : 120}
        ambient={ambient}
        getWaves={getWaves}
        followZ={() => followZ() - 30}
      />
      {/* oceano distante até o horizonte */}
      <WaterSurface look={farLook} width={1400} length={1400} segX={2} segZ={2} ambient={0} followZ={() => followZ()} y={-0.12} />

      <FloatingBuoys distance={distance} variant={variant} ambient={ambient} getWaves={getWaves} />
      <FloatLine distance={distance} color={variant === 'night' ? '#a855f7' : '#ff8a3d'} />
      {arch && <Arch z={-distance - 0.6} width={10} text="CHEGADA" color={variant === 'night' ? '#a855f7' : '#ff5d4d'} neon={variant === 'night'} />}
      {/* plataforma flutuante de largada */}
      {!beach && (
        <group position={[0, -0.05, 3.6]}>
          <mesh>
            <boxGeometry args={[9, 0.35, 2.2]} />
            <meshStandardMaterial color={variant === 'night' ? '#30366e' : '#ffffff'} roughness={0.5} />
          </mesh>
        </group>
      )}

      {variant === 'day' && (
        <>
          <Island position={[-38, 0, -95]} scale={2.2} />
          <Island position={[55, 0, -160]} scale={3} palms={4} />
          <Island position={[-90, 0, -230]} scale={4} rock="#6b7f8c" />
          <Island position={[30, 0, -40]} scale={1.2} palms={2} />
          <mesh position={[-70, 0, -120]} scale={[1, 3.2, 1]}>
            <sphereGeometry args={[9, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#8c9a8f" roughness={0.9} />
          </mesh>
          <FollowCamera factor={0.6}>
            <Cloud position={[-60, 45, -200]} scale={5} />
            <Cloud position={[40, 55, -260]} scale={6} />
            <Cloud position={[110, 40, -180]} scale={4} />
            <Cloud position={[-130, 60, -280]} scale={7} />
            <Cloud position={[0, 70, -330]} scale={8} />
          </FollowCamera>
        </>
      )}
      {variant === 'night' && (
        <>
          <mesh position={[-60, 0, -distance - 160]} scale={[1, 2.6, 1]}>
            <sphereGeometry args={[18, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#141a45" roughness={1} />
          </mesh>
          <mesh position={[30, 0, -distance - 200]} scale={[2, 1.4, 1]}>
            <sphereGeometry args={[20, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#10163a" roughness={1} />
          </mesh>
          <CityLights z={-distance - 130} width={260} />
        </>
      )}
      {variant === 'sunset' && (
        <>
          <FollowCamera factor={0.6}>
            <Cloud position={[-70, 35, -230]} scale={5} color="#ffd1b0" />
            <Cloud position={[60, 45, -260]} scale={6} color="#ffc0a8" />
            <Cloud position={[140, 30, -200]} scale={4} color="#ffd9b8" />
          </FollowCamera>
        </>
      )}
      {beach && <Beach z={-distance - 1.5} />}
      {beach && <Boat position={[2.6, 0.35, 1.2]} />}
    </group>
  );
}

/** Altura da areia da praia de chegada (fase do tubarão). */
export function sandHeight(worldZ: number, distance: number) {
  const zg = worldZ - (-distance - 1.5);
  return 0.1 - 0.08 * (zg + 1.25);
}
