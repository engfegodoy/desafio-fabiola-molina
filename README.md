# Desafio Fabiola Molina

Jogo de natação que gera cupons para o e-commerce Fabiola Molina.

Jogo 3D de natação para navegador (desktop e celular), feito com React + TypeScript + Vite, Three.js / React Three Fiber / Drei, Tailwind CSS, Zustand e Web Audio API. Antes de jogar, o jogador informa **nome e e-mail** (lead), que são salvos no **Supabase**. A pontuação e o progresso ficam só na memória do jogo.

## Cadastro de leads (Supabase)

1. No Supabase, abra **SQL Editor**, cole o conteúdo de [`supabase/leads.sql`](supabase/leads.sql) e clique em **Run**. Isso cria a tabela `leads`, com um cadastro por e-mail. O site só consegue **inserir**: ninguém lê os leads pelo site.
2. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
3. **No computador:** copie `.env.example` para `.env.local` e preencha os dois valores.
4. **No site (GitHub Pages):** no GitHub, vá em **Settings → Secrets and variables → Actions → New repository secret** e crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Depois publique de novo (push ou **Actions → Publicar no GitHub Pages → Run workflow**).
5. Os leads aparecem no Supabase em **Table Editor → leads**.
6. **Cupons:** rode também [`supabase/lead_coupons.sql`](supabase/lead_coupons.sql). Cada partida terminada grava o cupom ganho (com o e-mail do lead) na tabela `lead_coupons`. A visão `leads_com_cupom` mostra cada lead com o **melhor cupom** e quantas partidas terminou: veja em **SQL Editor** com `select * from leads_com_cupom;`.

Sem essa configuração, o site mostra "Cadastro indisponível" e não deixa jogar. Em desenvolvimento (`npm run dev`), o jogo continua e só avisa no console.

## Como rodar

```bash
npm install
npm run dev
```

Depois abra `http://localhost:5173`. No Replit, o botão **Run** já executa `npm install && npm run dev` (veja `.replit`).

- **Abrir direto uma fase (para testes):** `http://localhost:5173/?fase=3` (1 = piscina, 2 = mar de dia, 3 = mar à noite). Opcional: `&nome=Marina`
- `npm run build`: gera a versão de produção em `dist/`
- `npm run sim`: simula centenas de provas com robôs de habilidades e estratégias de respiração diferentes, usando o mesmo motor do jogo, para conferir o balanceamento
- `npm run test`: confere as regras dos cupons nos 8 cenários possíveis

## Fluxo

Identificação (nome, personagem homem/mulher e cor do traje) → Regras e dicas → Controles → 3 fases (Piscina Olímpica, Circuito Mares de dia e à noite) → Prêmio.

## Controles

- **Computador:** **ESPAÇO** = NADAR (cada aperto é uma braçada na hora; quanto mais rápido, mais rápido nada), **CTRL** ou **↑** = RESPIRAR. **P** ou **Esc** pausa. As teclas podem ser trocadas na tela de controles ou na pausa (⚙ Controles); NADAR e RESPIRAR não podem usar a mesma tecla.
- **Celular/tablet:** dois modos, escolhidos antes da primeira fase:
  - **Botões separados:** TOQUE PARA NADAR à direita, RESPIRAR à esquerda.
  - **Toque e gesto:** cada toque em qualquer lugar = braçada; arraste para cima (mínimo 60 px) = respirar.

## Fôlego e respiração

- O fôlego vai de **0 a 100%** e cai conforme a distância nadada (igual para qualquer ritmo ou combo). A cada fase é preciso respirar mais vezes: a cada ~18 m na piscina, ~15 m no mar de dia, ~13 m à noite e ~12 m na fuga do tubarão. Respirar devolve **25%**.
- Abaixo de **75%** a barra fica laranja e a nadadora perde velocidade aos poucos; com **20% ou menos** fica vermelha e pisca, as bordas da tela escurecem e o coração acelera.
- Se o fôlego **zerar**: "Oh não! Você se afogou!" e o jogo recomeça do zero.
- **Deslize:** a cada 5 braçadas perfeitas seguidas, as 3 próximas deslizam mais longe.
- **Toques (estilo Flappy Bird):** cada toque dá um impulso na hora e a água freia rápido entre os toques. **5 toques por segundo = velocidade máxima** (6 ou mais rende o mesmo); cada toque/s a menos tira 10% da velocidade (4/s = 90%, 3/s = 80%...). 1–2 toques/s = Devagar! (−1 combo), 3–4/s = Bom!, 5 ou mais = PERFEITO! (+1 combo, desliza melhor; o combo dá até +24%). A barra de ritmo (vermelho → verde) mostra a velocidade.
- A Fabiola respira (com uma pequena pausa) — é a chance de passar por ela.
- Todos os números ficam em `SWIM`, `QUALITY`, `ENERGY`, `GLIDE` e no `rhythm` de cada fase em `src/config/balance.ts`.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/config/balance.ts` | **Todos os parâmetros de dificuldade** (velocidades, potência, barra de força, energia, respiração, penalidades, combo, ondas, Fabiola, tubarão, distâncias) |
| `src/game/` | Motor puro (sem React): física do nadador, IA da Fabiola, ondas, prova e cupons |
| `src/store/` | Estado global (Zustand): tela, fase, nome, personagem, cor, controles, resultados, áudio |
| `src/three/` | Personagens 3D, água em shader, respingos, cenários (piscina, mar dia/noite, praia), câmera |
| `src/ui/` | Menu, HUD, resultados, pausa, tela final e cupom |
| `src/audio/` | Efeitos e música 100% procedurais (Web Audio) |

## Regras principais

- A Fabiola usa **a mesma física do jogador**, e o resultado sai da simulação da corrida. Nada é predeterminado.
- No mar, cada onda vem de frente e **puxa um pouco para trás** (quem para de tocar recua 1–2 m). Vale para as duas nadadoras.
- A Fabiola tem uma pequena variação de forma a cada corrida, então a dificuldade sobe de fase em fase sem resultado predeterminado.
- Repetir uma fase substitui o resultado anterior dela. É possível avançar mesmo perdendo.
- Cupons: FABIOLA20 (3 vitórias), FABIOLA15 (2 vitórias), FABIOLA10 (1 vitória), FABIOLA5 (nenhuma vitória). Os códigos são demonstrativos.
