# Processo de Desenvolvimento — Tarefas

Este documento descreve como features são criadas neste produto, do início ao fim. O processo é orientado por specs e assistido por IA em todas as etapas.

---

## Ferramentas necessárias

| Ferramenta | Para quê | Onde obter |
|---|---|---|
| Claude Cowork | Discovery, design e documentação | claude.ai |
| VS Code | Editor de código | code.visualstudio.com |
| Claude Code | Implementação assistida por IA | Extensão do VS Code ou CLI |
| Git + GitHub | Versionamento e deploy | git-scm.com |
| Node.js 18+ | Rodar o app localmente | nodejs.org |

---

## Configuração inicial do repositório

```bash
git clone https://github.com/eduardocgj1/gestao-de-tarefas.git
cd gestao-de-tarefas
npm install
cp .env.example .env
# Preencha o .env com as credenciais do Supabase
node server.js
# App rodando em http://localhost:3131
```

Leia o `CLAUDE.md` na raiz — ele é o contexto principal do produto e é lido automaticamente pela IA em toda sessão de trabalho.

---

## Visão geral do processo

O desenvolvimento segue o modelo **Spec-Driven Development**: cada feature vira um documento vivo (`spec.md`) que evolui em três versões antes de uma linha de código ser escrita.

```
COWORK (produto + design)           CLAUDE CODE (implementação)
──────────────────────────          ────────────────────────────
1. Discovery      → spec v1
2. Protótipo      → spec v2
3. Plano técnico  → spec v3
                                    4. Implementação (task a task)
                                    5. Verificação de conformidade
                                    6. Revisão de código
                                    7. Pull Request → merge → deploy
```

**Regra principal:** nenhuma feature entra em desenvolvimento sem spec v3 aprovada.

---

## Etapa 1 — Discovery
**Ferramenta:** Claude Cowork
**Skill:** `orquestrador` (ponto de entrada único)

Abra o Cowork, conecte a pasta do projeto e diga:

> *"use a skill orquestrador — quero criar a feature [nome]"*

O orquestrador vai conduzir todo o processo de produto automaticamente, passando pelas skills na ordem correta:

1. **`discovery`** — conduz perguntas de produto e preenche spec v1 (objetivo, problema, solução, escopo, jornada)
2. **`spec-reviewer`** — revisa a spec v1 e aponta o que está vago ou incompleto
3. **`prototype-generator`** — gera `prototype.html` fiel ao design system do app
4. **`design-critic`** — revisa o protótipo contra o design system e a spec v1
5. **`spec-reviewer`** — revisa a spec v2 antes de ir para o técnico
6. **`task-planner`** — decompõe o plano em tasks atômicas e gera spec v3
7. **`spec-reviewer`** — revisão final da spec v3

Ao final, faça o commit:
```bash
git checkout -b feature/nome-da-feature
git add -A
git commit -m "docs: spec completa - nome da feature"
git push
```

---

## Etapa 2 — Implementação
**Ferramenta:** VS Code + Claude Code
**Agente:** `orquestrador`

Abra o VS Code na pasta do projeto e no terminal do Claude Code diga:

> *"use the orquestrador agent — implementar feature [nome]"*

O orquestrador vai conduzir a implementação automaticamente, passando pelos agentes na ordem correta:

1. **`tech-discovery`** — valida a spec v3 lendo o código real e completa lacunas técnicas
2. **`implementor`** — executa as tasks uma a uma, fazendo um commit por task
3. **`spec-checker`** — verifica se a implementação atende todos os critérios da spec
4. **`code-reviewer`** — revisa qualidade, segurança e aderência às convenções

Ao final, o orquestrador orienta a abertura do Pull Request.

---

## Estrutura de uma feature

Cada feature vive em `docs/features/[nome]/`:

```
docs/features/nome-da-feature/
├── spec.md          ← documento vivo com v1, v2, v3 e tasks
└── prototype.html   ← protótipo gerado pelo design system
```

Use o template em `docs/features/template.md` como ponto de partida.

### Versões da spec

| Versão | Conteúdo | Quem preenche |
|---|---|---|
| v1 | Objetivo, problema, solução, escopo, jornada | skill `discovery` |
| v2 | Design, protótipo, estados da UI, decisões de UX | skill `prototype-generator` + `design-critic` |
| v3 | Plano técnico, arquivos, tasks, critérios de conclusão | skill `task-planner` + agente `tech-discovery` |

---

## Branches e Git

Cada feature tem sua própria branch:

```bash
# Criar branch da feature
git checkout -b feature/nome-da-feature

# Commit por task durante o desenvolvimento
git add -A
git commit -m "feat: nome-feature - descrição da task"

# Abrir PR no GitHub após aprovação do code-reviewer
git push origin feature/nome-da-feature
```

A branch `main` é a versão em produção. O Render faz o deploy automaticamente a cada merge na `main`.

**Nunca commitar diretamente na `main` durante o desenvolvimento de uma feature.**

---

## Skills disponíveis (Claude Cowork)

Skills ficam em `.claude/skills/` e são lidas pelo Cowork.

| Skill | Função |
|---|---|
| `orquestrador` | Ponto de entrada — conduz todo o processo de produto |
| `discovery` | Conduz o discovery e preenche spec v1 |
| `spec-reviewer` | Revisa qualquer versão da spec antes de avançar |
| `prototype-generator` | Gera protótipo HTML fiel ao design system |
| `design-critic` | Revisa protótipo contra design system e spec |
| `task-planner` | Decompõe spec v3 em tasks atômicas |
| `tarefas-design` | Design system completo — tokens, componentes, UI kit |

---

## Agentes disponíveis (Claude Code)

Agentes ficam em `.claude/agents/` e são lidos pelo Claude Code.

| Agente | Função |
|---|---|
| `orquestrador` | Ponto de entrada — conduz toda a implementação |
| `tech-discovery` | Valida e completa spec v3 lendo o código real |
| `implementor` | Executa as tasks da spec uma a uma |
| `spec-checker` | Verifica conformidade da implementação com a spec |
| `code-reviewer` | Revisa qualidade e aderência às convenções |
| `task-planner` | Versão técnica do planejamento de tasks |

---

## Design system

O design system completo fica em `.claude/skills/tarefas-design/` e contém:

- **Tokens** — cores, tipografia, espaçamento, efeitos (`tokens/`)
- **Componentes** — Button, TaskCard, Modal, Badge e mais 7 (`components/`)
- **UI Kit** — telas completas do app como referência (`ui_kits/tarefas/`)
- **Guidelines** — guias visuais de cada fundamento (`guidelines/`)

Toda interface nova deve seguir os tokens deste design system. Nenhuma cor, fonte ou espaçamento deve ser inventado fora dele.

---

## Documentação de referência

| Documento | Conteúdo |
|---|---|
| `CLAUDE.md` | Contexto geral do produto, stack e convenções |
| `docs/architecture.md` | Decisões arquiteturais e os motivos de cada uma |
| `docs/features/template.md` | Template para documentar novas features |
| `docs/decisions/` | ADRs — registro de decisões técnicas importantes |
| `schema.sql` | Estrutura completa do banco de dados |
| `README.md` | Setup, instalação e deploy |

---

## Convenções importantes

- **Frontend:** vanilla JS, DOM manipulation direta — sem React, Vue ou qualquer framework
- **Persistência:** toda alteração passa por `save()` — nunca criar outro mecanismo
- **Banco:** novos campos sempre em `schema.sql` E no mapeamento de `server.js`
- **`urgent_rank`:** é `BIGINT` (armazena timestamps) — nunca alterar para INTEGER
- **Textos:** português BR, voz imperativa, sentence case
- **Ícones:** apenas Unicode ou CSS puro — nunca emoji de navegação

---

## Fluxo resumido

```
1. Cowork: "use a skill orquestrador"
      ↓
2. Spec v1, v2 e v3 criadas e aprovadas
      ↓
3. git checkout -b feature/nome && git push
      ↓
4. Claude Code: "use the orquestrador agent"
      ↓
5. Implementação task a task com commits
      ↓
6. spec-checker + code-reviewer aprovam
      ↓
7. PR no GitHub → merge → Render deploya automaticamente
```
