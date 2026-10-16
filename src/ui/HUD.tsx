import { useRef, useState } from 'react';
import type { RaceEngine } from '../game/raceEngine';
import { formatTime, useEngineEvent, useTicker } from '../game/engineContext';
import { isTouch, useGame } from '../store/gameStore';
import { bindingLabel } from '../game/keybindings';
import { BreathButton, SwimButton } from './Controls';
import { ENERGY, SWIM } from '../config/balance';
import { AudioButton, MedalRow, PauseButton } from './common';

/* ===================== Barra de ritmo (velocidade) ===================== */
/** Velocidade que enche a barra até o fim (≈ ritmo ideal com combo). */
const SPEED_FULL = 2.9;

/**
 * Barra de ritmo: vai do vermelho (devagar) ao verde (rápido) e mostra a
 * VELOCIDADE. Tocar devagar = barra baixa; ritmo constante e rápido = verde.
 */
export function PowerBar({ engine }: { engine: RaceEngine }) {
  const wrap = useRef<HTMLDivElement>(null);
  const p = engine.player;
  // O HUD redesenha ~15x/s; a velocidade já vem suavizada pelo motor.
  const k = Math.max(0, Math.min(1, p.smoothSpeed / SPEED_FULL));

  // Pulso a cada braçada (resposta imediata ao toque).
  useEngineEvent(engine, (e) => {
    if (e.type === 'stroke' && e.who === 'player' && wrap.current) {
      const w = wrap.current;
      const color = e.result.quality === 'perfect' ? '61,245,138' : e.result.quality === 'good' ? '255,210,63' : '255,123,107';
      w.style.transition = 'none';
      w.style.boxShadow = `0 0 16px rgba(${color},0.95)`;
      w.style.transform = 'scaleY(1.12)';
      requestAnimationFrame(() => {
        w.style.transition = 'box-shadow 0.35s ease-out, transform 0.15s ease-out';
        w.style.boxShadow = '';
        w.style.transform = '';
      });
    }
  });

  return (
    <div className="hud-card w-full px-3 pb-2.5 pt-1.5">
      <div className="font-display flex items-center justify-between text-[11px] uppercase tracking-wide text-white/90 sm:text-xs">
        <span>Ritmo • velocidade</span>
        <span className="normal-case text-[#3df58a]">{p.tapRate > 0.3 ? `${p.tapRate.toFixed(1)} toques/s` : 'toque 2–3x/s'}</span>
      </div>
      <div ref={wrap} className="relative mt-1.5" style={{ borderRadius: 999 }}>
        <div
          className="power-track h-6 sm:h-7"
          style={{ background: 'linear-gradient(90deg,#ff3b3b 0%,#ff7a2f 28%,#ffd23f 52%,#9be84a 70%,#29d65f 84%,#3df58a 100%)' }}
        >
          {/* parte ainda não alcançada fica escurecida */}
          <div className="absolute inset-y-0 right-0 bg-navy-900/70 transition-[width] duration-100" style={{ width: `${(1 - k) * 100}%` }} />
        </div>
        <div
          className="pointer-events-none absolute -inset-y-1.5 z-20 w-2 -translate-x-1/2 rounded-full border-2 border-navy-900 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-[left] duration-100"
          style={{ left: `${k * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ===================== Combo ===================== */
export function ComboBox({ engine }: { engine: RaceEngine }) {
  const c = engine.player.combo;
  const active = c >= 2;
  return (
    <div className="hud-card flex min-w-[54px] flex-col items-center justify-center px-1.5 pb-1 pt-1 sm:min-w-[68px] sm:px-2">
      <div className="font-display text-[11px] uppercase text-white/90 sm:text-xs">Combo</div>
      <div
        key={c}
        className={`font-display text-stroke-thin leading-none ${active ? 'anim-pop text-sun-400' : 'text-white/40'}`}
        style={{ fontSize: active ? 30 : 24 }}
      >
        x{Math.max(1, c)}
      </div>
    </div>
  );
}

/* ===================== Energia ===================== */
export function energyState(e: number) {
  if (e <= ENERGY.criticalAt) return { key: 'critical', label: 'SEM FÔLEGO!', fill: '#ff3b3b', text: 'text-coral-400', blink: 'blink-strong' } as const;
  if (e <= ENERGY.lowAt) return { key: 'low', label: 'RESPIRE!', fill: '#ff9a1a', text: 'text-orange-300', blink: 'blink-soft' } as const;
  return { key: 'ok', label: 'FÔLEGO', fill: '#3df5c8', text: 'text-white/90', blink: '' } as const;
}

/** Barra de fôlego em 15 partes: cada braçada gasta 1, respirar devolve 5. */
export function EnergyBar({ engine, highlight = false }: { engine: RaceEngine; highlight?: boolean }) {
  const p = engine.player;
  const st = energyState(p.energy);
  const [glow, setGlow] = useState(0);
  useEngineEvent(engine, (e) => {
    if (e.type === 'breath' && e.result.valid) setGlow((g) => g + 1);
  });
  const shown = Math.max(0, Math.round(p.energy * 2) / 2);
  return (
    <div
      key={glow}
      className={`hud-card px-2.5 pb-1.5 pt-1 sm:px-3 ${glow ? 'breath-glow' : ''} ${highlight ? 'ring-4 ring-sun-400' : ''}`}
    >
      <div className="font-display flex items-center justify-between text-[11px] uppercase sm:text-xs">
        <span className={`${st.text} ${st.blink}`}>🫁 {st.label}</span>
        <span className={`tabular-nums ${st.text}`}>
          {Number.isInteger(shown) ? shown : shown.toFixed(1)}/{ENERGY.max}
        </span>
      </div>
      <div className={`mt-1 flex h-4 gap-[2px] sm:h-5 ${st.blink}`}>
        {Array.from({ length: ENERGY.max }, (_, i) => {
          const fill = Math.max(0, Math.min(1, p.energy - i));
          const slowZone = i < ENERGY.slowAt; // partes que, ao acabar, já deixam a nadadora lenta
          return (
            <div
              key={i}
              className={`relative flex-1 overflow-hidden rounded-[3px] border ${slowZone ? 'border-white/40' : 'border-white/80'} bg-navy-900`}
            >
              <div
                className="absolute inset-y-0 left-0 transition-[width] duration-150"
                style={{ width: `${fill * 100}%`, background: st.fill, boxShadow: st.key === 'ok' && fill > 0 ? '0 0 6px rgba(61,245,200,0.7)' : '' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Bordas da tela escurecendo quando o fôlego chega a 10/20 (mais escuro quanto menos energia). */
export function BreathVignette({ engine }: { engine: RaceEngine }) {
  const e = engine.player.energy;
  const racing = engine.controllable;
  const k = racing && e <= ENERGY.lowAt ? 0.55 + 0.45 * (1 - e / ENERGY.lowAt) : 0;
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[4] transition-opacity duration-500 ${k > 0.6 ? 'blink-soft' : ''}`}
      style={{
        opacity: k,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(5,8,30,0.55) 75%, rgba(5,8,30,0.92) 100%)',
      }}
    />
  );
}

/* ===================== Mensagens de feedback ===================== */
interface Msg {
  id: number;
  text: string;
  color: string;
  size: number;
}

const QUALITY_MSG: Record<string, { text: string; color: string; size: number }> = {
  perfect: { text: 'PERFEITO!', color: '#3df58a', size: 32 },
  good: { text: 'Bom!', color: '#ffd23f', size: 24 },
  slow: { text: 'Devagar!', color: '#ff9a3d', size: 24 },
  rushed: { text: 'Rápido demais!', color: '#ff7b6b', size: 22 },
};

export function Feedback({ engine }: { engine: RaceEngine }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const idRef = useRef(0);
  const push = (text: string, color: string, size: number) => {
    const id = ++idRef.current;
    setMsgs((m) => [...m.slice(-2), { id, text, color, size }]);
    setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 850);
  };
  useEngineEvent(engine, (e) => {
    if (e.type === 'stroke' && e.who === 'player') {
      const q = QUALITY_MSG[e.result.quality];
      push(q.text, q.color, q.size);
      if (e.result.glideEarned) push('🌊 SUPER DESLIZE! 3 BRAÇADAS', '#7ff0ff', 26);
      if (e.result.comboUp) {
        const n = e.result.combo;
        push(n >= SWIM.comboMax ? `COMBO x${n}! MÁXIMO!` : `COMBO x${n}!`, '#ffd23f', 28 + n * 2);
      }
    }
    if (e.type === 'breath') {
      const o = e.result.outcome;
      if (o === 'ok' && e.result.gain > 0) push(`+${Math.round(e.result.gain)} FÔLEGO!`, '#3df5ff', 28);
      else if (o === 'consecutive') push('DÊ UMA BRAÇADA ANTES DE RESPIRAR!', '#ff7b6b', 20);
    }
    if (e.type === 'sharkBreath') push('O TUBARÃO PAROU PARA RESPIRAR! 🦈', '#3df5ff', 22);
    if (e.type === 'energy') {
      if (e.level === 'low') push('PRECISA RESPIRAR!', '#ff9a3d', 26);
      else push('SEM FÔLEGO!', '#ff3b3b', 30);
    }
  });
  return (
    <div className="pointer-events-none absolute right-11 top-[34%] z-20 flex flex-col items-end gap-1 sm:right-24 md:right-28">
      {msgs.map((m) => (
        <div
          key={m.id}
          className="font-display text-stroke anim-side whitespace-nowrap"
          style={{ color: m.color, fontSize: `clamp(16px, ${m.size * 0.11}vw + 8px, ${m.size}px)`, filter: 'drop-shadow(0 3px 0 rgba(0,0,0,0.25))' }}
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}

/* ===================== Progresso vertical ===================== */
export function ProgressRail({ engine }: { engine: RaceEngine }) {
  const D = engine.cfg.distance;
  const pp = Math.min(1, engine.player.distance / D);
  const op = engine.opponent ? Math.min(1, engine.opponent.swimmer.distance / D) : null;
  const sp = engine.shark ? Math.max(0, Math.min(1, engine.shark.distance / D)) : null;
  const marker = (v: number) => ({ bottom: `calc(${v * 100}% - 14px)` });
  return (
    <div className="pointer-events-none absolute right-2 top-[42%] z-10 h-[30vh] max-h-[340px] min-h-[150px] -translate-y-1/2 sm:right-4 sm:top-1/2 sm:h-[38vh]">
      <div className="hud-card relative h-full w-7 rounded-full p-0">
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl">{engine.shark ? '🏖️' : '🏁'}</div>
        <div className="absolute inset-x-2 bottom-2 top-2 rounded-full bg-white/20">
          <div className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-aqua-400 to-sun-400" style={{ height: `${pp * 100}%` }} />
        </div>
        {sp !== null && (
          <div className="absolute left-1/2 z-10 -translate-x-1/2 text-xl transition-[bottom] duration-100" style={marker(sp)}>
            🦈
          </div>
        )}
        {op !== null && (
          <div
            className="font-display absolute left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-navy-800 text-[10px] text-white shadow transition-[bottom] duration-100"
            style={marker(op)}
            title="Fabiola"
          >
            FM
          </div>
        )}
        <div
          className="font-display absolute left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-sun-400 text-[10px] text-navy-800 shadow-lg transition-[bottom] duration-100"
          style={marker(pp)}
          title="Você"
        >
          VOCÊ
        </div>
      </div>
    </div>
  );
}

/* ===================== HUD principal ===================== */
export function HUD({ engine, tutorial = false, energyHighlight = false }: { engine: RaceEngine; tutorial?: boolean; energyHighlight?: boolean }) {
  useTicker(15);
  const name = useGame((s) => s.playerName);
  const gender = useGame((s) => s.gender);
  const scheme = useGame((s) => s.mobileScheme);
  const bindings = useGame((s) => s.bindings);
  const buttons = isTouch && scheme === 'buttons';
  const phase = useGame((s) => s.phase);
  const p = engine.player;
  const D = engine.cfg.distance;
  const isShark = engine.kind === 'shark';
  const showRace = engine.state !== 'intro';
  const w = engine.warning;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* topo */}
      <div className="safe-pad absolute inset-x-0 top-0 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-1.5 sm:gap-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="hud-card flex min-w-0 max-w-full items-center gap-2 px-2 py-1.5 sm:max-w-xs sm:px-3">
            <span className="text-lg">{gender === 'm' ? '🏊‍♂️' : '🏊‍♀️'}</span>
            <span className="font-display truncate text-sm text-sun-300 sm:text-lg">{name}</span>
          </div>
          {engine.opponent && showRace && (
            <div className="hud-card w-fit px-3 py-1">
              <div className="font-display text-[10px] uppercase text-white/80">Posição</div>
              <div className={`font-display text-2xl leading-none ${engine.position === 1 ? 'text-sun-400' : 'text-white'}`}>
                {engine.position}/2
              </div>
            </div>
          )}
          {!tutorial && (
            <div className="font-display w-fit whitespace-nowrap rounded-lg bg-white/90 px-2 py-0.5 text-[10px] uppercase text-navy-800 sm:text-xs">
              Fase {phase} de 4
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          {!tutorial && (
            <div className="hud-card px-2.5 py-1 sm:px-4">
              <div className="font-display text-xl tabular-nums sm:text-3xl">{formatTime(engine.time)}</div>
            </div>
          )}
          {!isShark && !tutorial && showRace && (
            <div className="font-display rounded-full bg-navy-800/70 px-3 py-0.5 text-xs text-white">
              {Math.max(0, D - p.distance).toFixed(0)} m para a chegada
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2 justify-self-end">
          <div className="flex gap-1.5 sm:gap-2">
            <AudioButton />
            <PauseButton />
          </div>
          {!tutorial && (
            <div className="hud-card px-1.5 py-1 sm:px-2 sm:py-1.5">
              <MedalRow size={typeof window !== 'undefined' && window.innerWidth < 420 ? 20 : 26} />
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 pointer-events-none top-[calc(max(10px,env(safe-area-inset-top))+108px)] flex justify-center px-2 sm:top-[calc(max(10px,env(safe-area-inset-top))+96px)] flex-col items-center gap-1.5">
        {isShark && showRace && <SharkDanger engine={engine} />}
          {w && w.distance < 9 && (engine.state === 'racing' || engine.state === 'finishing') && !p.finished && (
          <div
            className={`font-display anim-pop rounded-xl border-2 border-white px-3 py-1 text-xs sm:text-sm ${
              w.kind === 'front' ? 'bg-coral-500/90' : 'bg-emerald-500/90'
            }`}
          >
            {w.inside > 0.35 || w.distance < 0.6
              ? w.kind === 'front'
                ? '🌊 ONDA CONTRA! ÁGUA MAIS PESADA'
                : '🌊 ONDA A FAVOR! NADE AGORA!'
              : w.kind === 'front'
                ? `⬇ ONDA DE FRENTE EM ${w.distance.toFixed(0)} m`
                : `⬆ ONDA A FAVOR CHEGANDO`}
          </div>
        )}
      </div>
      {!tutorial && <ProgressRail engine={engine} />}
      <Feedback engine={engine} />

      {/* base */}
      <BreathVignette engine={engine} />
      <div className="safe-pad absolute inset-x-0 bottom-0">
        {/* botões grandes ACIMA das barras (modo botões no celular) */}
        {buttons && (
          <div className="mx-auto mb-2 flex max-w-4xl items-end justify-between px-1">
            <BreathButton engine={engine} />
            <SwimButton engine={engine} />
          </div>
        )}
        <div className="mx-auto flex max-w-4xl items-end gap-1.5 sm:gap-2">
          {!isTouch && (
            <div className="hud-card hidden w-48 shrink-0 flex-col justify-center gap-0.5 self-stretch px-3 py-1.5 lg:flex">
              <div className="text-[11px] font-bold leading-tight text-white/90">
                <span className="font-display text-sun-300">{bindingLabel(bindings.swim)}</span> = NADAR (toque{' '}
                <span className="text-[#3df58a]">2–3x por segundo</span>)
              </div>
              <div className="text-[11px] font-bold leading-tight text-white/90">
                <span className="font-display text-aqua-300">{bindingLabel(bindings.breathe)}</span> = RESPIRAR (+{ENERGY.breathGain} de fôlego)
              </div>
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-stretch gap-1.5">
              <div className="min-w-0 flex-1">
                <EnergyBar engine={engine} highlight={energyHighlight} />
              </div>
              <ComboBox engine={engine} />
              {engine.player.glideLeft > 0 && (
                <div className="hud-card font-display anim-pop flex flex-col items-center justify-center px-2 text-center text-[10px] leading-tight text-aqua-300">
                  🌊
                  <span>DESLIZE x{engine.player.glideLeft}</span>
                </div>
              )}
            </div>
            <PowerBar engine={engine} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SharkDanger({ engine }: { engine: RaceEngine }) {
  const danger = engine.sharkDanger;
  const gap = Math.max(0, engine.sharkGap);
  const toBeach = Math.max(0, engine.cfg.distance - engine.player.distance);
  return (
    <div className="hud-card w-[min(78vw,320px)] px-3 py-1.5">
      <div className="font-display flex items-center justify-between text-[11px] uppercase sm:text-xs">
        <span className={danger > 0.7 ? 'anim-danger text-coral-400' : 'text-white'}>
          {engine.shark?.breathing ? '💨 Tubarão respirando!' : '⚠ Perigo do tubarão'}
        </span>
        <span>{Math.round(danger * 100)}%</span>
      </div>
      <div className="mt-1 h-3.5 overflow-hidden rounded-full border-2 border-white/80 bg-navy-900">
        <div
          className={`h-full rounded-full ${danger > 0.7 ? 'anim-danger' : ''}`}
          style={{ width: `${danger * 100}%`, background: 'linear-gradient(90deg,#ffb21f,#ff3b3b)' }}
        />
      </div>
      <div className="font-display mt-1 flex justify-between text-xs">
        <span>🏖️ Praia: {toBeach.toFixed(0)} m</span>
        <span className={gap < 4 ? 'text-coral-400' : ''}>🦈 {gap.toFixed(1)} m</span>
      </div>
    </div>
  );
}
