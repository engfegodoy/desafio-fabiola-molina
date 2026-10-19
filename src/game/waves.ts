import type { WaveConfig } from '../config/balance.ts';
import type { SwimEnv } from './swimmer.ts';

export interface Wave {
  id: number;
  /** Posição no mundo (eixo Z). A prova avança no sentido -Z. */
  z: number;
  /** 'front' = vem de frente (contra), 'back' = vem de trás (a favor). */
  kind: 'front' | 'back';
  speed: number;
  strength: number;
  width: number;
  height: number;
  /** 0..1 — usado para surgir/desaparecer suavemente. */
  fade: number;
}

export interface WaveWarning {
  id: number;
  kind: 'front' | 'back';
  /** Distância (m) até chegar ao nadador. */
  distance: number;
  /** Intensidade atual que o nadador está sentindo (0..1). */
  inside: number;
}

/** Gerador pseudoaleatório simples com semente. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MAX_WAVES = 6;

/** Campo de ondas do mar: cria, move e calcula o efeito das ondas. */
export class WaveField {
  waves: Wave[] = [];
  cfg: WaveConfig;
  rng: () => number;
  timer: number;
  time = 0;
  private nextId = 1;

  constructor(cfg: WaveConfig, seed: number) {
    this.cfg = cfg;
    this.rng = mulberry32(seed);
    this.timer = 1.5;
  }

  private rand(a: number, b: number) {
    return a + (b - a) * this.rng();
  }

  spawn(anchorZ: number, kind?: 'front' | 'back') {
    const c = this.cfg;
    const k = kind ?? (this.rng() < c.frontChance ? 'front' : 'back');
    const strength = this.rand(c.strengthMin, c.strengthMax);
    this.waves.push({
      id: this.nextId++,
      z: k === 'front' ? anchorZ - this.rand(26, 32) : anchorZ + this.rand(16, 20),
      kind: k,
      speed: k === 'front' ? c.frontSpeed : c.backSpeed,
      strength,
      width: c.width * this.rand(0.85, 1.15),
      height: c.height * (0.6 + 0.4 * strength),
      fade: 0,
    });
  }

  /** anchorZ = posição do nadador de referência (jogador). */
  update(dt: number, anchorZ: number, spawning: boolean) {
    this.time += dt;
    if (!this.cfg.enabled) return;
    if (spawning) {
      this.timer -= dt;
      if (this.timer <= 0 && this.waves.length < MAX_WAVES) {
        this.spawn(anchorZ);
        this.timer = this.rand(this.cfg.intervalMin, this.cfg.intervalMax);
      }
    }
    for (const w of this.waves) {
      w.z += (w.kind === 'front' ? 1 : -1) * w.speed * dt;
      w.fade = Math.min(1, w.fade + dt * 0.8);
    }
    this.waves = this.waves.filter((w) => w.z < anchorZ + 45 && w.z > anchorZ - 70);
  }

  /** Efeito das ondas em um ponto Z do percurso. */
  envAt(z: number): SwimEnv {
    const c = this.cfg;
    let dragMul = 1;
    let push = 0;
    let strokeMul = 1;
    let pull = 0;
    if (c.dragVariation > 0) {
      const t = this.time;
      dragMul *= 1 + c.dragVariation * Math.sin(t * 0.45) * (0.6 + 0.4 * Math.sin(t * 0.17 + 1.3));
    }
    for (const w of this.waves) {
      const d = (z - w.z) / w.width;
      const s = w.strength * w.fade * Math.exp(-d * d);
      if (s < 0.01) continue;
      if (w.kind === 'front') {
        dragMul += c.frontDrag * s;
        push -= c.frontPush * s;
        strokeMul *= 1 - c.frontStrokePenalty * s;
        pull += c.frontPull * s;
      } else {
        push += c.backPush * s;
        strokeMul *= 1 + c.backStrokeBonus * s;
      }
    }
    return { dragMul, push, strokeMul, pull };
  }

  /** Onda mais próxima que está chegando (para o aviso do HUD). */
  warningFor(z: number): WaveWarning | null {
    let best: WaveWarning | null = null;
    for (const w of this.waves) {
      const ahead = w.kind === 'front' ? z - w.z : w.z - z; // > 0 = ainda vai chegar
      const d = (z - w.z) / w.width;
      const inside = w.strength * w.fade * Math.exp(-d * d);
      if (ahead < -w.width * 1.2 || ahead > 14) continue;
      const dist = Math.max(0, ahead);
      if (!best || dist < best.distance || inside > best.inside) {
        best = { id: w.id, kind: w.kind, distance: dist, inside };
      }
    }
    return best;
  }
}

/** Altura da água — a mesma fórmula do shader, para os nadadores boiarem junto. */
export function waterHeight(x: number, z: number, t: number, ambient: number, waves: Wave[]): number {
  let h =
    ambient *
    (Math.sin(x * 0.55 + t * 1.1) * 0.5 +
      Math.sin(z * 0.42 - t * 1.4) * 0.6 +
      Math.sin((x + z) * 0.9 + t * 2.1) * 0.25);
  for (const w of waves) {
    const d = (z - w.z) / w.width;
    h += w.height * w.fade * Math.exp(-d * d);
  }
  return h;
}
