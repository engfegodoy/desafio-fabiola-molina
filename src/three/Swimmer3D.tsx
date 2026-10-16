import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { capTexture, chestLogoTexture } from './textures';

export type SwimAnim = 'swim' | 'stand' | 'celebrate' | 'wave' | 'tread' | 'cheerWater' | 'tossed' | 'dance' | 'slip' | 'jump';

/** Estado visual preenchido a cada quadro por quem controla a nadadora. */
export interface SwimmerPose {
  pos: THREE.Vector3;
  /** 0 = em pé, 1 = deitada nadando. */
  prone: number;
  yaw: number;
  /** Rotação extra (cambalhota / queda). */
  spin: number;
  anim: SwimAnim;
  strokeCount: number;
  strokePower: number;
  speed: number;
  charging: boolean;
  charge: number;
  /** Óculos sobre os olhos (nadando) ou na testa. */
  gogglesDown: boolean;
  visible: boolean;
}

export interface SwimmerLook {
  cap: string;
  capStripe: string;
  capLogo: string;
  suit: string;
  suitTrim: string;
  skin: string;
  hair: string;
  goggles: string;
  label?: string;
  labelClass?: string;
}

export const PLAYER_LOOK: SwimmerLook = {
  cap: '#1f6fe5',
  capStripe: '#ffd23f',
  capLogo: '#ffffff',
  suit: '#0b2a6b',
  suitTrim: '#22d3ee',
  skin: '#f3c39b',
  hair: '#5a3420',
  goggles: '#ffd23f',
};

export const FABIOLA_LOOK: SwimmerLook = {
  cap: '#0b2a6b',
  capStripe: '#ff5d4d',
  capLogo: '#ffffff',
  suit: '#0a1f52',
  suitTrim: '#ff7b6b',
  skin: '#e8b48c',
  hair: '#2b1a12',
  goggles: '#22d3ee',
};

export function newPose(): SwimmerPose {
  return {
    pos: new THREE.Vector3(),
    prone: 1,
    yaw: 0,
    spin: 0,
    anim: 'swim',
    strokeCount: 0,
    strokePower: 0.5,
    speed: 0,
    charging: false,
    charge: 0,
    gogglesDown: true,
    visible: true,
  };
}

interface Props {
  look: SwimmerLook;
  drive: (pose: SwimmerPose, t: number, dt: number) => void;
  castShadow?: boolean;
  scale?: number;
  labelHeight?: number;
}

const SHOULDER_Y = 1.4;

export function Swimmer3D({ look, drive, castShadow = true, scale = 1, labelHeight = 1.25 }: Props) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const roll = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const foreL = useRef<THREE.Group>(null);
  const foreR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const pony = useRef<THREE.Group>(null);
  const gogglesUp = useRef<THREE.Group>(null);
  const gogglesDown = useRef<THREE.Group>(null);
  const label = useRef<THREE.Group>(null);

  const pose = useMemo(newPose, []);
  const anim = useRef({ phase: 0, target: 0, kick: 0, breathe: 0, lastStroke: -1, breatheSide: 1, prone: 1, t: 0 });

  const mats = useMemo(() => {
    const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.55 });
    const suit = new THREE.MeshStandardMaterial({ color: look.suit, roughness: 0.4, metalness: 0.05 });
    const trim = new THREE.MeshStandardMaterial({ color: look.suitTrim, roughness: 0.4, emissive: look.suitTrim, emissiveIntensity: 0.15 });
    const cap = new THREE.MeshStandardMaterial({
      map: capTexture(look.cap, look.capStripe, look.capLogo),
      roughness: 0.25,
      metalness: 0.05,
    });
    const hair = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.6 });
    const goggle = new THREE.MeshStandardMaterial({ color: look.goggles, roughness: 0.3, metalness: 0.2 });
    const lens = new THREE.MeshStandardMaterial({ color: '#9be7ff', roughness: 0.05, metalness: 0.6, emissive: '#1a5fa0', emissiveIntensity: 0.3 });
    const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
    const iris = new THREE.MeshStandardMaterial({ color: '#4a2b16', roughness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1b0f0a', roughness: 0.4 });
    const mouth = new THREE.MeshStandardMaterial({ color: '#b0303d', roughness: 0.5 });
    const cheek = new THREE.MeshStandardMaterial({ color: '#ff8a8a', roughness: 0.8, transparent: true, opacity: 0.5 });
    const logo = new THREE.MeshBasicMaterial({ map: chestLogoTexture('#ffffff'), transparent: true, depthWrite: false });
    return { skin, suit, trim, cap, hair, goggle, lens, white, iris, dark, mouth, cheek, logo };
  }, [look]);

  const geos = useMemo(
    () => ({
      torso: new THREE.CapsuleGeometry(0.22, 0.34, 8, 16),
      hips: new THREE.SphereGeometry(0.22, 18, 12),
      head: new THREE.SphereGeometry(0.29, 28, 20),
      cap: new THREE.SphereGeometry(0.303, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
      upperArm: new THREE.CapsuleGeometry(0.082, 0.22, 4, 12),
      foreArm: new THREE.CapsuleGeometry(0.072, 0.2, 4, 12),
      joint: new THREE.SphereGeometry(0.08, 12, 10),
      hand: new THREE.SphereGeometry(0.088, 14, 10),
      thigh: new THREE.CapsuleGeometry(0.115, 0.24, 4, 12),
      shin: new THREE.CapsuleGeometry(0.088, 0.26, 4, 12),
      foot: new THREE.SphereGeometry(0.085, 12, 8),
      eye: new THREE.SphereGeometry(0.068, 16, 12),
      pupil: new THREE.SphereGeometry(0.04, 12, 8),
      glint: new THREE.SphereGeometry(0.015, 6, 6),
      ring: new THREE.TorusGeometry(0.068, 0.02, 8, 18),
      lens: new THREE.SphereGeometry(0.066, 12, 8),
      strap: new THREE.TorusGeometry(0.302, 0.013, 6, 32),
      smile: new THREE.TorusGeometry(0.075, 0.02, 8, 16, Math.PI),
      brow: new THREE.CapsuleGeometry(0.012, 0.05, 2, 6),
      cheek: new THREE.SphereGeometry(0.05, 8, 6),
      pony: new THREE.SphereGeometry(0.1, 12, 10),
      logo: new THREE.PlaneGeometry(0.17, 0.17),
      band: new THREE.TorusGeometry(0.22, 0.02, 6, 24),
    }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    drive(pose, t, dt);
    const a = anim.current;
    a.t += dt;
    if (!root.current || !body.current) return;
    root.current.visible = pose.visible;
    root.current.position.copy(pose.pos);
    root.current.rotation.y = pose.yaw;
    a.prone += (pose.prone - a.prone) * Math.min(1, dt * 8);
    body.current.rotation.x = -Math.PI / 2 * a.prone + pose.spin;
    // Origem nos ombros quando deitada; nos pés quando em pé
    body.current.position.y = (1 - a.prone) * 0;
    if (roll.current) roll.current.position.y = -SHOULDER_Y * a.prone + 0;

    let armLa = 0;
    let armRa = 0;
    let armLz = 0.12;
    let armRz = -0.12;
    let foreLa = 0;
    let foreRa = 0;
    let legLa = 0;
    let legRa = 0;
    let rollZ = 0;
    let headY = 0;
    let headX = 0;
    let bounce = 0;

    switch (pose.anim) {
      case 'swim': {
        if (pose.strokeCount !== a.lastStroke) {
          if (a.lastStroke >= 0) {
            a.target += Math.PI;
            if (pose.strokeCount % 3 === 0) {
              a.breathe = 1;
              a.breatheSide = Math.round(a.target / Math.PI) % 2 ? 1 : -1;
            }
          } else {
            a.target = Math.ceil(a.phase / Math.PI) * Math.PI;
          }
          a.lastStroke = pose.strokeCount;
        }
        // braçada rápida se forte, plus deslize lento
        const k = 7 + pose.strokePower * 6;
        a.phase += (a.target - a.phase) * Math.min(1, dt * k) + dt * 0.25 * Math.min(1, pose.speed);
        if (a.phase > a.target) a.target = a.phase;
        const ph = a.phase;
        armLa = Math.PI - (ph % (Math.PI * 2));
        armRa = Math.PI - ((ph + Math.PI) % (Math.PI * 2));
        // cotovelo sai da água na recuperação
        const recL = Math.max(0, Math.sin(-armLa));
        const recR = Math.max(0, Math.sin(-armRa));
        armLz = 0.15 + recL * 0.35;
        armRz = -0.15 - recR * 0.35;
        foreLa = -recL * 0.9;
        foreRa = -recR * 0.9;
        // carregando: braço da frente se estica e o corpo "enrola"
        if (pose.charging) {
          rollZ += Math.sin(t * 30) * 0.01 * pose.charge;
        }
        rollZ += Math.sin(ph) * 0.35;
        const kickAmp = 0.18 + Math.min(1, pose.speed / 2.2) * 0.28 + (pose.charging ? 0.15 : 0);
        a.kick += dt * (7 + pose.speed * 3.5);
        legLa = Math.sin(a.kick) * kickAmp;
        legRa = -Math.sin(a.kick) * kickAmp;
        a.breathe = Math.max(0, a.breathe - dt * 1.8);
        headY = Math.sin(a.breathe * Math.PI) * 0.9 * a.breatheSide;
        headX = 0.25;
        break;
      }
      case 'tread':
      case 'cheerWater': {
        const s = Math.sin(t * 3);
        armLa = 1.3 + s * 0.3;
        armRa = 1.3 - s * 0.3;
        armLz = 0.8;
        armRz = -0.8;
        legLa = Math.sin(t * 4) * 0.4;
        legRa = -Math.sin(t * 4) * 0.4;
        if (pose.anim === 'cheerWater') {
          armLa = Math.PI - 0.25 + Math.sin(t * 10) * 0.2;
          armRa = Math.PI - 0.25 + Math.cos(t * 10) * 0.2;
          armLz = 0.35;
          armRz = -0.35;
          bounce = Math.abs(Math.sin(t * 5)) * 0.15;
        }
        break;
      }
      case 'stand': {
        armLz = 0.2 + Math.sin(t * 1.6) * 0.03;
        armRz = -0.2 - Math.sin(t * 1.6) * 0.03;
        headY = Math.sin(t * 0.7) * 0.15;
        break;
      }
      case 'wave': {
        armLz = 0.2;
        armRa = Math.PI - 0.3;
        armRz = -0.5 + Math.sin(t * 8) * 0.35;
        foreRa = -0.3;
        headY = Math.sin(t * 0.8) * 0.12;
        bounce = Math.abs(Math.sin(t * 2)) * 0.03;
        break;
      }
      case 'celebrate':
      case 'dance': {
        const j = Math.abs(Math.sin(t * (pose.anim === 'dance' ? 5 : 6)));
        bounce = j * 0.35;
        armLa = Math.PI - 0.2 + Math.sin(t * 12) * 0.25;
        armRa = Math.PI - 0.2 + Math.cos(t * 12) * 0.25;
        armLz = 0.4;
        armRz = -0.4;
        legLa = -j * 0.4;
        legRa = -j * 0.25;
        headY = Math.sin(t * 6) * 0.2;
        if (pose.anim === 'dance') {
          rollZ = Math.sin(t * 5) * 0.15;
          armLa = 1.4 + Math.sin(t * 10) * 0.8;
          armRa = 1.4 - Math.sin(t * 10) * 0.8;
        }
        break;
      }
      case 'jump': {
        // braços esticados acima da cabeça, pernas juntas (mergulho)
        armLa = Math.PI - 0.08;
        armRa = Math.PI - 0.08;
        armLz = 0.12;
        armRz = -0.12;
        legLa = 0.05;
        legRa = 0.05;
        break;
      }
      case 'slip':
      case 'tossed': {
        armLa = Math.PI * 0.75 + Math.sin(t * 20) * 0.5;
        armRa = Math.PI * 0.75 + Math.cos(t * 20) * 0.5;
        armLz = 0.9;
        armRz = -0.9;
        legLa = Math.sin(t * 18) * 0.7;
        legRa = -Math.sin(t * 18) * 0.7;
        break;
      }
    }

    const lerp = (r: THREE.Group | null, x: number, z: number) => {
      if (!r) return;
      r.rotation.x += (x - r.rotation.x) * Math.min(1, dt * 18);
      r.rotation.z += (z - r.rotation.z) * Math.min(1, dt * 12);
    };
    // Na natação, o ângulo do braço gira continuamente — aplica direto
    if (pose.anim === 'swim') {
      if (armL.current) {
        armL.current.rotation.x = armLa;
        armL.current.rotation.z = armLz;
      }
      if (armR.current) {
        armR.current.rotation.x = armRa;
        armR.current.rotation.z = armRz;
      }
    } else {
      lerp(armL.current, armLa, armLz);
      lerp(armR.current, armRa, armRz);
    }
    lerp(foreL.current, foreLa, 0);
    lerp(foreR.current, foreRa, 0);
    lerp(legL.current, legLa, 0.03);
    lerp(legR.current, legRa, -0.03);
    if (roll.current) {
      roll.current.rotation.y += (rollZ - roll.current.rotation.y) * Math.min(1, dt * 10);
      roll.current.position.y += bounce;
    }
    if (head.current) {
      head.current.rotation.y += (headY - head.current.rotation.y) * Math.min(1, dt * 10);
      head.current.rotation.x += (headX * a.prone - head.current.rotation.x) * Math.min(1, dt * 6);
    }
    if (pony.current) {
      pony.current.rotation.x = 0.6 + Math.sin(t * 6) * 0.15 + a.prone * 0.6;
      pony.current.rotation.z = Math.sin(t * 4.3) * 0.2;
    }
    if (gogglesUp.current && gogglesDown.current) {
      gogglesUp.current.visible = !pose.gogglesDown;
      gogglesDown.current.visible = pose.gogglesDown;
    }
    if (label.current) {
      label.current.position.y = labelHeight * scale * (a.prone > 0.5 ? 1 : 1.75);
    }
  });

  const shadow = castShadow;
  const { skin, suit, trim, cap, hair, goggle, lens, white, iris, dark, mouth, cheek, logo } = mats;
  const g = geos;

  const goggleSet = (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.1, 0, 0]}>
          <mesh geometry={g.ring} material={goggle} />
          <mesh geometry={g.lens} material={lens} scale={[1, 1, 0.45]} />
        </group>
      ))}
    </>
  );

  return (
    <group ref={root}>
      <group ref={label}>
        {look.label && (
          <Html center distanceFactor={6} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <div className={look.labelClass ?? 'swimmer-label'}>{look.label}</div>
          </Html>
        )}
      </group>
      <group scale={scale}>
        <group ref={body}>
          <group ref={roll}>
            {/* Tronco */}
            <mesh geometry={g.torso} material={suit} position={[0, 1.17, 0]} scale={[1.1, 1, 0.82]} castShadow={shadow} />
            <mesh geometry={g.hips} material={suit} position={[0, 0.92, 0]} scale={[1.05, 0.7, 0.85]} castShadow={shadow} />
            <mesh geometry={g.band} material={trim} position={[0, 0.98, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.08, 0.85, 1]} />
            <mesh geometry={g.logo} material={logo} position={[0, 1.22, -0.186]} rotation={[0, Math.PI, 0]} />
            {/* Pescoço */}
            <mesh geometry={g.hand} material={skin} position={[0, 1.5, 0]} scale={[1, 1.3, 1]} />

            {/* Cabeça */}
            <group ref={head} position={[0, 1.74, 0]}>
              <mesh geometry={g.head} material={skin} castShadow={shadow} />
              <mesh geometry={g.cap} material={cap} rotation={[0.42, 0, 0]} castShadow={shadow} />
              {/* franjinha */}
              <mesh geometry={g.pony} material={hair} position={[-0.11, 0.13, -0.235]} scale={[1.1, 0.5, 0.5]} rotation={[0, 0, 0.5]} />
              {/* Rabo de cavalo */}
              <group ref={pony} position={[0, -0.02, 0.26]}>
                <mesh geometry={g.pony} material={hair} position={[0, -0.06, 0.05]} scale={[0.9, 1.3, 0.9]} />
                <mesh geometry={g.pony} material={hair} position={[0, -0.2, 0.08]} scale={[0.75, 1.2, 0.75]} />
                <mesh geometry={g.pony} material={hair} position={[0, -0.32, 0.08]} scale={[0.5, 0.9, 0.5]} />
              </group>
              {/* Rosto (frente = -Z) */}
              {[-1, 1].map((s) => (
                <group key={s} position={[s * 0.1, 0.01, -0.25]}>
                  <mesh geometry={g.eye} material={white} scale={[1, 1.2, 0.6]} />
                  <mesh geometry={g.pupil} material={iris} position={[0, -0.006, -0.036]} scale={[1, 1.15, 0.6]} />
                  <mesh geometry={g.glint} material={white} position={[s * 0.012 + 0.012, 0.025, -0.06]} />
                  <mesh geometry={g.brow} material={dark} position={[0, 0.1, -0.012]} rotation={[0, 0, Math.PI / 2 + s * 0.15]} />
                </group>
              ))}
              {[-1, 1].map((s) => (
                <mesh key={s} geometry={g.cheek} material={cheek} position={[s * 0.17, -0.085, -0.225]} scale={[1, 0.7, 0.4]} />
              ))}
              <mesh geometry={g.smile} material={mouth} position={[0, -0.11, -0.262]} rotation={[0, 0, Math.PI]} scale={[1, 0.8, 1]} />
              <mesh geometry={g.hand} material={skin} position={[0, -0.03, -0.29]} scale={[0.36, 0.33, 0.36]} />
              {/* Óculos: na testa ou nos olhos */}
              <group ref={gogglesUp} position={[0, 0.2, -0.215]} rotation={[-0.75, 0, 0]} scale={0.92}>
                {goggleSet}
              </group>
              <group ref={gogglesDown} position={[0, 0.01, -0.262]} visible={false}>
                {goggleSet}
              </group>
              <mesh geometry={g.strap} material={goggle} rotation={[Math.PI / 2 - 0.35, 0, 0]} position={[0, 0.09, 0]} />
            </group>

            {/* Braços — pivô no ombro, braço apontando para baixo */}
            {[
              [armL, foreL, 1],
              [armR, foreR, -1],
            ].map(([ref, fref, s]) => (
              <group key={s as number} ref={ref as React.RefObject<THREE.Group>} position={[(s as number) * 0.31, SHOULDER_Y, 0]}>
                <mesh geometry={g.hand} material={suit} scale={[1.25, 1.1, 1.1]} />
                <mesh geometry={g.upperArm} material={skin} position={[0, -0.18, 0]} castShadow={shadow} />
                <group ref={fref as React.RefObject<THREE.Group>} position={[0, -0.36, 0]}>
                  <mesh geometry={g.joint} material={skin} />
                  <mesh geometry={g.foreArm} material={skin} position={[0, -0.15, 0]} castShadow={shadow} />
                  <mesh geometry={g.hand} material={skin} position={[0, -0.32, 0]} scale={[1, 1.15, 0.75]} />
                </group>
              </group>
            ))}

            {/* Pernas — pivô no quadril */}
            {[
              [legL, 1],
              [legR, -1],
            ].map(([ref, s]) => (
              <group key={s as number} ref={ref as React.RefObject<THREE.Group>} position={[(s as number) * 0.11, 0.86, 0]}>
                <mesh geometry={g.thigh} material={skin} position={[0, -0.21, 0]} castShadow={shadow} />
                <mesh geometry={g.joint} material={skin} position={[0, -0.42, 0]} scale={1.1} />
                <mesh geometry={g.shin} material={skin} position={[0, -0.6, 0]} castShadow={shadow} />
                <mesh geometry={g.foot} material={skin} position={[0, -0.82, -0.05]} scale={[0.9, 0.6, 1.6]} />
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}
