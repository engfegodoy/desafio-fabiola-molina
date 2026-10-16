import type { OpponentConfig, SharkConfig } from '../config/balance.ts';
import { ENERGY, QUALITY } from '../config/balance.ts';
import { Swimmer, type StrokeResult, type SwimEnv } from './swimmer.ts';
import type { WaveWarning } from './waves.ts';

/**
 * Inteligência da Fabiola: ela usa exatamente a mesma física do jogador,
 * decidindo quando segurar e soltar a braçada e quando respirar. Nada é predeterminado —
 * o resultado sai da simulação da corrida.
 */
export class OpponentAI {
  swimmer: Swimmer;
  cfg: OpponentConfig;
  rng: () => number;
  state: 'wait' | 'charging' = 'wait';
  target = 0.7;
  waitTimer = 0;

  constructor(swimmer: Swimmer, cfg: OpponentConfig, rng: () => number) {
    this.swimmer = swimmer;
    this.cfg = cfg;
    this.rng = rng;
    this.waitTimer = 0.05 + rng() * 0.12; // tempo de reação na largada
  }

  private pickTarget(): number {
    const b = this.swimmer.bar;
    const r = this.rng();
    const center = (b.greenStart + b.greenEnd) / 2;
    const half = (b.greenEnd - b.greenStart) / 2;
    const core = half * QUALITY.perfectCore;
    const c = this.cfg;
    if (r < c.perfectRate) return center - core * 0.7 + this.rng() * core * 1.1;
    if (r < c.perfectRate + c.greatRate) {
      const side = this.rng() < 0.5 ? -1 : 1;
      return center + side * (core + (half - core) * (0.25 + this.rng() * 0.6));
    }
    if (r < c.perfectRate + c.greatRate + c.goodRate) {
      return b.yellowStart + (b.greenStart - b.yellowStart) * (0.35 + this.rng() * 0.6);
    }
    return this.rng() < 0.5 ? b.yellowStart * (0.6 + this.rng() * 0.35) : b.greenEnd + 0.02 + this.rng() * 0.08;
  }

  update(dt: number, env: SwimEnv, _warning: WaveWarning | null, active: boolean): StrokeResult | null {
    const s = this.swimmer;
    let result: StrokeResult | null = null;
    if (active && !s.finished) {
      switch (this.state) {
        case 'wait':
          this.waitTimer -= dt;
          if (this.waitTimer <= 0) {
            if (s.energy <= this.cfg.breatheBelow && s.strokesSinceBreath >= 1) {
              // Respira na hora certa (~a cada 5 braçadas) e retoma o ritmo.
              s.breathe();
              this.waitTimer = ENERGY.breathTime + this.cfg.breathPause + this.cfg.breathDelay * (0.5 + this.rng());
            } else {
              this.target = this.pickTarget();
              s.press();
              this.state = 'charging';
            }
          }
          break;
        case 'charging': {
          // Solta no instante exato do alvo, independente da taxa de quadros.
          const need = this.target * s.bar.chargeTime;
          if (s.chargeTime + dt >= need) {
            s.chargeTime = need;
            result = s.release(env);
            this.state = 'wait';
            this.waitTimer = this.cfg.pauseMin + this.rng() * (this.cfg.pauseMax - this.cfg.pauseMin);
          }
          break;
        }
      }
    }
    s.update(dt, env);
    return result;
  }
}

/** Tubarão cartunesco que persegue o jogador. */
export class Shark {
  cfg: SharkConfig;
  distance: number;
  speed = 0;
  time = 0;

  constructor(cfg: SharkConfig) {
    this.cfg = cfg;
    this.distance = -cfg.startGap;
  }

  update(dt: number, playerDistance: number) {
    this.time += dt;
    const c = this.cfg;
    if (this.time < c.startDelay) {
      this.speed = 0;
      return;
    }
    const t = this.time - c.startDelay;
    const ramp = Math.min(1, t / 2); // arrancada inicial
    let target =
      c.baseSpeed + c.speedRamp * t + c.surgeAmp * Math.sin((t / c.surgePeriod) * Math.PI * 2 - 0.6);
    const gap = playerDistance - this.distance;
    // Se ficar muito para trás, ele dá uma acelerada para continuar no encalço.
    if (gap > 15) target += (gap - 15) * 0.12;
    target *= ramp;
    // Pausa para respirar: quase para — é a chance de abrir vantagem.
    if (this.breathing) target *= c.breathSpeed;
    this.speed += (target - this.speed) * Math.min(1, dt * 2.5);
    this.distance += this.speed * dt;
  }

  /** O tubarão está parado respirando? (ciclo fixo: a cada breathEvery s, por breathTime s) */
  get breathing() {
    const t = this.time - this.cfg.startDelay;
    if (t <= 0) return false;
    const ph = t % this.cfg.breathEvery;
    return ph > this.cfg.breathEvery - this.cfg.breathTime;
  }

  gapTo(playerDistance: number) {
    return playerDistance - this.distance;
  }
}
