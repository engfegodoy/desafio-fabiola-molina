import { useGame } from '../store/gameStore';
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
  const tips = [
    { icon: '🏊', title: 'TOQUE PARA NADAR', text: 'Toques rápidos = mais velocidade!' },
    { icon: '🫁', title: 'CONTROLE O FÔLEGO', text: 'Se a barra ficar laranja, você fica mais lento.' },
    { icon: '⚠️', title: 'NÃO DEIXE ZERAR!', text: 'Sem fôlego, você se afoga.' },
  ];

  return (
    <Shell step="PASSO 2 DE 3 • REGRAS">
      <div className="font-display text-stroke text-center text-4xl text-sun-400 sm:text-5xl">COMO NADAR</div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
        {tips.map((t, i) => (
          <div
            key={t.title}
            className="anim-slide flex items-center gap-3 rounded-2xl bg-sky-50 p-3 sm:flex-col sm:gap-2 sm:p-4 sm:text-center"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-sun-300 to-sun-500 text-3xl shadow sm:h-16 sm:w-16 sm:text-4xl">
              {t.icon}
            </div>
            <div>
              <div className="font-display text-lg leading-tight text-navy-800">{t.title}</div>
              <p className="mt-0.5 text-sm font-bold leading-snug text-navy-700">{t.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-row items-stretch gap-2">
        <Button color="white" className="shrink-0 !px-3 sm:w-40" onClick={() => goTo('menu')}>
          ◀ Voltar
        </Button>
        <Button big className="flex-1 !px-2" onClick={() => goTo('controls')}>
          ENTENDI! 👍
        </Button>
      </div>
    </Shell>
  );
}

/** TELA 3 — Configuração dos controles. */
export function ControlsScreen() {
  const goTo = useGame((s) => s.goTo);
  const startRace = useGame((s) => s.startRace);
  return (
    <Shell step="PASSO 3 DE 3 • CONTROLES">
      <div className="font-display text-stroke mb-2 text-center text-3xl text-sun-400 sm:mb-3 sm:text-5xl">SEUS CONTROLES</div>
      <ControlsPanel />
      <p className="mt-2 text-center text-[10px] font-bold text-sky-700 sm:text-xs">Dá para mudar depois na pausa (⚙ Controles).</p>
      <div className="mt-3 flex flex-row items-stretch gap-2 sm:mt-4">
        <Button color="white" className="shrink-0 !px-3 sm:w-40" onClick={() => goTo('rules')}>
          ◀ Voltar
        </Button>
        <Button className="flex-1 !px-2 sm:!px-8 sm:!py-4 sm:!text-2xl" onClick={startRace}>
          COMEÇAR 🏊
        </Button>
      </div>
    </Shell>
  );
}
