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
  const swimHow = isTouch ? (scheme === 'buttons' ? 'botão NADAR' : 'toque e segure') : bindingLabel(bindings.swim);
  const breathHow = isTouch ? (scheme === 'buttons' ? 'botão RESPIRAR' : 'arraste para cima') : bindingLabel(bindings.breathe);

  const tips = [
    { icon: '🏊', title: 'Braçada', text: `Segure (${swimHow}) para encher a barra de força e solte para dar a braçada.` },
    { icon: '🎯', title: 'Zona verde', text: 'Solte no VERDE: impulso máximo e menos gasto de energia. Amarelo rende menos; vermelho freia e quebra o combo.' },
    { icon: '🫁', title: 'Respirar', text: `Use RESPIRAR (${breathHow}) para recuperar ${ENERGY.breathGain}% de energia. A energia NÃO volta sozinha.` },
    { icon: '5️⃣', title: 'A cada ~5 braçadas', text: `Cada braçada no verde gasta ${ENERGY.costGreen}%. Cinco braçadas = ${ENERGY.costGreen * 5}%: é a hora de respirar.` },
    { icon: '🐢', title: 'Abaixo de 50%', text: 'Com menos de 50% de energia a barra pisca e você vai ficando cada vez mais lento.' },
    { icon: '🔥', title: 'Combo', text: 'Braçadas seguidas no verde, no ritmo certo, sobem o combo (até x5) e deixam você mais rápido.' },
    { icon: '⚠️', title: 'Sem exagero', text: 'Respirar com energia alta quebra o ritmo e o combo. E não dá para respirar duas vezes sem uma braçada no meio.' },
  ];

  return (
    <Shell step="PASSO 2 DE 3 • REGRAS E DICAS">
      <div className="font-display text-stroke text-center text-4xl text-sun-400 sm:text-5xl">COMO NADAR</div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tips.map((t, i) => (
          <div key={t.title} className="anim-slide flex gap-3 rounded-2xl bg-sky-50 p-3" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-sun-300 to-sun-500 text-2xl shadow">{t.icon}</div>
            <div>
              <div className="font-display text-navy-800">{t.title}</div>
              <p className="text-sm font-bold leading-snug text-navy-700">{t.text}</p>
            </div>
          </div>
        ))}
      </div>
      {/* barra de energia ilustrativa */}
      <div className="mt-3 rounded-2xl bg-navy-800 p-3 text-white">
        <div className="font-display mb-1 text-xs">BARRA DE ENERGIA</div>
        <div className="flex h-4 overflow-hidden rounded-full border-2 border-white">
          <div className="flex-[20] bg-red-500" />
          <div className="flex-[29] bg-orange-400" />
          <div className="flex-[2] bg-yellow-300" />
          <div className="flex-[49] bg-gradient-to-r from-cyan-400 to-emerald-400" />
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-bold">
          <span>0–20% SEM FÔLEGO!</span>
          <span>até 49% RESPIRE!</span>
          <span>50% ATENÇÃO</span>
          <span>51–100% NORMAL</span>
        </div>
      </div>
      <div className="font-display text-stroke-thin anim-wiggle mt-3 rounded-2xl bg-gradient-to-r from-[#0b2a6b] to-[#1f6fe5] px-4 py-2 text-center text-base text-sun-400 sm:text-lg">
        SEGREDO DOS CAMPEÕES: ACERTE O VERDE, CONTROLE SUA ENERGIA E RESPIRE NA HORA CERTA!
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
