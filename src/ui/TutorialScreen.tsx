import { useEffect, useState } from 'react';
import { TUTORIAL_STEPS, type RaceEngine } from '../game/raceEngine';
import { useEngineEvent, useTicker } from '../game/engineContext';
import { useGame } from '../store/gameStore';
import { HUD } from './HUD';
import { TouchControl, useKeyboard } from './Controls';
import { Button } from './common';
import { Confetti } from './Confetti';
import { PauseMenu } from './RaceScreen';

const STEPS = [
  { title: 'BRAÇADA CURTA', icon: '👆', text: 'Toque rapidinho na tela (ou aperte e solte o ESPAÇO bem rápido) para dar uma braçada curta.' },
  { title: 'BRAÇADA LONGA', icon: '✊', text: 'Agora SEGURE! A barra de força vai enchendo. Solte para uma braçada bem mais forte.' },
  { title: 'PONTO IDEAL', icon: '🎯', text: 'Solte quando o ponteiro estiver na ZONA VERDE ★ para ganhar potência máxima!' },
  { title: 'COMBO', icon: '🔥', text: 'Acerte a zona verde 3 vezes seguidas, sem demorar, para fazer COMBO x3!' },
  { title: 'ENERGIA', icon: '⚡', text: 'Ufa! Sua energia está baixa. Pare de nadar um pouquinho para recuperar o fôlego.' },
];

export function TutorialScreen({ engine }: { engine: RaceEngine }) {
  useTicker(15);
  useKeyboard(engine);
  const skip = useGame((s) => s.skipTutorial);
  const startPhase = useGame((s) => s.startPhase);
  const paused = useGame((s) => s.paused);
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
    const id = setTimeout(() => startPhase(1), 3200);
    return () => clearTimeout(id);
  }, [done, startPhase]);

  const step = Math.min(engine.tutorialStep, STEPS.length - 1);
  const info = STEPS[step];
  const need = TUTORIAL_STEPS[step].need;
  const progress = TUTORIAL_STEPS[step].key === 'rest' ? Math.min(1, engine.player.energy / 75) : Math.min(1, engine.tutorialCount / need);

  return (
    <>
      {!done && <TouchControl engine={engine} />}
      <HUD engine={engine} tutorial energyHighlight={TUTORIAL_STEPS[step].key === 'rest' && !done} />
      {!done && (
        <div className="pointer-events-none absolute inset-x-0 top-[88px] z-20 flex justify-center px-3 sm:top-[76px]">
          <div key={step} className="card anim-pop pointer-events-auto w-full max-w-lg p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-sun-300 to-sun-500 text-2xl shadow">
                {info.icon}
              </div>
              <div className="flex-1">
                <div className="font-display text-xs text-sky-600">TREINO • PASSO {step + 1} DE 5</div>
                <div className="font-display text-xl leading-tight text-navy-800 sm:text-2xl">{info.title}</div>
                <p className="mt-0.5 text-sm font-bold leading-snug text-navy-700 sm:text-base">{info.text}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-sky-100">
                <div className="h-full rounded-full bg-gradient-to-r from-aqua-400 to-emerald-400 transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < step ? 'bg-emerald-400' : i === step ? 'bg-sun-400' : 'bg-sky-200'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {!done && cheer > 0 && (
        <div key={cheer} className="font-display text-stroke anim-float pointer-events-none absolute left-1/2 top-[45%] z-30 -translate-x-1/2 text-4xl text-[#3df58a]">
          ✔ MUITO BEM!
        </div>
      )}
      {!done && (
        <div className="safe-pad absolute bottom-[110px] left-0 z-30 sm:bottom-[96px]">
          <Button color="white" className="!px-4 !py-2 !text-base" onClick={skip}>
            PULAR TUTORIAL ▸▸
          </Button>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-navy-900/30 p-4">
          <Confetti active duration={3} />
          <div className="anim-pop text-center">
            <div className="font-display text-stroke text-6xl text-sun-400 sm:text-8xl">PARABÉNS!</div>
            <div className="font-display text-stroke mt-2 text-3xl text-white sm:text-5xl">AGORA É PRA VALER!</div>
            <div className="font-display mt-4 inline-block rounded-2xl bg-navy-800/80 px-4 py-2 text-lg">Próxima parada: Piscina Olímpica 🏊‍♀️</div>
          </div>
        </div>
      )}
      {paused && !done && <PauseMenu />}
    </>
  );
}
