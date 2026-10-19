import { useEffect, useRef, useState } from 'react';
import type { RaceEngine } from '../game/raceEngine';
import { actionFor } from '../game/keybindings';
import { isTouch, useGame } from '../store/gameStore';
import { audio } from '../audio/audio';

/**
 * Ações do jogador — a mesma lógica serve para teclado, botões e gestos.
 * TOQUE = BRAÇADA NA HORA (sem segurar e soltar).
 */
export const actions = {
  swim(engine: RaceEngine) {
    if (useGame.getState().paused) return;
    audio.unlock();
    engine.stroke();
  },
  breathe(engine: RaceEngine) {
    if (useGame.getState().paused) return;
    audio.unlock();
    engine.breathe();
  },
};

/** Teclado: atalhos configuráveis (padrão: ESPAÇO = nadar, CTRL / ↑ = respirar). P/Esc pausa. */
export function useKeyboard(engine: RaceEngine | null) {
  const setPaused = useGame((s) => s.setPaused);
  useEffect(() => {
    if (!engine) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    const down = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (st.remapping) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const act = actionFor(e.code, st.bindings);
      if (act || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (act === 'swim') {
        // Cada aperto é uma braçada; segurar a tecla não repete.
        if (!e.repeat) actions.swim(engine);
      } else if (act === 'breathe') {
        if (!e.repeat) actions.breathe(engine);
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (engine.state === 'done' || engine.state === 'drowned') return;
        e.preventDefault();
        setPaused(!st.paused);
      }
    };
    const up = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (st.remapping || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (actionFor(e.code, st.bindings) || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    };
    window.addEventListener('keydown', down, { capture: true });
    window.addEventListener('keyup', up, { capture: true });
    const vis = () => {
      if (document.hidden && (engine.state === 'racing' || engine.state === 'finishing' || engine.state === 'countdown')) {
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('keydown', down, { capture: true });
      window.removeEventListener('keyup', up, { capture: true });
      document.removeEventListener('visibilitychange', vis);
    };
  }, [engine, setPaused]);
}

/** Distância mínima (px) do arraste para cima que conta como RESPIRAR. */
const SWIPE_MIN = 60;

/**
 * Camada de toque em tela cheia:
 * - computador: cada clique = uma braçada;
 * - celular, modo "Toque e gesto": cada toque = braçada na hora, arrastar para cima = RESPIRAR;
 * - celular, modo "Botões separados": não há camada (os botões ficam no HUD).
 */
export function TouchControl({ engine }: { engine: RaceEngine }) {
  const scheme = useGame((s) => s.mobileScheme);
  const pointers = useRef(new Map<number, { x: number; y: number; breathed: boolean }>());

  if (isTouch && scheme === 'buttons') return null;
  const gesture = isTouch && scheme === 'gesture';

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    if (useGame.getState().paused) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, breathed: false });
    actions.swim(engine);
  };
  const move = (e: React.PointerEvent) => {
    const p = pointers.current.get(e.pointerId);
    if (!gesture || !p || p.breathed) return;
    const dy = p.y - e.clientY;
    const dx = Math.abs(e.clientX - p.x);
    if (dy >= SWIPE_MIN && dy > dx * 1.2) {
      p.breathed = true;
      actions.breathe(engine);
    }
  };
  const up = (e: React.PointerEvent) => {
    e.preventDefault();
    pointers.current.delete(e.pointerId);
  };

  return (
    <div
      className="absolute inset-0 z-[5]"
      style={{ touchAction: 'none' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
      onContextMenu={(e) => e.preventDefault()}
    >
    </div>
  );
}

/** Botão RESPIRAR (lado esquerdo no celular). */
export function BreathButton({ engine }: { engine: RaceEngine }) {
  const [flash, setFlash] = useState(false);
  return (
    <button
      type="button"
      aria-label="Respirar"
      className={`font-display pointer-events-auto flex h-[76px] w-[76px] shrink-0 select-none flex-col items-center justify-center rounded-full border-4 border-white text-[11px] leading-tight text-navy-800 shadow-2xl transition-transform duration-75 ${
        flash ? 'scale-90 bg-emerald-300' : 'bg-gradient-to-b from-cyan-300 to-emerald-400'
      }`}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.breathe(engine);
        setFlash(true);
        setTimeout(() => setFlash(false), 140);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="text-3xl leading-none">🫁</span>
      RESPIRAR
    </button>
  );
}

/** Botão NADAR (lado direito no celular): cada toque é uma braçada na hora. */
export function SwimButton({ engine }: { engine: RaceEngine }) {
  const [flash, setFlash] = useState(false);
  return (
    <button
      type="button"
      aria-label="Toque para nadar"
      className={`font-display pointer-events-auto flex h-[92px] w-[92px] shrink-0 select-none flex-col items-center justify-center rounded-full border-4 border-white px-1 text-center text-[11px] leading-tight text-navy-800 shadow-2xl transition-transform duration-75 ${
        flash ? 'scale-90 bg-sun-300' : 'bg-gradient-to-b from-sun-300 to-sun-500'
      }`}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.swim(engine);
        setFlash(true);
        setTimeout(() => setFlash(false), 90);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="text-3xl leading-none">🏊</span>
      TOQUE PARA NADAR
    </button>
  );
}
