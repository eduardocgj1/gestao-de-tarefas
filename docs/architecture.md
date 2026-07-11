# Arquitetura do App

## Visão geral

App de gestão de tarefas pessoal rodando como um servidor Node.js único que serve o frontend estático e expõe uma API mínima. Sem frameworks no servidor, sem frameworks no frontend.

```
Navegador → Render (Node.js / server.js) → Supabase (PostgreSQL)
```

## Decisões de arquitetura

### Por que Node.js puro (sem Express, Fastify, etc.)?
O app tem apenas 2 rotas de API. Um framework adicionaria complexidade e dependências sem benefício real. O módulo `http` nativo do Node resolve com ~30 linhas.

### Por que vanilla JS no frontend (sem React, Vue, etc.)?
- O app é usado por uma pessoa em um contexto controlado — não precisa de reatividade complexa
- DOM manipulation direta é mais fácil de depurar e manter
- A IA (Claude Code) trabalha bem com vanilla JS — não há "magia" de framework para entender
- Evita build step (Webpack, Vite, etc.) — o arquivo é servido diretamente

### Por que upsert total (POST envia o estado inteiro)?
Em vez de fazer PATCH por tarefa individual, o frontend sempre envia o estado completo e o servidor substitui tudo. Isso simplifica radicalmente a lógica de sincronização — não há conflitos, não há diff, não há lógica de merge. A desvantagem (payload maior) é irrelevante para o volume de dados pessoais.

### Por que Supabase?
- PostgreSQL real com SDK JavaScript oficial
- Plano gratuito generoso para uso pessoal
- Sem necessidade de gerenciar servidor de banco de dados
- Alternativa considerada: SQLite local — descartada porque não funciona no Render (filesystem efêmero)

### Por que Render?
- Suporta servidor Node.js persistente (diferente do Vercel/Netlify que são serverless)
- Deploy automático via GitHub
- Plano gratuito funcional para uso pessoal
- O servidor precisa ser persistente porque serve arquivos estáticos E a API no mesmo processo

## Fluxo de dados

```
1. Navegador carrega → GET /api/tasks → server.js lê 5 tabelas do Supabase → retorna JSON
2. Usuário faz ação → frontend atualiza estado em memória → chama save()
3. save() → POST /api/tasks com estado completo → server.js faz upsert em todas as tabelas
```

## Estrutura do banco

5 tabelas no Supabase:

| Tabela | Função |
|---|---|
| `boards` | Quadros (Trabalho, Pessoal, etc.) |
| `tasks` | Tarefas, vinculadas a um board por `board_id` |
| `calendar_events` | Eventos do calendário mensal |
| `people` | Pessoas para delegação e equipe |
| `app_state` | Configurações gerais (key/value JSONB) |

**Atenção importante:** `urgent_rank` é `BIGINT` — armazena timestamps como número. Não alterar para INTEGER.

## Mapeamento camelCase ↔ snake_case

O frontend usa camelCase (`boardId`, `taskDate`). O banco usa snake_case (`board_id`, `task_date`). A conversão acontece **exclusivamente** em `server.js` via `appTaskToDb()` e `dbTaskToApp()`. Nunca fazer essa conversão no frontend.

## O que intencionalmente NÃO existe

- Autenticação — app pessoal, acesso público à URL é aceitável
- Versionamento de dados — o upsert total sobrescreve sem histórico
- Testes automatizados — complexidade não justificada para o tamanho atual
- Build step — nenhum transpilador, bundler ou minificador
