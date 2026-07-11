# ADR 003 — Node.js puro no servidor (sem Express)

**Data:** 2026-07  
**Status:** Aceito

## Contexto

O servidor precisa: servir arquivos estáticos da pasta `public/` e responder a 2 rotas de API (`GET /api/tasks` e `POST /api/tasks`).

## Decisão

Usar o módulo `http` nativo do Node.js. Sem Express, Fastify ou qualquer framework de servidor.

## Motivo

- 2 rotas não justificam uma dependência de framework
- O código de roteamento cabe em ~20 linhas
- Menos dependências = menos superfície de atualização e vulnerabilidades
- Mais simples de entender para quem (ou o que) for manter o código

## Consequências

- Se novas rotas forem adicionadas no futuro, o roteamento manual pode ficar verboso
- Sem middlewares prontos (autenticação, rate limiting, etc.) — tudo precisaria ser implementado manualmente se necessário
- Ponto de reavaliação: se o app passar de ~5 rotas de API, considerar adicionar Express
