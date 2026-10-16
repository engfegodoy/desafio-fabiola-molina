import { useEffect, useMemo, useState } from 'react';
import type { PhaseId } from '../config/balance';
import { computeCoupon, type Coupon } from '../game/coupons';
import { formatTime } from '../game/engineContext';
import { fabiolaWins, totalMedals, useGame } from '../store/gameStore';
import { audio } from '../audio/audio';
import { AudioButton, Button, Medal, MEDAL_STYLE } from './common';
import { Confetti } from './Confetti';

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* tenta o método alternativo */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function CouponCard({ coupon }: { coupon: Coupon }) {
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const onCopy = async () => {
    const ok = await copyText(coupon.code);
    setCopied(ok ? 'ok' : 'fail');
    if (ok) audio.copy();
    setTimeout(() => setCopied(null), 2600);
  };
  return (
    <div className="anim-pop relative mx-auto w-full max-w-sm" style={{ animationDelay: '0.5s' }}>
      <div className="ticket shine p-3">
        <div className="ticket-inner flex flex-col items-center px-4 py-3">
          <div className="font-display text-xs tracking-widest text-navy-700">🎟️ BILHETE DE PREMIAÇÃO 🎟️</div>
          <div className="font-display text-stroke-thin mt-1 text-4xl leading-none text-white sm:text-5xl" style={{ WebkitTextStroke: '0.05em #0b2a6b' }}>
            {coupon.prize}
          </div>
          <div className="mt-1 text-xs font-bold uppercase text-navy-700">{coupon.tier === 'freeShipping' ? 'na sua próxima compra' : 'de desconto'}</div>
          <div className="mt-2 w-full rounded-xl border-[3px] border-dashed border-navy-700 bg-white/80 px-3 py-2 text-center">
            <div className="text-[10px] font-bold uppercase text-navy-700">Código do cupom</div>
            <div className="font-display select-all text-3xl tracking-wider text-navy-800 sm:text-4xl" style={{ userSelect: 'text' }}>
              {coupon.code}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-col items-center gap-2">
        <Button color="blue" big className="w-full" onClick={onCopy}>
          COPIAR CUPOM 📋
        </Button>
        {copied === 'ok' && (
          <div className="font-display anim-pop rounded-full border-2 border-emerald-400 bg-white px-4 py-1 text-emerald-600 shadow-lg">✔ CUPOM COPIADO!</div>
        )}
        {copied === 'fail' && (
          <div className="anim-pop rounded-full bg-white px-4 py-1 text-sm font-bold text-coral-500 shadow-lg">
            Não foi possível copiar. Selecione o código acima.
          </div>
        )}
      </div>
    </div>
  );
}

export function FinalScreen() {
  const name = useGame((s) => s.playerName);
  const results = useGame((s) => s.results);
  const playAgain = useGame((s) => s.playAgain);
  const toMenu = useGame((s) => s.toMenu);
  const coupon = useMemo(() => computeCoupon(results), [results]);
  const wins = fabiolaWins(results);
  const escaped = !!results[4]?.won;

  useEffect(() => {
    const id = setTimeout(() => audio.award(), 300);
    return () => clearTimeout(id);
  }, []);

  const names: Record<PhaseId, string> = { 1: 'Piscina Olímpica', 2: 'Mares: Dia', 3: 'Mares: Noite', 4: 'Fuga do Tubarão' };

  return (
    <div className="safe-pad absolute inset-0 z-20 overflow-y-auto" style={{ touchAction: 'pan-y' }}>
      <Confetti active intensity={1.2} duration={7} />
      <div className="absolute right-3 z-30" style={{ top: 'max(12px, env(safe-area-inset-top))' }}>
        <AudioButton />
      </div>
      <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-4 py-4 lg:flex-row lg:items-center">
        <div className="card anim-slide w-full max-w-md p-4 text-center sm:p-6">
          <div className="font-display text-stroke text-5xl text-sun-400 sm:text-6xl">PARABÉNS!</div>
          <div className="font-display mt-1 text-2xl text-navy-800">{name}</div>
          <div className="font-display mt-1 text-lg text-coral-500">{coupon.title}</div>
          <p className="mt-1 text-sm font-bold text-navy-700">{coupon.message}</p>

          <div className="mt-3 flex justify-center gap-2">
            {([1, 2, 3, 4] as PhaseId[]).map((p, i) => (
              <div key={p} style={{ animationDelay: `${0.2 + i * 0.15}s` }} className="anim-medal">
                <Medal phase={p} won={!!results[p]?.won} played={!!results[p]} size={54} />
              </div>
            ))}
          </div>
          <div className="font-display mt-2 text-sm text-sky-700">{totalMedals(results)} de 4 medalhas conquistadas</div>

          <div className="mt-3 space-y-1.5 text-left">
            {([1, 2, 3, 4] as PhaseId[]).map((p) => {
              const r = results[p];
              return (
                <div key={p} className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-1.5 text-sm">
                  <span className="font-bold text-navy-800">
                    {MEDAL_STYLE[p].icon} {names[p]}
                  </span>
                  <span className={`font-display ${r?.won ? 'text-emerald-600' : 'text-coral-500'}`}>
                    {!r ? 'NÃO JOGADA' : p === 4 ? (r.won ? 'ESCAPOU!' : 'PEGO!') : r.won ? 'VITÓRIA' : 'DERROTA'}
                    {r && <span className="ml-1 text-xs text-sky-600">{formatTime(r.playerTime)}</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-navy-800 p-2 text-white">
              <div className="text-[10px] font-bold uppercase text-sky-200">Vitórias contra a Fabiola</div>
              <div className="font-display text-3xl text-sun-400">{wins}/3</div>
            </div>
            <div className="rounded-2xl bg-navy-800 p-2 text-white">
              <div className="text-[10px] font-bold uppercase text-sky-200">Fuga do tubarão</div>
              <div className={`font-display text-2xl ${escaped ? 'text-emerald-300' : 'text-coral-400'}`}>{escaped ? 'ESCAPOU 🏖️' : 'VIROU LANCHE 🦈'}</div>
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col items-center gap-3">
          <div className="font-display text-stroke-thin text-center text-xl text-white">AQUI ESTÁ O SEU CUPOM ESPECIAL:</div>
          <CouponCard coupon={coupon} />
          <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
            <Button color="yellow" className="flex-1" onClick={playAgain}>
              ↻ Jogar novamente
            </Button>
            <Button color="white" className="flex-1" onClick={toMenu}>
              ✎ Trocar nome
            </Button>
          </div>
          <p className="text-center text-xs font-bold text-white/80">Códigos demonstrativos do Desafio Fabiola Molina.</p>
        </div>
      </div>
    </div>
  );
}
