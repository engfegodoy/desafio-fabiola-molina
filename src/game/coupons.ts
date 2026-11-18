import type { PhaseId } from '../config/balance';
import type { PhaseResult } from './raceEngine';

export interface Coupon {
  code: string;
  /** Texto grande do prêmio (ex.: "15% OFF" ou "FRETE GRÁTIS"). */
  prize: string;
  title: string;
  message: string;
  tier: 'legend' | 'freeShipping' | 'p10' | 'p5';
}

/**
 * Regras de premiação (3 provas contra a Fabiola) — aplicadas exatamente nesta ordem.
 */
export function computeCoupon(results: Partial<Record<PhaseId, PhaseResult>>): Coupon {
  const wins = ([1, 2, 3] as PhaseId[]).filter((p) => results[p]?.won).length;

  if (wins === 3) {
    return {
      tier: 'legend',
      code: 'FABIOLA15',
      prize: '15% OFF',
      title: 'VOCÊ É UMA LENDA! NÍVEL FABIOLA!',
      message: 'Você venceu a Fabiola nas três provas!',
    };
  }
  if (wins === 2) {
    return {
      tier: 'freeShipping',
      code: 'FRETEFM',
      prize: 'FRETE GRÁTIS',
      title: 'QUE NADO INCRÍVEL!',
      message: 'Você venceu a Fabiola em duas provas. Está quase no nível dela!',
    };
  }
  if (wins === 1) {
    return {
      tier: 'p10',
      code: 'JOGOFM10',
      prize: '10% OFF',
      title: 'MANDOU BEM!',
      message: 'Você venceu a Fabiola em uma prova. Continue treinando essas braçadas!',
    };
  }
  return {
    tier: 'p5',
    code: 'FAB05',
    prize: '5% OFF',
    title: 'VALEU PELO DESAFIO!',
    message: 'Que tal comprar uma peça e começar a treinar melhor? Na próxima, você chega lá!',
  };
}
