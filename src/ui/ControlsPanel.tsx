import { useEffect, useState } from 'react';
import { ACTION_LABEL, bindingLabel, expandCode, validateKey, type Action } from '../game/keybindings';
import { isTouch, useGame, type MobileScheme } from '../store/gameStore';
import { audio } from '../audio/audio';

/** Configuração de teclas (computador) e esquema de toque (celular). Usado antes do treino e na pausa. */
export function ControlsPanel({ showBoth = false }: { showBoth?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {(!isTouch || showBoth) && <KeyboardSettings />}
      {(isTouch || showBoth) && <MobileSettings />}
    </div>
  );
}

function KeyboardSettings() {
  const bindings = useGame((s) => s.bindings);
  const setBinding = useGame((s) => s.setBinding);
  const resetBindings = useGame((s) => s.resetBindings);
  const setRemapping = useGame((s) => s.setRemapping);
  const [listening, setListening] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Action | null>(null);

  useEffect(() => {
    setRemapping(listening !== null);
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListening(null);
        return;
      }
      const err = validateKey(listening, e.code, useGame.getState().bindings);
      if (err) {
        setError(err);
        audio.quality('early', 0);
        return;
      }
      setBinding(listening, expandCode(e.code));
      setSaved(listening);
      setError(null);
      setListening(null);
      audio.copy();
      setTimeout(() => setSaved(null), 1500);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [listening, setBinding, setRemapping]);

  useEffect(() => () => setRemapping(false), [setRemapping]);

  return (
    <div className="rounded-2xl border-2 border-sky-100 bg-white p-3 sm:p-4">
      <div className="font-display mb-2 flex items-center gap-2 text-lg text-navy-800">⌨️ Teclado</div>
      <div className="flex flex-col gap-2">
        {(['swim', 'breathe'] as Action[]).map((a) => (
          <div key={a} className="flex flex-wrap items-center gap-2 rounded-xl bg-sky-50 px-3 py-2">
            <span className="text-2xl">{a === 'swim' ? '🏊' : '🫁'}</span>
            <span className="font-display w-24 text-navy-800">{ACTION_LABEL[a]}</span>
            <span
              className={`font-display min-w-[96px] flex-1 rounded-lg border-b-4 px-3 py-1 text-center text-lg ${
                listening === a ? 'animate-pulse border-sun-600 bg-sun-300 text-navy-800' : 'border-slate-400 bg-white text-navy-800 shadow'
              }`}
            >
              {listening === a ? 'Pressione uma tecla…' : bindingLabel(bindings[a])}
            </span>
            <button
              type="button"
              className="btn btn-blue !px-3 !py-1.5 !text-sm"
              onClick={() => {
                audio.click();
                setError(null);
                setListening(listening === a ? null : a);
              }}
            >
              {listening === a ? 'Cancelar' : 'Alterar'}
            </button>
            {saved === a && <span className="text-sm font-bold text-emerald-600">✔ Salvo!</span>}
          </div>
        ))}
      </div>
      {error && <p className="mt-2 rounded-lg bg-coral-500/10 px-3 py-1.5 text-sm font-bold text-coral-500">{error}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-sky-700">
        <span>P ou Esc: pausar. Esc também cancela a troca de tecla.</span>
        <button
          type="button"
          className="underline"
          onClick={() => {
            audio.click();
            resetBindings();
            setError(null);
          }}
        >
          Restaurar padrão (ESPAÇO / CTRL e ↑)
        </button>
      </div>
    </div>
  );
}

const SCHEMES: { id: MobileScheme; title: string; icon: string; lines: string[] }[] = [
  {
    id: 'buttons',
    title: 'Botões separados',
    icon: '🔘',
    lines: ['Direita: NADAR', 'Esquerda: RESPIRAR'],
  },
  {
    id: 'gesture',
    title: 'Toque e gesto',
    icon: '👆',
    lines: ['Toque na tela: NADAR', 'Arraste para cima: RESPIRAR'],
  },
];

function MobileSettings() {
  const scheme = useGame((s) => s.mobileScheme);
  const setScheme = useGame((s) => s.setMobileScheme);
  return (
    <div className="rounded-2xl border-2 border-sky-100 bg-white p-3 sm:p-4">
      <div className="font-display mb-2 text-base text-navy-800 sm:text-lg">📱 Toque na tela</div>
      <div className="grid grid-cols-2 gap-2">
        {SCHEMES.map((s) => {
          const active = scheme === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                audio.click();
                setScheme(s.id);
              }}
              className={`relative rounded-2xl border-4 p-2 text-left transition sm:p-3 ${
                active ? 'border-sun-400 bg-sun-300/30 shadow-lg' : 'border-sky-100 bg-sky-50'
              }`}
            >
              {active && (
                <span className="font-display absolute -top-2.5 right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] text-white">ATIVO</span>
              )}
              <div className="font-display text-sm text-navy-800 sm:text-base">
                {s.icon} {s.title}
              </div>
              <SchemeDemo id={s.id} />
              {s.lines.map((l) => (
                <div key={l} className="text-[10px] font-bold leading-tight text-sky-700 sm:text-xs">
                  • {l}
                </div>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pequena demonstração animada de cada esquema. */
function SchemeDemo({ id }: { id: MobileScheme }) {
  return (
    <div className="relative my-1.5 h-16 overflow-hidden sm:my-2 sm:h-24 rounded-xl bg-gradient-to-b from-sky-300 to-sky-500">
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
      {id === 'buttons' ? (
        <>
          <div className="demo-tap-left absolute bottom-1.5 left-1.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-emerald-400 text-base sm:bottom-2 sm:left-2 sm:h-11 sm:w-11 sm:text-lg">🫁</div>
          <div className="demo-hold-right absolute bottom-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-sun-400 text-base sm:bottom-2 sm:right-2 sm:h-12 sm:w-12 sm:text-lg">🏊</div>
          <div className="absolute bottom-3 left-1/2 h-2 w-10 -translate-x-1/2 sm:w-16 overflow-hidden rounded-full border border-white bg-gradient-to-r from-red-400 via-green-400 to-red-400">
            <div className="demo-needle absolute inset-y-0 w-1 bg-white" />
          </div>
        </>
      ) : (
        <>
          <div className="demo-finger absolute left-1/2 top-7 text-2xl sm:top-12">👆</div>
          <div className="demo-arrow absolute left-[58%] top-1 text-lg text-white sm:top-3">⬆</div>
        </>
      )}
    </div>
  );
}
