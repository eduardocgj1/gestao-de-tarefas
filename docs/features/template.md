# [Nome da Feature]

> **Como usar este template:**
> Copie para `docs/features/nome-da-feature/spec.md` e vá preenchendo etapa por etapa.
> Cada seção é preenchida em uma fase diferente do processo — não tente preencher tudo de uma vez.
> Delete as instruções em itálico antes de commitar cada versão.

**Status:** `[ ] Discovery` → `[ ] Design` → `[ ] Discovery Técnico` → `[ ] Desenvolvimento` → `[ ] Concluído`

**Branch:** `feature/nome-da-feature`

---

## v1 — Discovery
> *Preencher no Claude Cowork. Objetivo: entender O QUÊ e POR QUÊ antes de pensar em solução.*

### Objetivo
O que o usuário consegue fazer com essa feature que não conseguia antes? (1–2 frases)

### Problema
Qual dor concreta essa feature resolve? Descreva a situação que o usuário enfrenta hoje, sem mencionar solução ainda.

### Solução
Como a feature resolve o problema? Descreva o comportamento principal em linguagem de produto, sem entrar em detalhes técnicos ou visuais.

### Escopo

**Dentro do escopo**
- O que essa feature FAZ

**Fora do escopo**
- O que essa feature NÃO faz (tão importante quanto o escopo — evita crescimento descontrolado)

### Jornada do usuário
Passo a passo de como o usuário interage com a feature, do gatilho até o resultado final.

1. Usuário faz X
2. App responde com Y
3. ...

### Perguntas em aberto
*Liste aqui o que ainda não está decidido ao final do discovery. O design vai responder.*

- ?
- ?

---

## v2 — Design
> *Preencher após o protótipo no Claude Design. Objetivo: definir COMO PARECE e COMO FUNCIONA.*
> *Anexar o arquivo de protótipo em `docs/features/nome-da-feature/prototype.html`*

### Experiência e visual

Descreva o comportamento e aparência da feature como saiu do design. Referencie o protótipo para detalhes visuais.

**Protótipo:** `prototype.html` (abrir no browser para ver interativo)

### Decisões de UX tomadas
*Liste as decisões de design que não eram óbvias — o "porquê" de cada escolha visual/interativa.*

- Decisão X → motivo
- Decisão Y → motivo

### Estados e variações
*Quais são os diferentes estados que a interface pode ter?*

- Estado vazio (sem dados)
- Estado com dados
- Estado de erro
- Estado de carregamento (se aplicável)

### Perguntas respondidas pelo design
*Responda aqui as perguntas em aberto que ficaram do v1.*

- Pergunta do v1 → resposta do design

---

## v3 — Discovery Técnico
> *Preencher no Claude Cowork, lendo spec v2 + CLAUDE.md + código atual.*
> *Objetivo: definir EXATAMENTE O QUE CONSTRUIR antes de abrir o Claude Code.*

### Plano de implementação
*Lista ordenada do que precisa ser feito, do mais simples ao mais complexo.*

1. ...
2. ...
3. ...

### Arquivos a modificar

| Arquivo | O que muda |
|---|---|
| `public/app.js` | ... |
| `public/styles.css` | ... |
| `public/index.html` | ... |
| `server.js` | ... (se precisar) |

### Novos campos no banco
*Se precisar de novas colunas, listar aqui. Lembrar de atualizar `schema.sql` E o mapeamento em `server.js`.*

- Tabela `tasks`: novo campo `xxx` tipo `TEXT` (ou nenhum)

### O que reutilizar do código existente
*Funções, variáveis e padrões que já existem e devem ser aproveitados.*

- `save()` — para persistir alterações
- `load()` — para buscar estado
- ...

### Riscos e pontos de atenção
*O que pode dar errado ou exige cuidado especial na implementação.*

- Risco X → como mitigar
- Atenção Y → o que verificar

### Critérios de conclusão
*Como saber que a feature está pronta? Lista de comportamentos que devem funcionar.*

- [ ] Comportamento A funciona
- [ ] Comportamento B funciona
- [ ] Não quebrou nenhuma funcionalidade existente

---

## Notas e decisões durante o desenvolvimento
> *Preencher pelo Claude Code ou por você durante a implementação.*
> *Registre aqui desvios do plano, problemas encontrados e como foram resolvidos.*

- ...
