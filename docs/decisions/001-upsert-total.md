# ADR 001 — Upsert total em vez de updates parciais

**Data:** 2026-07  
**Status:** Aceito

## Contexto

O app precisa sincronizar o estado do frontend com o banco de dados. A abordagem clássica seria fazer operações granulares: POST para criar, PATCH para editar, DELETE para remover — rastreando cada mudança individualmente.

## Decisão

O frontend sempre envia o estado completo via `POST /api/tasks`. O servidor faz upsert em todas as tabelas e deleta os registros que não vieram no payload.

## Motivo

- Elimina toda a lógica de diff e merge — a fonte da verdade é sempre o estado em memória do frontend
- Sem risco de inconsistência entre frontend e banco
- Código do servidor drasticamente mais simples (~50 linhas em vez de múltiplas rotas)
- Para volume de dados pessoais (dezenas de tarefas), o payload maior é irrelevante

## Consequências

- Não há histórico de alterações — um save sobrescreve o anterior sem rastro
- Se dois dispositivos editarem simultaneamente, o último save vence (aceitável para uso pessoal)
- Não escala para múltiplos usuários sem uma revisão completa da arquitetura
