# ADR 002 — Vanilla JS no frontend (sem framework)

**Data:** 2026-07  
**Status:** Aceito

## Contexto

Ao construir o app, a escolha inicial foi entre usar um framework moderno (React, Vue, Svelte) ou vanilla JS com DOM manipulation direta.

## Decisão

Vanilla JS com DOM manipulation direta. Sem transpiladores, sem bundlers, sem build step.

## Motivo

- O app é usado por uma pessoa — não precisa de reatividade complexa ou componentização
- O arquivo `public/app.js` é servido diretamente pelo Node.js sem processamento
- A IA (Claude Code) trabalha bem com vanilla JS — o código é explícito e sem "magia"
- Sem dependências de build: nada de Webpack, Vite, Babel, etc.
- Mais fácil de depurar no browser — o código que roda é o código que você escreve

## Consequências

- À medida que `app.js` cresce, pode se tornar difícil de navegar (arquivo único grande)
- Sem reatividade automática — toda atualização de UI precisa ser feita manualmente no DOM
- Se o app crescer para múltiplos usuários ou features muito complexas, pode ser necessário reconsiderar
