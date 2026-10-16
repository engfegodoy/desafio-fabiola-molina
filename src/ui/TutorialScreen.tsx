import { useEffect, useState } from 'react';
import { TUTORIAL_STEPS, TUTORIAL_TOTAL_BREATHS, TUTORIAL_TOTAL_GREEN, type RaceEngine } from '../game/raceEngine';
import { useEngineEvent, useTicker } from '../game/engineContext';
import { bindingLabel } from '../game/keybindings';
import { isTouch, useGame } from '../store/gameStore';
import { HUD } from './HUD';
import { TouchControl, useKeyboard } from './Controls';
import { Button } from './common';
import { Confetti } from './Confetti';
import { PauseMenu } from './RaceScreen';

/** Como fazer cada ação, de acordo com o controle escolhido. */
function useHowTo() {
  const scheme = useGame((s) => s.mobileScheme);
  const bindings = useGame((s) => s.bindings);
  if (!isTouch) return { swim: `segure ${bindingLabel(bindings.swim)}`, breathe: `aperte ${bindingLabel(bindings.breathe)}` };
  if (scheme === 'buttons') return { swim: 'segure o botão NADAR (direita)', breathe: 'toque no botão RESPIRAR (esquerda)' };
  return { swim: 'toque e segure a tela', breathe: 'arraste o dedo para cima' };
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

  const STEPS = [
    {
      title: 'APRENDENDO A NADAR',
      icon: '🏊',
      text: `Para nadar, ${how.swim}: a barra de força vai enchendo. Solte quando o ponteiro estiver na ZONA VERDE ★. Fora do verde a braçada rende menos e gasta mais energia.`,
    },
    {
      title: 'PRIMEIRA RESPIRAÇÃO',
      icon: '🫁',
      text: `Cada braçada no verde gasta 10% de energia. Agora respire: ${how.breathe}. Uma respiração devolve 50%!`,
    },
    {
      title: 'MANTENDO O RITMO',
      icon: '🔥',
      text: 'Mais 5 braçadas no verde, sem pressa e sem demorar, para subir o COMBO. De olho na energia: abaixo de 50% a nadadora fica mais lenta.',
    },
    {
      title: 'SEGUNDA RESPIRAÇÃO',
      icon: '🫁',
      text: `Energia em 50%? Hora de respirar de novo: ${how.breathe}. Lembre: precisa dar pelo menos uma braçada entre duas respirações.`,
    },
    {
      title: 'PREPARAÇÃO PARA COMPETIR',
      icon: '🏆',
      text: 'Últimas 5 braçadas no verde! O segredo é: acerte o verde, controle a energia e respire a cada ~5 braçadas.',
    },
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
          <div key={step} className="card anim-pop pointer-events-auto w-full max-w-lg p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-sun-300 to-sun-500 text-2xl shadow">
                {info.icon}
              </div>
              <div className="flex-1">
                <div className="font-display text-xs text-sky-600">
                  TREINO • ETAPA {step + 1} DE {STEPS.length}
                </div>
                <div className="font-display text-xl leading-tight text-navy-800 sm:text-2xl">{info.title}</div>
                <p className="mt-0.5 text-sm font-bold leading-snug text-navy-700">{info.text}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="font-display whitespace-nowrap text-sm text-navy-800">
                {isBreath ? `Respiração: ${engine.tutorialCount}/${cfg.need}` : `Braçadas corretas: ${engine.tutorialCount}/${cfg.need}`}
              </div>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-sky-100">
                <div className="h-full rounded-full bg-gradient-to-r from-aqua-400 to-emerald-400 transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs font-bold text-sky-700">
              <span>
                Total: {Math.min(engine.tutorialGreen, TUTORIAL_TOTAL_GREEN)}/{TUTORIAL_TOTAL_GREEN} braçadas •{' '}
                {Math.min(engine.tutorialBreaths, TUTORIAL_TOTAL_BREATHS)}/{TUTORIAL_TOTAL_BREATHS} respirações
              </span>
              <span className="flex gap-1">
                {STEPS.map((_, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < step ? 'bg-emerald-400' : i === step ? 'bg-sun-400' : 'bg-sky-200'}`} />
                ))}
              </span>
            </div>
          </div>
        </div>
      )}
      {!done && cheer > 0 && (
        <div key={cheer} className="font-display text-stroke anim-float pointer-events-none absolute left-1/2 top-[48%] z-30 -translate-x-1/2 whitespace-nowrap text-4xl text-[#3df58a]">
          ✔ ETAPA CONCLUÍDA!
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
              {TUTORIAL_TOTAL_GREEN} braçadas corretas • {TUTORIAL_TOTAL_BREATHS} respirações válidas ✔
            </div>
          </div>
        </div>
      )}
      {paused && !done && <PauseMenu />}
    </>
  );
}
