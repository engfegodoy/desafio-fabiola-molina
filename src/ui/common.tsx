import type { ReactNode } from 'react';
import type { PhaseId } from '../config/balance';
import { audio } from '../audio/audio';
import { useGame } from '../store/gameStore';

export function Logo({ size = 'lg' }: { size?: 'lg' | 'md' | 'sm' }) {
  const s = '';
  const fs = size === 'lg' ? 'min(15vw, 11vh, 96px)' : size === 'md' ? '56px' : '30px';
  return (
    <div className="font-display select-none text-center leading-[0.85] drop-shadow-[0_8px_0_rgba(10,42,110,0.55)]" style={{ fontSize: fs }}>
      <div className={`${s} text-stroke`} style={{ color: '#ffd23f' }}>
        <span className="inline-block" style={{ fontSize: '0.62em', transform: 'rotate(-4deg)' }}>
          DESAFIO
        </span>
      </div>
      <div className={`${s} text-stroke text-white`} style={{ transform: 'rotate(-4deg)' }}>
        FABIOLA
      </div>
      <div className={`${s} text-stroke`} style={{ color: '#ffd23f', transform: 'rotate(-4deg)' }}>
        <span style={{ fontSize: '0.78em' }}>MOLINA</span>
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  color = 'yellow',
  big = false,
  disabled = false,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: 'yellow' | 'blue' | 'coral' | 'white';
  big?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`btn btn-${color} ${big ? 'btn-big' : ''} ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        audio.unlock();
        audio.click();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export function AudioButton() {
  const on = useGame((s) => s.audioOn);
  const toggle = useGame((s) => s.toggleAudio);
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={on ? 'Desativar áudio' : 'Ativar áudio'}
      title={on ? 'Desativar áudio' : 'Ativar áudio'}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        audio.unlock();
        toggle();
        audio.click();
      }}
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}

export function PauseButton() {
  const setPaused = useGame((s) => s.setPaused);
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label="Pausar"
      title="Pausar (P)"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        audio.click();
        setPaused(true);
      }}
    >
      <span className="font-display text-lg">II</span>
    </button>
  );
}

const MEDAL_STYLE: Record<PhaseId, { color: string; icon: string; name: string }> = {
  1: { color: 'linear-gradient(180deg,#7cc8ff,#1f6fe5)', icon: '🏊', name: 'Piscina Olímpica' },
  2: { color: 'linear-gradient(180deg,#7ff0e6,#14b8a6)', icon: '☀️', name: 'Mares: Dia' },
  3: { color: 'linear-gradient(180deg,#c9a7ff,#7c3aed)', icon: '🌙', name: 'Mares: Noite' },
  4: { color: 'linear-gradient(180deg,#ff9a8a,#ff5d4d)', icon: '🦈', name: 'Fuga do Tubarão' },
};

export function Medal({ phase, won, played, size = 40, animate = false }: { phase: PhaseId; won: boolean; played: boolean; size?: number; animate?: boolean }) {
  const st = MEDAL_STYLE[phase];
  return (
    <div
      className={`relative flex items-center justify-center rounded-full ${animate && won ? 'anim-medal' : ''}`}
      title={`${st.name}: ${won ? 'conquistada' : played ? 'não conquistada' : 'a disputar'}`}
      style={{
        width: size,
        height: size,
        background: won ? st.color : 'linear-gradient(180deg,#9aa6b8,#5d6878)',
        border: `${Math.max(2, size / 14)}px solid ${won ? '#ffd23f' : 'rgba(255,255,255,0.5)'}`,
        boxShadow: won ? '0 0 14px rgba(255,210,63,0.75), inset 0 -4px 0 rgba(0,0,0,0.2)' : 'inset 0 -3px 0 rgba(0,0,0,0.2)',
        opacity: won ? 1 : played ? 0.55 : 0.4,
        filter: won ? 'none' : 'grayscale(1)',
      }}
    >
      <span style={{ fontSize: size * 0.48 }}>{st.icon}</span>
      {won && (
        <span
          className="font-display absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-sun-400 text-navy-800"
          style={{ width: size * 0.42, height: size * 0.42, fontSize: size * 0.26, border: '2px solid #fff' }}
        >
          ★
        </span>
      )}
    </div>
  );
}

export function MedalRow({ size = 36, animate = false }: { size?: number; animate?: boolean }) {
  const results = useGame((s) => s.results);
  return (
    <div className="flex gap-1">
      {([1, 2, 3, 4] as PhaseId[]).map((p) => (
        <Medal key={p} phase={p} won={!!results[p]?.won} played={!!results[p]} size={size} animate={animate} />
      ))}
    </div>
  );
}

export { MEDAL_STYLE };

/** Bolhas decorativas em CSS para as telas de menu. */
export function CssBubbles({ count = 16 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const size = 10 + ((i * 37) % 30);
        return (
          <span
            key={i}
            className="bubble"
            style={{
              left: `${(i * 61) % 100}%`,
              width: size,
              height: size,
              animationDuration: `${6 + ((i * 13) % 9)}s`,
              animationDelay: `${-(i * 1.7) % 9}s`,
            }}
          />
        );
      })}
    </div>
  );
}
