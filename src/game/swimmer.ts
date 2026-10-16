import { QUALITY, SWIM, type PowerBarConfig } from '../config/balance.ts';

export type StrokeQuality = 'short' | 'perfect' | 'great' | 'good' | 'early' | 'passed';

export interface StrokeResult {
  quality: StrokeQuality;
  /** Eficiência final aplicada (0..~1.4). */
  efficiency: number;
  impulse: number;
  combo: number;
  comboBroken: boolean;
  comboUp: boolean;
  charge: number;
  long: boolean;
}

/** Ambiente local recebido a cada atualização (ondas, correnteza...). */
export interface SwimEnv {
  /** Multiplicador da resistência da água. */
  dragMul: number;
  /** Força externa (m/s²), positiva = a favor. */
  push: number;
  /** Multiplicador de eficiência da braçada. */
  strokeMul: number;
}

export const CALM_ENV: SwimEnv = { dragMul: 1, push: 0, strokeMul: 1 };

/**
 * Modelo físico de um nadador. Puro (sem DOM / Three.js), usado pelo
 * jogador, pela Fabiola e pelo simulador de balanceamento.
 */
export class Swimmer {
  distance = 0;
  speed = 0;
  energy = SWIM.energyMax;
  combo = 0;
  maxCombo = 0;
  charging = false;
  chargeTime = 0;
  /** Tempo desde a última braçada. */
  sinceStroke = 99;
  /** Tempo desde o último acerto (para o timeout do combo). */
  sinceHit = 99;
  thrustAccel = 0;
  thrustLeft = 0;
  finished = false;
  finishTime = 0;
  /** Contador de braçadas — usado pela animação dos braços. */
  strokeCount = 0;
  lastStrokePower = 0;
  power = 1;
  bar: PowerBarConfig;

  stats = {
    strokes: 0,
    perfect: 0,
    great: 0,
    good: 0,
    early: 0,
    passed: 0,
    short: 0,
    lowEnergyTime: 0,
    raceTime: 0,
    speedSum: 0,
  };

  constructor(bar: PowerBarConfig, power = 1) {
    this.bar = bar;
    this.power = power;
  }

  /** Carga atual da barra (0..1). */
  get charge(): number {
    return this.charging ? Math.min(1, this.chargeTime / this.bar.chargeTime) : 0;
  }

  get energyEfficiency(): number {
    const e = this.energy;
    if (e >= SWIM.energyLowThreshold) return 1;
    const k = e / SWIM.energyLowThreshold;
    return SWIM.energyEmptyEfficiency + (1 - SWIM.energyEmptyEfficiency) * k;
  }

  get comboMultiplier(): number {
    const c = Math.min(this.combo, SWIM.comboMax);
    return c <= 1 ? 1 : 1 + SWIM.comboStep * (c - 1);
  }

  press(): void {
    if (this.finished || this.charging) return;
    this.charging = true;
    this.chargeTime = 0;
  }

  /** Classifica a carga no momento de soltar. */
  classify(charge: number): { quality: StrokeQuality; eff: number } {
    const b = this.bar;
    if (charge < b.yellowStart) {
      const k = charge / b.yellowStart;
      return { quality: 'early', eff: QUALITY.earlyMin + (QUALITY.earlyMax - QUALITY.earlyMin) * k };
    }
    if (charge < b.greenStart) {
      const k = (charge - b.yellowStart) / (b.greenStart - b.yellowStart);
      return { quality: 'good', eff: QUALITY.goodMin + (QUALITY.goodMax - QUALITY.goodMin) * k };
    }
    if (charge <= b.greenEnd) {
      const center = (b.greenStart + b.greenEnd) / 2;
      const half = (b.greenEnd - b.greenStart) / 2;
      const u = Math.abs(charge - center) / half;
      if (u <= QUALITY.perfectCore) return { quality: 'perfect', eff: QUALITY.perfect };
      return { quality: 'great', eff: QUALITY.great };
    }
    if (charge <= b.yellowEnd) return { quality: 'passed', eff: QUALITY.passedYellow };
    const k = Math.min(1, (charge - b.yellowEnd) / Math.max(0.01, 1 - b.yellowEnd));
    return { quality: 'passed', eff: QUALITY.passedYellow - (QUALITY.passedYellow - QUALITY.passedRedMin) * k };
  }

  /** holdTime opcional: duração real do toque (mais precisa que os quadros). */
  release(env: SwimEnv = CALM_ENV, wallHold?: number): StrokeResult | null {
    if (!this.charging || this.finished) {
      this.charging = false;
      return null;
    }
    if (wallHold !== undefined && wallHold >= 0 && Math.abs(wallHold - this.chargeTime) < 0.25) this.chargeTime = wallHold;
    this.charging = false;
    const holdTime = this.chargeTime;
    const charge = Math.min(1, holdTime / this.bar.chargeTime);
    const long = holdTime > SWIM.tapMaxTime;

    let quality: StrokeQuality;
    let qualityEff: number;
    let base: number;
    let cost: number;
    if (!long) {
      quality = 'short';
      qualityEff = 1;
      base = SWIM.shortPower;
      cost = SWIM.energyCostShort;
    } else {
      const c = this.classify(charge);
      quality = c.quality;
      qualityEff = c.eff;
      base = SWIM.longPower;
      cost = SWIM.energyCostLongBase + SWIM.energyCostLongExtra * charge;
    }

    // Ritmo: braçadas atropeladas rendem menos.
    const rhythm = Math.max(
      SWIM.rhythmFloor,
      Math.min(1, this.sinceStroke / SWIM.rhythmMinInterval),
    );

    // Combo
    let comboUp = false;
    let comboBroken = false;
    if (quality === 'perfect' || quality === 'great') {
      if (rhythm >= 0.8) {
        const before = this.combo;
        this.combo = Math.min(SWIM.comboMax, this.combo + 1);
        comboUp = this.combo >= 2 && this.combo > before;
      }
      this.sinceHit = 0;
    } else if (quality === 'early' || quality === 'passed') {
      comboBroken = this.combo >= 2;
      this.combo = 0;
    }
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    const efficiency =
      qualityEff * rhythm * this.energyEfficiency * this.comboMultiplier * env.strokeMul * this.power;
    const impulse = base * efficiency;

    this.thrustLeft = SWIM.thrustTime;
    this.thrustAccel = this.thrustAccel * 0.3 + impulse / SWIM.thrustTime;
    this.energy = Math.max(0, this.energy - cost);
    this.sinceStroke = 0;
    this.strokeCount++;
    this.lastStrokePower = long ? Math.min(1.3, efficiency) : 0.35;

    this.stats.strokes++;
    this.stats[quality]++;

    return { quality, efficiency, impulse, combo: this.combo, comboBroken, comboUp, charge, long };
  }

  update(dt: number, env: SwimEnv = CALM_ENV): void {
    if (this.charging) this.chargeTime += dt;
    this.sinceStroke += dt;
    this.sinceHit += dt;

    if (this.combo > 0 && this.sinceHit > SWIM.comboTimeout) {
      this.combo = 0;
    }

    // Energia
    let regen = SWIM.energyRegenPassive;
    if (!this.charging && this.sinceStroke > SWIM.restDelay) regen += SWIM.energyRegenRest;
    if (this.charging) regen = SWIM.energyRegenPassive * 0.5;
    this.energy = Math.min(SWIM.energyMax, this.energy + regen * dt);

    // Física
    let accel = env.push;
    if (this.thrustLeft > 0) {
      const t = Math.min(dt, this.thrustLeft);
      accel += this.thrustAccel * (t / dt);
      this.thrustLeft -= dt;
      if (this.thrustLeft <= 0) this.thrustAccel = 0;
    }
    const v = this.speed;
    const drag = (SWIM.linearDrag * v + SWIM.quadDrag * v * v) * env.dragMul;
    this.speed = Math.max(0, Math.min(SWIM.maxSpeed, v + (accel - drag) * dt));
    this.distance += this.speed * dt;

    if (!this.finished) {
      this.stats.raceTime += dt;
      this.stats.speedSum += this.speed * dt;
      if (this.energy < SWIM.energyLowThreshold) this.stats.lowEnergyTime += dt;
    }
  }
}
