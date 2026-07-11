# Feature: Tarefas Recorrentes

---

### Nome
Criar e Gerenciar Tarefas Recorrentes

---

### Objetivo da Feature
Permitir que o usuário crie uma tarefa uma única vez e defina uma regra de recorrência, eliminando o trabalho manual de recriar tarefas repetitivas toda semana.

---

### Descrição Detalhada

**Ideia da Feature**
O usuário pode marcar qualquer tarefa como recorrente no momento da criação. Ao ativar a recorrência, um painel de opções aparece (inspirado no modelo do Microsoft Teams) onde o usuário define o padrão: diário, semanal, mensal ou personalizado. O app gera automaticamente todas as instâncias da série até o prazo definido.

**Problema Identificado**
Tarefas que se repetem (reuniões semanais, revisões periódicas, rotinas diárias) precisam ser criadas manualmente toda vez, gerando atrito e risco de esquecimento.

**Solução Desenhada**
Ao criar uma tarefa, o usuário ativa uma flag de recorrência. O app exibe as opções de padrão e gera automaticamente todas as instâncias da série no board como tarefas individuais, até o final de 2026. Editar ou excluir uma instância dispara uma pergunta: aplicar apenas àquela ocorrência ou a todas as futuras da série.

---

### Modelo de Dados

Novos campos na tabela `tasks`:

| Campo | Tipo | Descrição |
|---|---|---|
| `series_id` | UUID | Identificador da série. Igual em todas as instâncias do mesmo padrão. |
| `recurrence_rule` | JSONB | Regra da série: `{ type, days, interval, endDate }` |
| `is_exception` | BOOLEAN | `true` quando a instância foi editada individualmente (quebrou da série) |

**Estrutura do `recurrence_rule`:**
```json
{
  "type": "weekly",         // "daily" | "weekly" | "monthly" | "custom"
  "days": ["mon", "wed"],   // para type=weekly: dias da semana selecionados
  "workdaysOnly": true,     // para type=daily: se true, pula sábado e domingo
  "interval": 14,           // para type=custom: intervalo em dias (2–60)
  "dayOfMonth": 15,         // para type=monthly: dia fixo do mês
  "endDate": "2026-12-31"   // data de término da série
}
```

**Armazenamento:** cada ocorrência é uma linha independente na tabela `tasks`, com o mesmo `series_id`. Isso mantém compatibilidade com o padrão upsert total existente. O mapeamento `appTaskToDb` / `dbTaskToApp` em `server.js` deve incluir os três novos campos.

---

### Escopo

**Dentro do Escopo**
- Flag de recorrência no formulário de criação de tarefa
- Painel de opções de recorrência com os padrões:
  - **Diário** — todos os dias ou apenas dias úteis (seg–sex, sem feriados)
  - **Semanal** — dias da semana selecionáveis (seg a dom, múltipla seleção)
  - **Mensal** — dia fixo do mês
  - **Personalizado** — intervalo fixo de 2 a 60 dias
- Data de início: sempre o dia em que o usuário clicou para criar a tarefa
- Data de término: escolhida pelo usuário, máximo 31/12/2026
- Geração automática de todas as instâncias no board ao salvar
- Ao editar uma instância: modal "Apenas esta ocorrência" ou "Esta e todas as futuras"
  - "Todas as futuras" propaga todos os campos, exceto a data de cada instância
  - Instâncias editadas individualmente recebem `is_exception = true` e saem da série
- Ao excluir uma instância: mesmo modal com as duas opções
  - "Esta e todas as futuras" remove a partir da instância selecionada (inclusive); instâncias passadas permanecem
- Ao mover uma tarefa recorrente de dia (drag & drop ou edição de data): vira exceção (`is_exception = true`), sem afetar o restante da série
- Indicação visual (ícone 🔁) em todas as instâncias da série

**Fora do Escopo**
- Recorrências além de 31/12/2026
- Padrão de recorrência anual
- Integração com calendário externo (Google, Outlook)
- Notificações ou lembretes
- Alterar o padrão de recorrência de uma série já criada (deve-se excluir as futuras e recriar)
- Consideração de feriados no padrão "dias úteis"

---

### Jornada

**Criação de tarefa recorrente:**
1. Usuário clica para criar uma tarefa em um dia específico do board
2. Modal de criação abre com a data pré-preenchida (data do clique = data da 1ª instância)
3. Usuário preenche título e demais campos normalmente
4. Usuário ativa o toggle "Recorrente"
5. Painel de recorrência expande abaixo, com 4 opções de padrão:
   - **Diário:** radio "Todos os dias" ou "Apenas dias úteis (seg–sex)"
   - **Semanal:** checkboxes dos dias da semana (pelo menos 1 obrigatório)
   - **Mensal:** exibe o dia do mês pré-preenchido com o dia do clique (editável)
   - **Personalizado:** campo numérico "A cada ___ dias" (mín. 2, máx. 60)
6. Usuário define a data de término (picker, máx. 31/12/2026)
7. Usuário salva — o app gera todas as instâncias e exibe no board com ícone 🔁

**Edição de instância recorrente:**
1. Usuário clica para editar uma tarefa com ícone 🔁
2. Modal de confirmação: "Editar apenas esta ocorrência" ou "Esta e todas as futuras"
3. Se "apenas esta": edições aplicadas só nela; instância recebe `is_exception = true`
4. Se "esta e todas as futuras": todos os campos editados propagam para as instâncias subsequentes (a data de cada instância é preservada)

**Exclusão de instância recorrente:**
1. Usuário clica para excluir uma tarefa com ícone 🔁
2. Modal de confirmação: "Excluir apenas esta ocorrência" ou "Esta e todas as futuras"
3. Se "apenas esta": só essa instância é removida
4. Se "esta e todas as futuras": essa instância e todas as posteriores são removidas; instâncias anteriores permanecem intactas

**Mover tarefa recorrente de dia:**
1. Usuário move ou edita a data de uma instância recorrente
2. A instância é desvinculada da série (`is_exception = true`, `series_id` mantido para rastreabilidade)
3. O restante da série não é afetado
4. O ícone 🔁 permanece para indicar que a tarefa pertencia a uma série

---

### Critérios de Aceite

- Criar recorrência semanal (seg/qua) a partir de uma segunda-feira gera instâncias em todas as segundas e quartas até a data de término
- Criar recorrência mensal no dia 31 em um mês com menos dias pula esse mês (não gera no dia 28/30 — apenas nos meses que têm o dia 31)
- "Esta e todas as futuras" em edição nunca altera instâncias com data anterior à da instância selecionada
- Instâncias com `is_exception = true` não são afetadas por edições em massa da série
- O payload enviado ao `POST /api/tasks` continua sendo o estado completo (sem mudança de protocolo)
