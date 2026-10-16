import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RaceEngine } from '../game/raceEngine';
import { waterHeight } from '../game/waves';
import { isMobile, suitHex, useGame } from '../store/gameStore';
import { audio } from '../audio/audio';
import { FABIOLA_LOOK, playerLook as buildPlayerLook, Swimmer3D, type SwimmerPose } from './Swimmer3D';
import { ENERGY } from '../config/balance';
import { Shark3D, type SharkPose } from './Shark3D';
import { Splashes, splashBus } from './Splashes';
import { PoolScene, POOL } from './scenes/PoolScene';
import { SeaScene, sandHeight, type SeaVariant } from './scenes/SeaScene';
import type { Swimmer } from '../game/swimmer';

const TREAD_Y = -1.38;

/** Pequenos tremores de câmera (braçada perfeita, combo, tubarão). */
export const cameraFx = { shake: 0 };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const k = clamp01(v);
  return k * k * (3 - 2 * k);
};

interface DriveState {
  y: number;
  wake: number;
  diveSplash: boolean;
  introSplash: boolean;
}

function makeDrive(engine: RaceEngine, who: 'player' | 'opponent') {
  const st: DriveState = { y: 0, wake: 0, diveSplash: false, introSplash: false };
  const isPool = engine.kind === 'pool' || engine.kind === 'tutorial';
  const ambient = engine.cfg.waves.ambient;
  const D = engine.cfg.distance;

  return (pose: SwimmerPose, t: number, dt: number) => {
    const sw: Swimmer = who === 'player' ? engine.player : engine.opponent!.swimmer;
    const x = who === 'player' ? engine.playerX : engine.opponentX;
    const z = -sw.distance;
    const h = waterHeight(x, z, t, ambient, engine.waves.waves);
    const state = engine.state;
    const k = engine.stateTime;
    pose.visible = true;
    pose.spin = 0;
    pose.yaw = 0;
    pose.strokeCount = sw.strokeCount;
    pose.strokePower = sw.lastStrokePower;
    pose.speed = sw.speed;
    pose.charging = sw.charging;
    pose.charge = sw.charge;
    pose.breathing = sw.breathTimer > 0 ? Math.max(0.001, 1 - sw.breathTimer / ENERGY.breathTime) : 0;

    const swim = () => {
      pose.anim = 'swim';
      pose.prone = 1;
      pose.gogglesDown = true;
      const target = h * 0.85 - 0.04;
      st.y += (target - st.y) * Math.min(1, dt * 10);
      pose.pos.set(x, st.y, z);
      // espuma das pernas
      st.wake -= dt;
      if (sw.speed > 0.35 && st.wake <= 0) {
        st.wake = 0.09;
        splashBus.burst(x + (Math.random() - 0.5) * 0.3, 0.05, z + 1.35, 0.12 + sw.speed * 0.06, 2);
      }
    };
    const tread = (anim: SwimmerPose['anim'] = 'tread') => {
      pose.anim = anim;
      pose.prone = 0;
      pose.gogglesDown = anim === 'tread';
      const target = h + TREAD_Y;
      st.y += (target - st.y) * Math.min(1, dt * 6);
      pose.pos.set(x, st.y, z);
    };

    // ---------- Fase do tubarão (jogadora sozinha) ----------
    if (engine.kind === 'shark') {
      if (state === 'intro') {
        // Cena: comemora no barco → pulo de cabeça na água → olha para trás,
        // vê o tubarão → vira para a praia e a prova começa.
        const deck = new THREE.Vector3(2.35, 0.82, 0.6);
        const faceCam = -2.2;
        const faceJump = -Math.PI * 1.5; // olhando para -X (lado do mar livre)
        if (k < 2.6) {
          pose.anim = 'dance';
          pose.prone = 0;
          pose.gogglesDown = false;
          pose.yaw = faceCam;
          pose.pos.copy(deck);
        } else if (k < 3.0) {
          // agacha e se prepara para o pulo
          const a = smooth((k - 2.6) / 0.4);
          pose.anim = 'stand';
          pose.prone = 0;
          pose.gogglesDown = true;
          pose.yaw = THREE.MathUtils.lerp(faceCam, faceJump, a);
          pose.pos.set(deck.x, deck.y - Math.sin(a * Math.PI * 0.5) * 0.18, deck.z);
        } else if (k < 3.9) {
          // pulo em arco, bem por cima da borda do barco, caindo de cabeça
          const a = (k - 3.0) / 0.9;
          pose.anim = 'jump';
          pose.prone = 0;
          pose.gogglesDown = true;
          pose.yaw = faceJump;
          pose.spin = -smooth(a) * Math.PI * 0.85;
          pose.pos.set(
            THREE.MathUtils.lerp(deck.x, -0.2, a),
            THREE.MathUtils.lerp(deck.y, -0.6, a) + Math.sin(a * Math.PI) * 2.1,
            THREE.MathUtils.lerp(deck.z, 0, a),
          );
          st.y = -2.2;
          if (!st.introSplash && a > 0.92) {
            st.introSplash = true;
            splashBus.burst(-0.2, 0.05, 0, 1.4, 50);
            splashBus.ripple(-0.2, 0, 0, 2.2);
          }
        } else {
          // sobe, olha para trás (tubarão!) e vira para a praia
          if (k < 4.6) st.y = THREE.MathUtils.lerp(-2.2, h + TREAD_Y, smooth((k - 3.9) / 0.7));
          tread();
          pose.gogglesDown = true;
          pose.yaw =
            k < 4.8
              ? 0
              : k < 5.4
                ? THREE.MathUtils.lerp(0, Math.PI, smooth((k - 4.8) / 0.6))
                : k < 6.0
                  ? Math.PI
                  : THREE.MathUtils.lerp(Math.PI, 0, smooth((k - 6.0) / 0.5));
          pose.pos.set(0, st.y, 0);
        }
        return;
      }
      if (state === 'countdown') {
        tread();
        pose.gogglesDown = true;
        pose.pos.set(0, st.y, 0);
        return;
      }
      if (state === 'outro' || state === 'done') {
        if (engine.outcome === 'escaped') {
          const a = smooth(k / 1.3);
          const zz = THREE.MathUtils.lerp(-D, -D - 4.5, a);
          const ground = sandHeight(zz, D);
          const yWater = h + TREAD_Y;
          pose.prone = 0;
          pose.anim = k < 1.3 ? 'tread' : 'celebrate';
          pose.gogglesDown = false;
          pose.yaw = THREE.MathUtils.lerp(0, Math.PI * 0.08, a);
          pose.pos.set(0, Math.max(yWater, ground) * a + yWater * (1 - a), zz);
          return;
        }
        // pego pelo tubarão: arremessado para o alto, de forma cômica
        if (k < 1.7) {
          const a = k / 1.7;
          pose.anim = 'tossed';
          pose.prone = 0;
          pose.spin = k * 9;
          pose.gogglesDown = false;
          pose.pos.set(Math.sin(a * 3) * 0.6, -0.5 + Math.sin(a * Math.PI) * 5.2, z - a * 2.5);
          st.y = pose.pos.y;
          if (!st.diveSplash && a > 0.9) {
            st.diveSplash = true;
            splashBus.burst(pose.pos.x, 0.05, pose.pos.z, 1.4, 50);
            splashBus.ripple(pose.pos.x, 0, pose.pos.z, 2.5);
          }
        } else {
          tread('tread');
          pose.gogglesDown = false;
          pose.pos.set(Math.sin(3) * 0.6, st.y, z - 2.5);
        }
        return;
      }
      swim();
      return;
    }

    // ---------- Piscina / mar ----------
    const finished = sw.finished;
    const outcome = engine.outcome;
    const iWon = who === 'player' ? outcome === 'win' : outcome === 'lose';

    if (state === 'intro' || state === 'countdown') {
      if (isPool) {
        pose.anim = 'stand';
        pose.prone = 0;
        pose.gogglesDown = state === 'countdown';
        pose.pos.set(x, POOL.deckY + 0.67, POOL.startWall + 0.5);
        st.y = 0;
      } else {
        tread();
        pose.gogglesDown = state === 'countdown';
      }
      return;
    }
    // mergulho de largada (piscina)
    if (isPool && state === 'racing' && engine.time < 0.62 && !finished) {
      const a = clamp01(engine.time / 0.62);
      const from = new THREE.Vector3(x, POOL.deckY + 0.67, POOL.startWall + 0.5);
      const to = new THREE.Vector3(x, -0.06, z);
      pose.pos.lerpVectors(from, to, smooth(a));
      pose.pos.y += Math.sin(a * Math.PI) * 0.9;
      pose.anim = 'swim';
      pose.prone = 1;
      pose.spin = -Math.sin(a * Math.PI) * 0.55;
      pose.gogglesDown = true;
      st.y = pose.pos.y;
      if (!st.diveSplash && a > 0.8) {
        st.diveSplash = true;
        splashBus.burst(x, 0.05, z - 0.6, 1.2, 36);
        splashBus.ripple(x, 0, z - 0.5, 1.8);
        if (who === 'player') audio.splash();
      }
      return;
    }
    if (finished) {
      tread(state === 'outro' || state === 'done' ? (iWon ? 'cheerWater' : 'tread') : 'tread');
      pose.pos.z = -D;
      return;
    }
    swim();
  };
}

function makeSharkDrive(engine: RaceEngine) {
  const ambient = engine.cfg.waves.ambient;
  let y = -2.6;
  let yaw = 0;
  let pitch = 0;
  return (pose: SharkPose, t: number, dt: number) => {
    const sh = engine.shark!;
    const state = engine.state;
    const k = engine.stateTime;
    const px = Math.sin(t * 0.8) * 0.7;
    let z = -sh.distance + 1.7;
    const h = waterHeight(px, z, t, ambient, engine.waves.waves);
    let targetY = h - 0.42;
    let mouth = 0.25 + engine.sharkDanger * 0.75;
    let targetYaw = Math.sin(t * 0.8 + 1) * 0.12;
    let targetPitch = 0;
    pose.visible = true;
    pose.swim = 0.5 + sh.speed * 0.4;
    pose.grumpy = 0;
    if (state === 'intro') {
      if (k < 4.5) {
        pose.visible = false;
        y = -2.6;
      } else {
        targetY = k < 5.3 ? THREE.MathUtils.lerp(-2.6, h - 0.42, smooth((k - 4.5) / 0.8)) : h - 0.42;
        y = targetY;
        mouth = k > 5.3 ? 0.9 + Math.sin(t * 12) * 0.08 : 0.2;
      }
    } else if (state === 'countdown') {
      mouth = 0.5 + Math.sin(t * 3) * 0.3;
    } else if (state === 'outro' || state === 'done') {
      if (engine.outcome === 'caught') {
        const a = clamp01(k / 1.2);
        targetY = h - 0.42 + Math.sin(a * Math.PI) * 1.6;
        targetPitch = -Math.sin(a * Math.PI) * 0.6;
        mouth = a < 0.35 ? 1 : 0.1;
        z = -engine.player.distance + 1.2;
      } else {
        targetYaw = k > 1 ? Math.PI * 0.85 : 0;
        pose.grumpy = 1;
        mouth = 0.15;
        pose.swim = 0.3;
      }
    }
    y += (targetY - y) * Math.min(1, dt * 6);
    yaw += (targetYaw - yaw) * Math.min(1, dt * 3);
    pitch += (targetPitch - pitch) * Math.min(1, dt * 8);
    pose.pos.set(px, y, z);
    pose.yaw = yaw;
    pose.pitch = pitch;
    pose.mouth = mouth;
  };
}

function CameraRig({ engine }: { engine: RaceEngine }) {
  const { camera, size } = useThree();
  const pos = useRef(new THREE.Vector3(0, 6, 14));
  const look = useRef(new THREE.Vector3(0, 0, -5));
  const first = useRef(true);
  const sideK = useRef(0);
  const tmpP = useMemo(() => new THREE.Vector3(), []);
  const tmpL = useMemo(() => new THREE.Vector3(), []);
  const ambient = engine.cfg.waves.ambient;

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const cam = camera as THREE.PerspectiveCamera;
    const portrait = size.width / size.height < 0.9;
    const p = engine.player;
    const px = engine.playerX;
    const pz = -p.distance;
    const D = engine.cfg.distance;
    const k = engine.stateTime;
    const s = engine.state;
    const isShark = engine.kind === 'shark';
    const isPool = engine.kind === 'pool' || engine.kind === 'tutorial';
    let lerpK = 3.2;
    let fov = portrait ? 72 : 56;

    const follow = () => {
      const back = portrait ? 6.8 : 5.6;
      const up = portrait ? 3.6 : 2.9;
      const h = waterHeight(px, pz, t, ambient, engine.waves.waves);
      const cx = portrait ? px * 0.15 : px * 0.55;
      tmpP.set(cx, up + Math.sin(t * 1.6) * 0.05 + h * 0.45, pz + back);
      tmpL.set(portrait ? 0 : px * 0.3, 0.1 + h * 0.3, pz - 7);
    };
    const sharkFollow = () => {
      // Atrás da nadadora quando o tubarão está longe; gira para uma visão
      // lateral dramática quando ele se aproxima, para vê-lo chegando.
      const gap = Math.max(0, engine.sharkGap);
      const target = clamp01((9 - gap) / 5);
      sideK.current += (target - sideK.current) * Math.min(1, dt * 1.5);
      const k2 = smooth(sideK.current);
      const back = portrait ? 8.2 : 7;
      tmpP.set(px - 1.5, portrait ? 4.6 : 3.9, pz + back);
      tmpL.set(0, 0, pz - 4);
      tmpP.lerp(new THREE.Vector3(px + (portrait ? 9 : 7.5), 3.8, pz + gap * 0.5 + 1.2), k2);
      tmpL.lerp(new THREE.Vector3(0, 0.3, pz + gap * 0.45), k2);
    };
    if (isShark) {
      if (s === 'intro') {
        lerpK = 2.4;
        if (k < 3.0) {
          tmpP.set(6.8, 2.6, 5.4);
          tmpL.set(2.2, 1.4, 0.6);
        } else if (k < 4.5) {
          tmpP.set(7.5, 3.6, 7);
          tmpL.set(0.9, 0.9, 0.3);
        } else if (k < 6.0) {
          // por cima do ombro dela: vemos a nadadora olhando o tubarão chegando
          tmpP.set(-2.4, 2.6, -5.2);
          tmpL.set(0.4, 0.1, 6);
        } else {
          sharkFollow();
        }
        if (portrait && k < 6.0) tmpP.multiplyScalar(1.25);
      } else if (s === 'countdown' || s === 'racing' || s === 'finishing') {
        sharkFollow();
      } else if (engine.outcome === 'escaped') {
        lerpK = 1.6;
        tmpP.set(3.5, 3.2, -D - 13.5);
        tmpL.set(0, 0.9, -D - 2.5);
      } else {
        lerpK = 2;
        tmpP.set(7.5, 3.5, pz + 4);
        tmpL.set(0, 1.8, pz - 1.5);
      }
    } else if (s === 'intro') {
      const a = smooth(k / engine.introDuration);
      const start = isPool ? new THREE.Vector3(10, 9, -D * 0.6) : new THREE.Vector3(-14, 8, -26);
      const end = new THREE.Vector3(0, 3.4, 9.5);
      tmpP.lerpVectors(start, end, a);
      tmpL.lerpVectors(new THREE.Vector3(0, 0, -D * 0.4), new THREE.Vector3(0, 0.8, -3), a);
      lerpK = 6;
    } else if (s === 'countdown') {
      tmpP.set(0, 3.2, isPool ? 9.5 : 8.5);
      tmpL.set(0, 0.9, -3);
    } else if (engine.kind !== 'tutorial' && ((s === 'finishing' && p.finished) || s === 'outro' || s === 'done')) {
      lerpK = 1.6;
      const sway = Math.sin(t * 0.3) * 1.2;
      tmpP.set(px * 0.5 + 3 + sway, 2.4, -D - (isPool ? 4.6 : 6));
      tmpL.set(0, -0.2, -D + 0.5);
    } else {
      follow();
    }

    if (portrait && !isShark) fov = Math.max(fov, 70);
    if (first.current) {
      pos.current.copy(tmpP);
      look.current.copy(tmpL);
      first.current = false;
    }
    const f = 1 - Math.exp(-dt * lerpK);
    pos.current.lerp(tmpP, f);
    look.current.lerp(tmpL, Math.min(1, f * 1.4));
    cam.position.copy(pos.current);
    if (isShark && s === 'racing' && engine.sharkDanger > 0.75) cameraFx.shake = Math.max(cameraFx.shake, 0.05);
    if (cameraFx.shake > 0.001) {
      const a = cameraFx.shake;
      cam.position.x += (Math.random() - 0.5) * a;
      cam.position.y += (Math.random() - 0.5) * a;
      cameraFx.shake *= Math.exp(-dt * 9);
    }
    cam.lookAt(look.current);
    cam.rotateZ(Math.sin(t * 0.9) * 0.012 + Math.sin(t * 0.37) * 0.006);
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov += (fov - cam.fov) * Math.min(1, dt * 2);
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

function Lights({ variant, engine, quality }: { variant: 'pool' | SeaVariant; engine: RaceEngine; quality: 'high' | 'low' }) {
  const dir = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const follow = useRef<THREE.PointLight>(null);
  const follow2 = useRef<THREE.PointLight>(null);
  const cfg = {
    pool: { hemi: ['#e6f8ff', '#5d9fc4', 1.15], dir: ['#ffffff', 2.3], off: [5, 14, 6] },
    day: { hemi: ['#d6f2ff', '#3a86b5', 1.05], dir: ['#fff4dc', 2.5], off: [6, 12, -8] },
    night: { hemi: ['#7d80e8', '#141a46', 1.0], dir: ['#cdd6ff', 1.1], off: [3, 10, -12] },
    sunset: { hemi: ['#ffdcc8', '#4a6fb0', 1.0], dir: ['#ffc58a', 2.4], off: [-4, 6, -14] },
  }[variant];
  useFrame(() => {
    const z = -engine.player.distance;
    if (dir.current) {
      dir.current.position.set(cfg.off[0], cfg.off[1], z + cfg.off[2]);
      target.position.set(0, 0, z - 2);
      dir.current.target = target;
    }
    if (follow.current) follow.current.position.set(engine.playerX, 2.6, z + 1.2);
    if (follow2.current && engine.opponent) follow2.current.position.set(engine.opponentX, 2.6, -engine.opponent.swimmer.distance + 1.2);
  });
  const shadows = quality === 'high';
  return (
    <>
      <primitive object={target} />
      <hemisphereLight args={[cfg.hemi[0] as string, cfg.hemi[1] as string, cfg.hemi[2] as number]} />
      <ambientLight intensity={variant === 'night' ? 0.35 : 0.25} />
      <directionalLight
        ref={dir}
        color={cfg.dir[0] as string}
        intensity={cfg.dir[1] as number}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0008}
      />
      {variant === 'night' && (
        <>
          <pointLight ref={follow} color="#a8e4ff" intensity={14} distance={12} decay={1.4} />
          {engine.opponent && <pointLight ref={follow2} color="#ffc2ef" intensity={12} distance={12} decay={1.4} />}
        </>
      )}
    </>
  );
}

export function RaceWorld({ engine }: { engine: RaceEngine }) {
  const quality = useGame((s) => s.quality);
  const playerName = useGame((s) => s.playerName);
  const gender = useGame((s) => s.gender);
  const suitColor = useGame((s) => s.suitColor);
  const paused = useGame((s) => s.paused);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useFrame((_, dt) => {
    if (!pausedRef.current) engine.update(dt);
  }, -1);

  useEffect(
    () =>
      engine.on((e) => {
        if (e.type === 'stroke') {
          const sw = e.who === 'player' ? engine.player : engine.opponent!.swimmer;
          const side = sw.strokeCount % 2 ? 1 : -1;
          const power = e.result.long ? Math.min(1.3, e.result.efficiency) : 0.35;
          splashBus.burst(e.x + side * 0.32, 0.05, e.z - 0.9, power);
          splashBus.ripple(e.x + side * 0.3, 0, e.z - 0.9, 0.3 + power * 0.3);
        }
      }),
    [engine],
  );

  const kind = engine.kind;
  const isPool = kind === 'pool' || kind === 'tutorial';
  const variant: SeaVariant = kind === 'seaDay' ? 'day' : kind === 'seaNight' ? 'night' : 'sunset';
  const ambient = engine.cfg.waves.ambient;

  const playerLook = useMemo(
    () => ({ ...buildPlayerLook(gender, suitHex(suitColor)), label: playerName || 'VOCÊ', labelClass: 'swimmer-label player' }),
    [playerName, gender, suitColor],
  );
  const fabLook = useMemo(() => ({ ...FABIOLA_LOOK, label: 'FABIOLA MOLINA', labelClass: 'swimmer-label fabiola' }), []);
  const playerDrive = useMemo(() => makeDrive(engine, 'player'), [engine]);
  const oppDrive = useMemo(() => (engine.opponent ? makeDrive(engine, 'opponent') : null), [engine]);
  const sharkDrive = useMemo(() => (engine.shark ? makeSharkDrive(engine) : null), [engine]);
  const getWaves = useMemo(() => () => engine.waves.waves, [engine]);
  const followZ = useMemo(() => () => -engine.player.distance, [engine]);
  const shadows = quality === 'high';

  return (
    <>
      <Lights variant={isPool ? 'pool' : variant} engine={engine} quality={quality} />
      {isPool ? (
        <PoolScene length={kind === 'tutorial' ? 150 : engine.cfg.distance} crowd={kind !== 'tutorial'} quality={quality} lanes={kind === 'tutorial' ? 1 : isMobile ? 2 : 5} />
      ) : (
        <SeaScene
          variant={variant}
          distance={engine.cfg.distance}
          quality={quality}
          ambient={ambient}
          getWaves={getWaves}
          followZ={followZ}
          beach={kind === 'shark'}
          arch={kind !== 'shark'}
        />
      )}
      <Swimmer3D look={playerLook} drive={playerDrive} castShadow={shadows} />
      {oppDrive && <Swimmer3D look={fabLook} drive={oppDrive} castShadow={shadows} scale={1.04} />}
      {sharkDrive && <Shark3D drive={sharkDrive} castShadow={shadows} />}
      <Splashes max={quality === 'high' ? 500 : 260} />
      <CameraRig engine={engine} />
    </>
  );
}
