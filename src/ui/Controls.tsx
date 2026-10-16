import { useEffect, useRef, useState } from 'react';
import type { RaceEngine } from '../game/raceEngine';
import { useGame } from '../store/gameStore';
import { audio } from '../audio/audio';

const coarse = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

/** Teclado: barra de espaço para nadar, P/Esc para pausar. */
export function useKeyboard(engine: RaceEngine | null) {
  const setPaused = useGame((s) => s.setPaused);
  useEffect(() => {
    if (!engine) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    const down = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === 'INPUT';
      if (typing) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (e.repeat) return;
        if (useGame.getState().paused) return;
        audio.unlock();
        engine.press(performance.now());
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        const st = engine.state;
        if (st === 'done') return;
        e.preventDefault();
        engine.release();
        setPaused(!useGame.getState().paused);
      }
    };
    const up = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        engine.release(performance.now());
      }
    };
    window.addEventListener('keydown', down, { capture: true });
    window.addEventListener('keyup', up, { capture: true });
    const blur = () => engine.release();
    window.addEventListener('blur', blur);
    const vis = () => {
      if (document.hidden && (engine.state === 'racing' || engine.state === 'finishing' || engine.state === 'countdown')) {
        engine.release();
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('keydown', down, { capture: true });
      window.removeEventListener('keyup', up, { capture: true });
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [engine, setPaused]);
}

/**
 * Área de toque: a tela inteira (exceto botões) funciona como controle.
 * No celular também mostramos um botão grande "SEGURE PARA NADAR".
 */
export function TouchControl({ engine }: { engine: RaceEngine }) {
  const [held, setHeld] = useState(false);
  const [isTouch] = useState(coarse);
  const pointers = useRef(new Set<number>());
  const paused = useGame((s) => s.paused);

  useEffect(() => {
    if (paused) {
      pointers.current.clear();
      setHeld(false);
      engine.release();
    }
  }, [paused, engine]);

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    if (useGame.getState().paused) return;
    audio.unlock();
    pointers.current.add(e.pointerId);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 1) {
      engine.press(performance.now());
      setHeld(true);
    }
  };
  const up = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      engine.release(performance.now());
      setHeld(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[5]"
      style={{ touchAction: 'none' }}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isTouch && (
        <div className="pointer-events-none absolute bottom-[calc(150px+env(safe-area-inset-bottom))] right-3 sm:bottom-[calc(100px+env(safe-area-inset-bottom))] sm:right-6">
          <div
            className={`font-display flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-white text-center text-xs leading-tight text-navy-800 shadow-2xl transition-transform ${
              held ? 'scale-90 bg-sun-300' : 'anim-glow bg-sun-400/90'
            }`}
          >
            <span className="text-2xl">👆</span>
            {held ? 'SOLTE NO VERDE!' : 'SEGURE PARA NADAR'}
          </div>
        </div>
      )}
    </div>
  );
}
