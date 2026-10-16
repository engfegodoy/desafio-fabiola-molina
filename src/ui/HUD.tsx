import { useEffect, useRef, useState } from 'react';
import type { RaceEngine } from '../game/raceEngine';
import { formatTime, useEngineEvent, useTicker } from '../game/engineContext';
import { isTouch, useGame } from '../store/gameStore';
import { bindingLabel } from '../game/keybindings';
import { BreathButton, SwimButton } from './Controls';
import { ENERGY, SWIM } from '../config/balance';
import { AudioButton, MedalRow, PauseButton } from './common';

/* ===================== Barra de força ===================== */
export function PowerBar({ engine, compact = false }: { engine: RaceEngine; compact?: boolean }) {
  const needle = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const b = engine.cfg.bar;

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const p = engine.player;
      const c = p.charge;
      if (needle.current) {
        needle.current.style.left = `${c * 100}%`;
        needle.current.style.opacity = p.charging ? '1' : '0.45';
      }
      if (fill.current) fill.current.style.width = `${c * 100}%`;
      if (wrap.current) {
        const inGreen = p.charging && c >= b.greenStart && c <= b.greenEnd;
        wrap.current.style.boxShadow = inGreen ? '0 0 18px rgba(80,255,120,0.9)' : '';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine, b]);

  useEngineEvent(engine, (e) => {
    if (e.type === 'stroke' && e.who === 'player' && e.result.long && ghost.current) {
      const g = ghost.current;
      g.style.left = `${e.result.charge * 100}%`;
      g.style.transition = 'none';
      g.style.opacity = '1';
      requestAnimationFrame(() => {
        g.style.transition = 'opacity 0.9s ease-out';
        g.style.opacity = '0';
      });
    }
  });

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const grad = `linear-gradient(90deg,
    #ff3b3b 0%, #ff7a2f ${pct(b.yellowStart * 0.75)}, #ffd23f ${pct(b.yellowStart)},
    #ffe066 ${pct(b.greenStart - 0.005)}, #29d65f ${pct(b.greenStart)}, #3df58a ${pct((b.greenStart + b.greenEnd) / 2)},
    #29d65f ${pct(b.greenEnd)}, #ffe066 ${pct(b.greenEnd + 0.005)}, #ffb21f ${pct(b.yellowEnd)},
    #ff7a2f ${pct(b.yellowEnd + 0.02)}, #ff3b3b 100%)`;
  const center = (b.greenStart + b.greenEnd) / 2;

  return (
    <div className={`hud-card w-full ${compact ? 'px-2 pb-2 pt-1' : 'px-3 pb-3 pt-1.5'}`}>
      <div className="font-display flex items-center justify-between text-[11px] uppercase tracking-wide text-white/90 sm:text-xs">
        <span>Barra de força</span>
        <span className="hidden text-[#3df58a] sm:inline">★ ponto ideal</span>
      </div>
      <div ref={wrap} className="relative mt-3 transition-transform" style={{ borderRadius: 999 }}>
        {/* indicador da zona ideal */}
        <div
          className="absolute -top-3.5 z-10 -translate-x-1/2 text-sm leading-none text-[#3df58a] drop-shadow"
          style={{ left: pct(center) }}
        >
          ▼
        </div>
        <div className="power-track h-6 sm:h-7" style={{ background: grad }}>
          <div className="absolute inset-y-0 border-x-2 border-white/80" style={{ left: pct(b.greenStart), width: pct(b.greenEnd - b.greenStart) }} />
          <div ref={fill} className="absolute inset-y-0 left-0 bg-white/25" style={{ width: 0 }} />
        </div>
        <div ref={ghost} className="pointer-events-none absolute -bottom-2 z-10 -translate-x-1/2 text-xs text-white opacity-0">
          ▲
        </div>
        <div
          ref={needle}
          className="pointer-events-none absolute -inset-y-1.5 z-20 w-2 -translate-x-1/2 rounded-full border-2 border-navy-900 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
          style={{ left: 0 }}
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
  const v = Math.round(e);
  if (v <= ENERGY.criticalAt) return { key: 'critical', label: 'SEM FÔLEGO!', color: 'linear-gradient(90deg,#ff2d2d,#ff6b4a)', text: 'text-coral-400', blink: 'blink-strong' } as const;
  if (v <= ENERGY.lowAt) return { key: 'low', label: 'RESPIRE!', color: 'linear-gradient(90deg,#ff7a1a,#ffb21f)', text: 'text-orange-300', blink: 'blink-soft' } as const;
  if (v <= ENERGY.warnAt) return { key: 'warn', label: 'ATENÇÃO', color: 'linear-gradient(90deg,#ffd23f,#ffe873)', text: 'text-sun-300', blink: '' } as const;
  return { key: 'ok', label: 'ENERGIA', color: 'linear-gradient(90deg,#22d3ee,#3df58a)', text: 'text-white/90', blink: '' } as const;
}

export function EnergyBar({ engine, highlight = false }: { engine: RaceEngine; highlight?: boolean }) {
  const p = engine.player;
  const st = energyState(p.energy);
  const [glow, setGlow] = useState(0);
  useEngineEvent(engine, (e) => {
    if (e.type === 'breath' && e.result.valid) setGlow((g) => g + 1);
  });
  return (
    <div
      key={glow}
      className={`hud-card px-2.5 pb-1.5 pt-1 sm:px-3 ${glow ? 'breath-glow' : ''} ${highlight ? 'ring-4 ring-sun-400' : ''}`}
    >
      <div className="font-display flex items-center justify-between text-[11px] uppercase sm:text-xs">
        <span className={`${st.text} ${st.blink}`}>🫁 {st.label}</span>
        <span className={`tabular-nums ${st.text}`}>{Math.round(p.energy)}%</span>
      </div>
      <div className={`relative mt-1 h-4 overflow-hidden rounded-full border-2 border-white/80 bg-navy-900 sm:h-5 ${st.blink}`}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150"
          style={{ width: `${p.energy}%`, background: st.color, boxShadow: st.key === 'ok' ? '0 0 10px rgba(60,240,255,0.6)' : '' }}
        />
        {/* marca dos 50%: abaixo dela a nadadora perde velocidade */}
        <div className="absolute inset-y-0 border-l-2 border-dashed border-white/70" style={{ left: `${ENERGY.fullAbove}%` }} />
      </div>
    </div>
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
  perfect: { text: 'PERFEITO!', color: '#3df58a', size: 34 },
  great: { text: 'ÓTIMO!', color: '#3df5ff', size: 30 },
  good: { text: 'BOM!', color: '#ffd23f', size: 26 },
  early: { text: 'MUITO CEDO!', color: '#ff7b6b', size: 26 },
  passed: { text: 'PASSOU DO PONTO!', color: '#ff7b6b', size: 24 },
  short: { text: 'BRAÇADA CURTA', color: '#ffffff', size: 18 },
};

export function Feedback({ engine }: { engine: RaceEngine }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const idRef = useRef(0);
  const push = (text: string, color: string, size: number) => {
    const id = ++idRef.current;
    setMsgs((m) => [...m.slice(-2), { id, text, color, size }]);
    setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 1100);
  };
  useEngineEvent(engine, (e) => {
    if (e.type === 'stroke' && e.who === 'player') {
      if (e.result.rushed) push('PERDEU O RITMO!', '#ff9a3d', 26);
      else {
        const q = QUALITY_MSG[e.result.quality];
        push(q.text, q.color, q.size);
      }
      if (e.result.comboUp) {
        const n = e.result.combo;
        push(n >= SWIM.comboMax ? `COMBO x${n}! MÁXIMO!` : `COMBO x${n}!`, '#ffd23f', 28 + n * 2);
      }
    }
    if (e.type === 'comboLost') push('PERDEU O RITMO!', '#ff9a3d', 22);
    if (e.type === 'breath') {
      const o = e.result.outcome;
      if (o === 'ok') push(`+${Math.round(e.result.gain)}% FÔLEGO!`, '#3df5ff', 28);
      else if (o === 'early') push('RESPIROU CEDO DEMAIS! −RITMO', '#ffb21f', 22);
      else if (o === 'consecutive') push('DÊ UMA BRAÇADA ANTES DE RESPIRAR!', '#ff7b6b', 20);
    }
    if (e.type === 'energy') {
      if (e.level === 'warn') push('ATENÇÃO: ENERGIA EM 50%', '#ffd23f', 20);
      else if (e.level === 'low') push('PRECISA RESPIRAR!', '#ff9a3d', 26);
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
      <div className="safe-pad absolute inset-x-0 bottom-0">
        <div className="mx-auto flex max-w-4xl items-end gap-1.5 sm:gap-2">
          {buttons && <BreathButton engine={engine} />}
          {!isTouch && (
            <div className="hud-card hidden w-48 shrink-0 flex-col justify-center gap-0.5 self-stretch px-3 py-1.5 lg:flex">
              <div className="text-[11px] font-bold leading-tight text-white/90">
                <span className="font-display text-sun-300">{bindingLabel(bindings.swim)}</span> segure e solte no{' '}
                <span className="text-[#3df58a]">verde</span> = NADAR
              </div>
              <div className="text-[11px] font-bold leading-tight text-white/90">
                <span className="font-display text-aqua-300">{bindingLabel(bindings.breathe)}</span> = RESPIRAR (+50%)
              </div>
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-stretch gap-1.5">
              <div className="min-w-0 flex-1">
                <EnergyBar engine={engine} highlight={energyHighlight} />
              </div>
              <ComboBox engine={engine} />
            </div>
            <PowerBar engine={engine} />
          </div>
          {buttons && <SwimButton engine={engine} />}
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
        <span className={danger > 0.7 ? 'anim-danger text-coral-400' : 'text-white'}>⚠ Perigo do tubarão</span>
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
