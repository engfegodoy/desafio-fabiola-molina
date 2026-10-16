import { ENERGY, GLIDE, QUALITY, SWIM, type RhythmConfig } from '../config/balance.ts';

/** Qualidade de uma braçada, pelo ritmo (intervalo desde o toque anterior). */
export type StrokeQuality = 'perfect' | 'good' | 'slow' | 'rushed';

export interface StrokeResult {
  quality: StrokeQuality;
  /** Intervalo (s) desde a braçada anterior. */
  interval: number;
  /** Eficiência final aplicada (0..~1.3). */
  efficiency: number;
  impulse: number;
  combo: number;
  comboBroken: boolean;
  comboUp: boolean;
  /** Rápido demais (amassando o botão). */
  rushed: boolean;
  /** Esta braçada desliza mais (bônus de 5 perfeitas seguidas). */
  glide: boolean;
  /** Acabou de ganhar o bônus de deslize. */
  glideEarned: boolean;
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

/** Rendimento (0..1) para um nível de energia: 100% até o limite, caindo aos poucos abaixo. */
export function energyFactor(energy: number): number {
  if (energy >= ENERGY.fullAbove) return 1;
  const k = Math.max(0, energy) / ENERGY.fullAbove;
  return ENERGY.emptyEfficiency + (1 - ENERGY.emptyEfficiency) * Math.pow(k, ENERGY.curve);
}

/**
 * Modelo físico de um nadador (estilo Flappy Bird): cada toque é uma braçada
 * imediata, com impulso instantâneo; entre os toques a água freia rápido.
 * Puro (sem DOM / Three.js), usado pelo jogador, pela Fabiola e pelo simulador.
 */
export class Swimmer {
  distance = 0;
  speed = 0;
  /** Velocidade suavizada (para a barra de ritmo do HUD). */
  smoothSpeed = 0;
  /** Toques por segundo, suavizado. */
  tapRate = 0;
  combo = 0;
  maxCombo = 0;
  /** Tempo desde a última braçada. */
  sinceStroke = 99;
  /** Tempo desde o último acerto (para o timeout do combo). */
  sinceHit = 99;
  finished = false;
  finishTime = 0;
  /** Contador de braçadas — usado pela animação dos braços. */
  strokeCount = 0;
  lastStrokePower = 0;
  lastQuality: StrokeQuality | null = null;
  power = 1;
  rhythm: RhythmConfig;

  /** Energia 0..max — só a respiração recupera. */
  energy = ENERGY.max;
  /** Rendimento "sentido" pelo corpo: segue a energia suavemente. */
  vigor = 1;
  /** Respiração em andamento (s restantes). */
  breathTimer = 0;
  breathCount = 0;
  /** Braçadas desde a última respiração (precisa ser >= 1 para respirar de novo). */
  strokesSinceBreath = 1;
  /** Braçadas perfeitas seguidas e bônus de deslize restante. */
  perfectStreak = 0;
  glideLeft = 0;
  gliding = false;
  private hasStroked = false;

  stats = {
    strokes: 0,
    perfect: 0,
    good: 0,
    slow: 0,
    rushed: 0,
    breaths: 0,
    ignoredBreaths: 0,
    lowEnergyTime: 0,
    raceTime: 0,
    speedSum: 0,
  };

  constructor(rhythm: RhythmConfig, power = 1) {
    this.rhythm = rhythm;
    this.power = power;
  }

  get comboMultiplier(): number {
    const c = Math.min(this.combo, SWIM.comboMax);
    return c <= 1 ? 1 : 1 + SWIM.comboStep * (c - 1);
  }

  get breathing(): boolean {
    return this.breathTimer > 0;
  }

  /** Classifica o ritmo pelo intervalo entre dois toques. */
  classify(interval: number): StrokeQuality {
    const r = this.rhythm;
    if (interval < r.rushBelow) return 'rushed';
    if (interval >= r.perfectMin && interval <= r.perfectMax) return 'perfect';
    if (interval > r.slowAbove) return 'slow';
    return 'good';
  }

  /**
   * TOQUE = BRAÇADA NA HORA. Impulso instantâneo (sem segurar e soltar).
   * Retorna null se não pode nadar agora (ex.: no meio da respiração).
   */
  stroke(env: SwimEnv = CALM_ENV): StrokeResult | null {
    if (this.finished || this.breathing) return null;
    const interval = this.hasStroked ? this.sinceStroke : (this.rhythm.perfectMin + this.rhythm.perfectMax) / 2;
    // A primeira braçada (e a primeira depois de respirar) não é julgada como "devagar".
    const judged = this.hasStroked && this.strokesSinceBreath > 0 ? this.classify(interval) : 'good';
    const quality: StrokeQuality = judged === 'slow' && this.strokesSinceBreath === 0 ? 'good' : judged;
    this.hasStroked = true;

    // Combo: ritmo perfeito sobe 1; errar (devagar ou rápido demais) só tira 1.
    let comboUp = false;
    const before = this.combo;
    if (quality === 'perfect') {
      this.combo = Math.min(SWIM.comboMax, this.combo + 1);
      comboUp = this.combo >= 2 && this.combo > before;
      this.sinceHit = 0;
    } else if (quality === 'slow' || quality === 'rushed') {
      this.combo = Math.max(0, this.combo - 1);
    } else {
      this.sinceHit = 0;
    }
    const comboBroken = before >= 2 && this.combo < before;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    // Deslize: a cada 5 perfeitas seguidas, as 3 próximas braçadas vão mais longe.
    this.gliding = this.glideLeft > 0;
    if (this.gliding) this.glideLeft--;
    let glideEarned = false;
    if (quality === 'perfect') {
      this.perfectStreak++;
      if (this.perfectStreak % GLIDE.every === 0) {
        this.glideLeft = GLIDE.strokes;
        glideEarned = true;
      }
    } else {
      this.perfectStreak = 0;
    }

    const qualityEff = QUALITY[quality];
    const efficiency = qualityEff * this.comboMultiplier * env.strokeMul * this.power * this.vigor;
    // Impulso instantâneo: com o freio da água, cada braçada rende ~strokeDistance metros.
    const impulse = SWIM.waterDecay * SWIM.strokeDistance * efficiency;
    this.speed = Math.min(SWIM.maxSpeed, this.speed + impulse);

    const cost = quality === 'rushed' ? ENERGY.costRushed : ENERGY.costStroke;
    this.energy = Math.max(0, this.energy - cost);
    this.tapRate += (1 / Math.max(0.12, interval) - this.tapRate) * 0.35;
    this.sinceStroke = 0;
    this.strokeCount++;
    this.strokesSinceBreath++;
    this.lastStrokePower = Math.min(1.3, efficiency);
    this.lastQuality = quality;

    this.stats.strokes++;
    this.stats[quality]++;

    return {
      quality,
      interval,
      efficiency,
      impulse,
      combo: this.combo,
      comboBroken,
      comboUp,
      rushed: quality === 'rushed',
      glide: this.gliding,
      glideEarned,
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
    const gain = Math.min(ENERGY.breathGain, ENERGY.max - energyBefore);
    this.energy = energyBefore + gain;
    this.breathTimer = ENERGY.breathTime;
    this.strokesSinceBreath = 0;
    this.breathCount++;
    this.stats.breaths++;
    return { outcome: 'ok', valid: true, gain, energyBefore, energyAfter: this.energy };
  }

  update(dt: number, env: SwimEnv = CALM_ENV): void {
    this.sinceStroke += dt;
    this.sinceHit += dt;

    if (this.combo > 0 && this.sinceHit > SWIM.comboTimeout) this.combo = 0;
    if (this.breathTimer > 0) this.breathTimer = Math.max(0, this.breathTimer - dt);
    if (this.sinceStroke > 1.2) this.tapRate *= Math.exp(-dt * 2);

    // Cansaço: o rendimento acompanha a energia aos poucos (sem saltos).
    const target = energyFactor(this.energy);
    this.vigor += (target - this.vigor) * Math.min(1, dt * ENERGY.fatigueRate);
    const tired = (1 - this.vigor) / (1 - ENERGY.emptyEfficiency);

    // Freio da água: a velocidade cai rápido até o deslize mínimo (nunca para de vez).
    const decay = SWIM.waterDecay * env.dragMul * (1 + ENERGY.emptyExtraDrag * tired) * (this.gliding ? GLIDE.dragMul : 1);
    const floor = this.hasStroked && !this.finished ? SWIM.driftSpeed : 0;
    let v = this.speed;
    if (v > floor) v = floor + (v - floor) * Math.exp(-decay * dt);
    v += env.push * dt;
    this.speed = Math.max(0, Math.min(SWIM.maxSpeed, v));
    this.distance += this.speed * dt;
    this.smoothSpeed += (this.speed - this.smoothSpeed) * Math.min(1, dt * 3);

    if (!this.finished) {
      this.stats.raceTime += dt;
      this.stats.speedSum += this.speed * dt;
      if (this.energy <= ENERGY.lowAt) this.stats.lowEnergyTime += dt;
    }
  }
}
