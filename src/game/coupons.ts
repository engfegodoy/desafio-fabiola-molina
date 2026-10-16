import type { PhaseId } from '../config/balance';
import type { PhaseResult } from './raceEngine';

export interface Coupon {
  code: string;
  /** Texto grande do prêmio (ex.: "20% OFF" ou "FRETE GRÁTIS"). */
  prize: string;
  title: string;
  message: string;
  tier: 'legend' | 'freeShipping' | 'p15' | 'p10' | 'p5';
}

/**
 * Regras de premiação — aplicadas exatamente nesta ordem.
 * O resultado do tubarão só diferencia o prêmio máximo do frete grátis.
 */
export function computeCoupon(results: Partial<Record<PhaseId, PhaseResult>>): Coupon {
  const wins = ([1, 2, 3] as PhaseId[]).filter((p) => results[p]?.won).length;
  const escaped = !!results[4]?.won;

  if (wins === 3 && escaped) {
    return {
      tier: 'legend',
      code: 'FABIOLA20',
      prize: '20% OFF',
      title: 'VOCÊ É UMA LENDA! NÍVEL FABIOLA!',
      message: 'Venceu as três provas contra a Fabiola e ainda escapou do tubarão!',
    };
  }
  if (wins === 3) {
    return {
      tier: 'freeShipping',
      code: 'FRETEGRATIS',
      prize: 'FRETE GRÁTIS',
      title: 'CRAQUE DAS PISCINAS E DOS MARES!',
      message: 'Você venceu a Fabiola nas três provas! O tubarão levou a melhor, mas o frete é por nossa conta.',
    };
  }
  if (wins === 2) {
    return {
      tier: 'p15',
      code: 'FABIOLA15',
      prize: '15% OFF',
      title: 'QUE NADO INCRÍVEL!',
      message: 'Você venceu a Fabiola em duas provas. Está quase no nível dela!',
    };
  }
  if (wins === 1) {
    return {
      tier: 'p10',
      code: 'FABIOLA10',
      prize: '10% OFF',
      title: 'MANDOU BEM!',
      message: 'Você venceu a Fabiola em uma prova. Continue treinando essas braçadas!',
    };
  }
  return {
    tier: 'p5',
    code: 'FABIOLA5',
    prize: '5% OFF',
    title: 'VALEU PELO DESAFIO!',
    message: 'Que tal comprar uma peça e começar a treinar melhor? Na próxima, você chega lá!',
  };
}

export const SHARK_LOSE_MESSAGES = [
  'Você virou o lanche do tubarão!',
  'O tubarão disse que você é muito saboroso... mas nada devagar!',
  'Quase! Só faltou treinar mais uma braçadinha.',
  'Nem a Fabiola te salvaria dessa!',
  'Esse tubarão tem mais fôlego que você!',
];
