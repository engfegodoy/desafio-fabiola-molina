import { useEffect, useRef, useState } from 'react';
import type { RaceEngine } from '../game/raceEngine';
import { actionFor } from '../game/keybindings';
import { isTouch, useGame } from '../store/gameStore';
import { audio } from '../audio/audio';

/**
 * Ações do jogador — a mesma lógica serve para teclado, botões e gestos.
 */
export const actions = {
  swimDown(engine: RaceEngine) {
    if (useGame.getState().paused) return;
    audio.unlock();
    engine.press(performance.now());
  },
  swimUp(engine: RaceEngine) {
    engine.release(performance.now());
  },
  breathe(engine: RaceEngine) {
    if (useGame.getState().paused) return;
    audio.unlock();
    engine.breathe();
  },
  cancel(engine: RaceEngine) {
    engine.cancelCharge();
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
        if (!e.repeat) actions.swimDown(engine);
      } else if (act === 'breathe') {
        if (!e.repeat) actions.breathe(engine);
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (engine.state === 'done' || engine.state === 'drowned') return;
        e.preventDefault();
        engine.release();
        setPaused(!st.paused);
      }
    };
    const up = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (st.remapping) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const act = actionFor(e.code, st.bindings);
      if (act || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (act === 'swim') actions.swimUp(engine);
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

/** Captura o ponteiro para não perder o "soltar" (ignora falhas de navegadores antigos). */
function capture(e: React.PointerEvent) {
  try {
    (e.target as Element).setPointerCapture?.(e.pointerId);
  } catch {
    /* sem captura: o soltar ainda chega pelo próprio elemento */
  }
}

/** Distância mínima (px) do arraste para cima que conta como RESPIRAR. */
const SWIPE_MIN = 60;

/**
 * Camada de toque em tela cheia:
 * - computador: segurar o mouse = NADAR;
 * - celular, modo "Toque e gesto": segurar = carregar, soltar = braçada, arrastar para cima = RESPIRAR;
 * - celular, modo "Botões separados": não há camada (os botões ficam no HUD).
 */
export function TouchControl({ engine }: { engine: RaceEngine }) {
  const scheme = useGame((s) => s.mobileScheme);
  const paused = useGame((s) => s.paused);
  const [held, setHeld] = useState(false);
  const pointer = useRef<{ id: number; x: number; y: number; breathed: boolean } | null>(null);

  useEffect(() => {
    if (paused) {
      pointer.current = null;
      setHeld(false);
      engine.release();
    }
  }, [paused, engine]);

  if (isTouch && scheme === 'buttons') return null;
  const gesture = isTouch && scheme === 'gesture';

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    if (pointer.current || useGame.getState().paused) return;
    capture(e);
    pointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY, breathed: false };
    actions.swimDown(engine);
    setHeld(true);
  };
  const move = (e: React.PointerEvent) => {
    const p = pointer.current;
    if (!gesture || !p || p.id !== e.pointerId || p.breathed) return;
    const dy = p.y - e.clientY;
    const dx = Math.abs(e.clientX - p.x);
    if (dy >= SWIPE_MIN && dy > dx * 1.2) {
      // Gesto reconhecido: cancela a braçada em carregamento e respira.
      p.breathed = true;
      actions.cancel(engine);
      actions.breathe(engine);
      setHeld(false);
    }
  };
  const up = (e: React.PointerEvent) => {
    e.preventDefault();
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    pointer.current = null;
    if (!p.breathed) actions.swimUp(engine);
    setHeld(false);
  };

  return (
    <div
      className="absolute inset-0 z-[5]"
      style={{ touchAction: 'none' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {gesture && (
        <div className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 text-center">
          <div
            className={`font-display whitespace-nowrap rounded-2xl border-2 border-white/70 px-3 py-1.5 text-xs text-white shadow-lg transition ${
              held ? 'bg-sun-500/80' : 'bg-navy-800/50'
            }`}
          >
            {held ? 'SOLTE NO VERDE! ⬆ arraste p/ respirar' : '👆 SEGURE = NADAR • ⬆ ARRASTE = RESPIRAR'}
          </div>
        </div>
      )}
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
      className={`font-display pointer-events-auto flex h-[76px] w-[76px] shrink-0 select-none flex-col items-center justify-center rounded-full border-4 border-white text-[11px] leading-tight text-navy-800 shadow-2xl transition-transform ${
        flash ? 'scale-90 bg-emerald-300' : 'bg-gradient-to-b from-cyan-300 to-emerald-400'
      }`}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.breathe(engine);
        setFlash(true);
        setTimeout(() => setFlash(false), 160);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="text-3xl leading-none">🫁</span>
      RESPIRAR
    </button>
  );
}

/** Botão NADAR (lado direito no celular): pressione, segure e solte. */
export function SwimButton({ engine }: { engine: RaceEngine }) {
  const [held, setHeld] = useState(false);
  const id = useRef<number | null>(null);
  const end = (e: React.PointerEvent) => {
    e.preventDefault();
    if (id.current !== e.pointerId) return;
    id.current = null;
    setHeld(false);
    actions.swimUp(engine);
  };
  return (
    <button
      type="button"
      aria-label="Nadar"
      className={`font-display pointer-events-auto flex h-[88px] w-[88px] shrink-0 select-none flex-col items-center justify-center rounded-full border-4 border-white text-xs leading-tight text-navy-800 shadow-2xl transition-transform ${
        held ? 'scale-90 bg-sun-300' : 'bg-gradient-to-b from-sun-300 to-sun-500'
      }`}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (id.current !== null) return;
        id.current = e.pointerId;
        capture(e);
        setHeld(true);
        actions.swimDown(engine);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="text-3xl leading-none">🏊</span>
      {held ? 'SOLTE!' : 'NADAR'}
    </button>
  );
}
