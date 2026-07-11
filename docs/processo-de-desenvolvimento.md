# Processo de Desenvolvimento — Tarefas

Este documento descreve exatamente o que fazer, onde fazer e o que acontece em cada etapa do desenvolvimento de uma feature neste produto.

---

## Ferramentas e onde cada uma opera

| Ferramenta | Onde opera | Para quê |
|---|---|---|
| **Claude Cowork** | Na pasta local do seu computador | Discovery, design e documentação |
| **VS Code** | Na pasta local do seu computador | Editar código |
| **Claude Code** | Dentro do VS Code (terminal ou extensão) | Implementação assistida por IA |
| **Git** | Na pasta local do seu computador | Versionar e enviar código para o GitHub |
| **GitHub** | Na nuvem | Guardar o código e disparar o deploy |
| **Render** | Na nuvem | Rodar o servidor em produção |
| **Supabase** | Na nuvem | Banco de dados em produção |

> **Importante:** o Cowork e o Claude Code leem arquivos da **pasta local** — eles não acessam o GitHub diretamente. O GitHub é só o destino final depois do `git push`.

---

## Configuração inicial (primeira vez)

### 1. Clone o repositório
No terminal do seu computador:
```bash
git clone https://github.com/eduardocgj1/gestao-de-tarefas.git
cd gestao-de-tarefas
```
**O que acontece:** o Git baixa todos os arquivos do GitHub para uma pasta no seu computador.

### 2. Instale as dependências
```bash
npm install
```
**O que acontece:** o npm lê o `package.json` e baixa os pacotes necessários para a pasta `node_modules/`.

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```
Abra o arquivo `.env` no VS Code e preencha com as credenciais reais do Supabase.
**O que acontece:** o app passa a ter acesso ao banco de dados. Sem isso, o servidor não consegue conectar ao Supabase.

### 4. Rode o app localmente
```bash
node server.js
```
**O que acontece:** o servidor Node.js sobe na sua máquina. Acesse `http://localhost:3131` no browser para usar o app localmente.

---

## Criando uma feature nova

O processo tem duas grandes fases: **produto** (no Cowork) e **desenvolvimento** (no VS Code com Claude Code). Nenhuma feature entra em desenvolvimento sem ter a spec completa.

---

### FASE 1 — Produto (Claude Cowork)

#### Passo 1 — Preparar a branch

No terminal:
```bash
cd gestao-de-tarefas
git checkout -b feature/nome-da-feature
```
**O que acontece:** o Git cria uma cópia paralela do código chamada `feature/nome-da-feature`. Tudo que for criado ou modificado a partir de agora fica isolado nessa branch, sem afetar a versão em produção (`main`).

#### Passo 2 — Conectar o Cowork à pasta local

Abra o Claude Cowork e conecte a pasta `gestao-de-tarefas` do seu computador.

**O que acontece:** o Cowork passa a enxergar todos os arquivos da pasta — incluindo `CLAUDE.md`, `docs/`, `.claude/skills/` e a branch que está ativa no momento. Ele não acessa o GitHub, só a pasta local.

#### Passo 3 — Iniciar o orquestrador

No Cowork, diga:
> *"use a skill orquestrador — quero criar a feature [nome]"*

**O que acontece:** o orquestrador lê o `CLAUDE.md` e as features existentes em `docs/features/` para entender o contexto do produto, e começa a conduzir o processo etapa por etapa.

---

#### Etapa 1.1 — Discovery (skill: `discovery`)

**O que você faz:** responde as perguntas do orquestrador sobre a feature — qual problema resolve, qual a jornada do usuário, o que está dentro e fora do escopo.

**O que a IA faz:** conduz as perguntas certas para garantir que o problema está bem definido antes de pensar em solução. Ao final, cria o arquivo `docs/features/nome-da-feature/spec.md` com a **spec v1** preenchida.

**O que é gerado:** `docs/features/nome-da-feature/spec.md` com objetivo, problema, solução, escopo e jornada.

---

#### Etapa 1.2 — Revisão da spec v1 (skill: `spec-reviewer`)

**O que você faz:** aguarda o relatório e decide se aprova ou pede ajustes.

**O que a IA faz:** lê a spec v1 e aponta o que está vago, incompleto ou contraditório. Gera um relatório com bloqueantes e sugestões.

**O que acontece se reprovar:** volta para o discovery, corrige e passa pela revisão novamente antes de avançar.

**Commit ao aprovar:**
```bash
git add -A
git commit -m "docs: spec v1 - nome da feature"
```
**O que acontece:** o Git salva uma versão local com a spec v1. Ainda não foi para o GitHub.

---

#### Etapa 1.3 — Protótipo (skill: `prototype-generator`)

**O que você faz:** confirma que quer gerar o protótipo.

**O que a IA faz:** lê a spec v1 + todo o design system em `.claude/skills/tarefas-design/` (tokens de cor, tipografia, componentes, UI kit) e gera um arquivo HTML interativo com a cara exata do app.

**O que é gerado:** `docs/features/nome-da-feature/prototype.html` — abra no browser para ver e interagir.

---

#### Etapa 1.4 — Crítica do design (skill: `design-critic`)

**O que você faz:** abre o `prototype.html` no browser, interage com ele e diz o que aprovou ou quer mudar.

**O que a IA faz:** revisa o protótipo contra o design system — verifica cores, tipografia, componentes, estados da interface, textos em português e consistência com o resto do app. Gera relatório com problemas e aprovações.

**O que acontece se reprovar:** o protótipo é ajustado e revisado novamente antes de avançar.

**O que é gerado:** spec v2 atualizada com as decisões de design e UX tomadas.

**Commit ao aprovar:**
```bash
git add -A
git commit -m "docs: spec v2 + protótipo - nome da feature"
```

---

#### Etapa 1.5 — Revisão da spec v2 (skill: `spec-reviewer`)

**O que você faz:** aguarda o relatório e aprova ou pede ajustes.

**O que a IA faz:** verifica se todos os passos da jornada v1 têm representação visual no design v2, se os estados da interface estão todos cobertos e se as decisões de UX estão justificadas.

---

#### Etapa 1.6 — Planejamento de tasks (skill: `task-planner`)

**O que você faz:** confirma que quer gerar as tasks.

**O que a IA faz:** lê a spec v2 e decompõe a implementação em tasks atômicas ordenadas por dependência — banco de dados primeiro, depois backend, depois frontend. Cada task é pequena o suficiente para um único commit.

**O que é gerado:** seção "Tasks de implementação" na spec com tasks prefixadas (`db-01`, `be-01`, `fe-01`...) e critérios de conclusão objetivos.

---

#### Etapa 1.7 — Revisão final da spec v3 (skill: `spec-reviewer`)

**O que você faz:** aguarda o relatório final e aprova.

**O que a IA faz:** verifica se as tasks são atômicas, se a ordem respeita dependências, se os critérios de conclusão são objetivos e verificáveis.

**Commit ao aprovar:**
```bash
git add -A
git commit -m "docs: spec v3 plano técnico - nome da feature"
git push
```
**O que acontece:** o `git push` envia todos os commits desta fase para o GitHub. A branch `feature/nome-da-feature` agora existe no GitHub mas ainda não afeta a produção.

---

### FASE 2 — Desenvolvimento (VS Code + Claude Code)

#### Passo 1 — Abrir o projeto no VS Code

Abra o VS Code na pasta `gestao-de-tarefas`. Confirme que está na branch correta:
```bash
git branch
# deve mostrar * feature/nome-da-feature
```
**O que acontece:** o VS Code e o Claude Code passam a enxergar os arquivos da branch da feature, incluindo a spec v3 recém-criada.

#### Passo 2 — Iniciar o orquestrador

No terminal do Claude Code dentro do VS Code, diga:
> *"use the orquestrador agent — implementar feature nome-da-feature"*

**O que acontece:** o orquestrador lê o `CLAUDE.md`, `docs/architecture.md` e a spec completa da feature, e começa a conduzir a implementação etapa por etapa.

---

#### Etapa 2.1 — Verificação técnica (agente: `tech-discovery`)

**O que você faz:** aguarda a análise.

**O que a IA faz:** lê a spec v3 e o código real dos arquivos que serão modificados (`app.js`, `styles.css`, `index.html`, `server.js`). Confirma que o plano é implementável, identifica funções existentes para reutilizar e sinaliza se há lacunas na spec.

**O que acontece se houver lacunas:** o orquestrador lista as dúvidas e você decide como resolver antes de começar a implementar.

---

#### Etapa 2.2 — Implementação (agente: `implementor`)

**O que você faz:** acompanha a implementação e responde dúvidas pontuais.

**O que a IA faz:** executa as tasks da spec uma por uma, na ordem definida. A cada task concluída, marca como `[x]` na spec e faz um commit.

```bash
# A IA faz isso automaticamente a cada task:
git add -A
git commit -m "feat: nome-feature - descrição da task"
```

**O que acontece:** o código vai sendo construído de forma incremental, rastreável. Cada commit representa uma task concluída. O app pode ser testado localmente a qualquer momento com `node server.js`.

---

#### Etapa 2.3 — Verificação de conformidade (agente: `spec-checker`)

**O que você faz:** aguarda o relatório e testa o app localmente.

**O que a IA faz:** percorre cada critério de conclusão da spec e verifica objetivamente se está implementado. Verifica também se funcionalidades existentes não foram quebradas (criação de tarefas, calendário, pomodoro, persistência).

**O que acontece se reprovar:** volta para a implementação, corrige os itens reprovados e passa pela verificação novamente.

---

#### Etapa 2.4 — Revisão de código (agente: `code-reviewer`)

**O que você faz:** aguarda o relatório.

**O que a IA faz:** revisa o diff completo — verifica convenções (sem frameworks, persistência via `save()`, campos no banco), qualidade do código (legibilidade, duplicação, console.logs esquecidos) e segurança (inputs sanitizados, dados sensíveis).

**O que acontece se houver bloqueantes:** corrige e repassa pela revisão antes do PR.

---

#### Etapa 2.5 — Pull Request e deploy

```bash
git push origin feature/nome-da-feature
```
**O que acontece:** a branch com todos os commits vai para o GitHub.

Abra o GitHub em `github.com/eduardocgj1/gestao-de-tarefas`, clique em "Compare & pull request", revise e faça o merge na `main`.

**O que acontece após o merge:** o Render detecta a mudança na `main` em segundos e inicia um novo deploy automaticamente. Em 1–2 minutos o app em produção está atualizado.

```bash
# Volte para a main localmente
git checkout main
git pull
```

---

## O que fica registrado após uma feature

```
docs/features/nome-da-feature/
├── spec.md          ← histórico completo: v1, v2, v3, tasks e registro de desenvolvimento
└── prototype.html   ← protótipo de referência visual

GitHub
└── commits rastreáveis por task + PR com descrição da feature

Render
└── novo deploy registrado com o hash do commit
```

---

## Resumo do fluxo completo

```
COMPUTADOR LOCAL                    NUVEM
────────────────                    ──────
git clone ←──────────────────────── GitHub

git checkout -b feature/X

[COWORK]
  orquestrador →
    discovery → spec v1
    spec-reviewer → aprovação
    prototype-generator → prototype.html
    design-critic → aprovação
    spec-reviewer → aprovação
    task-planner → spec v3 com tasks
    spec-reviewer → aprovação final

git push ───────────────────────→ GitHub (branch feature/X)

[VS CODE + CLAUDE CODE]
  orquestrador →
    tech-discovery → valida spec v3
    implementor → task a task (1 commit por task)
    spec-checker → verifica conformidade
    code-reviewer → revisa qualidade

git push ───────────────────────→ GitHub (feature/X atualizada)
PR + merge na main ─────────────→ GitHub (main atualizada)
                                        │
                                        ↓ detecta automaticamente
                                   Render → deploy em produção
```
