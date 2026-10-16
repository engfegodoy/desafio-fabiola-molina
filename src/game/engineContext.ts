import { useEffect, useReducer } from 'react';
import type { EngineEvent, RaceEngine } from './raceEngine';

/** Motor da prova em andamento (um por vez). */
export const current: { engine: RaceEngine | null } = { engine: null };

export function useEngineEvent(engine: RaceEngine | null, fn: (e: EngineEvent) => void) {
  useEffect(() => {
    if (!engine) return;
    return engine.on(fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);
}

/** Re-renderiza o componente algumas vezes por segundo (HUD). */
export function useTicker(hz = 12) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(force, 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
}

export function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const c = Math.floor((t * 100) % 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}
