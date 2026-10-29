import { computeCoupon } from '../src/game/coupons';
const r = (won: boolean) => ({ won } as never);
const cases: [string, Record<number, unknown>, string][] = [
  ['3 vitórias', { 1: r(true), 2: r(true), 3: r(true) }, 'FABIOLA20'],
  ['2 vitórias (1 e 3)', { 1: r(true), 2: r(false), 3: r(true) }, 'FABIOLA15'],
  ['2 vitórias (1 e 2)', { 1: r(true), 2: r(true), 3: r(false) }, 'FABIOLA15'],
  ['1 vitória (fase 3)', { 1: r(false), 2: r(false), 3: r(true) }, 'FABIOLA10'],
  ['1 vitória (fase 1)', { 1: r(true), 2: r(false), 3: r(false) }, 'FABIOLA10'],
  ['0 vitórias', { 1: r(false), 2: r(false), 3: r(false) }, 'FABIOLA5'],
  ['nenhuma jogada', {}, 'FABIOLA5'],
];
let fail = 0;
for (const [name, res, code] of cases) {
  const c = computeCoupon(res as never);
  const ok = c.code === code;
  if (!ok) fail++;
  console.log(`${ok ? 'OK ' : 'ERR'} ${name.padEnd(22)} -> ${c.code}  ${c.title}`);
}
process.exit(fail);
