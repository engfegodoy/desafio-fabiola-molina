/**
 * ============================================================
 *  DESAFIO FABIOLA MOLINA — PARÂMETROS DE BALANCEAMENTO
 * ============================================================
 *  Todos os números que controlam a dificuldade do jogo ficam aqui.
 *  Unidades: distância em metros, tempo em segundos, velocidade em m/s.
 *  O desafio combina velocidade de toques (combo) e fôlego (energia e respiração).
 *  Rode `npm run sim` para simular corridas com jogadores-robô de
 *  diferentes habilidades e conferir se as provas continuam vencíveis.
 */

export type PhaseId = 1 | 2 | 3 | 4;
export type StageKind = 'tutorial' | 'pool' | 'seaDay' | 'seaNight' | 'shark';

/**
 * Física estilo Flappy Bird: cada TOQUE é uma braçada NA HORA.
 * A braçada dá um impulso instantâneo e, entre uma e outra, a água freia rápido —
 * é preciso tocar num ritmo constante (~2 a 3 toques por segundo).
 */
export const SWIM = {
  /** Distância (m) que cada braçada rende antes do limite de velocidade. */
  strokeDistance: 1.0,
  /** Freio da água (1/s): sem tocar, a nadadora perde a velocidade em ~1 s. */
  waterDecay: 3.0,
  /** Braçada PERFEITA desliza melhor: o freio da água fica menor até o próximo toque. */
  perfectGlide: 0.75,
  /** Velocidade mínima de deslize: nunca fica totalmente parada. */
  driftSpeed: 0.3,
  /** Velocidade máxima sem combo (trava): mantém a duração das provas. O combo aumenta este teto. */
  maxSpeed: 3.0,

  /** Combo: cada braçada PERFEITA soma este bônus no teto de velocidade (x5 = +24%). */
  comboStep: 0.06,
  comboMax: 5,
  /** Ficar este tempo (s) sem uma braçada perfeita zera o combo. */
  comboTimeout: 2.2,
};

/**
 * Ritmo: quanto mais rápido você toca, mais rápido nada.
 *   1–2 toques/s → "Devagar!"   3–4 toques/s → "Bom!"   5 ou mais → "PERFEITO!"
 */
export interface RhythmConfig {
  /** Intervalo (s) acima do qual a braçada é "Devagar!" (−1 no combo). */
  slowAbove: number;
  /** Intervalo (s) igual ou abaixo do qual é "PERFEITO!" (+1 no combo, desliza melhor). */
  perfectBelow: number;
}

/** Rendimento de cada tipo de braçada (multiplica a distância). */
export const QUALITY = {
  perfect: 1.0,
  good: 0.9,
  slow: 0.8,
};

/**
 * Fôlego de 0 a 100%.
 * A energia NÃO se recupera sozinha: só a ação RESPIRAR devolve fôlego.
 * O fôlego cai conforme a distância nadada (não importa o ritmo ou o combo):
 * o ideal é respirar a cada ~18 m (2 vezes na piscina de 50 m), quando ele chega em 75% — respirar devolve 25%.
 * Abaixo de 75% a barra fica laranja e a nadadora vai perdendo velocidade aos poucos;
 * com 20% ou menos fica vermelha e pisca; em 0% se afoga.
 */
export const ENERGY = {
  max: 100,
  /** Ideal: respirar a cada X metros. */
  breathEveryMeters: 18,
  /** Quanto uma respiração devolve (limitado a max). Respirar a mais não tem penalidade. */
  breathGain: 25,
  /** Duração da respiração (s): a cabeça vira e os toques nesse instante não contam. */
  breathTime: 0.22,
  /** Abaixo disto a nadadora começa a ficar lenta (aos poucos) — hora de respirar. */
  slowAt: 75,
  /** Acima deste nível o nadador rende 100%. */
  fullAbove: 75,
  /** Eficiência da braçada com energia zero. */
  emptyEfficiency: 0.2,
  /** Curvatura da queda (1 = linear, >1 cai mais forte perto de zero). */
  curve: 1.2,
  /** Resistência extra da água com energia zero (cansaço). */
  emptyExtraDrag: 0.9,
  /** Velocidade (por s) com que o corpo "sente" a mudança de energia: transição suave. */
  fatigueRate: 1.4,
  /** Com isto ou menos: barra VERMELHA piscando, bordas escurecem, coração acelera. */
  lowAt: 20,
  /** Abaixo disto a barra fica laranja ("RESPIRE!"). */
  warnBelow: 75,
  /** Com isto ou menos: "SEM FÔLEGO!". */
  criticalAt: 10,
  /** Energia zerada = afogou (a partida recomeça do zero). */
  drownAt: 0,
};

/** 5 braçadas PERFEITAS seguidas: desliza mais longe nas próximas braçadas. */
export const GLIDE = {
  /** A cada N braçadas perfeitas seguidas... */
  every: 5,
  /** ...as próximas N braçadas deslizam mais... */
  strokes: 3,
  /** ...com menos resistência da água. */
  dragMul: 0.6,
};

export interface WaveConfig {
  enabled: boolean;
  /** Intervalo (s) entre ondas. */
  intervalMin: number;
  intervalMax: number;
  /** Chance de a onda ser frontal (contra). */
  frontChance: number;
  /** Intensidade 0..1 do efeito na física. */
  strengthMin: number;
  strengthMax: number;
  /** Largura (m) da crista. */
  width: number;
  /** Altura visual (m) da crista. */
  height: number;
  /** Velocidades (m/s) das ondas frontais e traseiras. */
  frontSpeed: number;
  backSpeed: number;
  /** Multiplicador de resistência extra máximo dentro de uma onda frontal. */
  frontDrag: number;
  /** Força contrária (m/s²) dentro da onda frontal. */
  frontPush: number;
  /** Perda de eficiência da braçada dentro da onda frontal (0..1). */
  frontStrokePenalty: number;
  /** Empurrão a favor (m/s²) dentro da onda traseira. */
  backPush: number;
  /** Bônus de eficiência da braçada dentro da onda traseira. */
  backStrokeBonus: number;
  /** Variação lenta da resistência da água (correnteza), 0 = constante. */
  dragVariation: number;
  /** Ondulação ambiente (visual). */
  ambient: number;
}

export interface OpponentConfig {
  name: string;
  /** Multiplicador geral de potência da Fabiola. */
  power: number;
  /** Intervalo médio (s) entre os toques dela e a variação (ritmo constante). */
  tapInterval: number;
  tapJitter: number;
  /** Ela respira quando a energia chega a este nível (ou abaixo). */
  breatheBelow: number;
  /** Atraso (s) para reagir e respirar. */
  breathDelay: number;
  /** Pausa extra (s) que ela faz ao respirar — é a chance de passar por ela. */
  breathPause: number;
}

export interface StageConfig {
  id: StageKind;
  phase: PhaseId | 0;
  title: string;
  subtitle: string;
  distance: number;
  rhythm: RhythmConfig;
  waves: WaveConfig;
  /** Multiplicador de potência do jogador (dificuldade de ambiente). */
  playerPower: number;
  opponent?: OpponentConfig;
  shark?: SharkConfig;
}

export interface SharkConfig {
  /** Distância inicial (m) entre o tubarão e o jogador. */
  startGap: number;
  /** Velocidade base (m/s). */
  baseSpeed: number;
  /** Aumento de velocidade por segundo de prova (fica mais bravo). */
  speedRamp: number;
  /** Amplitude e período (s) das arrancadas do tubarão. */
  surgeAmp: number;
  surgePeriod: number;
  /** Tempo (s) que o tubarão demora para começar a nadar. */
  startDelay: number;
  /** Distância (m) em que o tubarão alcança o jogador. */
  catchGap: number;
  /** O tubarão também precisa respirar: a cada X s ele quase para por Y s. */
  breathEvery: number;
  breathTime: number;
  /** Velocidade (fração) durante a respiração do tubarão. */
  breathSpeed: number;
}

const NO_WAVES: WaveConfig = {
  enabled: false,
  intervalMin: 99,
  intervalMax: 99,
  frontChance: 0,
  strengthMin: 0,
  strengthMax: 0,
  width: 3,
  height: 0,
  frontSpeed: 0,
  backSpeed: 0,
  frontDrag: 0,
  frontPush: 0,
  frontStrokePenalty: 0,
  backPush: 0,
  backStrokeBonus: 0,
  dragVariation: 0,
  ambient: 0.03,
};

const POOL_RHYTHM: RhythmConfig = { slowAbove: 0.4, perfectBelow: 0.24 };

export const STAGES: Record<StageKind, StageConfig> = {
  tutorial: {
    id: 'tutorial',
    phase: 0,
    title: 'TREINO',
    subtitle: 'Piscina de treinamento',
    distance: 9999,
    rhythm: { slowAbove: 0.42, perfectBelow: 0.25 },
    waves: NO_WAVES,
    playerPower: 1,
  },
  pool: {
    id: 'pool',
    phase: 1,
    title: 'FASE 1 • PISCINA OLÍMPICA',
    subtitle: '50 metros contra Fabiola Molina',
    distance: 50,
    rhythm: POOL_RHYTHM,
    waves: NO_WAVES,
    playerPower: 1,
    opponent: {
      name: 'FABIOLA MOLINA',
      power: 1.0,
      tapInterval: 0.207,
      tapJitter: 0.02,
      breatheBelow: 75,
      breathDelay: 0.08,
      breathPause: 0.25,
    },
  },
  seaDay: {
    id: 'seaDay',
    phase: 2,
    title: 'FASE 2 • CIRCUITO MARES: DIA',
    subtitle: '60 metros no mar aberto',
    distance: 60,
    rhythm: { slowAbove: 0.4, perfectBelow: 0.235 },
    waves: {
      enabled: true,
      intervalMin: 3.2,
      intervalMax: 5.5,
      frontChance: 0.55,
      strengthMin: 0.55,
      strengthMax: 0.85,
      width: 2.6,
      height: 0.42,
      frontSpeed: 2.4,
      backSpeed: 4.6,
      frontDrag: 1.1,
      frontPush: 0.5,
      frontStrokePenalty: 0.42,
      backPush: 0.75,
      backStrokeBonus: 0.15,
      dragVariation: 0.06,
      ambient: 0.12,
    },
    playerPower: 1,
    opponent: {
      name: 'FABIOLA MOLINA',
      power: 1.0,
      tapInterval: 0.203,
      tapJitter: 0.02,
      breatheBelow: 75,
      breathDelay: 0.08,
      breathPause: 0.25,
    },
  },
  seaNight: {
    id: 'seaNight',
    phase: 3,
    title: 'FASE 3 • CIRCUITO MARES: NOITE',
    subtitle: '65 metros sob a luz da lua',
    distance: 65,
    rhythm: { slowAbove: 0.4, perfectBelow: 0.23 },
    waves: {
      enabled: true,
      intervalMin: 2.6,
      intervalMax: 4.4,
      frontChance: 0.58,
      strengthMin: 0.7,
      strengthMax: 1.0,
      width: 2.9,
      height: 0.6,
      frontSpeed: 2.7,
      backSpeed: 4.9,
      frontDrag: 1.35,
      frontPush: 0.65,
      frontStrokePenalty: 0.5,
      backPush: 0.85,
      backStrokeBonus: 0.18,
      dragVariation: 0.14,
      ambient: 0.18,
    },
    playerPower: 1,
    opponent: {
      name: 'FABIOLA MOLINA',
      power: 1.0,
      tapInterval: 0.2,
      tapJitter: 0.02,
      breatheBelow: 75,
      breathDelay: 0.08,
      breathPause: 0.25,
    },
  },
  shark: {
    id: 'shark',
    phase: 4,
    title: 'FASE 4 • FUGA DO TUBARÃO',
    subtitle: 'Nade até a areia!',
    distance: 75,
    rhythm: { slowAbove: 0.4, perfectBelow: 0.235 },
    waves: {
      enabled: true,
      intervalMin: 4,
      intervalMax: 6.5,
      frontChance: 0.4,
      strengthMin: 0.45,
      strengthMax: 0.7,
      width: 2.6,
      height: 0.35,
      frontSpeed: 2.2,
      backSpeed: 4.6,
      frontDrag: 0.9,
      frontPush: 0.4,
      frontStrokePenalty: 0.35,
      backPush: 0.8,
      backStrokeBonus: 0.15,
      dragVariation: 0.05,
      ambient: 0.1,
    },
    playerPower: 1,
    shark: {
      startGap: 11,
      baseSpeed: 3.44,
      speedRamp: 0.006,
      surgeAmp: 0.32,
      surgePeriod: 6.5,
      startDelay: 1.6,
      catchGap: 1.1,
      breathEvery: 6,
      breathTime: 1.2,
      breathSpeed: 0.3,
    },
  },
};

export const PHASE_STAGE: Record<PhaseId, StageKind> = {
  1: 'pool',
  2: 'seaDay',
  3: 'seaNight',
  4: 'shark',
};

/** Posições laterais (x) das raias. */
export const LANES = {
  pool: { player: -1.25, opponent: 1.25 },
  sea: { player: -1.7, opponent: 1.7 },
  solo: { player: 0, opponent: 0 },
};

/** Tempo de contagem regressiva e de apresentação. */
export const TIMING = {
  introTime: 2.6,
  sharkIntroTime: 6.6,
  countdownTime: 3.0,
  /** Depois que o jogador chega, quanto tempo esperar antes de acelerar a simulação da Fabiola. */
  finishWait: 1.6,
  /** Tempo máximo de prova (s) — garante que nada trave. */
  maxRaceTime: 240,
};
