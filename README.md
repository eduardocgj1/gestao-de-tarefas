# Gestão de Tarefas

App pessoal de gestão de tarefas com board por colunas de dia, calendário mensal, timer pomodoro e suporte a múltiplos boards.

## Demo

🔗 [gestao-de-tarefas-e465.onrender.com](https://gestao-de-tarefas-e465.onrender.com)

> O plano gratuito do Render hiberna após 15 min sem uso. Na primeira visita pode demorar ~30s para carregar.

## Funcionalidades

- **Board por dia** — colunas de segunda a sexta, com navegação por semana
- **Múltiplos boards** — organize por contexto (ex: Trabalho, Pessoal)
- **Campos customizados** — adicione campos como Projeto, Modo, etc.
- **Urgência e prioridade** — marque tarefas urgentes e ordene por prioridade
- **Delegação** — registre para quem uma tarefa foi delegada
- **Calendário mensal** — visualize eventos e tarefas no mês
- **Pomodoro** — timer integrado com ciclos de foco e pausa
- **Persistência em nuvem** — dados salvos no Supabase (PostgreSQL)

## Stack

| Camada | Tecnologia |
|---|---|
| Servidor | Node.js puro (sem framework) |
| Frontend | HTML + CSS + JavaScript vanilla |
| Banco de dados | Supabase (PostgreSQL) |
| Hospedagem | Render (Web Service) |

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) com as tabelas criadas (ver `schema.sql`)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/eduardocgj1/gestao-de-tarefas.git
cd gestao-de-tarefas

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Supabase
```

### Banco de dados

No painel do Supabase, acesse o SQL Editor e rode o conteúdo do arquivo `schema.sql` para criar as tabelas.

### Iniciar

```bash
node server.js
# Acesse em http://localhost:3131
```

## Variáveis de ambiente

Veja o arquivo `.env.example` para referência:

```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_chave_secreta
PORT=3131
```

## Deploy

O app está configurado para deploy automático no Render:

1. Push para `main` no GitHub
2. Render detecta automaticamente e faz o redeploy

- **Build command:** `npm install`
- **Start command:** `node server.js`

## Estrutura do projeto

```
├── server.js        ← servidor Node.js + rotas da API
├── schema.sql       ← estrutura do banco de dados
├── public/
│   ├── index.html   ← HTML do app
│   ├── app.js       ← lógica do frontend
│   └── styles.css   ← estilos
└── docs/
    └── features/    ← documentação das features em desenvolvimento
```

## Features em desenvolvimento

Veja a pasta [`docs/features/`](./docs/features/) para a documentação de cada feature planejada.
