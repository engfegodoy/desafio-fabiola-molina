/**
 * Simulador de balanceamento: corre provas com jogadores-robô de
 * diferentes habilidades e estratégias de respiração, usando o MESMO motor do jogo.
 *   npm run sim
 */
declare const process: { env: Record<string, string | undefined> };
import { RaceEngine } from '../src/game/raceEngine.ts';
import type { StageKind } from '../src/config/balance.ts';

interface Bot {
  name: string;
  /** Intervalo médio (s) entre toques e a variação humana (desvio). */
  interval: number;
  jitter: number;
  /** Respira quando a energia chega a este valor (ou abaixo). -1 = nunca. */
  breatheAt: number;
  /** Respira a cada N braçadas, independentemente da energia (0 = desliga). */
  breathEvery?: number;
}

const BOTS: Bot[] = [
  { name: '6 toques/s', interval: 0.167, jitter: 0.015, breatheAt: 75 },
  { name: '5 toques/s', interval: 0.2, jitter: 0.02, breatheAt: 75 },
  { name: '4,5 toques/s', interval: 0.222, jitter: 0.03, breatheAt: 72 },
  { name: '4 toques/s', interval: 0.25, jitter: 0.03, breatheAt: 70 },
  { name: '3 toques/s', interval: 0.333, jitter: 0.05, breatheAt: 60 },
  { name: '10 toques/s', interval: 0.1, jitter: 0.01, breatheAt: 75 },
  { name: 'sem-respirar', interval: 0.2, jitter: 0.02, breatheAt: -1 },
]

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
  let timer = 0.15;
  let sinceBreath = 0;
  let guard = 0;
  while (eng.state !== 'done' && eng.state !== 'drowned' && guard++ < 60 * 400) {
    if (eng.controllable) {
      const p = eng.player;
      timer -= dt;
      if (timer <= 0 && !p.breathing) {
        const wantBreath =
          (bot.breatheAt >= 0 && p.energy <= bot.breatheAt) || (bot.breathEvery && sinceBreath >= bot.breathEvery);
        if (wantBreath && p.strokesSinceBreath >= 1) {
          eng.breathe();
          sinceBreath = 0;
          timer = 0.1;
        } else {
          eng.stroke();
          sinceBreath++;
          timer = Math.max(0.08, bot.interval + gauss() * bot.jitter);
        }
      }
    }
    eng.update(dt);
  }
  return eng.result ?? { won: false, playerTime: 0, opponentTime: 0, drowned: true };
}

const N = Number(process.env.SIM_N ?? 300);
const only = process.env.SIM_STAGE as StageKind | undefined;
const stages: StageKind[] = only ? [only] : ['pool', 'seaDay', 'seaNight', 'shark'];
for (const st of stages) {
  console.log(`\n=== ${st} ===`);
  for (const bot of BOTS) {
    let wins = 0;
    let drowned = 0;
    let tSum = 0;
    let oSum = 0;
    let n = 0;
    for (let i = 0; i < N; i++) {
      const r = runOnce(st, bot) as { won: boolean; playerTime: number; opponentTime?: number; drowned?: boolean };
      if (r.won) wins++;
      if (r.drowned) {
        drowned++;
        continue;
      }
      n++;
      tSum += r.playerTime;
      oSum += r.opponentTime ?? 0;
    }
    const extra = st === 'shark' ? '' : `  fabiola ${(oSum / Math.max(1, n)).toFixed(2)}s`;
    const dr = drowned ? `  afogou ${((drowned / N) * 100).toFixed(0)}%` : '';
    console.log(
      `${bot.name.padEnd(17)} vitórias ${((wins / N) * 100).toFixed(0).padStart(3)}%  tempo ${(tSum / Math.max(1, n)).toFixed(2)}s${extra}${dr}`,
    );
  }
}
