import { ENERGY, LANES, STAGES, SWIM, TIMING, type PhaseId, type StageConfig, type StageKind } from '../config/balance.ts';
import { OpponentAI, Shark } from './opponent.ts';
import { Swimmer, type BreathResult, type StrokeResult } from './swimmer.ts';
import { mulberry32, WaveField, type WaveWarning } from './waves.ts';

export type RaceState = 'intro' | 'countdown' | 'racing' | 'finishing' | 'outro' | 'done';
export type Outcome = 'win' | 'lose' | 'escaped' | 'caught';

export interface ScoreBreakdown {
  velocidade: number;
  resistencia: number;
  tecnica: number;
  conquista: number;
}

export interface PhaseResult {
  phase: PhaseId;
  won: boolean;
  outcome: Outcome;
  playerTime: number;
  opponentTime?: number;
  sharkGap?: number;
  score: number;
  breakdown: ScoreBreakdown;
  maxCombo: number;
  perfects: number;
  strokes: number;
  breaths: number;
}

export type EngineEvent =
  | { type: 'stroke'; who: 'player' | 'opponent'; result: StrokeResult; x: number; z: number }
  | { type: 'state'; state: RaceState }
  | { type: 'countdown'; n: number }
  | { type: 'finish'; who: 'player' | 'opponent' }
  | { type: 'tutorialStep'; step: number }
  | { type: 'tutorialComplete' }
  | { type: 'caught' }
  | { type: 'escaped' }
  | { type: 'result'; result: PhaseResult }
  | { type: 'wave'; kind: 'front' | 'back' }
  | { type: 'comboLost' }
  | { type: 'breath'; who: 'player'; result: BreathResult }
  | { type: 'energy'; level: 'warn' | 'low' | 'critical' };

type Listener = (e: EngineEvent) => void;

/** Treino obrigatório: 15 braçadas no verde e 2 respirações válidas. */
export const TUTORIAL_STEPS = [
  { key: 'swim', need: 5 },
  { key: 'breath', need: 1 },
  { key: 'swim', need: 5 },
  { key: 'breath', need: 1 },
  { key: 'swim', need: 5 },
] as const;
export const TUTORIAL_TOTAL_GREEN = 15;
export const TUTORIAL_TOTAL_BREATHS = 2;

/**
 * Motor da prova. Puro (sem React/Three), atualizado a cada quadro.
 * Guarda o estado mutável da corrida — a interface lê daqui.
 */
export class RaceEngine {
  kind: StageKind;
  cfg: StageConfig;
  state: RaceState = 'intro';
  stateTime = 0;
  /** Tempo de prova (cronômetro). */
  time = 0;
  /** Tempo total desde que a cena começou (animações). */
  clock = 0;
  countdownShown = 4;
  player: Swimmer;
  opponent?: OpponentAI;
  shark?: Shark;
  waves: WaveField;
  playerX: number;
  opponentX: number;
  outcome: Outcome | null = null;
  result: PhaseResult | null = null;
  rng: () => number;
  warning: WaveWarning | null = null;
  private lastWarnId = 0;
  private listeners = new Set<Listener>();
  private fastForwarded = false;

  // Tutorial
  tutorialStep = 0;
  tutorialCount = 0;
  tutorialDone = false;
  /** Totais do treino (braçadas no verde e respirações válidas). */
  tutorialGreen = 0;
  tutorialBreaths = 0;
  /** Último nível de energia avisado (para não repetir alertas). */
  private energyLevel: 'ok' | 'warn' | 'low' | 'critical' = 'ok';

  constructor(kind: StageKind, seed = Math.floor(Math.random() * 1e9)) {
    this.kind = kind;
    this.cfg = STAGES[kind];
    this.rng = mulberry32(seed);
    this.player = new Swimmer(this.cfg.bar, this.cfg.playerPower);
    this.waves = new WaveField(this.cfg.waves, seed ^ 0x9e3779b9);
    const lanes = kind === 'pool' ? LANES.pool : kind === 'seaDay' || kind === 'seaNight' ? LANES.sea : LANES.solo;
    this.playerX = lanes.player;
    this.opponentX = lanes.opponent;
    if (this.cfg.opponent) {
      const s = new Swimmer(this.cfg.bar, this.cfg.opponent.power);
      this.opponent = new OpponentAI(s, this.cfg.opponent, mulberry32(seed + 77));
    }
    if (this.cfg.shark) this.shark = new Shark(this.cfg.shark);
    if (kind === 'tutorial') this.setState('racing');
    // Ondas já existentes para o mar parecer vivo desde o início.
    if (this.cfg.waves.enabled) {
      this.waves.spawn(-20, 'front');
      this.waves.waves[0].z = -30;
    }
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(e: EngineEvent) {
    this.listeners.forEach((fn) => fn(e));
  }

  private setState(s: RaceState) {
    this.state = s;
    this.stateTime = 0;
    this.emit({ type: 'state', state: s });
  }

  get distance() {
    return this.cfg.distance;
  }

  get introDuration() {
    return this.kind === 'shark' ? TIMING.sharkIntroTime : TIMING.introTime;
  }

  /** Jogador pode controlar a nadadora agora? */
  get controllable() {
    return (this.state === 'racing' || this.state === 'finishing') && !this.player.finished;
  }

  skipIntro() {
    if (this.state === 'intro') this.stateTime = this.introDuration;
  }

  private pressWall: number | null = null;

  /** wallMs: horário real do toque (performance.now) para medir a força com precisão. */
  press(wallMs?: number) {
    if (!this.controllable) return;
    const started = this.player.press();
    // Se ficou aguardando o fim da respiração, mede pelos quadros.
    if (started) this.pressWall = wallMs ?? null;
    else if (this.player.pendingPress) this.pressWall = null;
  }

  /** Cancela a braçada em carregamento (gesto de respirar no celular). */
  cancelCharge() {
    this.player.cancelCharge();
    this.pressWall = null;
  }

  /** RESPIRAR: recupera 50% de energia sem parar a nadadora. */
  breathe() {
    if (!this.controllable) return;
    this.pressWall = null;
    const r = this.player.breathe();
    this.emit({ type: 'breath', who: 'player', result: r });
    if (r.valid) this.energyLevel = 'ok';
    if (this.kind === 'tutorial') this.tutorialOnBreath(r);
  }

  release(wallMs?: number) {
    if (!this.player.charging) {
      this.player.pendingPress = false;
      return;
    }
    if (!this.controllable) {
      this.player.charging = false;
      return;
    }
    const env = this.waves.envAt(-this.player.distance);
    const hold = wallMs !== undefined && this.pressWall !== null ? (wallMs - this.pressWall) / 1000 : undefined;
    this.pressWall = null;
    const r = this.player.release(env, hold);
    if (r) {
      this.emit({ type: 'stroke', who: 'player', result: r, x: this.playerX, z: -this.player.distance });
      if (r.comboBroken) this.emit({ type: 'comboLost' });
      if (this.kind === 'tutorial') this.tutorialOnStroke(r);
      this.checkEnergyAlerts();
    }
  }

  /** Avisos de energia: atenção em 50%, "PRECISA RESPIRAR!" abaixo, "SEM FÔLEGO!" perto de zero. */
  private checkEnergyAlerts() {
    const e = Math.round(this.player.energy);
    const level = e <= ENERGY.criticalAt ? 'critical' : e <= ENERGY.lowAt ? 'low' : e <= ENERGY.warnAt ? 'warn' : 'ok';
    const rank = { ok: 0, warn: 1, low: 2, critical: 3 } as const;
    if (rank[level] > rank[this.energyLevel] && level !== 'ok') this.emit({ type: 'energy', level });
    this.energyLevel = level;
  }

  /** Posição (1 ou 2) do jogador na prova. */
  get position() {
    if (!this.opponent) return 1;
    const o = this.opponent.swimmer;
    if (this.player.finished && o.finished) return this.player.finishTime <= o.finishTime ? 1 : 2;
    if (o.finished) return 2;
    if (this.player.finished) return 1;
    return this.player.distance >= o.distance ? 1 : 2;
  }

  get sharkGap() {
    return this.shark ? this.shark.gapTo(this.player.distance) : 99;
  }

  /** 0..1 — perigo do tubarão. */
  get sharkDanger() {
    if (!this.shark) return 0;
    const g = this.sharkGap;
    const start = this.cfg.shark!.startGap + 2;
    return Math.max(0, Math.min(1, 1 - (g - this.cfg.shark!.catchGap) / (start - this.cfg.shark!.catchGap)));
  }

  update(rawDt: number) {
    // Aceita quedas de FPS até ~10 quadros/s sem desacelerar o tempo do jogo.
    const dt = Math.min(rawDt, 0.1);
    this.clock += dt;
    this.stateTime += dt;

    const racing = this.state === 'racing' || this.state === 'finishing';
    const p = this.player;
    const pz = -p.distance;

    this.waves.update(dt, pz, this.state !== 'outro' && this.state !== 'done');
    const env = racing && this.cfg.waves.enabled ? this.waves.envAt(pz) : undefined;

    // Aviso de onda
    if (this.cfg.waves.enabled && racing) {
      const w = this.waves.warningFor(pz);
      this.warning = w;
      if (w && w.distance > 0 && w.distance < 9 && w.id !== this.lastWarnId) {
        this.lastWarnId = w.id;
        this.emit({ type: 'wave', kind: w.kind });
      }
    } else {
      this.warning = null;
    }

    switch (this.state) {
      case 'intro':
        if (this.stateTime >= this.introDuration) {
          if (this.kind === 'shark') {
            // Depois de ver o tubarão, a fuga começa na hora: "NADE!"
            this.setState('racing');
            this.time = 0;
            this.emit({ type: 'countdown', n: 0 });
          } else {
            this.setState('countdown');
            this.countdownShown = 4;
          }
        }
        break;
      case 'countdown': {
        const n = Math.max(0, 3 - Math.floor((this.stateTime / TIMING.countdownTime) * 3));
        if (n !== this.countdownShown) {
          this.countdownShown = n;
          this.emit({ type: 'countdown', n });
        }
        if (this.stateTime >= TIMING.countdownTime) {
          this.countdownShown = 0;
          this.setState('racing');
          this.time = 0;
        }
        break;
      }
      case 'racing':
      case 'finishing':
        this.time += dt;
        this.stepRace(dt, env);
        break;
      case 'outro':
        if (this.kind === 'tutorial') break;
        p.update(dt);
        p.speed *= 0.97;
        if (this.opponent) this.opponent.swimmer.update(dt);
        if (this.shark) {
          if (this.outcome === 'escaped') this.shark.speed *= 0.95;
          this.shark.distance += this.shark.speed * dt * (this.outcome === 'caught' ? 0.2 : 1);
        }
        if (this.stateTime >= (this.kind === 'shark' ? 3.6 : 2.6)) {
          this.setState('done');
          this.emit({ type: 'result', result: this.result! });
        }
        break;
      case 'done':
        break;
    }
  }

  private stepRace(dt: number, env?: ReturnType<WaveField['envAt']>) {
    const p = this.player;
    const D = this.cfg.distance;
    const before = p.distance;
    p.update(dt, env);
    if (this.kind === 'tutorial') {
      this.tutorialTick();
      return;
    }
    if (!p.finished && p.distance >= D) {
      p.finished = true;
      const over = (p.distance - D) / Math.max(0.01, p.distance - before);
      p.finishTime = this.time - dt * over;
      p.distance = D;
      this.emit({ type: 'finish', who: 'player' });
      if (this.kind === 'shark') {
        this.outcome = 'escaped';
        this.finishRace();
        this.emit({ type: 'escaped' });
        return;
      }
      if (this.state === 'racing') this.setState('finishing');
    }
    if (p.finished) p.speed *= 0.9;

    // Fabiola
    if (this.opponent) {
      const o = this.opponent;
      const os = o.swimmer;
      const oz = -os.distance;
      const oenv = this.cfg.waves.enabled ? this.waves.envAt(oz) : undefined;
      const warn = this.cfg.waves.enabled ? this.waves.warningFor(oz) : null;
      const ob = os.distance;
      const r = o.update(dt, oenv ?? { dragMul: 1, push: 0, strokeMul: 1 }, warn, true);
      if (r) this.emit({ type: 'stroke', who: 'opponent', result: r, x: this.opponentX, z: -os.distance });
      this.checkOpponentFinish(ob, dt);
      if (os.finished) os.speed *= 0.9;

      // Jogador já chegou e a Fabiola ainda não: acelera a simulação dela.
      if (p.finished && !os.finished && this.stateTime > TIMING.finishWait && !this.fastForwarded) {
        this.fastForwarded = true;
        let guard = 0;
        const sdt = 1 / 60;
        while (!os.finished && guard++ < 60 * 120) {
          this.time += sdt;
          const b = os.distance;
          this.waves.update(sdt, -p.distance, true);
          const e2 = this.cfg.waves.enabled ? this.waves.envAt(-os.distance) : undefined;
          const w2 = this.cfg.waves.enabled ? this.waves.warningFor(-os.distance) : null;
          o.update(sdt, e2 ?? { dragMul: 1, push: 0, strokeMul: 1 }, w2, true);
          this.checkOpponentFinish(b, sdt);
        }
      }
      if (p.finished && os.finished) {
        this.outcome = p.finishTime <= os.finishTime ? 'win' : 'lose';
        this.finishRace();
      }
    }

    // Tubarão
    if (this.shark) {
      this.shark.update(dt, p.distance);
      if (this.shark.gapTo(p.distance) <= this.cfg.shark!.catchGap) {
        this.outcome = 'caught';
        p.finishTime = this.time;
        this.finishRace();
        this.emit({ type: 'caught' });
      } else if (this.time > TIMING.maxRaceTime) {
        this.outcome = 'caught';
        p.finishTime = this.time;
        this.finishRace();
        this.emit({ type: 'caught' });
      }
    }
  }

  private checkOpponentFinish(before: number, dt: number) {
    const os = this.opponent!.swimmer;
    const D = this.cfg.distance;
    if (!os.finished && os.distance >= D) {
      os.finished = true;
      const over = (os.distance - D) / Math.max(0.01, os.distance - before);
      os.finishTime = this.time - dt * over;
      os.distance = D;
      if (!this.player.finished) this.emit({ type: 'finish', who: 'opponent' });
    }
  }

  private finishRace() {
    const p = this.player;
    p.charging = false;
    const st = p.stats;
    const won = this.outcome === 'win' || this.outcome === 'escaped';
    const longStrokes = st.strokes - st.short;
    const avgSpeed = st.raceTime > 0 ? st.speedSum / st.raceTime : 0;
    const breakdown: ScoreBreakdown = {
      velocidade: Math.round(Math.min(1, avgSpeed / 2.4) * 400),
      // Resistência: tempo com fôlego (energia >= 50%), descontando respirações antecipadas.
      resistencia: Math.max(
        0,
        Math.round((1 - Math.min(1, st.lowEnergyTime / Math.max(1, st.raceTime))) * 300 - st.earlyBreaths * 30),
      ),
      tecnica: Math.round(
        longStrokes > 0 ? Math.min(1, (st.perfect + st.great * 0.7 + st.good * 0.3) / longStrokes) * 400 : 0,
      ),
      conquista: (won ? 300 : 80) + Math.min(SWIM.comboMax, p.maxCombo) * 20,
    };
    const score = breakdown.velocidade + breakdown.resistencia + breakdown.tecnica + breakdown.conquista;
    this.result = {
      phase: this.cfg.phase as PhaseId,
      won,
      outcome: this.outcome!,
      playerTime: p.finishTime,
      opponentTime: this.opponent?.swimmer.finishTime,
      sharkGap: this.shark ? Math.max(0, this.shark.gapTo(p.distance)) : undefined,
      score,
      breakdown,
      maxCombo: p.maxCombo,
      perfects: st.perfect,
      strokes: st.strokes,
      breaths: st.breaths,
    };
    this.setState('outro');
  }

  // ---------------- Tutorial ----------------
  private tutorialOnStroke(r: StrokeResult) {
    if (this.tutorialDone) return;
    if (r.zone !== 'green') return;
    this.tutorialGreen++;
    const step = TUTORIAL_STEPS[this.tutorialStep];
    if (step.key !== 'swim') return;
    this.tutorialCount++;
    if (this.tutorialCount >= step.need) this.advanceTutorial();
  }

  private tutorialOnBreath(r: BreathResult) {
    if (this.tutorialDone || !r.valid) return;
    this.tutorialBreaths++;
    const step = TUTORIAL_STEPS[this.tutorialStep];
    if (step.key !== 'breath') return;
    this.tutorialCount++;
    if (this.tutorialCount >= step.need) this.advanceTutorial();
  }

  private tutorialTick() {
    // A piscina de treino é longa; se alguém nadar demais, volta discretamente.
    if (this.player.distance > 135) this.player.distance -= 100;
  }

  private advanceTutorial() {
    this.tutorialStep++;
    this.tutorialCount = 0;
    if (this.tutorialStep >= TUTORIAL_STEPS.length) {
      this.tutorialDone = true;
      this.emit({ type: 'tutorialComplete' });
      return;
    }
    this.emit({ type: 'tutorialStep', step: this.tutorialStep });
  }

  /** Fim do tutorial para o jogador: para de controlar. */
  stopTutorial() {
    this.tutorialDone = true;
    this.state = 'outro';
  }
}
