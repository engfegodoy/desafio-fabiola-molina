import { useEffect, useState } from 'react';
import type { RaceEngine } from '../game/raceEngine';
import { useEngineEvent } from '../game/engineContext';
import { useGame } from '../store/gameStore';
import { audio } from '../audio/audio';
import { ENERGY } from '../config/balance';
import { Button } from './common';

const RESTART_IN = 4;

/** "Oh não! Você se afogou!" — a energia zerou e o jogo recomeça do zero. */
export function DrownOverlay({ engine }: { engine: RaceEngine }) {
  const screen = useGame((s) => s.screen);
  const playAgain = useGame((s) => s.playAgain);
  const startTutorial = useGame((s) => s.startTutorial);
  const [show, setShow] = useState(false);
  const [left, setLeft] = useState(RESTART_IN);

  useEngineEvent(engine, (e) => {
    if (e.type === 'drowned') {
      setShow(true);
      audio.playMusic(null);
      audio.defeat();
    }
  });

  const restart = () => {
    // No treino, recomeça o treino; nas provas, recomeça o jogo do zero (Fase 1, sem pontos).
    if (screen === 'tutorial') startTutorial();
    else playAgain();
  };

  useEffect(() => {
    if (!show) return;
    if (left <= 0) {
      restart();
      return;
    }
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, left]);

  if (!show) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-navy-900/70 p-4 backdrop-blur-[2px]">
      <div className="card anim-pop w-full max-w-sm p-6 text-center">
        <div className="text-6xl">🫧</div>
        <div className="font-display text-stroke mt-1 text-4xl leading-tight text-coral-400 sm:text-5xl">OH NÃO!</div>
        <div className="font-display mt-1 text-2xl text-navy-800">Você se afogou!</div>
        <p className="mt-2 text-sm font-bold text-navy-700">
          O fôlego acabou. Lembre de <span className="text-sky-600">respirar a cada ~{ENERGY.breathEveryMeters} m</span>!
        </p>
        <p className="mt-2 text-xs font-bold text-sky-700">
          {screen === 'tutorial' ? 'O treino' : 'O jogo'} recomeça do zero em {left}s…
        </p>
        <Button big className="mt-3 w-full" onClick={restart}>
          ↻ RECOMEÇAR DO ZERO
        </Button>
      </div>
    </div>
  );
}
