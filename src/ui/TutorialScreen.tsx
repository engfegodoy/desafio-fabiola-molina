import { useEffect, useState } from 'react';
import { TUTORIAL_STEPS, TUTORIAL_TOTAL_BREATHS, TUTORIAL_TOTAL_STROKES, type RaceEngine } from '../game/raceEngine';
import { useEngineEvent, useTicker } from '../game/engineContext';
import { bindingLabel } from '../game/keybindings';
import { isTouch, useGame } from '../store/gameStore';
import { HUD } from './HUD';
import { TouchControl, useKeyboard } from './Controls';
import { Button } from './common';
import { Confetti } from './Confetti';
import { PauseMenu } from './RaceScreen';
import { DrownOverlay } from './DrownOverlay';

/** Como fazer cada ação, de acordo com o controle escolhido. */
function useHowTo() {
  const scheme = useGame((s) => s.mobileScheme);
  const bindings = useGame((s) => s.bindings);
  if (!isTouch) return { swim: `segure ${bindingLabel(bindings.swim)}`, breathe: `aperte ${bindingLabel(bindings.breathe)}` };
  if (scheme === 'buttons') return { swim: 'segure NADAR', breathe: 'toque RESPIRAR' };
  return { swim: 'segure a tela', breathe: 'arraste para cima' };
}

export function TutorialScreen({ engine }: { engine: RaceEngine }) {
  useTicker(15);
  useKeyboard(engine);
  const skip = useGame((s) => s.skipTutorial);
  const startPhase = useGame((s) => s.startPhase);
  const paused = useGame((s) => s.paused);
  const how = useHowTo();
  const [done, setDone] = useState(false);
  const [cheer, setCheer] = useState(0);

  useEngineEvent(engine, (e) => {
    if (e.type === 'tutorialStep') setCheer((c) => c + 1);
    if (e.type === 'tutorialComplete') {
      setDone(true);
      engine.stopTutorial();
    }
  });

  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => startPhase(1), 3800);
    return () => clearTimeout(id);
  }, [done, startPhase]);

  // Etapas curtas: 10 braçadas → respirar → mais 10 braçadas.
  const STEPS = [
    { icon: '🏊', title: 'NADE', text: `${how.swim} e solte no VERDE` },
    { icon: '🫁', title: 'RESPIRE', text: `${how.breathe} (+5 de fôlego)` },
    { icon: '🔥', title: 'MANTENHA O RITMO', text: 'acerte o verde e respire a cada 5' },
  ];

  const step = Math.min(engine.tutorialStep, STEPS.length - 1);
  const info = STEPS[step];
  const cfg = TUTORIAL_STEPS[step];
  const isBreath = cfg.key === 'breath';
  const progress = Math.min(1, engine.tutorialCount / cfg.need);

  return (
    <>
      {!done && <TouchControl engine={engine} />}
      <HUD engine={engine} tutorial energyHighlight={isBreath && !done} />
      {!done && (
        <div className="pointer-events-none absolute inset-x-0 top-[64px] z-20 flex justify-center px-3 sm:top-[70px]">
          <div key={step} className="card anim-pop w-full max-w-md px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{info.icon}</span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="font-display text-sm text-navy-800 sm:text-base">
                  <span className="text-sky-600">{step + 1}/{STEPS.length}</span> {info.title}
                </div>
                <div className="truncate text-xs font-bold text-navy-700">{info.text}</div>
              </div>
              <div className="font-display shrink-0 rounded-xl bg-sky-100 px-2 py-1 text-center text-sm text-navy-800">
                {isBreath ? '🫁' : '🏊'} {engine.tutorialCount}/{cfg.need}
              </div>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sky-100">
              <div className="h-full rounded-full bg-gradient-to-r from-aqua-400 to-emerald-400 transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </div>
      )}
      {!done && cheer > 0 && (
        <div key={cheer} className="font-display text-stroke anim-float pointer-events-none absolute left-1/2 top-[48%] z-30 -translate-x-1/2 whitespace-nowrap text-4xl text-[#3df58a]">
          ✔ MUITO BEM!
        </div>
      )}
      {!done && (
        <div className="safe-pad absolute right-0 top-[46%] z-30">
          <Button color="white" className="!px-3 !py-1.5 !text-sm" onClick={skip}>
            PULAR TUTORIAL ▸▸
          </Button>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-navy-900/30 p-4">
          <Confetti active duration={3.2} />
          <div className="anim-pop text-center">
            <div className="font-display text-stroke text-6xl text-sun-400 sm:text-8xl">PARABÉNS!</div>
            <div className="font-display text-stroke mt-2 text-2xl text-white sm:text-4xl">VOCÊ ESTÁ PRONTO PARA DESAFIAR A FABIOLA!</div>
            <div className="font-display mt-4 inline-block rounded-2xl bg-navy-800/80 px-4 py-2 text-lg">
              {TUTORIAL_TOTAL_STROKES} braçadas • {TUTORIAL_TOTAL_BREATHS} respiração ✔
            </div>
          </div>
        </div>
      )}
      <DrownOverlay engine={engine} />
      {paused && !done && <PauseMenu />}
    </>
  );
}
