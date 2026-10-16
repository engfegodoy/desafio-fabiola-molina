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
  /** Desvio-padrão (s) do erro humano ao soltar. */
  sigma: number;
  /** Pausa média (s) entre braçadas. */
  pause: number;
  /** Respira quando a energia chega a este valor (ou abaixo). -1 = nunca. */
  breatheAt: number;
  /** Respira a cada N braçadas, independentemente da energia (0 = desliga). */
  breathEvery?: number;
  /** Só toques rápidos. */
  spam?: boolean;
  /** Joga no computador (barra mais generosa). */
  desktop?: boolean;
}

const BOTS: Bot[] = [
  { name: 'craque', sigma: 0.03, pause: 0.1, breatheAt: 10 },
  { name: 'bom', sigma: 0.05, pause: 0.13, breatheAt: 10 },
  { name: 'bom (computador)', sigma: 0.05, pause: 0.13, breatheAt: 10, desktop: true },
  { name: 'erra-e-ajusta', sigma: 0.065, pause: 0.15, breatheAt: 10 },
  { name: 'médio', sigma: 0.08, pause: 0.18, breatheAt: 8 },
  { name: 'iniciante', sigma: 0.12, pause: 0.24, breatheAt: 6 },
  { name: 'sem-respirar', sigma: 0.03, pause: 0.1, breatheAt: -1 },
  { name: 'respira-demais', sigma: 0.03, pause: 0.1, breatheAt: -1, breathEvery: 2 },
  { name: 'respira-tarde', sigma: 0.03, pause: 0.1, breatheAt: 3 },
  { name: 'só-toques', sigma: 0, pause: 0.12, breatheAt: 10, spam: true },
];

function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function runOnce(kind: StageKind, bot: Bot) {
  const eng = new RaceEngine(kind, undefined, { desktop: bot.desktop });
  const dt = 1 / 60;
  let mode: 'wait' | 'hold' = 'wait';
  let timer = 0;
  let releaseAt = 0;
  let sinceBreath = 0;
  let guard = 0;
  while (eng.state !== 'done' && eng.state !== 'drowned' && guard++ < 60 * 400) {
    if (eng.controllable) {
      const p = eng.player;
      const bar = eng.playerBar;
      if (mode === 'wait') {
        timer -= dt;
        if (timer <= 0 && !p.breathing) {
          const wantBreath =
            (bot.breatheAt >= 0 && p.energy <= bot.breatheAt) || (bot.breathEvery && sinceBreath >= bot.breathEvery);
          if (wantBreath && p.strokesSinceBreath >= 1) {
            eng.breathe();
            sinceBreath = 0;
            timer = 0.08;
          } else {
            eng.press();
            mode = 'hold';
            const center = ((bar.greenStart + bar.greenEnd) / 2) * bar.chargeTime;
            releaseAt = bot.spam ? 0.08 : Math.max(0.17, center + gauss() * bot.sigma);
          }
        }
      } else if (mode === 'hold') {
        if (p.charging && p.chargeTime >= releaseAt) {
          eng.release();
          sinceBreath++;
          mode = 'wait';
          timer = bot.pause * (0.7 + Math.random() * 0.6);
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
