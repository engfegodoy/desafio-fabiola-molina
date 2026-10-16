import { useEffect } from 'react';
import type { RaceEngine } from '../game/raceEngine';
import { useGame } from '../store/gameStore';
import { audio } from '../audio/audio';
import { ENERGY, SWIM } from '../config/balance';

/** Liga os eventos do jogo aos efeitos sonoros e à trilha. */
export function GameAudio({ engine }: { engine: RaceEngine | null }) {
  const screen = useGame((s) => s.screen);

  // Desbloqueio do áudio no primeiro gesto do usuário (política dos navegadores)
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (screen === 'menu' || screen === 'rules' || screen === 'controls') {
      audio.playMusic('menu');
      audio.setAmbience('crowd');
    } else if (screen === 'final') {
      audio.playMusic('final');
      audio.setAmbience('sea');
    }
  }, [screen]);

  useEffect(() => {
    if (!engine) return;
    const kind = engine.kind;
    audio.setAmbience(kind === 'pool' || kind === 'tutorial' ? 'crowd' : kind === 'seaNight' ? 'night' : 'sea');
    audio.playMusic(kind === 'tutorial' ? 'menu' : kind === 'shark' ? 'final' : 'race');

    const flags = { slip: false, splash: false, shark: false, chomp: 0 };
    const off = engine.on((e) => {
      switch (e.type) {
        case 'countdown':
          audio.countdown(e.n);
          break;
        case 'stroke':
          if (e.who === 'player') {
            audio.stroke(e.result.long ? e.result.efficiency : 0.35);
            audio.quality(e.result.quality, e.result.combo);
            if (e.result.comboUp && e.result.combo >= SWIM.comboMax) audio.comboMax();
          }
          break;
        case 'comboLost':
          audio.comboLost();
          break;
        case 'breath':
          if (e.result.valid) audio.breath();
          else if (e.result.outcome === 'consecutive') audio.breathDenied();
          break;
        case 'energy':
          audio.energyAlert(e.level);
          break;
        case 'wave':
          audio.wave(e.kind);
          break;
        case 'finish':
          if (e.who === 'player') audio.cheer(1);
          break;
        case 'state':
          if (e.state === 'racing' && kind === 'shark') audio.playMusic('shark');
          if (e.state === 'outro') {
            audio.playMusic(null);
            const o = engine.outcome;
            if (o === 'win' || o === 'escaped') audio.victory();
            else if (o === 'caught') {
              audio.sharkBite();
              setTimeout(() => audio.defeat(), 900);
            } else if (o === 'lose') audio.defeat();
          }
          if (e.state === 'done') audio.playMusic('menu');
          break;
        case 'tutorialStep':
          audio.tutorialStep();
          break;
        case 'tutorialComplete':
          audio.victory();
          break;
      }
    });

    // Linha do tempo sonora da cena do barco e do tubarão
    let beat = 0;
    const id = window.setInterval(() => {
      // Coração: com 10/15 ou menos de fôlego, bate mais alto e mais rápido.
      const en = engine.player.energy;
      if (engine.controllable && en <= ENERGY.lowAt && !useGame.getState().paused) {
        const k = 1 - en / ENERGY.lowAt;
        beat -= 0.05;
        if (beat <= 0) {
          beat = 0.95 - 0.55 * k;
          audio.heartbeat(0.3 + 0.7 * k);
        }
      } else beat = 0;
      if (kind !== 'shark') return;
      const k = engine.stateTime;
      if (engine.state === 'intro') {
        if (!flags.slip && k > 3.0) {
          flags.slip = true;
          audio.jump();
        }
        if (!flags.splash && k > 3.85) {
          flags.splash = true;
          audio.splash();
        }
        if (!flags.shark && k > 4.5) {
          flags.shark = true;
          audio.playMusic(null);
          audio.sharkAppear();
        }
      }
      if (engine.state === 'racing' && engine.sharkDanger > 0.8) {
        flags.chomp -= 0.05;
        if (flags.chomp <= 0) {
          flags.chomp = 1.1;
          audio.chomp();
        }
      }
    }, 50);

    return () => {
      off();
      clearInterval(id);
    };
  }, [engine]);

  return null;
}
