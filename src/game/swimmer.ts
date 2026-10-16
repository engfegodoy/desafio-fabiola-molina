import { ENERGY, GLIDE, QUALITY, SWIM, ZONES, type PowerBarConfig } from '../config/balance.ts';

export type StrokeQuality = 'short' | 'perfect' | 'great' | 'good' | 'early' | 'passed';
export type StrokeZone = 'green' | 'yellow' | 'red' | 'tap';

export interface StrokeResult {
  quality: StrokeQuality;
  zone: StrokeZone;
  /** Eficiência final aplicada (0..~1.4). */
  efficiency: number;
  impulse: number;
  combo: number;
  comboBroken: boolean;
  comboUp: boolean;
  /** Braçada atropelada (ritmo ruim): "PERDEU O RITMO!". */
  rushed: boolean;
  /** Esta braçada desliza mais (bônus do combo x5). */
  glide: boolean;
  /** Acabou de ganhar o bônus de deslize. */
  glideEarned: boolean;
  charge: number;
  long: boolean;
  energyCost: number;
}

export type BreathOutcome = 'ok' | 'consecutive' | 'busy';

export interface BreathResult {
  outcome: BreathOutcome;
  valid: boolean;
  gain: number;
  energyBefore: number;
  energyAfter: number;
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

/** Rendimento (0..1) para um nível de energia: 100% acima de 50, caindo aos poucos abaixo. */
export function energyFactor(energy: number): number {
  if (energy >= ENERGY.fullAbove) return 1;
  const k = Math.max(0, energy) / ENERGY.fullAbove;
  return ENERGY.emptyEfficiency + (1 - ENERGY.emptyEfficiency) * Math.pow(k, ENERGY.curve);
}

/**
 * Modelo físico de um nadador. Puro (sem DOM / Three.js), usado pelo
 * jogador, pela Fabiola e pelo simulador de balanceamento.
 */
export class Swimmer {
  distance = 0;
  speed = 0;
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

  /** Energia 0..100 — só a respiração recupera. */
  energy = ENERGY.max;
  /** Rendimento "sentido" pelo corpo: segue a energia suavemente. */
  vigor = 1;
  /** Respiração em andamento (s restantes). */
  breathTimer = 0;
  breathCount = 0;
  /** Braçadas desde a última respiração (precisa ser >= 1 para respirar de novo). */
  strokesSinceBreath = 1;
  /** Apertou NADAR durante a respiração: começa a carregar quando ela terminar. */
  pendingPress = false;
  /** Braçadas seguidas no verde e bônus de deslize restante. */
  greenStreak = 0;
  glideLeft = 0;
  gliding = false;
  /** Freio temporário (zona vermelha). */
  private brakeMul = 1;
  private brakeLeft = 0;

  stats = {
    strokes: 0,
    perfect: 0,
    great: 0,
    good: 0,
    early: 0,
    passed: 0,
    short: 0,
    rushed: 0,
    breaths: 0,
    ignoredBreaths: 0,
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

  get comboMultiplier(): number {
    const c = Math.min(this.combo, SWIM.comboMax);
    return c <= 1 ? 1 : 1 + SWIM.comboStep * (c - 1);
  }

  get breathing(): boolean {
    return this.breathTimer > 0;
  }

  /** Começa a carregar a braçada. Retorna false se ficou aguardando a respiração terminar. */
  press(): boolean {
    if (this.finished || this.charging) return false;
    if (this.breathing) {
      this.pendingPress = true;
      return false;
    }
    this.charging = true;
    this.chargeTime = 0;
    return true;
  }

  /** Cancela a braçada em carregamento (ex.: gesto de respirar). */
  cancelCharge() {
    this.charging = false;
    this.pendingPress = false;
    this.chargeTime = 0;
  }

  private brake(mul: number, time: number) {
    this.brakeMul = Math.max(this.brakeMul, mul);
    this.brakeLeft = Math.max(this.brakeLeft, time);
  }

  /** Classifica a carga no momento de soltar. */
  classify(charge: number): { quality: StrokeQuality; zone: StrokeZone; eff: number } {
    const b = this.bar;
    if (charge < b.yellowStart) {
      const k = charge / b.yellowStart;
      return { quality: 'early', zone: 'red', eff: QUALITY.earlyMin + (QUALITY.earlyMax - QUALITY.earlyMin) * k };
    }
    if (charge < b.greenStart) {
      const k = (charge - b.yellowStart) / (b.greenStart - b.yellowStart);
      return { quality: 'good', zone: 'yellow', eff: QUALITY.goodMin + (QUALITY.goodMax - QUALITY.goodMin) * k };
    }
    if (charge <= b.greenEnd) {
      const center = (b.greenStart + b.greenEnd) / 2;
      const half = (b.greenEnd - b.greenStart) / 2;
      const u = Math.abs(charge - center) / half;
      if (u <= QUALITY.perfectCore) return { quality: 'perfect', zone: 'green', eff: QUALITY.perfect };
      return { quality: 'great', zone: 'green', eff: QUALITY.great };
    }
    if (charge <= b.yellowEnd) return { quality: 'passed', zone: 'yellow', eff: QUALITY.passedYellow };
    const k = Math.min(1, (charge - b.yellowEnd) / Math.max(0.01, 1 - b.yellowEnd));
    return { quality: 'passed', zone: 'red', eff: QUALITY.passedYellow - (QUALITY.passedYellow - QUALITY.passedRedMin) * k };
  }

  /** wallHold opcional: duração real do toque (mais precisa que os quadros). */
  release(env: SwimEnv = CALM_ENV, wallHold?: number): StrokeResult | null {
    this.pendingPress = false;
    if (!this.charging || this.finished) {
      this.charging = false;
      return null;
    }
    // O tempo real do toque é mais preciso que os quadros (e não depende do FPS).
    if (wallHold !== undefined && wallHold >= 0 && wallHold < 5) this.chargeTime = wallHold;
    this.charging = false;
    const holdTime = this.chargeTime;
    const charge = Math.min(1, holdTime / this.bar.chargeTime);
    const long = holdTime > SWIM.tapMaxTime;

    let quality: StrokeQuality;
    let zone: StrokeZone;
    let qualityEff: number;
    let base: number;
    let cost: number;
    if (!long) {
      quality = 'short';
      zone = 'tap';
      qualityEff = 1;
      base = SWIM.shortPower;
      cost = ENERGY.costShort;
    } else {
      const c = this.classify(charge);
      quality = c.quality;
      zone = c.zone;
      qualityEff = c.eff;
      base = SWIM.longPower;
      cost = zone === 'green' ? ENERGY.costGreen : zone === 'yellow' ? ENERGY.costYellow : ENERGY.costRed;
    }

    // Ritmo: braçadas atropeladas rendem menos e quebram o combo.
    const rhythm = Math.max(SWIM.rhythmFloor, Math.min(1, this.sinceStroke / SWIM.rhythmMinInterval));
    const rushed = rhythm < ZONES.rushBreaksBelow;

    // Combo
    let comboUp = false;
    const before = this.combo;
    if (rushed || zone === 'red') {
      this.combo = 0;
    } else if (zone === 'green') {
      if (rhythm >= 0.8) this.combo = Math.min(SWIM.comboMax, this.combo + 1);
      comboUp = this.combo >= 2 && this.combo > before;
      this.sinceHit = 0;
    } else if (zone === 'yellow') {
      this.combo = Math.max(0, this.combo - ZONES.yellowComboLoss);
    }
    const comboBroken = before >= 2 && this.combo < before && (rushed || zone === 'red' || this.combo <= 1);
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    if (zone === 'red') this.brake(ZONES.redDrag, ZONES.redDragTime);

    // A energia de ANTES da braçada define o rendimento (sentido de forma suave pelo vigor).
    const efficiency = qualityEff * rhythm * this.comboMultiplier * env.strokeMul * this.power * this.vigor;
    const impulse = base * efficiency;

    this.energy = Math.max(0, this.energy - cost);
    this.thrustLeft = SWIM.thrustTime;
    this.thrustAccel = this.thrustAccel * 0.3 + impulse / SWIM.thrustTime;
    this.sinceStroke = 0;
    this.strokeCount++;
    this.strokesSinceBreath++;
    this.lastStrokePower = long ? Math.min(1.3, efficiency) : 0.35;

    // Deslize: a cada 5 seguidas no verde, as 3 próximas braçadas vão mais longe.
    this.gliding = this.glideLeft > 0;
    if (this.gliding) this.glideLeft--;
    let glideEarned = false;
    if (zone === 'green' && !rushed) {
      this.greenStreak++;
      if (this.greenStreak % GLIDE.every === 0) {
        this.glideLeft = GLIDE.strokes;
        glideEarned = true;
      }
    } else {
      this.greenStreak = 0;
    }

    this.stats.strokes++;
    this.stats[quality]++;
    if (rushed) this.stats.rushed++;

    return {
      quality,
      zone,
      efficiency,
      impulse,
      combo: this.combo,
      comboBroken,
      comboUp,
      rushed,
      glide: this.gliding,
      glideEarned,
      charge,
      long,
      energyCost: cost,
    };
  }

  /**
   * RESPIRAR: devolve fôlego sem parar o nadador (a velocidade do momento é preservada,
   * sem aceleração extra). Respirar a mais não tem penalidade; duas seguidas sem braçada
   * no meio são ignoradas.
   */
  breathe(): BreathResult {
    const energyBefore = this.energy;
    const fail = (outcome: BreathOutcome): BreathResult => ({ outcome, valid: false, gain: 0, energyBefore, energyAfter: energyBefore });
    if (this.finished) return fail('busy');
    if (this.breathing) return fail('busy');
    if (this.strokesSinceBreath < 1) {
      this.stats.ignoredBreaths++;
      return fail('consecutive');
    }
    this.cancelCharge();
    const gain = Math.min(ENERGY.breathGain, ENERGY.max - energyBefore);
    this.energy = energyBefore + gain;
    this.breathTimer = ENERGY.breathTime;
    this.strokesSinceBreath = 0;
    this.breathCount++;
    this.stats.breaths++;
    return { outcome: 'ok', valid: true, gain, energyBefore, energyAfter: this.energy };
  }

  update(dt: number, env: SwimEnv = CALM_ENV): void {
    if (this.charging) this.chargeTime += dt;
    this.sinceStroke += dt;
    this.sinceHit += dt;

    if (this.combo > 0 && this.sinceHit > SWIM.comboTimeout) {
      this.combo = 0;
    }

    if (this.breathTimer > 0) {
      this.breathTimer = Math.max(0, this.breathTimer - dt);
      if (this.breathTimer === 0 && this.pendingPress) {
        this.pendingPress = false;
        this.charging = true;
        this.chargeTime = 0;
      }
    }

    // Cansaço: o rendimento acompanha a energia aos poucos (sem saltos).
    const target = energyFactor(this.energy);
    this.vigor += (target - this.vigor) * Math.min(1, dt * ENERGY.fatigueRate);
    const tired = (1 - this.vigor) / (1 - ENERGY.emptyEfficiency);

    if (this.brakeLeft > 0) {
      this.brakeLeft -= dt;
      if (this.brakeLeft <= 0) this.brakeMul = 1;
    }

    // Física
    let accel = env.push;
    if (this.thrustLeft > 0) {
      const t = Math.min(dt, this.thrustLeft);
      accel += this.thrustAccel * (t / dt);
      this.thrustLeft -= dt;
      if (this.thrustLeft <= 0) this.thrustAccel = 0;
    }
    const v = this.speed;
    const dragMul = env.dragMul * this.brakeMul * (1 + ENERGY.emptyExtraDrag * tired) * (this.gliding ? GLIDE.dragMul : 1);
    const drag = (SWIM.linearDrag * v + SWIM.quadDrag * v * v) * dragMul;
    this.speed = Math.max(0, Math.min(SWIM.maxSpeed, v + (accel - drag) * dt));
    this.distance += this.speed * dt;

    if (!this.finished) {
      this.stats.raceTime += dt;
      this.stats.speedSum += this.speed * dt;
      if (this.energy <= ENERGY.lowAt) this.stats.lowEnergyTime += dt;
    }
  }
}
