# Bússola — Contexto para o Claude

## O que é este app

App pessoal de gestão de tarefas com board por colunas de dia, calendário mensal, pomodoro e múltiplos boards. Roda 100% em Node.js puro (sem framework) com vanilla JS no frontend.

## Stack

| Camada | Tecnologia |
|---|---|
| Servidor | Node.js puro (`http` nativo), `server.js` |
| Frontend | HTML + CSS + JavaScript vanilla (sem React, sem Vue) |
| Banco de dados | Supabase (PostgreSQL) via `@supabase/supabase-js` v2 |
| Hospedagem | Render (Web Service, plano Free) |
| Repositório | GitHub — `eduardocgj1/bussola` |

## Estrutura de arquivos

```
├── CLAUDE.md              ← você está aqui
├── server.js              ← servidor Node.js: rotas da API + serve arquivos estáticos
├── package.json           ← dependências (só @supabase/supabase-js)
├── schema.sql             ← estrutura das tabelas no Supabase
├── .env                   ← variáveis de ambiente (NÃO está no git)
├── .env.example           ← template das variáveis necessárias
├── public/
│   ├── index.html         ← HTML do app
│   ├── app.js             ← toda a lógica do frontend (DOM manipulation direta)
│   └── styles.css         ← estilos
└── docs/
    └── features/          ← documentação de cada feature
        ├── visao-do-dia/
        ├── atualizacao-de-design/
        └── exportar-atividades/
```

## API do servidor

Apenas 2 rotas:

- `GET /api/tasks` → retorna o estado completo do app em JSON
- `POST /api/tasks` → recebe o estado completo e salva no Supabase

O padrão é **upsert total**: o frontend sempre envia o estado inteiro; o servidor substitui tudo.

## Banco de dados (Supabase)

5 tabelas:

- `boards` — quadros (id, name, color, fields JSONB)
- `tasks` — tarefas (vinculadas a um board via `board_id`)
- `calendar_events` — eventos do calendário
- `people` — pessoas cadastradas
- `app_state` — configurações gerais (key/value JSONB)

**Mapeamento de nomes:** o frontend usa camelCase (`boardId`, `taskDate`, `urgentRank`). O banco usa snake_case (`board_id`, `task_date`, `urgent_rank`). A conversão acontece em `server.js` via `appTaskToDb()` / `dbTaskToApp()`.

**Atenção:** `urgent_rank` é `BIGINT` (não INTEGER) — armazena timestamps.

## Variáveis de ambiente

```
SUPABASE_URL=https://cmppxsdtpekamafnbvkq.supabase.co
SUPABASE_KEY=<secret key>
PORT=3131
```

No Render, essas variáveis estão configuradas no painel (Environment). Nunca commit o `.env`.

## Como rodar localmente

```bash
npm install
node server.js
# acessa em http://localhost:3131
```

## Deploy

Push para `main` no GitHub → Render detecta automaticamente e faz deploy.

- Build command: `npm install`
- Start command: `node server.js`

## Convenções de código

- **Sem frameworks no frontend** — tudo é DOM manipulation direta (`document.querySelector`, `addEventListener`, etc.)
- O frontend chama `save()` para persistir o estado via `POST /api/tasks`
- O frontend chama `load()` para buscar o estado via `GET /api/tasks`
- Novos campos no banco precisam ser adicionados no `schema.sql` E no mapeamento em `server.js`

## Features em desenvolvimento

Veja a pasta `docs/features/` para documentação detalhada de cada feature planejada. Cada feature tem:
- `spec.md` — especificação funcional e de design
- `prototype/` ou `prototype.dc.html` — protótipo de referência visual (abrir no browser)

### Status atual
- `atualizacao-de-design` — redesign visual completo do app (não implementado)
- `visao-do-dia` — popup de planejamento/fechamento do dia (v2 implementada — painel com modos Planejar/Executar/Fechar, lista unificada de boards, `day_logs` no Supabase — ver `docs/features/visao-do-dia/spec-v2.md`)
- `exportar-atividades` — exportar tarefas da semana para report (não implementado)
- `gastos-por-envelope` — envelopes de contexto sobre a view de Finanças (spec + protótipo prontos, não implementado)
