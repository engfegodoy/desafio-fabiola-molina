import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { useGame } from './store/gameStore';
import type { PhaseId } from './config/balance';

// Impede rolagem/zoom acidental por gestos no celular (iOS ignora user-scalable).
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener(
  'touchmove',
  (e) => {
    const el = e.target as HTMLElement;
    if (!el.closest?.('[style*="pan-y"]')) e.preventDefault();
  },
  { passive: false },
);

// Espera as fontes (usadas também nas texturas 3D) por no máximo 1,5 s.
const fontsReady = Promise.race([
  Promise.all([
    document.fonts?.load('40px "Lilita One"'),
    document.fonts?.load('700 20px "Baloo 2"'),
  ]).catch(() => undefined),
  new Promise((r) => setTimeout(r, 1500)),
]);

// Atalho de teste: ?fase=1..3 abre direto a fase (ex.: ?fase=3 = mar à noite).
// Opcional: &nome=Marina. Sem nome, usa "Jogador".
const params = new URLSearchParams(location.search);
const fase = Number(params.get('fase'));
if (fase >= 1 && fase <= 3) {
  const g = useGame.getState();
  g.setName(params.get('nome') || g.playerName || 'Jogador');
  g.startPhase(fase as PhaseId);
}

void fontsReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
