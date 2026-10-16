# Desafio Fabiola Molina

Jogo 3D de natação para navegador (desktop e celular), feito com React + TypeScript + Vite, Three.js / React Three Fiber / Drei, Tailwind CSS, Zustand e Web Audio API. Não tem backend nem banco de dados: o nome, a pontuação e o progresso ficam só na memória do jogo.

## Como rodar

```bash
npm install
npm run dev
```

Depois abra `http://localhost:5173`. No Replit, o botão **Run** já executa `npm install && npm run dev` (veja `.replit`).

- **Abrir direto uma fase (para testes):** `http://localhost:5173/?fase=3` (1 = piscina, 2 = mar de dia, 3 = mar à noite, 4 = tubarão). Opcional: `&nome=Marina`
- `npm run build`: gera a versão de produção em `dist/`
- `npm run sim`: simula centenas de provas com robôs de habilidades diferentes, usando o mesmo motor do jogo, para conferir o balanceamento
- `npm run test`: confere as regras dos cupons nos 8 cenários possíveis

## Controles

- **Desktop:** barra de **ESPAÇO**. Toque rápido = braçada curta. Segure e solte na zona verde = braçada longa. **P** ou **Esc** pausa.
- **Celular/tablet:** toque e segure em qualquer lugar da tela (há um botão grande "SEGURE PARA NADAR").

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/config/balance.ts` | **Todos os parâmetros de dificuldade** (velocidades, potência, barra de força, energia, combo, ondas, Fabiola, tubarão, distâncias) |
| `src/game/` | Motor puro (sem React): física do nadador, IA da Fabiola, tubarão, ondas, prova, tutorial e cupons |
| `src/store/` | Estado global (Zustand): tela, fase, nome, resultados, áudio |
| `src/three/` | Personagens 3D, água em shader, respingos, cenários (piscina, mar dia/noite, praia), câmera |
| `src/ui/` | Menu, HUD, tutorial, resultados, pausa, tela final e cupom |
| `src/audio/` | Efeitos e música 100% procedurais (Web Audio) |

## Regras principais

- A Fabiola usa **a mesma física do jogador**, e o resultado sai da simulação da corrida. Nada é predeterminado.
- Ondas frontais aumentam a resistência e reduzem a eficiência; ondas traseiras empurram a favor. Isso vale para as duas nadadoras.
- Repetir uma fase substitui o resultado anterior dela. É possível avançar mesmo perdendo.
- Cupons: FABIOLA20 (3 vitórias + escapou), FRETEGRATIS (3 vitórias sem escapar), FABIOLA15 (2 vitórias), FABIOLA10 (1 vitória), FABIOLA5 (nenhuma vitória). Os códigos são demonstrativos.
