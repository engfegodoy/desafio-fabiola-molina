import { ENERGY } from '../config/balance';
import { bindingLabel } from '../game/keybindings';
import { isTouch, useGame } from '../store/gameStore';
import { AudioButton, Button } from './common';
import { ControlsPanel } from './ControlsPanel';

function Shell({ children, step }: { children: React.ReactNode; step: string }) {
  return (
    <div className="safe-pad absolute inset-0 z-20 overflow-y-auto bg-navy-900/35" style={{ touchAction: 'pan-y' }}>
      <div className="absolute right-3 z-30" style={{ top: 'max(12px, env(safe-area-inset-top))' }}>
        <AudioButton />
      </div>
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center py-4">
        <div className="card anim-pop w-full p-4 sm:p-6">
          <div className="font-display mb-1 text-xs text-sky-600">{step}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** TELA 2 — Regras e dicas. */
export function RulesScreen() {
  const goTo = useGame((s) => s.goTo);
  const bindings = useGame((s) => s.bindings);
  const scheme = useGame((s) => s.mobileScheme);
  const swimHow = isTouch ? (scheme === 'buttons' ? 'botão NADAR' : 'toque na tela') : bindingLabel(bindings.swim);
  const breathHow = isTouch ? (scheme === 'buttons' ? 'botão RESPIRAR' : 'arraste para cima') : bindingLabel(bindings.breathe);

  const tips = [
    { icon: '🏊', title: 'Toque para nadar', text: `Cada toque (${swimHow}) = 1 braçada. 5 toques por segundo = velocidade máxima; menos que isso, mais devagar.` },
    { icon: '🫁', title: 'Respire sempre', text: `O fôlego cai enquanto você nada (no mar, mais rápido). RESPIRAR (${breathHow}) devolve ${ENERGY.breathGain}%.` },
    { icon: '🐢', title: 'Fôlego baixo', text: `Abaixo de ${ENERGY.warnBelow}% você vai ficando lento; em ${ENERGY.lowAt}% fica vermelho. Zerou? Afogou!` },
    { icon: '🌊', title: 'PERFEITO!', text: '5 toques por segundo ou mais: desliza melhor, sobe o combo e nada mais rápido.' },
  ];

  return (
    <Shell step="PASSO 2 DE 3 • REGRAS">
      <div className="font-display text-stroke text-center text-4xl text-sun-400 sm:text-5xl">COMO NADAR</div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tips.map((t, i) => (
          <div key={t.title} className="anim-slide flex items-center gap-3 rounded-2xl bg-sky-50 p-3" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-sun-300 to-sun-500 text-2xl shadow">{t.icon}</div>
            <div>
              <div className="font-display text-navy-800">{t.title}</div>
              <p className="text-sm font-bold leading-snug text-navy-700">{t.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="font-display text-stroke-thin anim-wiggle mt-3 rounded-2xl bg-gradient-to-r from-[#0b2a6b] to-[#1f6fe5] px-4 py-2 text-center text-base text-sun-400 sm:text-lg">
        SEGREDO DOS CAMPEÕES: TOQUE RÁPIDO, FÔLEGO NO CONTROLE E RESPIRAR NA HORA CERTA!
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button color="white" className="sm:w-40" onClick={() => goTo('menu')}>
          ◀ Voltar
        </Button>
        <Button big className="flex-1" onClick={() => goTo('controls')}>
          ENTENDI! 👍
        </Button>
      </div>
    </Shell>
  );
}

/** TELA 3 — Configuração dos controles. */
export function ControlsScreen() {
  const goTo = useGame((s) => s.goTo);
  const startTutorial = useGame((s) => s.startTutorial);
  return (
    <Shell step="PASSO 3 DE 3 • CONTROLES">
      <div className="font-display text-stroke mb-3 text-center text-4xl text-sun-400 sm:text-5xl">SEUS CONTROLES</div>
      <ControlsPanel />
      <p className="mt-2 text-center text-xs font-bold text-sky-700">Você pode mudar isso depois no menu de pausa (⚙ Controles).</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button color="white" className="sm:w-40" onClick={() => goTo('rules')}>
          ◀ Voltar
        </Button>
        <Button big className="flex-1" onClick={startTutorial}>
          INICIAR TREINAMENTO 🏊
        </Button>
      </div>
    </Shell>
  );
}
