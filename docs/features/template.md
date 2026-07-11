# [Nome da Feature]

> **Como usar este template:**
> Copie para `docs/features/nome-da-feature/spec.md` e preencha etapa por etapa.
> Cada seção pertence a uma fase do processo — não tente preencher tudo de uma vez.
> O status e as tasks são a fonte da verdade do andamento da feature.

---

**Status:** `[ ] Discovery` → `[ ] Design` → `[ ] Discovery Técnico` → `[ ] Em desenvolvimento` → `[ ] Em revisão` → `[ ] Concluído`

**Branch:** `feature/nome-da-feature`
**Criado em:** YYYY-MM-DD
**Última atualização:** YYYY-MM-DD

---

## v1 — Discovery
> *Preencher no Claude Cowork com a skill `discovery`.*
> *Objetivo: entender O QUÊ e POR QUÊ antes de pensar em solução.*

### Objetivo
O que o usuário consegue fazer com essa feature que não conseguia antes? (1–2 frases)

### Problema
Qual dor concreta essa feature resolve? Descreva a situação que o usuário enfrenta hoje, sem mencionar solução.

### Solução
Como a feature resolve o problema? Descreva o comportamento principal em linguagem de produto, sem entrar em detalhes técnicos ou visuais.

### Escopo

**Dentro do escopo**
- O que essa feature FAZ

**Fora do escopo**
- O que essa feature NÃO faz (tão importante quanto o escopo)

### Jornada do usuário
Passo a passo da interação, do gatilho até o resultado final.

1. Usuário faz X
2. App responde com Y
3. ...

### Perguntas em aberto
*O que ainda não está decidido. O design vai responder.*

- ?

---

## v2 — Design
> *Preencher após protótipo gerado com a skill `tarefas-design` e revisado com a skill `design-critic`.*
> *Objetivo: definir COMO PARECE e COMO FUNCIONA.*

### Experiência e visual
Descreva o comportamento e aparência da feature. Referencie o protótipo para detalhes visuais.

**Protótipo:** `prototype.html` (abrir no browser)

### Decisões de UX tomadas
- Decisão X → motivo
- Decisão Y → motivo

### Estados da interface
- **Vazio** — o que aparece quando não há dados
- **Com dados** — estado principal
- **Carregando** — se aplicável
- **Erro** — o que aparece se algo falhar

### Perguntas respondidas pelo design
*Responda aqui as perguntas em aberto do v1.*
- Pergunta → resposta

---

## v3 — Discovery Técnico
> *Preencher no Claude Cowork com o agente `tech-discovery`.*
> *Objetivo: definir EXATAMENTE O QUE CONSTRUIR antes de abrir o Claude Code.*

### Visão geral técnica
Resumo em 2–3 frases do que será construído tecnicamente.

### Arquivos a modificar

| Arquivo | O que muda | Impacto |
|---|---|---|
| `public/app.js` | ... | Baixo / Médio / Alto |
| `public/styles.css` | ... | Baixo / Médio / Alto |
| `public/index.html` | ... | Baixo / Médio / Alto |
| `server.js` | ... (se precisar) | Baixo / Médio / Alto |

### Novos campos no banco
*Se precisar de novas colunas. Lembrar de atualizar `schema.sql` E o mapeamento em `server.js`.*

- Tabela `tasks`: novo campo `xxx` tipo `TEXT DEFAULT NULL`
- Ou: nenhuma mudança necessária

### O que reutilizar
*Funções e padrões existentes que devem ser aproveitados — não reinventar.*

- `save()` → persistir alterações
- `load()` → buscar estado
- `openModal(id)` → abrir modal de tarefa existente
- ...

### Riscos e pontos de atenção
- Risco X → como mitigar
- Atenção Y → o que verificar

---

## Tasks de implementação
> *Criadas pelo agente `task-planner` com base no v3. Atualizadas durante o desenvolvimento.*
> *Cada task = um commit. Ordem importa — respeite as dependências.*

### 🗄️ Banco de dados
- [ ] `db-01` Adicionar coluna `xxx` na tabela `tasks` no `schema.sql`
- [ ] `db-02` Atualizar mapeamento `appTaskToDb()` / `dbTaskToApp()` em `server.js`

### ⚙️ Backend
- [ ] `be-01` ...
- [ ] `be-02` ...

### 🎨 Frontend — estrutura
- [ ] `fe-01` Adicionar HTML da nova UI em `index.html`
- [ ] `fe-02` Estilizar componente em `styles.css`

### ⚡ Frontend — lógica
- [ ] `fe-03` Implementar lógica principal em `app.js`
- [ ] `fe-04` Conectar gatilhos de evento (click, input, etc.)
- [ ] `fe-05` Chamar `save()` nos pontos corretos

### ✅ Critérios de conclusão
*Checklist final antes de abrir o PR. Verificado pelo agente `spec-checker`.*

- [ ] Comportamento A funciona conforme a jornada do v1
- [ ] Comportamento B funciona conforme o design do v2
- [ ] Nenhuma funcionalidade existente foi quebrada
- [ ] Testado nos dois boards (Trabalho e Pessoal)
- [ ] Dados persistem após recarregar a página

---

## Registro de desenvolvimento
> *Preenchido durante e após o desenvolvimento.*
> *Registre desvios do plano, problemas encontrados e como foram resolvidos.*

### Desvios da spec
- Task `fe-03`: precisou ser dividida em duas porque...

### Problemas encontrados
- Problema X → solução aplicada

### O que ficou fora (e por quê)
- Item Y foi deixado para uma próxima iteração porque...


### Notas de sessão
> *Registre o contexto importante de cada sessão de trabalho para que a próxima sessão comece com clareza.*

**[YYYY-MM-DD]**
- Onde parei: ...
- Próximo passo: ...
- Contexto importante: ...
