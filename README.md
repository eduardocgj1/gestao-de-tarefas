# Bússola

Aplicativo web pessoal para organizar o dia a dia: um board de tarefas por colunas de dia, calendário, lista de atividades, controle financeiro e timer pomodoro — tudo num só lugar, com dados salvos na nuvem.

> Revisão em andamento: esta branch reúne as alterações recentes do app e da documentação para avaliação do pull request.

🔗 **Demo:** [bussola.onrender.com](https://bussola.onrender.com)

> O plano gratuito do Render hiberna após 15 min sem uso. Na primeira visita pode demorar ~30s para carregar.

---

## Por que este app existe

A maioria dos apps de tarefas força você a escolher entre uma lista simples ou uma ferramenta pesada de gestão de projetos. Este projeto nasceu de uma necessidade pessoal: um único lugar para **planejar a semana por dia**, **enxergar compromissos no calendário**, **guardar ideias de coisas para fazer**, **acompanhar as finanças** e **manter o foco com pomodoro** — sem a complexidade de ferramentas corporativas e sem depender de várias contas diferentes.

O intuito é ser um "painel de vida" leve e rápido, moldado ao fluxo de quem usa: colunas de segunda a sexta para o trabalho da semana, boards separados por contexto, campos customizáveis por board, e visões especializadas (finanças, atividades) que crescem conforme a necessidade. É software feito sob medida, priorizando simplicidade técnica (Node puro + JS vanilla) para ser fácil de manter e evoluir.

---

## Funcionalidades

**Board de tarefas**
- Colunas por dia (segunda a sexta), com navegação por semana
- Múltiplos boards para separar contextos (ex: Trabalho, Pessoal, Estudos)
- Campos customizados por board (Projeto, Modo, Responsável, etc.)
- Marcação de urgência e ordenação por prioridade
- Delegação — registrar para quem uma tarefa foi passada
- Tarefas recorrentes — criar uma vez e definir a regra de repetição
- Checklists dentro de atividades

**Calendário**
- Visão mensal com eventos e tarefas do mês
- Integração com as tarefas do board

**Visão do Dia**
- Popup de planejamento e fechamento do dia, agregando tarefas e eventos
- Modo planejamento (abertura) e modo revisão (fechamento), com destaque para prioridades

**Lista de Atividades**
- Catálogo pessoal de coisas para fazer (destinos, hobbies, restaurantes, trilhas)
- Atributos estruturados (vibe, duração, custo, sazonalidade) para planejar depois

**Finanças**
- Visão geral com KPIs (receita, gastos, saldo, projeção)
- Lançamentos, categorias, carteiras e envelopes de contexto
- Compras planejadas com meta e progresso de economia

**Produtividade e extras**
- Timer pomodoro integrado (ciclos de foco e pausa)
- Previsão do tempo no cabeçalho das colunas (via Open-Meteo)
- Exportar atividades da semana para report (Progresso / Próximos passos)

**Conta e dados**
- Autenticação via Supabase Auth
- Persistência em nuvem (PostgreSQL no Supabase), com dados isolados por usuário

---

## Stack

| Camada | Tecnologia |
|---|---|
| Servidor | Node.js puro (módulo `http` nativo, sem framework) |
| Frontend | HTML + CSS + JavaScript vanilla (DOM direto, sem React/Vue) |
| Banco de dados | Supabase (PostgreSQL) via `@supabase/supabase-js` v2 |
| Autenticação | Supabase Auth (JWT) |
| Hospedagem | Render (Web Service, plano Free) |
| Repositório | GitHub — `eduardocgj1/bussola` |

Escolha deliberada por **zero frameworks**: o servidor serve arquivos estáticos e expõe uma API mínima; o frontend manipula o DOM diretamente. Isso mantém o projeto simples, sem build step e fácil de entender de ponta a ponta.

---

## Como funciona (arquitetura)

O frontend mantém o estado do app em memória e sincroniza com o servidor por **upsert total**: ao salvar, envia o estado inteiro; o servidor substitui tudo no banco. Cada usuário só enxerga e grava os próprios dados (filtrados por `user_id` a partir do JWT).

### Rotas da API

| Rota | Descrição |
|---|---|
| `GET /api/config` | Expõe a configuração pública do Supabase para o frontend |
| `GET /api/tasks` | Carrega o estado completo (boards, tarefas, eventos, pessoas, atividades) |
| `POST /api/tasks` | Salva o estado completo (upsert total) |
| `GET /api/finance` | Carrega os dados financeiros |
| `POST /api/finance` | Salva os dados financeiros |
| `POST /api/claim-data` | Migra dados legados (sem `user_id`) para o usuário logado |

### Banco de dados

Principais tabelas no Supabase:

- **Core:** `boards`, `tasks`, `calendar_events`, `people`, `activities`, `app_state`
- **Finanças:** `finance_categories`, `finance_wallets`, `finance_envelopes`, `finance_transactions`, `finance_planned_purchases`, `finance_budget_items`

Todas vinculadas ao usuário por `user_id`. O esquema completo está em [`schema.sql`](./schema.sql).

**Mapeamento de nomes:** o frontend usa camelCase (`boardId`, `taskDate`, `urgentRank`) e o banco usa snake_case (`board_id`, `task_date`, `urgent_rank`). A conversão acontece em `server.js` (`appTaskToDb()` / `dbTaskToApp()`).

> **Atenção:** `urgent_rank` é `BIGINT` (armazena timestamps), não `INTEGER`.

---

## Estrutura do projeto

```
├── server.js          ← servidor Node.js: autenticação, rotas da API e arquivos estáticos
├── schema.sql         ← estrutura das tabelas no Supabase
├── package.json       ← dependências (@supabase/supabase-js, dotenv)
├── .env               ← variáveis de ambiente (NÃO versionado)
├── .env.example       ← template das variáveis necessárias
├── public/
│   ├── index.html     ← HTML do app (sidebar, board, calendário, finanças…)
│   ├── app.js         ← toda a lógica do frontend
│   └── styles.css     ← estilos
└── docs/
    └── features/      ← documentação de cada feature (spec + protótipos)
```

---

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) com as tabelas criadas (ver `schema.sql`)

### Passos

```bash
# Clone o repositório
git clone https://github.com/eduardocgj1/bussola.git
cd bussola

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Supabase
```

No painel do Supabase, abra o **SQL Editor** e rode o conteúdo de `schema.sql` para criar as tabelas.

```bash
# Inicie o servidor
node server.js
# Acesse em http://localhost:3131
```

---

## Variáveis de ambiente

Veja `.env.example` para referência:

```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_chave_secreta
PORT=3131
```

No Render, essas variáveis ficam configuradas no painel (Environment). **Nunca** faça commit do `.env`.

---

## Deploy

Deploy automático no Render a cada push:

1. Push para `main` no GitHub
2. Render detecta e faz o redeploy

- **Build command:** `npm install`
- **Start command:** `node server.js`

---

## Convenções de código

- **Sem frameworks no frontend** — DOM direto (`document.querySelector`, `addEventListener`).
- O frontend chama `save()` para persistir (`POST /api/tasks`) e `load()` para buscar (`GET /api/tasks`).
- Campos novos no banco precisam ser adicionados **tanto** em `schema.sql` **quanto** no mapeamento em `server.js`.

---

## Features e roadmap

A pasta [`docs/features/`](./docs/features/) documenta cada feature — com spec funcional/design e protótipos de referência. Estado atual das principais:

| Feature | Status |
|---|---|
| Tarefas recorrentes | ✅ Concluído |
| Finanças (visão geral, lançamentos, planejados) | ✅ Implementado |
| Visão do Dia (popup de planejamento/fechamento) | ✅ Implementado |
| Gastos por envelope | Design pronto |
| Previsão do tempo | Design pronto |
| Lista de atividades | Em evolução |
| Atualização de design (redesign visual) | Em andamento |
| Exportar atividades para report | Em andamento |

Consulte o `spec.md` de cada pasta para detalhes e critérios de conclusão.
