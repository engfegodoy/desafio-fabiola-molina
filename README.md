# Desafio Fabiola Molina

Jogo de natação que gera cupons para o e-commerce Fabiola Molina.

Jogo 3D de natação para navegador (desktop e celular), feito com React + TypeScript + Vite, Three.js / React Three Fiber / Drei, Tailwind CSS, Zustand e Web Audio API. Não tem backend nem banco de dados: o nome, a pontuação e o progresso ficam só na memória do jogo.

## Como rodar

```bash
npm install
npm run dev
```

Depois abra `http://localhost:5173`. No Replit, o botão **Run** já executa `npm install && npm run dev` (veja `.replit`).

- **Abrir direto uma fase (para testes):** `http://localhost:5173/?fase=3` (1 = piscina, 2 = mar de dia, 3 = mar à noite, 4 = tubarão). Opcional: `&nome=Marina`
- `npm run build`: gera a versão de produção em `dist/`
- `npm run sim`: simula centenas de provas com robôs de habilidades e estratégias de respiração diferentes, usando o mesmo motor do jogo, para conferir o balanceamento
- `npm run test`: confere as regras dos cupons nos 8 cenários possíveis

## Fluxo

Identificação (nome, personagem homem/mulher e cor do traje) → Regras e dicas → Controles → Treino (tocar para nadar, respirar, manter o ritmo; com "Pular tutorial") → 4 fases → Prêmio.

## Controles

- **Computador:** **ESPAÇO** = NADAR (cada aperto é uma braçada na hora, ritmo ideal de 2–3 por segundo), **CTRL** ou **↑** = RESPIRAR. **P** ou **Esc** pausa. As teclas podem ser trocadas na tela de controles ou na pausa (⚙ Controles); NADAR e RESPIRAR não podem usar a mesma tecla.
- **Celular/tablet:** dois modos, escolhidos antes do treino:
  - **Botões separados:** TOQUE PARA NADAR à direita, RESPIRAR à esquerda.
  - **Toque e gesto:** cada toque em qualquer lugar = braçada; arraste para cima (mínimo 60 px) = respirar.

## Fôlego e respiração

- O fôlego tem **20 partes** e não volta sozinho. Cada braçada gasta 1 (amarelo 1,5; vermelho 2).
- **RESPIRAR** devolve 10 (respire a cada ~10 braçadas). Respirar a mais não tem penalidade (só não dá para respirar duas vezes sem uma braçada no meio).
- Com **10/20** a barra pisca, as bordas da tela escurecem e o coração acelera. Com **7/20 ou menos** a nadadora fica lenta aos poucos.
- Se o fôlego **zerar**: "Oh não! Você se afogou!" e o jogo recomeça do zero (no treino, recomeça o treino).
- **Deslize:** a cada 5 braçadas perfeitas seguidas, as 3 próximas deslizam mais longe.
- **Ritmo (estilo Flappy Bird):** cada toque dá um impulso na hora e a água freia rápido entre os toques. A barra de ritmo (vermelho → verde) mostra a velocidade. Toques no ritmo certo = PERFEITO (+1 combo); devagar ou rápido demais = −1 combo. Cada braçada rende cerca de 1 m.
- A Fabiola respira (com uma pequena pausa) e o tubarão para para respirar a cada 6 s.
- Todos os números ficam em `SWIM`, `QUALITY`, `ENERGY`, `GLIDE` e no `rhythm` de cada fase em `src/config/balance.ts`.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/config/balance.ts` | **Todos os parâmetros de dificuldade** (velocidades, potência, barra de força, energia, respiração, penalidades, combo, ondas, Fabiola, tubarão, distâncias) |
| `src/game/` | Motor puro (sem React): física do nadador, IA da Fabiola, tubarão, ondas, prova, tutorial e cupons |
| `src/store/` | Estado global (Zustand): tela, fase, nome, personagem, cor, controles, resultados, áudio |
| `src/three/` | Personagens 3D, água em shader, respingos, cenários (piscina, mar dia/noite, praia), câmera |
| `src/ui/` | Menu, HUD, tutorial, resultados, pausa, tela final e cupom |
| `src/audio/` | Efeitos e música 100% procedurais (Web Audio) |

## Regras principais

- A Fabiola usa **a mesma física do jogador**, e o resultado sai da simulação da corrida. Nada é predeterminado.
- Ondas frontais aumentam a resistência e reduzem a eficiência; ondas traseiras empurram a favor. Isso vale para as duas nadadoras.
- Repetir uma fase substitui o resultado anterior dela. É possível avançar mesmo perdendo.
- Cupons: FABIOLA20 (3 vitórias + escapou), FRETEGRATIS (3 vitórias sem escapar), FABIOLA15 (2 vitórias), FABIOLA10 (1 vitória), FABIOLA5 (nenhuma vitória). Os códigos são demonstrativos.
