import { ENERGY, GLIDE, QUALITY, SWIM, type RhythmConfig } from '../config/balance.ts';

/** Qualidade de uma braçada, pelo ritmo (intervalo desde o toque anterior). */
export type StrokeQuality = 'perfect' | 'good' | 'slow';

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
  /** Onda puxando para trás (m/s). */
  pull?: number;
}

export const CALM_ENV: SwimEnv = { dragMul: 1, push: 0, strokeMul: 1, pull: 0 };

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
  /** A última braçada foi perfeita: desliza melhor até o próximo toque. */
  lastPerfect = false;
  /** Teto de velocidade atual (sobe com o combo, cai com o cansaço e as ondas). */
  speedCap = SWIM.maxSpeed;
  /** Intervalos recentes entre toques (para medir o ritmo). */
  private recent: number[] = [];
  /** Tempo restante em que a velocidade se mantém depois do toque. */
  private holdLeft = 0;
  /** Distância (m) em que o fôlego cai 25% (cada fase pede mais respirações). */
  breathEveryMeters = 18;
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
    breaths: 0,
    ignoredBreaths: 0,
    lowEnergyTime: 0,
    raceTime: 0,
    speedSum: 0,
  };

  constructor(rhythm: RhythmConfig, power = 1, breathEveryMeters = 18) {
    this.rhythm = rhythm;
    this.power = power;
    this.breathEveryMeters = breathEveryMeters;
  }

  /** Rendimento pelo ritmo: 5+ toques/s = 100%; cada toque/s a menos tira 10%. */
  static rateFactor(rate: number): number {
    return Math.max(SWIM.rateFloor, Math.min(1, 1 - SWIM.ratePenalty * (SWIM.fullRate - rate)));
  }

  get comboMultiplier(): number {
    const c = Math.min(this.combo, SWIM.comboMax);
    return c <= 1 ? 1 : 1 + SWIM.comboStep * (c - 1);
  }

  get breathing(): boolean {
    return this.breathTimer > 0;
  }

  /** Classifica pela velocidade dos toques: 1–2/s Devagar, 3–4/s Bom, 5+/s PERFEITO. */
  classify(interval: number): StrokeQuality {
    const r = this.rhythm;
    if (interval <= r.perfectBelow) return 'perfect';
    if (interval > r.slowAbove) return 'slow';
    return 'good';
  }

  /**
   * TOQUE = BRAÇADA NA HORA. Impulso instantâneo (sem segurar e soltar).
   * Retorna null se não pode nadar agora (ex.: no meio da respiração).
   */
  stroke(env: SwimEnv = CALM_ENV): StrokeResult | null {
    if (this.finished || this.breathing) return null;
    // Depois de respirar, o tempo da respiração não conta contra o ritmo.
    const raw = this.strokesSinceBreath === 0 ? this.sinceStroke - ENERGY.breathTime : this.sinceStroke;
    const interval = this.hasStroked ? Math.max(0.05, raw) : this.rhythm.slowAbove;
    // A primeira braçada (e a primeira depois de respirar) não é julgada como "devagar".
    const judged = this.hasStroked ? this.classify(interval) : 'good';
    const quality: StrokeQuality = judged === 'slow' && this.strokesSinceBreath === 0 ? 'good' : judged;
    this.hasStroked = true;

    // Combo: PERFEITO sobe 1; devagar só tira 1.
    let comboUp = false;
    const before = this.combo;
    if (quality === 'perfect') {
      this.combo = Math.min(SWIM.comboMax, this.combo + 1);
      comboUp = this.combo >= 2 && this.combo > before;
      this.sinceHit = 0;
    } else if (quality === 'slow') {
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

    // Ritmo medido pelos últimos toques: 5+/s = 100%, 4/s = 90%, 3/s = 80%...
    if (this.strokesSinceBreath > 0 || this.recent.length === 0) {
      this.recent.push(interval);
      if (this.recent.length > SWIM.rateWindow) this.recent.shift();
    }
    const avg = this.recent.reduce((a, b) => a + b, 0) / this.recent.length;
    const rateFactor = Swimmer.rateFactor(1 / Math.max(0.05, avg));
    const efficiency = rateFactor * this.comboMultiplier * env.strokeMul * this.power * this.vigor;
    // Impulso imediato: a velocidade vai na hora para a velocidade do seu ritmo.
    this.speedCap = SWIM.maxSpeed * efficiency;
    const impulse = Math.max(0, this.speedCap - this.speed);
    // A cada toque a velocidade vai para a do momento (ritmo, combo, fôlego e ondas).
    this.speed = this.speedCap;
    this.holdLeft = SWIM.holdTime;
    this.lastPerfect = quality === 'perfect';
    void QUALITY;
    // O fôlego cai pela distância nadada (no update), não por braçada.
    const cost = 0;
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

    // Freio da água: depois de um instante, a velocidade cai rápido até o deslize mínimo
    // (nunca para de vez). Braçada perfeita e o bônus de 5 perfeitas seguidas deslizam melhor.
    const decay =
      SWIM.waterDecay *
      env.dragMul *
      (1 + ENERGY.emptyExtraDrag * tired) *
      (this.gliding ? GLIDE.dragMul : 1) *
      (this.lastPerfect ? SWIM.perfectGlide : 1);
    const floor = this.hasStroked && !this.finished ? SWIM.driftSpeed : 0;
    let v = this.speed;
    if (this.holdLeft > 0) this.holdLeft -= dt;
    else if (v > floor) v = floor + (v - floor) * Math.exp(-decay * dt);
    v += env.push * dt;
    this.speed = Math.max(0, Math.min(SWIM.maxSpeed * 1.5, v));
    // A onda puxa para trás: com força suficiente, o nadador recua um pouco.
    const pull = this.finished ? 0 : env.pull ?? 0;
    const move = Math.max(-SWIM.maxBackSpeed, this.speed - pull);
    this.distance = Math.max(0, this.distance + move * dt);
    // Fôlego cai com a distância nadada (cada fase pede mais respirações), igual para qualquer ritmo.
    if (this.hasStroked && !this.finished && move > 0) {
      this.energy = Math.max(0, this.energy - move * dt * (ENERGY.breathGain / this.breathEveryMeters));
    }
    this.smoothSpeed += (this.speed - this.smoothSpeed) * Math.min(1, dt * 3);

    if (!this.finished) {
      this.stats.raceTime += dt;
      this.stats.speedSum += this.speed * dt;
      if (this.energy <= ENERGY.lowAt) this.stats.lowEnergyTime += dt;
    }
  }
}
