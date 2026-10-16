import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Crowd, SkyDome, type CrowdSeat } from '../Props';
import { WaterSurface, type WaterLook } from '../Water';
import { bannerTexture, checkerTexture, deckTileTexture, logoTexture } from '../textures';

export const POOL = {
  startWall: 1.75,
  depth: 2,
  deckY: 0.32,
  laneWidth: 2.5,
};

/** 1 = treino (raia única), 2 = duas raias (celular), 5 = piscina completa (desktop). */
export type PoolLanes = 1 | 2 | 5;

/** Geometria da piscina: centro de cada raia, cordas e meia-largura. */
export function poolLayout(lanes: PoolLanes) {
  if (lanes === 1) return { centers: [0], ropes: [-1.6, 1.6], halfWidth: 3.2, offsetX: 0 };
  const w = POOL.laneWidth;
  const centers = Array.from({ length: lanes }, (_, i) => (i - (lanes - 1) / 2) * w);
  const ropes = Array.from({ length: lanes + 1 }, (_, i) => (i - lanes / 2) * w);
  // Com 5 raias, a piscina é deslocada para que as nadadoras (x = ±1,25)
  // fiquem nas raias 3 e 4, no meio da piscina.
  const offsetX = lanes === 5 ? -w / 2 : 0;
  return { centers, ropes, halfWidth: (lanes / 2) * w + 0.2, offsetX };
}

const POOL_WATER: WaterLook = {
  deep: '#0a8fd6',
  shallow: '#4fe0f0',
  foam: '#ffffff',
  sky: '#bff4ff',
  sunDir: [0.3, 0.9, 0.5],
  sunColor: '#ffffff',
  opacity: 0.72,
  glint: 1.6,
  sparkle: 0.35,
};

/** Fundo da piscina com azulejos, faixas das raias e cáusticas animadas. */
function PoolFloor({ length, lanes, halfWidth }: { length: number; lanes: number[]; halfWidth: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uLength: { value: length },
          uLanes: { value: Array.from({ length: 8 }, (_, i) => lanes[i] ?? 999) },
        },
        vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `
          uniform float uTime; uniform float uLength; uniform float uLanes[8]; varying vec3 vW;
          float caustic(vec2 p){
            float c = 0.0;
            for (int i = 0; i < 3; i++) {
              float fi = float(i);
              vec2 q = p * (1.2 + fi * 0.6) + vec2(uTime * (0.35 + fi * 0.1), -uTime * (0.25 + fi * 0.07));
              c += abs(sin(q.x + sin(q.y * 1.3 + fi)) * sin(q.y + sin(q.x * 1.1 - fi)));
            }
            return pow(1.0 - c / 3.0, 6.0);
          }
          void main(){
            vec2 p = vW.xz;
            vec3 tile = vec3(0.55, 0.88, 0.97);
            vec2 g = abs(fract(p * 2.5) - 0.5);
            float grout = step(0.46, max(g.x, g.y));
            vec3 col = mix(tile, vec3(0.42, 0.72, 0.86), grout * 0.7);
            // faixa escura no centro de cada raia, com o "T" no final
            for (int i = 0; i < 8; i++) {
              float lx = uLanes[i];
              float inLane = step(abs(p.x - lx), 0.13) * step(-uLength + 1.5, p.y) * step(p.y, -0.5);
              float tBar = step(abs(p.x - lx), 0.55) * step(abs(p.y - (-uLength + 1.6)), 0.12);
              col = mix(col, vec3(0.05, 0.16, 0.42), max(inLane, tBar));
            }
            col += vec3(0.9, 1.0, 1.0) * caustic(p * 0.9) * 0.55;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [length, lanes],
  );
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
  });
  const len = length + POOL.startWall + 1;
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -POOL.depth, -len / 2 + POOL.startWall]}>
      <planeGeometry args={[halfWidth * 2, len]} />
    </mesh>
  );
}

function LaneRope({ x, length }: { x: number; length: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spacing = 0.26;
  const count = Math.floor(length / spacing);
  const geo = useMemo(() => new THREE.SphereGeometry(0.11, 8, 6).scale(1, 1, 1.25), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.35 }), []);
  const done = useRef(false);
  useFrame((s) => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const t = s.clock.elapsedTime;
    if (!done.current) {
      const c = new THREE.Color();
      for (let i = 0; i < count; i++) {
        const z = -i * spacing;
        const fromEnd = Math.min(-z, length + z);
        const seg = Math.floor(i / 5) % 2;
        c.set(fromEnd < 5 ? '#ff3b3b' : seg ? '#ffd23f' : '#1f6fe5');
        m.setColorAt(i, c);
      }
      m.instanceColor!.needsUpdate = true;
      done.current = true;
    }
    for (let i = 0; i < count; i++) {
      const z = POOL.startWall - 0.2 - i * spacing;
      d.position.set(x, 0.04 + Math.sin(t * 2 + z * 0.8) * 0.015, z);
      d.rotation.set(0, 0, t * 0.5 + i);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />;
}

function Bunting({ z, width }: { z: number; width: number }) {
  const colors = ['#ff5d4d', '#ffd23f', '#22d3ee', '#1f6fe5', '#ffffff'];
  const n = 16;
  return (
    <group position={[0, 2.4, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, width, 4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const x = -width / 2 + ((i + 0.5) / n) * width;
        const sag = -Math.sin(((i + 0.5) / n) * Math.PI) * 0.3;
        return (
          <mesh key={i} position={[x, sag - 0.16, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.16, 0.36, 3]} />
            <meshStandardMaterial color={colors[i % colors.length]} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (width / 2), -1.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2.5, 8]} />
          <meshStandardMaterial color="#d0d8e0" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function StartingBlock({ x, n }: { x: number; n: number }) {
  const tex = useMemo(() => bannerTexture(String(n), '#1f6fe5', '#ffffff', { w: 128, h: 128 }), [n]);
  return (
    <group position={[x, POOL.deckY, POOL.startWall + 0.55]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.7, 0.6, 0.75]} />
        <meshStandardMaterial color="#e8eef4" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.63, 0.02]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.72, 0.08, 0.78]} />
        <meshStandardMaterial color="#1f6fe5" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.3, -0.38]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Flag({ position, color, phase }: { position: [number, number, number]; color: string; phase: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => bannerTexture('FM', color, '#ffffff', { w: 256, h: 160 }), [color]);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 3 + phase) * 0.25;
  });
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 4, 6]} />
        <meshStandardMaterial color="#c7d2dc" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh ref={ref} position={[0, 3.55, 0]}>
        <planeGeometry args={[1.1, 0.7]} />
        <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function PoolScene({ length, crowd, quality, lanes = 2 }: { length: number; crowd: boolean; quality: 'high' | 'low'; lanes?: PoolLanes }) {
  const layout = useMemo(() => poolLayout(lanes), [lanes]);
  const HW = layout.halfWidth;
  // arquibancada começa 7 m depois da borda
  const S0 = HW + 7;
  const deckTex = useMemo(() => {
    const t = deckTileTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(3, length / 3);
    return t;
  }, [length]);
  const logo = useMemo(() => logoTexture(), []);
  const adA = useMemo(() => bannerTexture('DESAFIO FABIOLA MOLINA', '#1f6fe5', '#ffd23f', { w: 1024, h: 160 }), []);
  const adB = useMemo(() => bannerTexture('NATAÇÃO • SUPERAÇÃO • CONQUISTA', '#0b2a6b', '#ffffff', { w: 1024, h: 160 }), []);
  const adC = useMemo(() => bannerTexture('FM', '#ff5d4d', '#ffffff', { w: 512, h: 160 }), []);
  const checker = useMemo(() => checkerTexture(), []);
  const banner = useMemo(() => bannerTexture('CHEGADA', '#ff5d4d', '#ffffff', { w: 1024, h: 200 }), []);

  const totalLen = length + POOL.startWall + 1.2;
  const centerZ = POOL.startWall - totalLen / 2;
  const endZ = POOL.startWall - totalLen;
  const tiers = quality === 'high' ? 7 : 5;
  const standLen = Math.min(totalLen + 24, 140);

  const seats = useMemo(() => {
    if (!crowd) return [] as CrowdSeat[];
    const out: CrowdSeat[] = [];
    const spacing = quality === 'high' ? 0.78 : 1.15;
    for (const side of [-1, 1]) {
      for (let tIdx = 0; tIdx < tiers; tIdx++) {
        const x = side * (S0 + tIdx * 1.1);
        const y = 0.6 + tIdx * 0.7 + 0.35;
        for (let z = POOL.startWall + 10; z > POOL.startWall - standLen + 10; z -= spacing) {
          if (Math.random() < 0.12) continue;
          out.push({ x: x + (Math.random() - 0.5) * 0.2, y, z: z + (Math.random() - 0.5) * 0.25, facing: side * -Math.PI / 2 });
        }
      }
    }
    return out;
  }, [crowd, quality, tiers, standLen]);

  const standCenter = POOL.startWall + 10 - standLen / 2;

  return (
    <group position={[layout.offsetX, 0, 0]}>
      <SkyDome top="#2b7bea" horizon="#c4f1ff" bottom="#7cc8e8" sunDir={[0.4, 0.7, 0.3]} sunColor="#fff7d6" sunSize={0.6} />
      <WaterSurface
        look={POOL_WATER}
        width={HW * 2}
        length={totalLen}
        segX={Math.round((quality === 'high' ? 4 : 2) * HW)}
        segZ={quality === 'high' ? Math.min(400, Math.round(totalLen * 3)) : Math.min(200, Math.round(totalLen * 1.5))}
        ambient={0.025}
        centerZ={centerZ}
      />
      <PoolFloor length={length + 0.9} lanes={layout.centers.map((c) => c + layout.offsetX)} halfWidth={HW} />
      {/* paredes internas */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * HW, -POOL.depth / 2 + 0.15, centerZ]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[totalLen, POOL.depth + 0.3]} />
          <meshStandardMaterial color="#5cc8e6" roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, -POOL.depth / 2 + 0.15, POOL.startWall]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[HW * 2, POOL.depth + 0.3]} />
        <meshStandardMaterial color="#5cc8e6" roughness={0.3} />
      </mesh>
      <mesh position={[0, -POOL.depth / 2 + 0.15, endZ]}>
        <planeGeometry args={[HW * 2, POOL.depth + 0.3]} />
        <meshStandardMaterial color="#5cc8e6" roughness={0.3} />
      </mesh>
      {/* placas de toque na chegada */}
      {crowd &&
        layout.centers.map((x) => (
          <mesh key={x} position={[x, -0.25, endZ + 0.05]}>
            <boxGeometry args={[2.2, 0.9, 0.08]} />
            <meshStandardMaterial color="#ffd23f" emissive="#ffb000" emissiveIntensity={0.25} />
          </mesh>
        ))}

      {/* deck */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (HW + 3.2), POOL.deckY / 2 - 0.5, standCenter]} receiveShadow>
          <boxGeometry args={[6.4, POOL.deckY + 1, standLen]} />
          <meshStandardMaterial map={deckTex} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, POOL.deckY / 2 - 0.5, POOL.startWall + 4.5]} receiveShadow>
        <boxGeometry args={[HW * 2, POOL.deckY + 1, 5.5]} />
        <meshStandardMaterial map={deckTex} roughness={0.5} />
      </mesh>
      <mesh position={[0, POOL.deckY / 2 - 0.5, endZ - 4]} receiveShadow>
        <boxGeometry args={[HW * 2, POOL.deckY + 1, 8]} />
        <meshStandardMaterial map={deckTex} roughness={0.5} />
      </mesh>
      {/* bordas arredondadas */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (HW + 0.15), POOL.deckY + 0.02, centerZ]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.16, totalLen, 4, 8]} />
          <meshStandardMaterial color="#22b8e6" roughness={0.3} />
        </mesh>
      ))}

      {layout.ropes.map((x) => (
        <LaneRope key={x} x={x} length={totalLen - 0.6} />
      ))}

      {crowd && layout.centers.map((x, i) => <StartingBlock key={x} x={x} n={lanes === 2 ? i + 4 : i + 1} />)}
      <Bunting z={POOL.startWall - 5} width={HW * 2 + 1} />
      {crowd && <Bunting z={endZ + 5} width={HW * 2 + 1} />}

      {/* arco de chegada sobre a piscina */}
      {crowd && (
        <group position={[0, 0, endZ - 0.4]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (HW + 0.6), 2.2, 0]}>
              <boxGeometry args={[0.35, 4.4, 0.35]} />
              <meshStandardMaterial color="#1f6fe5" />
            </mesh>
          ))}
          <mesh position={[0, 4.3, 0]}>
            <boxGeometry args={[HW * 2 + 1.6, 0.9, 0.3]} />
            <meshStandardMaterial color="#ff5d4d" />
          </mesh>
          <mesh position={[0, 4.3, 0.16]}>
            <planeGeometry args={[HW * 2 + 1.4, 0.8]} />
            <meshBasicMaterial map={banner} toneMapped={false} />
          </mesh>
          <mesh position={[0, 3.75, 0.16]}>
            <planeGeometry args={[HW * 2 + 1.4, 0.25]} />
            <meshBasicMaterial map={checker} />
          </mesh>
        </group>
      )}

      {/* placar / logo no fundo */}
      <group position={[0, 0, crowd ? endZ - 9 : POOL.startWall - 60]}>
        <group scale={HW > 6 ? 1.6 : 1}>
        <mesh position={[0, 5.2, 0]}>
          <boxGeometry args={[11, 6, 0.4]} />
          <meshStandardMaterial color="#0b2a6b" />
        </mesh>
        <mesh position={[0, 5.2, 0.21]}>
          <planeGeometry args={[10.4, 5.2]} />
          <meshBasicMaterial map={logo} toneMapped={false} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 4, 1.1, 0]}>
            <boxGeometry args={[0.4, 2.2, 0.4]} />
            <meshStandardMaterial color="#9aa8b6" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
        </group>
      </group>

      {/* arquibancadas */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {Array.from({ length: tiers }, (_, i) => (
            <mesh key={i} position={[s * (S0 + i * 1.1), 0.3 + i * 0.35 + 0.15, standCenter]} receiveShadow>
              <boxGeometry args={[1.1, 0.6 + i * 0.7 + 0.3, standLen]} />
              <meshStandardMaterial color={i % 2 ? '#2563eb' : '#1d4ed8'} roughness={0.7} />
            </mesh>
          ))}
          {/* placas de publicidade na frente da arquibancada */}
          {Array.from({ length: Math.ceil(standLen / 8) }, (_, i) => {
            const tex = [adA, adB, adC][i % 3];
            return (
              <mesh key={i} position={[s * (S0 - 0.62), 0.85, POOL.startWall + 10 - 4 - i * 8]} rotation={[0, -s * Math.PI / 2, 0]}>
                <planeGeometry args={[7.8, 1.1]} />
                <meshBasicMaterial map={tex} toneMapped={false} />
              </mesh>
            );
          })}
          <mesh position={[s * (S0 - 0.55), 0.6, standCenter]}>
            <boxGeometry args={[0.1, 1.4, standLen]} />
            <meshStandardMaterial color="#0b2a6b" />
          </mesh>
          {/* parede de fundo + cobertura */}
          <mesh position={[s * (S0 + tiers * 1.1 + 0.3), 4, standCenter]}>
            <boxGeometry args={[0.6, 8, standLen]} />
            <meshStandardMaterial color="#e9f2fb" roughness={0.6} />
          </mesh>
          <mesh position={[s * (S0 - 1.8 + tiers * 0.55), 9.2, standCenter]} rotation={[0, 0, s * 0.18]}>
            <boxGeometry args={[tiers * 1.1 + 4, 0.25, standLen]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
          {/* refletores */}
          {Array.from({ length: Math.ceil(standLen / 18) }, (_, i) => (
            <mesh key={i} position={[s * (S0 - 1), 8.6, POOL.startWall + 4 - i * 18]} rotation={[0, 0, s * 0.4]}>
              <boxGeometry args={[0.2, 0.6, 2.2]} />
              <meshStandardMaterial color="#ffffff" emissive="#fff9d0" emissiveIntensity={2} toneMapped={false} />
            </mesh>
          ))}
          {/* banners grandes no fundo */}
          {Array.from({ length: Math.ceil(standLen / 14) }, (_, i) => (
            <mesh key={i} position={[s * (S0 + tiers * 1.1), 6.6, POOL.startWall + 3 - i * 14]} rotation={[0, -s * Math.PI / 2, 0]}>
              <planeGeometry args={[6, 1.6]} />
              <meshBasicMaterial map={i % 2 ? adA : adC} toneMapped={false} />
            </mesh>
          ))}
          {/* bandeiras no deck */}
          {Array.from({ length: Math.ceil(totalLen / 10) + 1 }, (_, i) => (
            <Flag key={i} position={[s * (HW + 3.2), POOL.deckY, POOL.startWall - i * 10]} color={['#ff5d4d', '#1f6fe5', '#ffd23f'][i % 3]} phase={i} />
          ))}
        </group>
      ))}
      {seats.length > 0 && <Crowd seats={seats} />}
    </group>
  );
}
