import type { OpponentConfig, SharkConfig } from '../config/balance.ts';
import { ENERGY } from '../config/balance.ts';
import { Swimmer, type StrokeResult, type SwimEnv } from './swimmer.ts';
import type { WaveWarning } from './waves.ts';

/**
 * Inteligência da Fabiola: ela usa exatamente a mesma física do jogador —
 * toca num ritmo constante (com pequenas variações) e respira na hora certa.
 * Nada é predeterminado: o resultado sai da simulação da corrida.
 */
export class OpponentAI {
  swimmer: Swimmer;
  cfg: OpponentConfig;
  rng: () => number;
  waitTimer = 0;

  constructor(swimmer: Swimmer, cfg: OpponentConfig, rng: () => number) {
    this.swimmer = swimmer;
    this.cfg = cfg;
    this.rng = rng;
    this.waitTimer = 0.05 + rng() * 0.12; // tempo de reação na largada
  }

  private nextInterval() {
    const c = this.cfg;
    // variação suave em torno do ritmo dela (soma de uniformes ~ normal)
    const g = (this.rng() + this.rng() + this.rng() - 1.5) * 1.4;
    return Math.max(0.1, c.tapInterval + g * c.tapJitter);
  }

  update(dt: number, env: SwimEnv, _warning: WaveWarning | null, active: boolean): StrokeResult | null {
    const s = this.swimmer;
    let result: StrokeResult | null = null;
    if (active && !s.finished) {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0 && !s.breathing) {
        if (s.energy <= this.cfg.breatheBelow && s.strokesSinceBreath >= 1) {
          // Respira na hora certa (~a cada 10 braçadas) e retoma o ritmo.
          s.breathe();
          this.waitTimer = ENERGY.breathTime + this.cfg.breathPause + this.cfg.breathDelay * (0.5 + this.rng());
        } else {
          result = s.stroke(env);
          this.waitTimer = this.nextInterval();
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

  /** Forma do dia (multiplica a velocidade). */
  form: number;

  constructor(cfg: SharkConfig, form = 1) {
    this.cfg = cfg;
    this.form = form;
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
      c.baseSpeed * this.form + c.speedRamp * t + c.surgeAmp * Math.sin((t / c.surgePeriod) * Math.PI * 2 - 0.6);
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
