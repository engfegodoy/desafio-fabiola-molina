import { create } from 'zustand';
import type { PhaseId } from '../config/balance';
import type { PhaseResult } from '../game/raceEngine';
import { audio } from '../audio/audio';

export type Screen = 'menu' | 'tutorial' | 'race' | 'final';
export type Quality = 'high' | 'low';

interface GameState {
  screen: Screen;
  phase: PhaseId;
  /** Incrementa para reiniciar a fase atual (remonta a cena). */
  runId: number;
  playerName: string;
  audioOn: boolean;
  paused: boolean;
  quality: Quality;
  results: Partial<Record<PhaseId, PhaseResult>>;

  setName: (name: string) => void;
  startGame: () => void;
  skipTutorial: () => void;
  startPhase: (p: PhaseId) => void;
  retryPhase: () => void;
  nextPhase: () => void;
  recordResult: (r: PhaseResult) => void;
  goFinal: () => void;
  playAgain: () => void;
  toMenu: () => void;
  toggleAudio: () => void;
  setPaused: (p: boolean) => void;
  setQuality: (q: Quality) => void;
}

export const isMobile =
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

export const MAX_NAME = 30;

export const useGame = create<GameState>((set, get) => ({
  screen: 'menu',
  phase: 1,
  runId: 0,
  playerName: '',
  audioOn: true,
  paused: false,
  quality: isMobile ? 'low' : 'high',
  results: {},

  setName: (name) => set({ playerName: name.slice(0, MAX_NAME) }),
  startGame: () => {
    if (!get().playerName.trim()) return;
    set({ screen: 'tutorial', results: {}, phase: 1, paused: false, runId: get().runId + 1 });
  },
  skipTutorial: () => get().startPhase(1),
  startPhase: (p) => set({ screen: 'race', phase: p, paused: false, runId: get().runId + 1 }),
  retryPhase: () => set({ paused: false, runId: get().runId + 1 }),
  nextPhase: () => {
    const p = get().phase;
    if (p >= 4) get().goFinal();
    else get().startPhase((p + 1) as PhaseId);
  },
  // Repetir uma fase substitui o resultado anterior — nunca duplica pontos.
  recordResult: (r) => set({ results: { ...get().results, [r.phase]: r } }),
  goFinal: () => set({ screen: 'final', paused: false }),
  playAgain: () => set({ results: {}, screen: 'race', phase: 1, paused: false, runId: get().runId + 1 }),
  toMenu: () => set({ screen: 'menu', results: {}, phase: 1, paused: false, runId: get().runId + 1 }),
  toggleAudio: () => {
    const on = !get().audioOn;
    audio.setMuted(!on);
    set({ audioOn: on });
  },
  setPaused: (p) => set({ paused: p }),
  setQuality: (q) => set({ quality: q }),
}));

/** Vitórias contra a Fabiola (fases 1 a 3). */
export function fabiolaWins(results: GameState['results']) {
  return ([1, 2, 3] as PhaseId[]).filter((p) => results[p]?.won).length;
}

export function totalMedals(results: GameState['results']) {
  return ([1, 2, 3, 4] as PhaseId[]).filter((p) => results[p]?.won).length;
}
