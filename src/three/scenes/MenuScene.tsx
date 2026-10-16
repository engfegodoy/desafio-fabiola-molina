import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PoolScene, POOL } from './PoolScene';
import { SeaScene } from './SeaScene';
import { FABIOLA_LOOK, PLAYER_LOOK, Swimmer3D, type SwimmerPose } from '../Swimmer3D';
import { Splashes, splashBus } from '../Splashes';
import { isMobile, useGame } from '../../store/gameStore';

function Bubbles({ count = 70, area = [6, 30] as [number, number] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.08, 10, 8), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e8fbff', transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2, emissive: '#bdf3ff', emissiveIntensity: 0.4 }),
    [],
  );
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * area[0],
        z: -Math.random() * area[1],
        y: -2 + Math.random() * 2.4,
        s: 0.4 + Math.random() * 1.4,
        v: 0.3 + Math.random() * 0.6,
        p: Math.random() * 10,
      })),
    [count, area],
  );
  useFrame((s, dt) => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const t = s.clock.elapsedTime;
    data.forEach((b, i) => {
      b.y += b.v * dt;
      if (b.y > 1.2) b.y = -2;
      d.position.set(b.x + Math.sin(t * 2 + b.p) * 0.08, b.y, b.z);
      d.scale.setScalar(b.s * (b.y > 0 ? 1 + b.y : 1));
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, count]} />;
}

function OrbitCam({ target, radius, height, speed = 0.08, offsetX = 0 }: { target: THREE.Vector3; radius: number; height: number; speed?: number; offsetX?: number }) {
  const { camera, size } = useThree();
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const portrait = size.width / size.height < 0.9;
    const r = portrait ? radius * 1.35 : radius;
    const a = Math.sin(t * speed) * 0.55 + 0.25;
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(target.x + Math.sin(a) * r + (portrait ? 0 : offsetX), target.y + height + Math.sin(t * 0.4) * 0.2, target.z + Math.cos(a) * r);
    cam.lookAt(target.x + (portrait ? 0 : offsetX), target.y + (portrait ? 0.3 : 0.9), target.z);
    if (cam.fov !== 50) {
      cam.fov = 50;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

export function MenuScene() {
  const quality = useGame((s) => s.quality);
  const target = useMemo(() => new THREE.Vector3(1.25, POOL.deckY + 0.67, POOL.startWall + 0.5), []);
  const drive = useMemo(
    () => (pose: SwimmerPose, t: number) => {
      pose.anim = 'wave';
      pose.prone = 0;
      pose.gogglesDown = false;
      pose.pos.copy(target);
      pose.yaw = Math.PI + Math.sin(t * 0.5) * 0.15 - 0.2;
    },
    [target],
  );
  const swimDrive = useMemo(() => {
    let count = 0;
    let next = 0;
    return (pose: SwimmerPose, t: number) => {
      pose.anim = 'swim';
      pose.prone = 1;
      pose.gogglesDown = true;
      const z = -((t * 1.8) % 46) - 2;
      pose.pos.set(-1.25, -0.04 + Math.sin(t * 3) * 0.02, z);
      pose.speed = 1.8;
      pose.strokePower = 0.8;
      if (t > next) {
        next = t + 0.55;
        count++;
        splashBus.burst(-1.25 + (count % 2 ? 0.3 : -0.3), 0.05, z - 0.9, 0.7, 10);
        splashBus.ripple(-1.25, 0, z - 0.9, 1);
      }
      pose.strokeCount = count;
    };
  }, []);
  return (
    <>
      <hemisphereLight args={['#e6f8ff', '#5d9fc4', 1.15]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 12, 8]} intensity={2.4} castShadow={quality === 'high'} shadow-mapSize={[1024, 1024]} />
      <PoolScene length={50} crowd quality={quality} lanes={isMobile ? 2 : 5} />
      <Swimmer3D look={PLAYER_LOOK} drive={drive} castShadow={quality === 'high'} />
      <Swimmer3D look={FABIOLA_LOOK} drive={swimDrive} castShadow={false} />
      <Bubbles count={quality === 'high' ? 90 : 40} />
      <Splashes max={200} />
      <OrbitCam target={target} radius={5.2} height={0.9} offsetX={-1.6} />
    </>
  );
}

/** Fundo da tela final: praia ao pôr do sol com a nadadora comemorando. */
export function FinalScene() {
  const quality = useGame((s) => s.quality);
  const D = 40;
  const target = useMemo(() => new THREE.Vector3(0, 0.4, -D - 4.5), []);
  const drive = useMemo(
    () => (pose: SwimmerPose) => {
      pose.anim = 'celebrate';
      pose.prone = 0;
      pose.gogglesDown = false;
      pose.pos.set(0, 0.3, -D - 4.5);
      pose.yaw = Math.PI;
    },
    [],
  );
  const fab = useMemo(
    () => (pose: SwimmerPose) => {
      pose.anim = 'wave';
      pose.prone = 0;
      pose.gogglesDown = false;
      pose.pos.set(1.6, 0.42, -D - 6);
      pose.yaw = Math.PI - 0.3;
    },
    [],
  );
  const noWaves = useMemo(() => () => [], []);
  const fz = useMemo(() => () => -D, []);
  return (
    <>
      <hemisphereLight args={['#ffdcc8', '#4a6fb0', 1.1]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[-4, 8, -30]} intensity={2.4} color="#ffc58a" />
      <directionalLight position={[3, 6, -60]} intensity={1.2} color="#ffffff" />
      <SeaScene variant="sunset" distance={D} quality={quality} ambient={0.1} getWaves={noWaves} followZ={fz} beach arch={false} />
      <Swimmer3D look={PLAYER_LOOK} drive={drive} castShadow={false} />
      <Swimmer3D look={FABIOLA_LOOK} drive={fab} castShadow={false} scale={1.04} />
      <OrbitCam target={target} radius={5.5} height={1.1} speed={0.12} />
    </>
  );
}
