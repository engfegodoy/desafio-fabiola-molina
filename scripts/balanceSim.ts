/**
 * Simulador de balanceamento: corre provas com jogadores-robô de
 * diferentes habilidades, usando o MESMO motor do jogo.
 *   npm run sim
 */
import { RaceEngine } from '../src/game/raceEngine.ts';
import type { StageKind } from '../src/config/balance.ts';

interface Bot {
  name: string;
  /** Desvio-padrão (s) do erro humano ao soltar. */
  sigma: number;
  pause: number;
  restBelow: number;
  restUntil: number;
  waveSmart: boolean;
  spam?: boolean;
}

const BOTS: Bot[] = [
  { name: 'craque', sigma: 0.03, pause: 0.1, restBelow: 26, restUntil: 62, waveSmart: true },
  { name: 'bom', sigma: 0.055, pause: 0.14, restBelow: 25, restUntil: 60, waveSmart: false },
  { name: 'médio', sigma: 0.09, pause: 0.2, restBelow: 18, restUntil: 50, waveSmart: false },
  { name: 'iniciante', sigma: 0.14, pause: 0.25, restBelow: 10, restUntil: 40, waveSmart: false },
  { name: 'sem-descanso', sigma: 0.03, pause: 0.1, restBelow: -1, restUntil: 0, waveSmart: false },
  { name: 'só-toques', sigma: 0, pause: 0.12, restBelow: -1, restUntil: 0, waveSmart: false, spam: true },
];

function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function runOnce(kind: StageKind, bot: Bot) {
  const eng = new RaceEngine(kind);
  const dt = 1 / 60;
  let mode: 'wait' | 'hold' | 'rest' = 'wait';
  let timer = 0;
  let releaseAt = 0;
  let guard = 0;
  while (eng.state !== 'done' && guard++ < 60 * 400) {
    if (eng.controllable) {
      const p = eng.player;
      const bar = eng.cfg.bar;
      if (mode === 'wait') {
        timer -= dt;
        if (timer <= 0) {
          const warn = eng.warning;
          if (p.energy < bot.restBelow) mode = 'rest';
          else if (bot.waveSmart && warn && warn.kind === 'front' && warn.inside > 0.45 && p.energy < 80) timer = 0.2;
          else {
            eng.press();
            mode = 'hold';
            const center = ((bar.greenStart + bar.greenEnd) / 2) * bar.chargeTime;
            releaseAt = bot.spam ? 0.08 : Math.max(0.17, center + gauss() * bot.sigma);
          }
        }
      } else if (mode === 'hold') {
        if (p.chargeTime >= releaseAt) {
          eng.release();
          mode = 'wait';
          timer = bot.pause * (0.7 + Math.random() * 0.6);
        }
      } else if (mode === 'rest') {
        if (p.energy >= bot.restUntil) mode = 'wait';
      }
    }
    eng.update(dt);
  }
  return eng.result!;
}

const N = 300;
const stages: StageKind[] = ['pool', 'seaDay', 'seaNight', 'shark'];
for (const st of stages) {
  console.log(`\n=== ${st} ===`);
  for (const bot of BOTS) {
    let wins = 0;
    let tSum = 0;
    let oSum = 0;
    for (let i = 0; i < N; i++) {
      const r = runOnce(st, bot);
      if (r.won) wins++;
      tSum += r.playerTime;
      oSum += r.opponentTime ?? 0;
    }
    const extra = st === 'shark' ? '' : `  fabiola ${(oSum / N).toFixed(2)}s`;
    console.log(
      `${bot.name.padEnd(13)} vitórias ${((wins / N) * 100).toFixed(0).padStart(3)}%  tempo ${(tSum / N).toFixed(2)}s${extra}`,
    );
  }
}
