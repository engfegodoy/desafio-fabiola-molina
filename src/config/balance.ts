/**
 * ============================================================
 *  DESAFIO FABIOLA MOLINA — PARÂMETROS DE BALANCEAMENTO
 * ============================================================
 *  Todos os números que controlam a dificuldade do jogo ficam aqui.
 *  Unidades: distância em metros, tempo em segundos, velocidade em m/s.
 *  O desafio combina timing (zona verde), ritmo (combo) e fôlego (energia e respiração).
 *  Rode `npm run sim` para simular corridas com jogadores-robô de
 *  diferentes habilidades e conferir se as provas continuam vencíveis.
 */

export type PhaseId = 1 | 2 | 3 | 4;
export type StageKind = 'tutorial' | 'pool' | 'seaDay' | 'seaNight' | 'shark';

/** Física geral do nadador (vale para jogador, Fabiola e robôs de teste). */
export const SWIM = {
  /** Velocidade máxima absoluta (trava de segurança). */
  maxSpeed: 3.1,
  /** Resistência linear da água (desacelera proporcional à velocidade). */
  linearDrag: 0.42,
  /** Resistência quadrática (cresce rápido em alta velocidade = teto natural). */
  quadDrag: 0.13,
  /** Tempo em que o impulso da braçada é aplicado (aceleração suave). */
  thrustTime: 0.28,

  /** Braçada curta: soltar antes deste tempo (s) conta como toque rápido. */
  tapMaxTime: 0.16,
  /** Impulso (m/s) da braçada curta. */
  shortPower: 0.4,
  /** Impulso (m/s) da braçada longa com eficiência 100%. */
  longPower: 1.18,

  /** Intervalo mínimo confortável entre braçadas; abaixo disso o impulso cai. */
  rhythmMinInterval: 0.42,
  /** Eficiência mínima de uma braçada "atropelada" (ritmo muito rápido). */
  rhythmFloor: 0.3,

  /** Combo: cada acerto consecutivo soma este bônus de eficiência. */
  comboStep: 0.075,
  /** Combo máximo (x5 = +30% de eficiência com comboStep 0.075). */
  comboMax: 5,
  /** Ficar este tempo (s) sem acertar uma braçada zera o combo. */
  comboTimeout: 2.6,
};

/**
 * Energia (fôlego) em 20 partes.
 * A energia NÃO se recupera sozinha: só a ação RESPIRAR devolve fôlego.
 * Ritmo ideal: 7 braçadas no verde (20 → 13) e uma respiração (+7).
 * Com 10/20 a barra pisca (alerta); com 7/20 ou menos fica lenta; em 0 se afoga.
 */
export const ENERGY = {
  max: 20,
  /** Custo por braçada, conforme a zona em que foi solta. */
  costGreen: 1,
  costYellow: 1.5,
  costRed: 2,
  /** Toque rápido (braçada curta). */
  costShort: 1,
  /** Quanto uma respiração devolve (limitado a max). Respirar a mais não tem penalidade. */
  breathGain: 7,
  /** Duração da respiração (s): a cabeça vira e não dá para iniciar braçada. */
  breathTime: 0.5,
  /** Com isto ou menos a nadadora começa a ficar lenta (aos poucos). */
  slowAt: 7,
  /** Acima deste nível o nadador rende 100% (= slowAt + 1). */
  fullAbove: 8,
  /** Eficiência da braçada com energia zero. */
  emptyEfficiency: 0.3,
  /** Curvatura da queda (1 = linear, >1 cai mais forte perto de zero). */
  curve: 1.25,
  /** Resistência extra da água com energia zero (cansaço). */
  emptyExtraDrag: 0.9,
  /** Velocidade (por s) com que o corpo "sente" a mudança de energia: transição suave. */
  fatigueRate: 1.4,
  /** Com isto ou menos: alerta — bordas escurecem, coração acelera, barra pisca. */
  lowAt: 10,
  /** Com isto ou menos: "SEM FÔLEGO!". */
  criticalAt: 3,
  /** Energia zerada = afogou (a partida recomeça do zero). */
  drownAt: 0,
};

/** Combo x5 com braçadas no verde: desliza mais longe nas próximas braçadas. */
export const GLIDE = {
  /** A cada N braçadas seguidas no verde... */
  every: 5,
  /** ...as próximas N braçadas deslizam mais... */
  strokes: 3,
  /** ...com menos resistência da água. */
  dragMul: 0.6,
};

/** No computador a zona verde é maior e mais perto do começo da barra. */
export const DESKTOP_BAR = {
  /** Aproxima as zonas do início (fração da posição original). */
  shift: 0.72,
  /** Alarga a zona verde. */
  widen: 1.35,
};

/** Penalidades das zonas da barra de força (além da eficiência menor). */
export const ZONES = {
  /** Zona vermelha freia: multiplicador de resistência por um instante. */
  redDrag: 1.4,
  redDragTime: 0.3,
  /** Zona amarela antes do verde tira 1 do combo (amarela depois do verde também). */
  yellowComboLoss: 1,
  /** Braçada "atropelada" abaixo deste fator de ritmo quebra o combo: PERDEU O RITMO! */
  rushBreaksBelow: 0.7,
};

/** Qualidade da braçada longa conforme o ponto em que foi solta. */
export const QUALITY = {
  /** Eficiência por resultado. */
  perfect: 1.0,
  great: 0.88,
  goodMin: 0.58,
  goodMax: 0.76,
  earlyMin: 0.22,
  earlyMax: 0.5,
  passedYellow: 0.62,
  passedRedMin: 0.28,
  /** Fração central da zona verde que conta como PERFEITO. */
  perfectCore: 0.42,
};

/** Barra de força por fase: duração da carga e posição/tamanho da zona verde. */
export interface PowerBarConfig {
  /** Tempo (s) para a barra ir de 0 a 100%. */
  chargeTime: number;
  /** Início da zona amarela (antes disso é vermelho = cedo demais). */
  yellowStart: number;
  /** Início e fim da zona verde (ponto ideal). */
  greenStart: number;
  greenEnd: number;
  /** Fim da zona amarela após o verde (depois disso é vermelho = passou muito). */
  yellowEnd: number;
}

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
  /** Probabilidades de cada qualidade de braçada. */
  perfectRate: number;
  greatRate: number;
  goodRate: number;
  /** Atraso médio (s) entre soltar e começar a próxima braçada. */
  pauseMin: number;
  pauseMax: number;
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
  bar: PowerBarConfig;
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

const POOL_BAR: PowerBarConfig = {
  chargeTime: 0.95,
  yellowStart: 0.28,
  greenStart: 0.4,
  greenEnd: 0.66,
  yellowEnd: 0.78,
};

export const STAGES: Record<StageKind, StageConfig> = {
  tutorial: {
    id: 'tutorial',
    phase: 0,
    title: 'TREINO',
    subtitle: 'Piscina de treinamento',
    distance: 9999,
    bar: { ...POOL_BAR, chargeTime: 1.0, yellowStart: 0.26, greenStart: 0.37, greenEnd: 0.67 },
    waves: NO_WAVES,
    playerPower: 1,
  },
  pool: {
    id: 'pool',
    phase: 1,
    title: 'FASE 1 • PISCINA OLÍMPICA',
    subtitle: '50 metros contra Fabiola Molina',
    distance: 50,
    bar: POOL_BAR,
    waves: NO_WAVES,
    playerPower: 1,
    opponent: {
      name: 'FABIOLA MOLINA',
      power: 1.02,
      perfectRate: 0.5,
      greatRate: 0.38,
      goodRate: 0.1,
      pauseMin: 0.08,
      pauseMax: 0.16,
      breatheBelow: 13,
      breathDelay: 0.08,
      breathPause: 0.45,
    },
  },
  seaDay: {
    id: 'seaDay',
    phase: 2,
    title: 'FASE 2 • CIRCUITO MARES: DIA',
    subtitle: '60 metros no mar aberto',
    distance: 60,
    bar: { chargeTime: 0.9, yellowStart: 0.3, greenStart: 0.42, greenEnd: 0.65, yellowEnd: 0.77 },
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
      power: 1.03,
      perfectRate: 0.5,
      greatRate: 0.38,
      goodRate: 0.1,
      pauseMin: 0.08,
      pauseMax: 0.16,
      breatheBelow: 13,
      breathDelay: 0.08,
      breathPause: 0.45,
    },
  },
  seaNight: {
    id: 'seaNight',
    phase: 3,
    title: 'FASE 3 • CIRCUITO MARES: NOITE',
    subtitle: '65 metros sob a luz da lua',
    distance: 65,
    bar: { chargeTime: 0.86, yellowStart: 0.32, greenStart: 0.44, greenEnd: 0.64, yellowEnd: 0.75 },
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
      power: 0.97,
      perfectRate: 0.56,
      greatRate: 0.34,
      goodRate: 0.08,
      pauseMin: 0.07,
      pauseMax: 0.14,
      breatheBelow: 13,
      breathDelay: 0.08,
      breathPause: 0.45,
    },
  },
  shark: {
    id: 'shark',
    phase: 4,
    title: 'FASE 4 • FUGA DO TUBARÃO',
    subtitle: 'Nade até a areia!',
    distance: 75,
    bar: { chargeTime: 0.9, yellowStart: 0.3, greenStart: 0.42, greenEnd: 0.66, yellowEnd: 0.78 },
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
      baseSpeed: 3.35,
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
