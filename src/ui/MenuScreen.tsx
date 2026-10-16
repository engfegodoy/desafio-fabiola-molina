import { MAX_NAME, SUIT_COLORS, useGame, type Gender } from '../store/gameStore';
import { audio } from '../audio/audio';
import { AudioButton, Button, CssBubbles, Logo } from './common';

/** TELA 1 — Identificação: nome, personagem (mulher/homem) e cor do traje. */
export function MenuScreen() {
  const name = useGame((s) => s.playerName);
  const setName = useGame((s) => s.setName);
  const gender = useGame((s) => s.gender);
  const setGender = useGame((s) => s.setGender);
  const suitColor = useGame((s) => s.suitColor);
  const setSuitColor = useGame((s) => s.setSuitColor);
  const start = useGame((s) => s.startGame);
  const valid = name.trim().length > 0;

  const go = () => {
    if (!valid) return;
    audio.unlock();
    start();
  };

  const genders: { id: Gender; label: string; icon: string; sub: string }[] = [
    { id: 'f', label: 'MULHER', icon: '🏊‍♀️', sub: 'de maiô' },
    { id: 'm', label: 'HOMEM', icon: '🏊‍♂️', sub: 'de bermuda' },
  ];

  return (
    <div className="safe-pad absolute inset-0 flex flex-col overflow-y-auto" style={{ touchAction: 'pan-y' }}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a4fb5]/80 via-[#0a4fb5]/25 to-transparent max-md:bg-gradient-to-b max-md:from-[#0a4fb5]/50 max-md:via-transparent max-md:to-[#0a4fb5]/70" />
      <CssBubbles count={14} />
      <div className="absolute right-3 top-3 z-10" style={{ top: 'max(12px, env(safe-area-inset-top))' }}>
        <AudioButton />
      </div>

      <div className="relative z-[1] mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-3 md:flex-row md:items-center md:justify-start">
        <div className="flex w-full flex-1 flex-col items-center justify-between gap-3 md:w-[470px] md:flex-none md:items-stretch md:justify-center">
          <div className="anim-pop mt-1 md:mt-0">
            <Logo />
            <p className="font-display text-stroke-thin mt-1 text-center text-sm text-white sm:text-lg">NATAÇÃO, SUPERAÇÃO E GRANDES CONQUISTAS!</p>
          </div>

          <div className="card anim-slide w-full max-w-md p-4 sm:p-5 md:max-w-none" style={{ animationDelay: '0.15s' }}>
            <div className="font-display mb-2 text-xs text-sky-600">PASSO 1 DE 3 • IDENTIFICAÇÃO</div>
            <label htmlFor="player-name" className="font-display mb-1 block text-base text-navy-700">
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
                className="w-full rounded-2xl border-[3px] border-sky-200 bg-white py-2.5 pl-12 pr-16 text-lg font-bold text-navy-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-200"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-sky-500">
                {name.length}/{MAX_NAME}
              </span>
            </div>

            <div className="font-display mb-1 mt-3 text-base text-navy-700">Personagem</div>
            <div className="grid grid-cols-2 gap-2">
              {genders.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    audio.click();
                    setGender(g.id);
                  }}
                  className={`flex items-center gap-2 rounded-2xl border-4 px-3 py-2 text-left transition ${
                    gender === g.id ? 'border-sun-400 bg-sun-300/30 shadow-lg' : 'border-sky-100 bg-sky-50'
                  }`}
                >
                  <span className="text-3xl">{g.icon}</span>
                  <span>
                    <span className="font-display block text-navy-800">{g.label}</span>
                    <span className="block text-xs font-bold text-sky-700">{g.sub}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="font-display mb-1 mt-3 text-base text-navy-700">
              Cor do {gender === 'm' ? 'calção' : 'maiô'}:{' '}
              <span className="text-sky-600">{SUIT_COLORS.find((c) => c.id === suitColor)?.name}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUIT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => {
                    audio.click();
                    setSuitColor(c.id);
                  }}
                  className={`h-9 w-9 rounded-full border-4 shadow transition-transform ${
                    suitColor === c.id ? 'scale-110 border-sun-400 ring-2 ring-navy-700' : 'border-white'
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
            <p className="mt-1 text-xs font-bold text-sky-700">A prévia em 3D muda na hora. 👉</p>

            <Button big className="anim-glow mt-3 w-full" disabled={!valid} onClick={go}>
              CONTINUAR ▶
            </Button>
            {!valid && <p className="mt-2 text-center text-sm font-bold text-sky-700">Digite seu nome para continuar.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
