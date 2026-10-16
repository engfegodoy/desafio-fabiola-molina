import { create } from 'zustand';
import type { PhaseId } from '../config/balance';
import type { PhaseResult } from '../game/raceEngine';
import { DEFAULT_BINDINGS, loadBindings, saveBindings, type Action, type Bindings } from '../game/keybindings';
import { audio } from '../audio/audio';

/** Fluxo: identificação → regras → controles → treino → provas → prêmio. */
export type Screen = 'menu' | 'rules' | 'controls' | 'tutorial' | 'race' | 'final';
export type Quality = 'high' | 'low';
export type Gender = 'f' | 'm';
export type MobileScheme = 'buttons' | 'gesture';

export const SUIT_COLORS = [
  { id: 'azul', name: 'Azul', hex: '#1f6fe5' },
  { id: 'vermelho', name: 'Vermelho', hex: '#e5322d' },
  { id: 'roxo', name: 'Roxo', hex: '#7c3aed' },
  { id: 'rosa', name: 'Rosa', hex: '#ec4899' },
  { id: 'verde', name: 'Verde', hex: '#16a34a' },
  { id: 'preto', name: 'Preto', hex: '#1f2937' },
  { id: 'amarelo', name: 'Amarelo', hex: '#facc15' },
] as const;
export type SuitColorId = (typeof SUIT_COLORS)[number]['id'];

interface GameState {
  screen: Screen;
  phase: PhaseId;
  /** Incrementa para reiniciar a fase atual (remonta a cena). */
  runId: number;
  playerName: string;
  gender: Gender;
  suitColor: SuitColorId;
  audioOn: boolean;
  paused: boolean;
  quality: Quality;
  results: Partial<Record<PhaseId, PhaseResult>>;
  bindings: Bindings;
  mobileScheme: MobileScheme;
  /** Tela de controles aberta capturando uma tecla (o jogo ignora o teclado). */
  remapping: boolean;

  setName: (name: string) => void;
  setGender: (g: Gender) => void;
  setSuitColor: (c: SuitColorId) => void;
  startGame: () => void;
  goTo: (s: Screen) => void;
  startTutorial: () => void;
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
  setBinding: (a: Action, codes: string[]) => void;
  resetBindings: () => void;
  setMobileScheme: (m: MobileScheme) => void;
  setRemapping: (r: boolean) => void;
}

export const isMobile =
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

/** Tela de toque (celular/tablet). */
export const isTouch =
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || isMobile);

export const MAX_NAME = 30;

function loadScheme(): MobileScheme {
  try {
    return localStorage.getItem('dfm-scheme') === 'gesture' ? 'gesture' : 'buttons';
  } catch {
    return 'buttons';
  }
}

export const useGame = create<GameState>((set, get) => ({
  screen: 'menu',
  phase: 1,
  runId: 0,
  playerName: '',
  gender: 'f',
  suitColor: 'azul',
  audioOn: true,
  paused: false,
  quality: isMobile ? 'low' : 'high',
  results: {},
  bindings: loadBindings(),
  mobileScheme: loadScheme(),
  remapping: false,

  setName: (name) => set({ playerName: name.slice(0, MAX_NAME) }),
  setGender: (g) => set({ gender: g }),
  setSuitColor: (c) => set({ suitColor: c }),
  startGame: () => {
    if (!get().playerName.trim()) return;
    set({ screen: 'rules', results: {}, phase: 1, paused: false });
  },
  goTo: (s) => set({ screen: s, paused: false }),
  startTutorial: () => set({ screen: 'tutorial', results: {}, phase: 1, paused: false, runId: get().runId + 1 }),
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
  setBinding: (a, codes) => {
    const bindings = { ...get().bindings, [a]: codes };
    saveBindings(bindings);
    set({ bindings });
  },
  resetBindings: () => {
    saveBindings(DEFAULT_BINDINGS);
    set({ bindings: DEFAULT_BINDINGS });
  },
  setMobileScheme: (m) => {
    try {
      localStorage.setItem('dfm-scheme', m);
    } catch {
      /* sem armazenamento */
    }
    set({ mobileScheme: m });
  },
  setRemapping: (r) => set({ remapping: r }),
}));

/** Vitórias contra a Fabiola (fases 1 a 3). */
export function fabiolaWins(results: GameState['results']) {
  return ([1, 2, 3] as PhaseId[]).filter((p) => results[p]?.won).length;
}

export function totalMedals(results: GameState['results']) {
  return ([1, 2, 3, 4] as PhaseId[]).filter((p) => results[p]?.won).length;
}

export function suitHex(id: SuitColorId) {
  return SUIT_COLORS.find((c) => c.id === id)?.hex ?? '#1f6fe5';
}
