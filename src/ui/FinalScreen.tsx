import { useEffect, useMemo, useState } from 'react';
import type { PhaseId } from '../config/balance';
import { computeCoupon, type Coupon } from '../game/coupons';
import { saveCoupon } from '../game/leads';
import { formatTime } from '../game/engineContext';
import { fabiolaWins, useGame } from '../store/gameStore';
import { audio } from '../audio/audio';
import { AudioButton, Button, Medal } from './common';
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

export function CouponCard({ coupon, onPlayAgain }: { coupon: Coupon; onPlayAgain: () => void }) {
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const onCopy = async () => {
    const ok = await copyText(coupon.code);
    setCopied(ok ? 'ok' : 'fail');
    if (ok) audio.copy();
    setTimeout(() => setCopied(null), 2600);
  };
  return (
    <div className="anim-pop relative mx-auto w-full max-w-sm" style={{ animationDelay: '0.5s' }}>
      <div className="font-display text-stroke-thin mb-1.5 text-center text-base text-white sm:mb-2 sm:text-xl">SEU CUPOM ESPECIAL:</div>
      <div className="ticket shine p-2 sm:p-3">
        <div className="ticket-inner flex flex-col items-center px-3 py-2 sm:px-4 sm:py-3">
          <div className="font-display flex items-baseline gap-2">
            <span className="text-stroke-thin text-3xl leading-none text-white sm:text-5xl" style={{ WebkitTextStroke: '0.05em #0b2a6b' }}>
              {coupon.prize}
            </span>
            <span className="text-xs font-bold uppercase text-navy-700">{coupon.tier === 'freeShipping' ? 'na próxima compra' : 'de desconto'}</span>
          </div>
          <div className="mt-1.5 w-full rounded-xl border-[3px] border-dashed border-navy-700 bg-white/80 px-3 py-1 text-center sm:mt-2 sm:py-2">
            <div className="text-[10px] font-bold uppercase text-navy-700">Código do cupom</div>
            <div className="font-display select-all text-2xl tracking-wider text-navy-800 sm:text-4xl" style={{ userSelect: 'text' }}>
              {coupon.code}
            </div>
          </div>
        </div>
      </div>
      <div className="relative mt-2.5 flex gap-2 sm:mt-3">
        <Button color="blue" className="flex-1 !px-2 !text-base sm:!text-xl" onClick={onCopy}>
          COPIAR 📋
        </Button>
        <Button color="yellow" className="flex-1 !px-2 !text-base sm:!text-xl" onClick={onPlayAgain}>
          ↻ JOGAR DE NOVO
        </Button>
        {copied && (
          <div
            className={`font-display anim-pop pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-1 text-sm shadow-lg ${
              copied === 'ok' ? 'border-2 border-emerald-400 text-emerald-600' : 'text-coral-500'
            }`}
          >
            {copied === 'ok' ? '✔ CUPOM COPIADO!' : 'Não deu para copiar: selecione o código'}
          </div>
        )}
      </div>
    </div>
  );
}

/** Último jogo cujo cupom já foi enviado (evita enviar duas vezes o mesmo resultado). */
let sentFor: object | null = null;

export function FinalScreen() {
  const name = useGame((s) => s.playerName);
  const email = useGame((s) => s.playerEmail);
  const leadSaved = useGame((s) => s.leadSaved);
  const results = useGame((s) => s.results);
  const playAgain = useGame((s) => s.playAgain);
  const coupon = useMemo(() => computeCoupon(results), [results]);
  const wins = fabiolaWins(results);

  useEffect(() => {
    const id = setTimeout(() => audio.award(), 300);
    return () => clearTimeout(id);
  }, []);

  // Salva no Supabase o cupom ganho, junto do e-mail do lead (uma vez por jogo).
  useEffect(() => {
    if (!leadSaved || !email || sentFor === results) return;
    sentFor = results;
    void saveCoupon({ email, coupon: coupon.code, wins });
  }, [leadSaved, email, results, coupon.code, wins]);

  const names: Record<PhaseId, string> = { 1: 'Piscina', 2: 'Mar: Dia', 3: 'Mar: Noite' };

  return (
    <div className="safe-pad absolute inset-0 z-20 overflow-y-auto" style={{ touchAction: 'pan-y' }}>
      <Confetti active intensity={1.2} duration={7} />
      <div className="absolute right-3 z-30" style={{ top: 'max(12px, env(safe-area-inset-top))' }}>
        <AudioButton />
      </div>
      <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-3 py-2 sm:gap-4 sm:py-4 lg:flex-row lg:items-center">
        <div className="card anim-slide w-full max-w-md px-3 py-3 text-center sm:p-6">
          <div className="font-display text-stroke text-3xl leading-tight text-sun-400 sm:text-5xl">
            PARABÉNS,
            <br className="hidden sm:block" /> <span className="text-navy-800 [-webkit-text-stroke:0]">{name}!</span>
          </div>
          <div className="font-display mt-0.5 text-base leading-tight text-coral-500 sm:mt-1 sm:text-lg">{coupon.title}</div>
          <p className="mt-0.5 text-xs font-bold text-navy-700 sm:text-sm">{coupon.message}</p>

          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-3 sm:gap-2">
            {([1, 2, 3] as PhaseId[]).map((p, i) => {
              const r = results[p];
              return (
                <div key={p} className="flex flex-col items-center rounded-xl bg-sky-50 px-1 py-1.5 sm:py-2">
                  <div style={{ animationDelay: `${0.2 + i * 0.15}s` }} className="anim-medal">
                    <Medal phase={p} won={!!r?.won} played={!!r} size={44} />
                  </div>
                  <div className="mt-1 text-[11px] font-bold leading-tight text-navy-800">{names[p]}</div>
                  <div className={`font-display text-xs leading-tight ${r?.won ? 'text-emerald-600' : 'text-coral-500'}`}>
                    {!r ? 'NÃO JOGADA' : r.won ? 'VITÓRIA' : 'DERROTA'}
                  </div>
                  {r && <div className="font-display text-[11px] leading-tight text-sky-600">{formatTime(r.playerTime)}</div>}
                </div>
              );
            })}
          </div>
          <div className="font-display mt-2 inline-flex items-center gap-2 rounded-full bg-navy-800 px-4 py-1 text-white sm:mt-3">
            <span className="text-[11px] uppercase text-sky-200">Vitórias contra a Fabiola</span>
            <span className="text-xl leading-none text-sun-400">{wins}/3</span>
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col items-center gap-1.5">
          <CouponCard coupon={coupon} onPlayAgain={playAgain} />
          <p className="text-center text-[10px] font-bold text-white/80">Códigos demonstrativos do Desafio Fabiola Molina.</p>
        </div>
      </div>
    </div>
  );
}
