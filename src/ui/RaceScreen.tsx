import { useEffect, useMemo, useRef, useState } from 'react';
import type { PhaseResult, RaceEngine } from '../game/raceEngine';
import { formatTime, useEngineEvent, useTicker } from '../game/engineContext';
import { fabiolaWins, useGame } from '../store/gameStore';
import { SHARK_LOSE_MESSAGES } from '../game/coupons';
import { HUD } from './HUD';
import { TouchControl, useKeyboard } from './Controls';
import { AudioButton, Button, MedalRow } from './common';
import { Confetti } from './Confetti';
import { ControlsPanel } from './ControlsPanel';
import { DrownOverlay } from './DrownOverlay';

const PHASE_TAG: Record<string, { tag: string; emoji: string; goal: string }> = {
  pool: { tag: 'FASE 1', emoji: '🏊‍♀️', goal: 'Vença a Fabiola Molina nos 50 metros!' },
  seaDay: { tag: 'FASE 2', emoji: '☀️', goal: 'Acelere nas ondas a favor e mantenha o ritmo nas ondas contra!' },
  seaNight: { tag: 'FASE 3', emoji: '🌙', goal: 'Ondas fortes e timing exigente. A Fabiola está voando!' },
  shark: { tag: 'FASE 4', emoji: '🦈', goal: 'Nade até a areia antes do tubarão!' },
};

function StageOverlay({ engine }: { engine: RaceEngine }) {
  useTicker(20);
  const [count, setCount] = useState<number | null>(null);
  const [oppDone, setOppDone] = useState(false);
  useEngineEvent(engine, (e) => {
    if (e.type === 'countdown') setCount(e.n);
    if (e.type === 'finish' && e.who === 'opponent') setOppDone(true);
  });
  useEffect(() => {
    if (count === 0) {
      const id = setTimeout(() => setCount(null), 900);
      return () => clearTimeout(id);
    }
  }, [count]);

  const s = engine.state;
  const k = engine.stateTime;
  const info = PHASE_TAG[engine.kind];
  const isShark = engine.kind === 'shark';

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      {s === 'intro' && !isShark && (
        <div className="anim-pop flex flex-col items-center px-4 text-center">
          <div className="ribbon mb-2 text-lg">{info.tag}</div>
          <div className="font-display text-stroke text-4xl text-white drop-shadow-xl sm:text-6xl">
            {info.emoji} {engine.cfg.title.split('•')[1]?.trim()}
          </div>
          <div className="font-display text-stroke-thin mt-2 text-lg text-sun-300 sm:text-2xl">{engine.cfg.subtitle}</div>
          <div className="mt-3 max-w-md rounded-2xl bg-navy-800/80 px-4 py-2 text-base font-bold sm:text-lg">{info.goal}</div>
        </div>
      )}
      {s === 'intro' && isShark && (
        <div className="absolute top-[18%] flex flex-col items-center px-4 text-center">
          {k < 2.6 && (
            <>
              <div className="font-display text-stroke anim-pop text-4xl text-sun-400 sm:text-6xl">QUE FESTA! 🎉</div>
              <div className="font-display text-stroke-thin mt-1 text-xl text-white sm:text-2xl">Você completou as provas!</div>
            </>
          )}
          {k >= 2.6 && k < 4.5 && <div className="font-display text-stroke anim-pop text-5xl text-white sm:text-7xl">TCHIBUM! 🤸</div>}
          {k >= 4.5 && k < 6.0 && <div className="font-display text-stroke anim-pop text-5xl text-coral-400 sm:text-7xl">UM TUBARÃO!!! 🦈</div>}
          {k >= 6.0 && (
            <>
              <div className="ribbon mb-2">{info.tag} • FUGA DO TUBARÃO</div>
              <div className="font-display text-stroke anim-pop text-4xl text-sun-400 sm:text-6xl">NADE ATÉ A PRAIA!</div>
            </>
          )}
        </div>
      )}
      {isShark && s === 'intro' && k < 2.6 && <Confetti active duration={2.4} />}
      {count !== null && (
        <div key={count} className="font-display text-stroke anim-countdown text-[28vw] leading-none text-sun-400 sm:text-[180px]">
          {count > 0 ? count : isShark ? 'NADE!' : 'VAI!'}
        </div>
      )}
      {s === 'racing' && engine.time < 3.5 && engine.kind === 'pool' && (
        <div className="font-display anim-slide absolute top-[24%] rounded-2xl bg-navy-800/80 px-4 py-2 text-center text-base sm:text-xl">
          Toque <span className="text-[#3df58a]">2–3x por segundo</span> para nadar!
        </div>
      )}
      {oppDone && !engine.player.finished && (s === 'racing' || s === 'finishing') && (
        <div className="font-display anim-pop absolute top-[22%] rounded-2xl border-4 border-white bg-coral-500 px-5 py-2 text-center text-lg sm:text-2xl">
          A FABIOLA CHEGOU! Termine a prova!
        </div>
      )}
      {s === 'finishing' && engine.player.finished && (
        <div className="font-display text-stroke anim-pop text-5xl text-white sm:text-7xl">CHEGADA! 🏁</div>
      )}
      {s === 'outro' && <OutroText engine={engine} />}
      {s === 'intro' && (
        <div className="safe-pad pointer-events-auto absolute right-0 top-[46%] z-30">
          <Button color="white" className="!px-4 !py-2 !text-base" onClick={() => engine.skipIntro()}>
            Pular ▸▸
          </Button>
        </div>
      )}
    </div>
  );
}

function OutroText({ engine }: { engine: RaceEngine }) {
  const o = engine.outcome;
  const map = {
    win: { t: 'VITÓRIA! 🏆', c: 'text-sun-400' },
    lose: { t: 'A FABIOLA VENCEU!', c: 'text-white' },
    escaped: { t: 'VOCÊ ESCAPOU! 🏖️', c: 'text-sun-400' },
    caught: { t: 'NHAC! 🦈', c: 'text-coral-400' },
  } as const;
  if (!o) return null;
  return (
    <>
      {(o === 'win' || o === 'escaped') && <Confetti active duration={3} />}
      <div className={`font-display text-stroke anim-pop absolute top-[20%] text-center text-5xl sm:text-7xl ${map[o].c}`}>{map[o].t}</div>
    </>
  );
}

function ScoreChips({ r }: { r: PhaseResult }) {
  const items = [
    { icon: '⚡', label: 'Velocidade', v: r.breakdown.velocidade, bg: 'from-sky-400 to-blue-600' },
    { icon: '❤️', label: 'Resistência', v: r.breakdown.resistencia, bg: 'from-pink-400 to-rose-600' },
    { icon: '⭐', label: 'Técnica', v: r.breakdown.tecnica, bg: 'from-yellow-300 to-amber-500' },
    { icon: '🏆', label: 'Conquista', v: r.breakdown.conquista, bg: 'from-cyan-300 to-teal-500' },
  ];
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {items.map((it, i) => (
        <div key={it.label} className="anim-pop flex flex-col items-center" style={{ animationDelay: `${0.25 + i * 0.1}s` }}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b ${it.bg} text-lg shadow`}>
            {it.icon}
          </div>
          <div className="font-display text-lg leading-none text-navy-800">{it.v}</div>
          <div className="text-[10px] font-bold uppercase text-sky-700">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

function ResultPanel({ engine, result }: { engine: RaceEngine; result: PhaseResult }) {
  const phase = useGame((s) => s.phase);
  const results = useGame((s) => s.results);
  const name = useGame((s) => s.playerName);
  const retry = useGame((s) => s.retryPhase);
  const next = useGame((s) => s.nextPhase);
  const loseMsg = useMemo(() => SHARK_LOSE_MESSAGES[Math.floor(Math.random() * SHARK_LOSE_MESSAGES.length)], []);
  const isShark = engine.kind === 'shark';
  const won = result.won;
  const title = isShark ? (won ? 'VOCÊ ESCAPOU!' : 'O TUBARÃO TE PEGOU!') : won ? 'VITÓRIA!' : 'DERROTA';
  const diff = result.opponentTime !== undefined ? result.playerTime - result.opponentTime : 0;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-navy-900/45 p-3 backdrop-blur-[2px]" style={{ touchAction: 'pan-y' }}>
      {won && <Confetti active duration={4} />}
      <div className="card anim-pop relative my-auto w-full max-w-md p-4 text-center sm:p-6">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <div className="ribbon whitespace-nowrap text-base text-white">FASE {phase} • {engine.cfg.title.split('•')[1]?.trim()}</div>
        </div>
        <div className={`font-display text-stroke mt-3 text-5xl sm:text-6xl ${won ? 'text-sun-400' : 'text-coral-400'}`}>
          {title}
        </div>
        <div className="font-display mt-1 text-lg text-navy-700">{name}</div>
        {isShark && !won && <p className="mx-auto mt-2 max-w-xs text-lg font-bold text-coral-500">“{loseMsg}”</p>}
        {isShark && won && <p className="mt-2 text-lg font-bold text-emerald-600">Chegou na areia em segurança! O tubarão ficou só no sorriso. 😁</p>}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-sky-100 p-2">
            <div className="text-xs font-bold uppercase text-sky-700">Seu tempo</div>
            <div className="font-display text-2xl tabular-nums">{formatTime(result.playerTime)}</div>
          </div>
          {result.opponentTime !== undefined ? (
            <div className="rounded-2xl bg-sky-100 p-2">
              <div className="text-xs font-bold uppercase text-sky-700">Fabiola</div>
              <div className="font-display text-2xl tabular-nums">{formatTime(result.opponentTime)}</div>
            </div>
          ) : (
            <div className="rounded-2xl bg-sky-100 p-2">
              <div className="text-xs font-bold uppercase text-sky-700">{won ? 'Vantagem final' : 'Faltaram'}</div>
              <div className="font-display text-2xl tabular-nums">
                {won ? `${(result.sharkGap ?? 0).toFixed(1)} m` : `${Math.max(0, engine.cfg.distance - engine.player.distance).toFixed(1)} m`}
              </div>
            </div>
          )}
        </div>
        {result.opponentTime !== undefined && (
          <div className={`mt-1 text-sm font-bold ${diff <= 0 ? 'text-emerald-600' : 'text-coral-500'}`}>
            {diff <= 0 ? `Você chegou ${Math.abs(diff).toFixed(2)} s na frente!` : `Faltaram ${diff.toFixed(2)} s para vencer.`}
          </div>
        )}

        <div className="mt-3 rounded-2xl border-2 border-sky-100 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-display text-sm text-navy-700">PONTOS CONQUISTADOS</span>
            <span className={`font-display rounded-full px-3 py-0.5 text-sm ${won ? 'bg-sun-400 text-navy-800' : 'bg-slate-200 text-slate-500'}`}>
              {won ? '+1 MEDALHA' : '0 MEDALHA'}
            </span>
          </div>
          <ScoreChips r={result} />
          <div className="mt-2 flex justify-between text-xs font-bold text-sky-700">
            <span>Perfeitos: {result.perfects}</span>
            <span>Combo máx.: x{Math.max(1, result.maxCombo)}</span>
            <span className="font-display text-sm text-navy-800">Total: {result.score}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-col items-center gap-1">
          <MedalRow size={38} animate />
          <div className="text-xs font-bold text-sky-700">
            Vitórias contra a Fabiola: {fabiolaWins(results)}/3
            {results[4] ? ` • Tubarão: ${results[4].won ? 'escapou' : 'pegou você'}` : ''}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button color="white" className="flex-1" onClick={retry}>
            ↻ Tentar novamente
          </Button>
          <Button color={phase === 4 ? 'yellow' : 'blue'} className="flex-1" onClick={next}>
            {phase === 4 ? 'VER PREMIAÇÃO 🎁' : 'PRÓXIMA FASE ▶'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PauseMenu() {
  const setPaused = useGame((s) => s.setPaused);
  const retry = useGame((s) => s.retryPhase);
  const toMenu = useGame((s) => s.toMenu);
  const screen = useGame((s) => s.screen);
  const [controls, setControls] = useState(false);
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy-900/60 p-4 backdrop-blur-sm" style={{ touchAction: 'pan-y' }}>
      {controls ? (
        <div className="card anim-pop my-auto w-full max-w-xl p-4 sm:p-6">
          <div className="font-display text-stroke mb-3 text-center text-4xl text-sun-400">CONTROLES</div>
          <ControlsPanel />
          <Button color="yellow" className="mt-4 w-full" onClick={() => setControls(false)}>
            ✔ Pronto
          </Button>
        </div>
      ) : (
        <div className="card anim-pop flex w-full max-w-xs flex-col gap-3 p-6 text-center">
          <div className="font-display text-stroke text-5xl text-sun-400">PAUSA</div>
          <div className="flex justify-center">
            <AudioButton />
          </div>
          <Button color="yellow" big onClick={() => setPaused(false)}>
            ▶ Continuar
          </Button>
          <Button color="white" onClick={() => setControls(true)}>
            ⚙ Controles
          </Button>
          <Button color="blue" onClick={retry}>
            ↻ {screen === 'tutorial' ? 'Reiniciar treino' : 'Reiniciar fase'}
          </Button>
          <Button color="white" onClick={toMenu}>
            ⌂ Menu inicial
          </Button>
        </div>
      )}
    </div>
  );
}

export function RaceScreen({ engine }: { engine: RaceEngine }) {
  const paused = useGame((s) => s.paused);
  const record = useGame((s) => s.recordResult);
  const [result, setResult] = useState<PhaseResult | null>(null);
  const recorded = useRef(false);
  useKeyboard(engine);
  useEngineEvent(engine, (e) => {
    if (e.type === 'result' && !recorded.current) {
      recorded.current = true;
      record(e.result);
      setResult(e.result);
    }
  });
  return (
    <>
      <TouchControl engine={engine} />
      <HUD engine={engine} />
      <StageOverlay engine={engine} />
      <DrownOverlay engine={engine} />
      {result && <ResultPanel engine={engine} result={result} />}
      {paused && !result && <PauseMenu />}
    </>
  );
}

export { PauseMenu };
