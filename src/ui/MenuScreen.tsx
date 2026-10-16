import { MAX_NAME, useGame } from '../store/gameStore';
import { audio } from '../audio/audio';
import { AudioButton, Button, CssBubbles, Logo } from './common';

const FEATURES = [
  { icon: '⚡', title: 'VELOCIDADE', text: 'Reaja no tempo certo', bg: 'from-sky-400 to-blue-600' },
  { icon: '❤️', title: 'RESISTÊNCIA', text: 'Mantenha seu ritmo', bg: 'from-pink-400 to-rose-600' },
  { icon: '⭐', title: 'TÉCNICA', text: 'Braçadas perfeitas', bg: 'from-yellow-300 to-amber-500' },
  { icon: '🏆', title: 'CONQUISTA', text: 'Complete cada fase', bg: 'from-cyan-300 to-teal-500' },
];

export function MenuScreen() {
  const name = useGame((s) => s.playerName);
  const setName = useGame((s) => s.setName);
  const start = useGame((s) => s.startGame);
  const valid = name.trim().length > 0;

  const go = () => {
    if (!valid) return;
    audio.unlock();
    start();
  };

  return (
    <div className="safe-pad absolute inset-0 flex flex-col overflow-y-auto" style={{ touchAction: 'pan-y' }}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a4fb5]/80 via-[#0a4fb5]/25 to-transparent max-md:bg-gradient-to-b max-md:from-[#0a4fb5]/50 max-md:via-transparent max-md:to-[#0a4fb5]/70" />
      <CssBubbles count={14} />
      <div className="absolute right-3 top-3 z-10" style={{ top: 'max(12px, env(safe-area-inset-top))' }}>
        <AudioButton />
      </div>

      <div className="relative z-[1] mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-4 md:flex-row md:items-center md:justify-start">
        <div className="flex w-full flex-1 flex-col items-center justify-between gap-4 md:w-[460px] md:flex-none md:items-stretch md:justify-center">
          <div className="anim-pop mt-2 md:mt-0">
            <Logo />
            <p className="font-display text-stroke-thin mt-2 text-center text-base text-white sm:text-xl">
              NATAÇÃO, SUPERAÇÃO E GRANDES CONQUISTAS!
            </p>
          </div>

          <div className="hidden grid-cols-4 gap-2 md:grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col items-center text-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b ${f.bg} text-2xl shadow-lg`}>
                  {f.icon}
                </div>
                <div className="font-display text-stroke-thin mt-1 text-xs text-white">{f.title}</div>
                <div className="text-[11px] font-bold leading-tight text-white/90">{f.text}</div>
              </div>
            ))}
          </div>

          <div className="flex w-full flex-col items-center gap-3 md:items-stretch">
          <div className="card anim-slide w-full max-w-md p-5 sm:p-6 md:max-w-none" style={{ animationDelay: '0.15s' }}>
            <label htmlFor="player-name" className="font-display mb-2 block text-lg text-navy-700">
              Nome do jogador
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl">👤</span>
              <input
                id="player-name"
                autoComplete="off"
                maxLength={MAX_NAME}
                value={name}
                placeholder="Digite seu nome"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') go();
                }}
                className="w-full rounded-2xl border-[3px] border-sky-200 bg-white py-3 pl-12 pr-16 text-lg font-bold text-navy-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-200"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-sky-500">
                {name.length}/{MAX_NAME}
              </span>
            </div>
            <Button big className="anim-glow mt-4 w-full" disabled={!valid} onClick={go}>
              COMEÇAR A JOGAR
            </Button>
            <p className="mt-3 text-center text-sm font-bold text-sky-700">
              {valid ? 'Tudo pronto! Bora nadar? 🏊‍♀️' : 'Digite seu nome para começar.'}
            </p>
          </div>

          <div className="font-display text-stroke-thin anim-wiggle mx-auto rounded-2xl bg-gradient-to-r from-[#0b2a6b] to-[#1f6fe5] px-4 py-2 text-center text-sm text-sun-400 shadow-xl sm:text-lg">
            4 FASES, MUITA DIVERSÃO E UM CUPOM ESPECIAL!
          </div>
          </div>
        </div>
      </div>
      <p className="relative z-[1] mt-2 text-center text-xs font-bold text-white/80">
        Desktop: barra de ESPAÇO • Celular: toque e segure na área de controle
      </p>
    </div>
  );
}
