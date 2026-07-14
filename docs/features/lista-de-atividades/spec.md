# Feature: Gerenciar Lista de Atividades

---

## Nome

Gerenciar Lista de Atividades

---

## Objetivo da Feature

Permitir que o usuário capture, organize e especifique atividades que deseja realizar — de uma parada rápida num café a viagens longas — com dados estruturados suficientes para planejar por conta própria hoje e servir de insumo à futura IA de recomendação de final de semana.

---

## Descrição Detalhada

**Ideia da Feature**
O usuário mantém uma lista pessoal de atividades que quer fazer algum dia: um destino, um hobby, um restaurante, uma trilha. Cada atividade é especificada com atributos estruturados — vibe, modalidades de duração, perfis de custo por nível de conforto, variações sazonais, meios de transporte e checklist de planejamento — que tornam a lista acionável hoje e inteligente no futuro, quando uma IA cruzará esses dados com contexto real (clima, orçamento disponível, companhia) para sugerir o que fazer.

**Problema Identificado**
Listas de "quero fazer" ficam em bloco de notas, Notion ou na cabeça — sem estrutura, sem contexto, sem conexão com o momento em que a janela de tempo aparece. Quando chega o final de semana, o usuário não sabe o que está dentro do seu orçamento, compatível com o clima, adequado à companhia, viável com o tempo disponível ou se faz sentido naquela época do ano.

**Solução Desenhada**
Uma lista estruturada por categorias onde cada atividade é enriquecida com atributos de contexto e pode ter múltiplas Variações Sazonais — cada uma com sua própria vibe, custos e condições ideais. O checklist de cada atividade é composto por tarefas reais — os mesmos objetos do board de gestão de tarefas —, com campos de antecedência mínima, máxima e recomendada que permitem alocar automaticamente cada tarefa na data certa ao registrar a data de início da atividade. Quando o status muda para Planejada, as tarefas são promovidas ao board e passam a aparecer em ambos os lugares com sincronização real.

---

## Escopo

**Dentro do Escopo**
- Criação de atividades em dois modos: rápido (Rascunho) e detalhado
- Auto-save por etapa no formulário — progresso nunca é perdido
- Edição completa de qualquer atributo a qualquer momento
- Categorização por tipo com opção de categoria personalizada (texto livre com autocomplete das categorias existentes)
- Campo de Vibe (multisseleção) para definir o estilo e atmosfera da atividade
- Modalidades de duração múltiplas e granulares por atividade
- Perfis de custo por nível de conforto (Econômico / Padrão / Conforto) com variação sazonal
- Variações Sazonais com regra de merge explícita (substituição, não soma) e lista fechada de campos substituíveis
- Campo de meios de transporte compatíveis por atividade
- Atributos de planejamento: antecedência mínima, decisão de última hora, repetível, pet-friendly
- Checklist composto por tarefas reais (mesmo objeto do board), com campos de antecedência mínima, máxima e recomendada
- Tarefas do checklist gerenciáveis com o mesmo card e interações do board atual
- Sincronização bidirecional em tempo real: alterações em qualquer lugar refletem nos dois
- Promoção do checklist ao board ao mudar status para Planejada — com seleção do board de destino e definição da data de início
- Alocação automática de cada tarefa na data correta (data_inicio − antecedência_mínima), com fallback para hoje se a data ficar no passado
- Exibição de próximos feriados compatíveis com as modalidades de duração (via API feriadosapi.com)
- Preenchimento automático de distância de SP via geocodificação (API Nominatim) com fallback manual
- Máquina de estados com ciclo de realização repetível
- Cancelamento do plano com confirmação e zeragem do checklist
- Registro de múltiplas realizações por atividade, cada uma editável individualmente
- Exclusão de atividade com confirmação (apenas se nunca realizada)
- Tela de importação de JSON gerado pelo prompt de refinamento
- Busca fuzzy em tempo real via Fuse.js (carregada via CDN)
- Filtros por categoria, vibe, status, modalidade de duração, custo e época do ano
- Foto de capa armazenada como base64 data URL no banco
- Ordenação padrão: mais recente primeiro dentro de cada agrupamento

**Fora do Escopo**
- Recomendação automática de atividade para o final de semana (fase futura — IA Planejadora)
- Integração com API de clima (Open-Meteo / HG Brasil) para dados em tempo real (fase futura)
- Integração com Google Places para fotos e horários automáticos (fase futura)
- Integração com API de IA para preenchimento automático (fase futura — nesta fase o usuário usa o prompt manualmente)
- Compartilhamento de listas com outras pessoas
- Importação de sugestões de fontes externas (TripAdvisor, Google Places etc.)
- Monetização ou limites de uso
- Arquivamento de atividades com realizações (fase futura — por ora, exclusão é bloqueada para atividades já realizadas)

---

## Categorias de Atividades

| Categoria | Exemplos |
|---|---|
| Explorar a cidade | Restaurante, café especial, bairro, museu, show, feira, bar, mirante |
| Viagem de final de semana | Ubatuba, Campos do Jordão, Serra da Canastra |
| Viagem longa | Buenos Aires, Chapada, Nordeste, Europa |
| Natureza & aventura | Trilha, cachoeira, surfe, mergulho, camping |
| Hobbies & aprendizado | Curso de fotografia, aula de culinária, ler um livro |
| Social & cultural | Teatro, exposição, festival, evento esportivo |
| Descanso intencional | Spa, retiro, fim de semana sem sair de casa |
| Personalizada | Categoria criada pelo próprio usuário |

**Categoria Personalizada:** o usuário digita um texto livre quando seleciona "Personalizada". O campo exibe autocomplete com as categorias personalizadas já existentes em outras atividades (derivadas do array `activities` em memória) para evitar fragmentação por erro de digitação. O texto é normalizado (trim, sem caixa forçada) antes de salvar. O agrupamento na view é por string exata — categorias personalizadas diferentes mas semanticamente iguais ficam em grupos separados; o usuário é responsável pela consistência.

---

## Vibes

Campo de multisseleção — uma atividade (ou variação sazonal) pode ter mais de uma vibe.

| Vibe | Quando usar |
|---|---|
| Romantico | Ideal para casal, atmosfera intimista |
| Aventura | Adrenalina, esforço físico, imprevistos bem-vindos |
| Relaxamento | Descanso, sem agenda, recarregar energia |
| Cultural | Museus, história, gastronomia local, arquitetura |
| Agito social | Festa, festival, eventos com muita gente |
| Mochilão | Low cost, improviso, experiência sobre conforto |
| Natureza & contemplação | Trilhas tranquilas, pôr do sol, desconexão |
| Gastronômico | Foco em comer bem, beber bem, mercados |
| Fotográfico | Apelo visual forte, cenários, luz, composição |
| Desconexão digital | Área rural, sem sinal, retiro, camping |
| Família | Inclusiva para crianças ou gerações diferentes |
| Solo | Melhor ou ótima feita sozinho |

---

## Modalidades de Duração

Multisseleção — a mesma atividade pode suportar mais de uma modalidade.

| Modalidade | Duração | Exemplos |
|---|---|---|
| Parada rápida | Até 1h | Cafezinho, padaria especial, mirante, livraria, feira |
| Meio período | 2–4h | Museu, trilha curta, almoço especial, parque, cinema |
| Dia inteiro | 6–10h | Parque maior, praia próxima, visita a cidade na região sem pernoite |
| Bate volta | 1 dia com deslocamento longo | Ubatuba saindo cedo e voltando à noite |
| Final de semana | 2–3 dias com pernoite | — |
| Feriado prolongado | 3–5 dias | Semana santa, Carnaval, feriado emendado |
| Semana+ | 7 dias ou mais | Viagem longa, internacional |

A distinção entre "Dia inteiro" e "Bate volta" é o deslocamento: bate volta implica viagem com tempo de estrada significativo; dia inteiro pode ser dentro da cidade ou região próxima.

---

## Perfis de Custo

Cada atividade pode ter até três perfis de custo por nível de conforto. Cada perfil suporta dois ranges: alta e baixa temporada. O usuário preenche apenas os que conhece. Para avançar de Rascunho para "Quero fazer", é necessário preencher ao menos o range completo (mín e máx) de um perfil em baixa temporada.

| Perfil | Descrição |
|---|---|
| Economico | Mochilão, hostel, transporte público, cozinha própria |
| Padrao | Pousada simples, carro, restaurantes medianos |
| Conforto | Hotel boutique, transfers, experiências gastronômicas |

Campos por perfil:
- Custo em baixa temporada: R$ mín – R$ máx por pessoa (obrigatório para ao menos 1 perfil)
- Custo em alta temporada: R$ mín – R$ máx por pessoa (opcional)

---

## Variações Sazonais

Uma mesma atividade pode ser vivida de formas radicalmente diferentes dependendo da época. Variações Sazonais permitem mapear isso sem duplicar a atividade no banco.

**Regra de merge — substituição, não soma:**
Os campos definidos na variação *substituem* os campos correspondentes da base. Campos não definidos na variação herdam o valor da base.

**Épocas cobertas — unidades trimestrais indivisíveis:**
As épocas são: "Jan–Mar", "Abr–Jun", "Jul–Set", "Out–Dez". Cada época representa exatamente um trimestre. Uma variação pode cobrir uma ou mais épocas. O conflito entre variações é verificado ao nível de época: se duas variações incluem a mesma época, o app bloqueia o salvamento da segunda com a mensagem: "Este período já está coberto pela variação '[nome]'. Ajuste as épocas antes de salvar."

**Detecção da variação ativa:**
- Mapeamento mês → época: Jan/Fev/Mar → "Jan–Mar"; Abr/Mai/Jun → "Abr–Jun"; Jul/Ago/Set → "Jul–Set"; Out/Nov/Dez → "Out–Dez".
- A variação cujas `epocas_cobertas` incluem a época do mês atual é a variação ativa.
- Se `inclui_feriados_prolongados: true`, a variação também fica ativa a partir da véspera do primeiro dia de feriado prolongado (detectado via feriadosapi.com), mesmo que a data ainda pertença à época anterior.
- Se nenhuma variação cobre a época atual, os atributos da base funcionam como fallback.

**Lista fechada de campos substituíveis numa variação:**

| Campo | Pode substituir? | Justificativa |
|---|---|---|
| `vibes` | ✅ Sim | Muda significativamente por época |
| `condicao_climatica_ideal` | ✅ Sim | Tolerância ao clima muda por época |
| `temperatura_minima_celsius` | ✅ Sim | Temperatura mínima aceitável muda |
| `antecedencia_minima_dias` | ✅ Sim | Alta temporada exige reserva com mais antecedência |
| `decisao_ultima_hora` | ✅ Sim | Possível na baixa, inviável na alta |
| `perfis_custo` | ✅ Sim | Custo muda drasticamente por época |
| `modalidades_duracao` | ✅ Sim | Ex.: só viável como FDS na baixa temporada |
| `meios_transporte` | ✅ Sim | Ex.: ônibus disponível na alta, só carro na baixa |
| `perfil_grupo` | ✅ Sim | Ex.: romântico fora de época, família na alta |
| `evitar_alta_temporada` | ✅ Sim | Pode inverter conforme a variação |
| `notas` | ✅ Sim | Notas específicas da época |
| `nome` | ❌ Não | Identidade da atividade — invariável |
| `categoria` | ❌ Não | Classificação estrutural — invariável |
| `descricao` | ❌ Não | Descrição geral — invariável |
| `distancia_sp` | ❌ Não | Distância física — invariável |
| `nivel_planejamento` | ❌ Não | Complexidade geral — invariável |
| `condicionamento_fisico` | ❌ Não | Exigência física — invariável |
| `repetivel` | ❌ Não | Atributo da atividade em si — invariável |
| `pet_friendly` | ❌ Não | Política do destino — invariável |
| `tamanho_grupo` | ❌ Não | Restrição estrutural — invariável |

**Exemplo — Ubatuba:**

| Atributo | Base | Variação: Alta temporada | Variação: Fora de temporada |
|---|---|---|---|
| Épocas | — (fallback) | Out–Dez + Jan–Mar | Abr–Jun + Jul–Set |
| Vibe | Relaxamento | Agito social | Relaxamento, Natureza & contemplação, Fotográfico |
| Clima ideal | Ensolarado, 22°C+ | Ensolarado, 26°C+ | Ensolarado ou Nublado, 18°C+ |
| Antecedência mínima | 7 dias | 21 dias | 3 dias |
| Perfil Padrão | R$ 350–550 | R$ 700–1.200 | R$ 350–550 |
| Notas | — | Trânsito brutal na sexta. Reservar com 3+ semanas. | Praias desertas. Ótimo para fotografia. |

---

## Checklist de Planejamento

### Modelo de dados do item de checklist

Cada item do checklist de uma atividade é uma **tarefa real** — o mesmo objeto de task usado no board de gestão de tarefas, com todos os campos existentes — acrescida de três campos de antecedência:

| Campo | Tipo | Descrição |
|---|---|---|
| `antecedenciaMiniDias` | INTEGER ou null | Quantos dias antes da atividade esta tarefa deve estar concluída no mínimo |
| `antecedenciaMaxDias` | INTEGER ou null | Janela máxima de antecedência (não faz sentido fazer antes disso) |
| `antecedenciaRecDias` | INTEGER ou null | Antecedência recomendada — usado como alvo se a mínima não for possível |

Exemplo: "Reservar pousada" com `antecedenciaMiniDias: 7`, `antecedenciaMaxDias: 60`, `antecedenciaRecDias: 21` para uma atividade planejada para 01/09 → data ideal 11/08, aceita entre 02/07 e 25/08.

### Comportamento do checklist antes da promoção (status rascunho / quero_fazer)

- Tarefas ficam no checklist da atividade com `boardId: null` e `date: null`
- Aparecem **apenas** no card da atividade — não em nenhum board
- O usuário gerencia essas tarefas com o **mesmo card e interações do board**: editar nome, duração, delegação, marcar como concluída, reordenar por drag-and-drop
- O indicador de progresso ("3 de 6 itens concluídos") reflete o estado real de `completed` de cada tarefa
- O usuário pode adicionar, editar, reordenar e remover tarefas a qualquer momento

### Sincronização bidirecional (após promoção ao board)

Após a promoção (status `planejada`), cada tarefa do checklist passa a ter `boardId` e `date` definidos. Ela aparece nos **dois lugares simultaneamente**:

- No board, na coluna do dia correspondente à sua `date`
- No card da atividade, no checklist

A sincronização é real: há **uma única instância** da tarefa em memória (em `activity.checklistTasks`). O board lê as tarefas promovidas a partir desse array. Qualquer edição — em qualquer lugar — atualiza o mesmo objeto e reflete imediatamente nos dois.

### Promoção ao board (status → planejada)

Ao mover uma atividade para `planejada`:
1. O usuário **obrigatoriamente** informa a `data_inicio` da atividade (data em que a atividade será realizada)
2. O usuário **seleciona o board de destino** (dropdown listando todos os boards existentes)
3. Se o checklist estiver vazio, o botão "Mover para Planejada" fica desabilitado com tooltip "Adicione ao menos uma tarefa ao checklist"
4. Para cada tarefa do checklist, o app calcula: `data_tarefa = data_inicio − antecedenciaMiniDias`
   - Se `antecedenciaMiniDias` for null → `date: null` (tarefa fica sem data no board)
   - Se `data_tarefa < hoje` → `date = hoje` (não aloca no passado)
5. Cada tarefa recebe `boardId` = board selecionado e `date` calculado
6. Status da atividade muda para `planejada`
7. `save()` é chamado

### Cancelamento do plano (status planejada → quero_fazer)

Um botão "Cancelar planejamento" fica no **rodapé do card da atividade** quando o status for `planejada`.

Ao clicar:
1. App exibe dialog de confirmação: *"Cancelar o planejamento vai remover as datas das tarefas do checklist e tirá-las do board. As tarefas permanecem no checklist da atividade. Deseja continuar?"*
2. Se confirmado:
   - Cada tarefa do checklist tem `boardId: null`, `date: null`, `completed: false` restaurados
   - Status da atividade muda para `quero_fazer`
   - `save()` é chamado
3. As tarefas deixam de aparecer no board imediatamente
4. O checklist da atividade mantém todas as tarefas intactas (nomes, campos de antecedência, etc.)

**Nota:** nada é deletado da gestão de tarefas neste fluxo — as tarefas voltam para o estado pré-promoção.

---

## Meios de Transporte

Campo de multisseleção. O meio de transporte costuma definir o perfil de experiência — isso é representado nos perfis de custo, não como campo de custo separado.

| Meio | Quando usar |
|---|---|
| A pé | Atividades dentro do bairro |
| Bicicleta | Até ~15 km, ciclovias disponíveis |
| Metro / CPTM | Destino com estação acessível |
| Ônibus municipal | Dentro da cidade |
| Ônibus interestadual | Destinos até ~500 km |
| Carro próprio | Maioria das viagens curtas e médias |
| Aplicativo (Uber/99) | Quando não quer dirigir |
| Aluguel de carro | Destinos que exigem mobilidade no local |
| Avião | Destinos distantes ou internacionais |
| Barco / ferry | Destinos insulares ou costeiros |
| Van / transfer compartilhado | Destinos turísticos com transfer disponível |

---

## Campos por Atividade

### Identidade
| Campo | Tipo | Obrigatorio |
|---|---|---|
| Nome | Texto livre | Sim |
| Categoria | Seleção única (enum + personalizada) | Sim |
| Vibe | Multisseleção | Não |
| Descrição | Texto livre | Não |
| Foto de capa | Imagem armazenada como base64 data URL | Não |

### Logistica
| Campo | Tipo | Obrigatorio | Observacao |
|---|---|---|---|
| Modalidades de duração | Multisseleção | Sim | Condição para sair do Rascunho |
| Meios de transporte compatíveis | Multisseleção | Não | |
| Perfil Econômico — baixa/alta temporada (R$/pessoa) | Range numérico × 2 | Não | Preencher range completo em ao menos 1 perfil para sair do Rascunho |
| Perfil Padrão — baixa/alta temporada (R$/pessoa) | Range numérico × 2 | Não | |
| Perfil Conforto — baixa/alta temporada (R$/pessoa) | Range numérico × 2 | Não | |
| Nível de planejamento | Seleção única | Não | Espontâneo / Planejado / Requer reserva antecipada |
| Antecedência mínima (dias) | Número | Não | Referência geral da atividade; antecedência por tarefa fica no checklist |
| Decisão de última hora possível? | Booleano | Não | |
| Localidade | Texto curto (ex.: "Cantareira", "Ubatuba", "Mercadão") | Não | Usado para geocodificação via Nominatim. Se vazio, exibe seletor manual de distância |
| Distância de SP | Seleção manual ou preenchida via Nominatim | Não | Na cidade / Até 150 km / 150–400 km / 400 km+ |

**Condição para sair do Rascunho:** ao menos 1 modalidade de duração + range completo (mín+máx) de ao menos 1 perfil de custo em baixa temporada.

### Condicoes Ideais
| Campo | Tipo | Obrigatorio |
|---|---|---|
| Condição climática ideal | Multisseleção | Não — Ensolarado / Nublado (ok) / Chuva (ok) / Frio / Qualquer |
| Temperatura mínima ideal (°C) | Número opcional | Não |
| Época ideal do ano | Multisseleção de épocas trimestrais | Não — Jan–Mar / Abr–Jun / Jul–Set / Out–Dez / Qualquer |
| Perfil de grupo | Multisseleção | Não — Solo / Dupla (casal) / Amigos / Família / Qualquer |
| Tamanho do grupo | Seleção | Não — Solo / Dupla / Pequeno (3–5) / Grande / Qualquer |
| Condicionamento físico exigido | Seleção | Não — Não / Leve / Moderado / Intenso |
| Evitar alta temporada | Booleano | Não |
| Repetível | Booleano | Não |
| Pet-friendly | Booleano | Não |

### Variacoes Sazonais
| Campo | Tipo | Obrigatorio |
|---|---|---|
| Nome da variação | Texto livre | Sim (por variação) |
| Épocas cobertas | Multisseleção de trimestres + flag "feriados prolongados" | Sim (por variação) |
| Campos substituídos | Subconjunto da lista fechada acima | Não |

### Planejamento
| Campo | Tipo | Obrigatorio |
|---|---|---|
| Checklist | Lista de tarefas reais com antecedência | Não |
| Data de início | Data — obrigatória ao mover para Planejada | Condicional |
| Board de destino | Seleção do board — obrigatória ao mover para Planejada | Condicional |
| Próximos feriados compatíveis | Gerado via feriadosapi.com | — |
| Notas pessoais | Texto livre | Não |
| Links úteis | Lista de `{ url: string, titulo: string }` | Não |

### Status e Realizacoes
| Campo | Tipo | Condicao |
|---|---|---|
| Status | rascunho / quero_fazer / planejada | Sempre visível |
| Data de início | Data da atividade planejada | Visível quando status = planejada |
| Board de destino | Board selecionado na promoção | Visível quando status = planejada |
| Contador de realizações | Número (ex.: "Realizada 2×") | Exibido quando ≥ 1 realização |
| Registros de realização | Lista de registros individuais, cada um editável | — |

**Campos de cada registro de realização:**
| Campo | Tipo |
|---|---|
| Data realizada | Data — deve ser ≤ data de hoje |
| Gasto total real (R$) | Número |
| Perfil vivido | Econômico / Padrão / Conforto |
| Variação vivida | Seleção entre as variações cadastradas (se houver) |
| Com quem foi | Texto livre |
| Avaliação | 1–5 estrelas + nota livre |

---

## Maquina de Estados e Ciclo de Realizacoes

```
rascunho → quero_fazer → planejada → [marcar como Realizada]
               ↑_______________↓                   ↓
         (cancelar planejamento,         Atividade volta para a lista
          tarefas voltam pro checklist)  com status quero_fazer
                                         e contador "Realizada N×"
                                         pode ser planejada novamente
```

**rascunho:** só nome e categoria obrigatórios. Fica em seção separada "X atividades aguardando detalhamento".

**quero_fazer:** ao menos 1 modalidade de duração + range completo de ao menos 1 perfil de custo em baixa temporada preenchidos.

**planejada:** ao entrar neste status, `data_inicio` e `board_destino_id` são obrigatórios. Tarefas do checklist são promovidas ao board com datas calculadas.

**Realizada:** ao marcar como realizada, o usuário preenche o registro de realização. A atividade volta para `quero_fazer`. O registro salvo pode ser editado a qualquer momento.

**Cancelar planejamento:** botão no rodapé do card quando status = `planejada`. Exibe confirmação. Ao confirmar, tarefas voltam ao estado pré-promoção (`boardId: null`, `date: null`), status volta para `quero_fazer`.

**Exclusão:** permitida apenas se `realizacoes.length === 0`. Exibe confirmação detalhando o que será perdido.

---

## Comportamentos de UX Definidos

**Auto-save:** o formulário de criação/edição faz auto-save usando `save()` (debounce 250ms). Se o usuário sair no meio, o progresso é mantido como Rascunho parcial.

**Busca fuzzy:** via Fuse.js (CDN). Filtra a cada tecla. Varre nome, categoria, vibe e notas. Threshold inicial: 0.4. Fuse.js é carregado via CDN no `index.html` antes do `app.js`:
```html
<script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js"></script>
```

**Nominatim:** chamada ao avançar da etapa 1 para a etapa 2 do formulário, usando o campo `localidade` como query. Se `localidade` estiver vazio ou a geocodificação não retornar resultado, exibe seletor manual de distância. O fluxo não é bloqueado em nenhum caso.

**feriadosapi.com:** chamada uma vez por sessão ao abrir a view de Atividades, buscando feriados do ano corrente para o estado de SP. Resultado cacheado em memória (`let holidaysCache = null`). Se a API falhar, a seção "Próximos feriados" exibe "Não foi possível carregar feriados" e o fluxo não é bloqueado.

**Ordenação padrão:** `created_at` DESC dentro de cada agrupamento de categoria.

**Conflito de variações:** bloqueio ao salvar se dois trimestres se sobrepõem. Mensagem: "Este período já está coberto pela variação '[nome]'. Ajuste as épocas antes de salvar."

**Checklist vazio ao mover para Planejada:** o botão "Mover para Planejada" fica desabilitado com tooltip "Adicione ao menos uma tarefa ao checklist para planejar".

---

## APIs Integradas

### Fase atual

| API | Gratuita? | Onde entra |
|---|---|---|
| **Nominatim** (OpenStreetMap) | Sim | Ao avançar etapa 1→2: geocodifica o campo `localidade` para preencher distância de SP. Fallback: seletor manual se `localidade` vazio ou sem resultado. |
| **feriadosapi.com** | Sim (60 req/min) | Ao abrir a view: carrega feriados do ano (cache em memória). Usado no card e para detectar início de feriado prolongado. |

### Fase futura (IA Planejadora)

| API | Gratuita? | Onde entra |
|---|---|---|
| **Open-Meteo** | Sim | Previsão do tempo cruzada com condição climática e temperatura mínima da variação ativa |
| **Google Places** | Até $200/mês crédito | Foto de capa automática e horários |
| **Open Exchange Rates** | Free 1.000 req/mês | Conversão de custos internacionais para R$ |

---

## Jornada do Usuario

### Fluxo 1 — Captura rápida (Rascunho)

1. Usuário clica em "Atividades" na sidebar e em "+ Nova atividade"
2. App exibe campo de texto: "O que você quer fazer? Ex.: ir para Ubatuba, cafezinho no Mercadão, aprender fotografia..."
3. Usuário digita o nome, seleciona uma categoria e salva
4. Auto-save imediato. Atividade entra com status `rascunho`

### Fluxo 2 — Criacao detalhada (ou refinamento de Rascunho)

1. Usuário abre uma atividade em Rascunho (ou cria nova no modo detalhado)
2. Formulário em 5 etapas com auto-save a cada etapa:
   - Etapa 1 — Identidade: nome, categoria, vibe, descrição, localidade (texto curto, ex.: "Cantareira", "Ubatuba"), foto de capa
   - Etapa 2 — Logística: modalidades de duração, meios de transporte, perfis de custo, nível de planejamento, antecedência mínima, decisão de última hora, distância (preenchida via Nominatim usando `localidade` ao entrar na etapa, ou seletor manual se `localidade` estiver vazio / sem resultado)
   - Etapa 3 — Condições ideais
   - Etapa 4 — Variações sazonais (opcional, pode pular)
   - Etapa 5 — Planejamento: checklist (adicionar tarefas com antecedências), notas, links
3. Ao completar etapa 2 com condições mínimas atendidas, status avança para `quero_fazer`

### Fluxo 3 — Importar atividade via JSON

1. Usuário acessa "Importar" na topbar da view de Atividades
2. Cola JSON gerado pelo prompt no Claude
3. App valida: (a) campos obrigatórios presentes; (b) tipos corretos. Exibe erros por campo se inválido
4. Se válido: exibe preview. Usuário revisa, edita e confirma
5. Atividade entra com status correto (`quero_fazer` ou `rascunho`)

### Fluxo 4 — Mover para Planejada

1. Usuário clica em "Mover para Planejada"
2. Se checklist vazio: botão desabilitado. Usuário precisa adicionar tarefas primeiro
3. App exibe dialog com dois campos obrigatórios:
   - Data de início da atividade (date picker, mín: amanhã)
   - Board de destino (dropdown com todos os boards existentes)
4. Ao confirmar: app calcula datas de cada tarefa (`data_inicio − antecedenciaMiniDias`), aplica fallback para hoje se necessário, define `boardId` em cada tarefa, muda status para `planejada`
5. Tarefas passam a aparecer no board selecionado nas datas corretas

### Fluxo 5 — Cancelar planejamento

1. Usuário clica em "Cancelar planejamento" (botão no rodapé do card, visível quando status = `planejada`)
2. App exibe confirmação: *"Cancelar o planejamento vai remover as datas das tarefas do checklist e tirá-las do board. As tarefas permanecem no checklist da atividade. Deseja continuar?"*
3. Se confirmado: tarefas voltam para `boardId: null`, `date: null`, `completed: false`. Status volta para `quero_fazer`
4. Tarefas desaparecem do board imediatamente

### Fluxo 6 — Registrar realização

1. Usuário clica em "Marcar como realizada" no card
2. App exibe formulário de registro: data (≤ hoje), gasto total, perfil vivido, variação vivida, com quem foi, avaliação (1–5 + nota)
3. Ao confirmar: registro salvo em `realizacoes`, atividade volta para `quero_fazer` com badge "Realizada N×"

### Fluxo 7 — Tentar excluir atividade

1. Se `realizacoes.length === 0`: confirmação com listagem do que será perdido → deletada permanentemente
2. Se `realizacoes.length >= 1`: bloqueado. Mensagem: "Esta atividade já foi realizada e não pode ser excluída."

### Fluxo 8 — Navegar, filtrar e buscar

1. View padrão: grid de cards agrupados por categoria, ordenados por `created_at` DESC
2. Banner no topo se houver rascunhos: "X atividades aguardando detalhamento"
3. Busca fuzzy em tempo real via Fuse.js
4. Filtros combináveis: categoria, vibe, status, modalidade de duração, perfil de custo (range), época do ano

---

## Prompt de Refinamento de Atividade

**Hoje (fase manual):** usuário cola o prompt no Claude, recebe o JSON e importa via Fluxo 3.

**Futuro (fase com API):** app chama a IA em background. Zero mudança no schema.

### O Prompt

```
Você é um assistente de planejamento pessoal. O usuário vai descrever uma atividade que quer fazer — pode ser só o título, pode ser uma descrição mais detalhada, pode incluir contexto pessoal (com quem vai, ocasião, preferências).

ANTES DE GERAR O JSON:
- Avalie se você tem informação suficiente para preencher os campos com qualidade.
- Se o input for ambíguo em algo que impacte campos obrigatórios ou estimativas centrais (categoria, custo, duração), faça perguntas objetivas — no máximo 3, todas numa única mensagem.
- Se o input for suficiente, vá direto ao JSON sem comentários.
- Campos opcionais sem informação suficiente devem ser preenchidos com null.

REGRAS DE PREENCHIMENTO:
- Preencha com base no seu conhecimento sobre a atividade e no contexto fornecido.
- Inclua variações sazonais apenas quando a experiência mudar significativamente por época.
- Nas variações, preencha APENAS os campos que diferem da base.
- Estime custos em R$ por pessoa, considerando São Paulo como cidade de origem.
- O checklist deve ser prático e específico. Para cada item, estime antecedência mínima, máxima e recomendada em dias antes da data da atividade.

RETORNE SOMENTE O JSON, sem texto antes ou depois.

SCHEMA:
{
  "nome": "",
  "categoria": "", // enum de categorias ou texto livre para personalizada
  "descricao": "",
  "vibes": [],
  "modalidades_duracao": [],
  "meios_transporte": [],
  "nivel_planejamento": "",
  "antecedencia_minima_dias": null,
  "decisao_ultima_hora": false,
  "distancia_sp": "",
  "condicao_climatica_ideal": [],
  "temperatura_minima_ideal_celsius": null,
  "epoca_ideal": [], // "Jan–Mar" | "Abr–Jun" | "Jul–Set" | "Out–Dez" | "Qualquer"
  "perfil_grupo": [],
  "tamanho_grupo": "",
  "condicionamento_fisico": "",
  "evitar_alta_temporada": false,
  "repetivel": true,
  "pet_friendly": null,
  "perfis_custo": {
    "economico": { "baixa_temporada": [min, max], "alta_temporada": [min, max] },
    "padrao":    { "baixa_temporada": [min, max], "alta_temporada": [min, max] },
    "conforto":  { "baixa_temporada": [min, max], "alta_temporada": [min, max] }
  },
  "variacoes": [
    {
      "nome": "",
      "epocas_cobertas": [], // trimestres: "Jan–Mar" | "Abr–Jun" | "Jul–Set" | "Out–Dez"
      "inclui_feriados_prolongados": false,
      // Apenas campos da lista substituível que diferem da base:
      "vibes": [],
      "condicao_climatica_ideal": [],
      "temperatura_minima_celsius": null,
      "antecedencia_minima_dias": null,
      "decisao_ultima_hora": null,
      "perfis_custo": {},
      "modalidades_duracao": [],
      "meios_transporte": [],
      "perfil_grupo": [],
      "evitar_alta_temporada": null,
      "notas": ""
    }
  ],
  "checklist_sugerido": [
    {
      "name": "",
      "antecedencia_minima_dias": null,
      "antecedencia_max_dias": null,
      "antecedencia_rec_dias": null
    }
  ]
}
```

---

## Telas e Navegação

### Entrada na Sidebar

Novo item fixo na sidebar, abaixo do separador atual (após o Calendário):

```html
<button type="button" id="sidebarActivitiesItem" class="sidebar-activities-item">
  <span class="icon-activities-wrap"><span class="icon-activities"></span></span>
  <span class="sidebar-activities-label">Atividades</span>
</button>
```

Classe `active` quando `currentView === 'activities'`. Ao clicar: `setView('activities')`.

### Nova View: `'activities'`

`currentView` ganha o valor `'activities'`. A função `setView()` passa a tratar este caso:
- Oculta `#board` e `#calendarView`
- Exibe `#activitiesView` (novo `<main>` no `index.html`)
- Oculta `#navBoardControls` e `#navCalendarControls`
- Exibe `#navActivitiesControls` (busca + filtros + importar + nova atividade)
- Título do app: "Atividades"

### Layout da View

```
┌─────────────────────────────────────────────────────┐
│  [🔍 Buscar...]  [Filtros ▾]  [Importar]  [+ Nova]  │
├─────────────────────────────────────────────────────┤
│  ⚠️  3 atividades aguardando detalhamento            │  ← banner (só se houver rascunhos)
├─────────────────────────────────────────────────────┤
│  Explorar a cidade                                  │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ Card         │  │ Card         │                 │
│  └──────────────┘  └──────────────┘                 │
│  Viagem de final de semana                          │
│  ┌──────────────┐                                   │
│  │ Card         │                                   │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

Grid de 2–3 colunas responsivo, agrupado por categoria.

### Card de Atividade (sumário na lista)

- Nome (destaque)
- Categoria (chip)
- Vibes (chips, máx 3 + "+N")
- Status (chip colorido)
- Variação ativa hoje (chip destacado, se houver)
- Badge "Realizada N×" (se houver realizações)
- Custo padrão em baixa temporada ("R$ 350–550 / pessoa")
- Modalidades de duração (chips compactos)

### Modal de Detalhes / Edição

Ao clicar num card: abre modal fullscreen com tabs ou scroll por seções — Visão geral / Logística / Condições / Variações / Planejamento / Histórico. Botão "Editar" no cabeçalho abre o formulário em etapas. Botão "Cancelar planejamento" no rodapé (visível quando `planejada`).

### Modal de Criação / Edição (formulário em etapas)

Stepper de 5 etapas. Cada etapa tem "Próximo" e "Salvar rascunho". O estado em progresso é gravado diretamente na atividade em `activities[]`.

### Modal de Importação de JSON

Textarea para colar JSON → validação em duas camadas → preview → confirmar ou editar.

### Modal de Registro de Realização

Campos: data (≤ hoje), gasto total, perfil vivido, variação vivida, com quem foi, avaliação (estrelas + nota).

### Dialog de Promoção a Planejada

Ao clicar "Mover para Planejada":
- Campo data de início (date picker, obrigatório, mín: amanhã)
- Dropdown de board de destino (lista todos os boards existentes, obrigatório)
- Botão "Confirmar" (desabilitado enquanto campos não preenchidos)
- Preview das datas calculadas para cada tarefa do checklist, no formato:

  ```
  [nome da tarefa]  →  14/07 (ter)
  [tarefa no passado → fallback]  →  Hoje
  [tarefa sem antecedência definida]  →  Sem data
  ```

  Formato da data: `DD/MM (ddd)` onde `ddd` é a abreviação do dia da semana em minúsculas (seg, ter, qua, qui, sex, sáb, dom). Se a data calculada for igual à data de hoje (por aplicação do fallback ou por `antecedenciaMiniDias: 0`), exibir "Hoje" em vez da data.

---

## Modelo Tecnico de Dados

### Alterações no banco de dados (Supabase)

#### Tabela `tasks` — alterações

```sql
-- board_id passa a ser nullable (tarefas de checklist existem antes de serem promovidas)
ALTER TABLE tasks
  ALTER COLUMN board_id DROP NOT NULL;

-- Novos campos para suporte a checklist de atividades
ALTER TABLE tasks
  ADD COLUMN activity_id              TEXT REFERENCES activities(id) ON DELETE CASCADE,
  ADD COLUMN antecedencia_minima_dias INTEGER DEFAULT NULL,
  ADD COLUMN antecedencia_max_dias    INTEGER DEFAULT NULL,
  ADD COLUMN antecedencia_rec_dias    INTEGER DEFAULT NULL;

-- Índice para busca de tarefas por atividade
CREATE INDEX IF NOT EXISTS tasks_activity_id_idx ON tasks(activity_id);
```

**Regra:** uma task sempre tem ao menos um de `board_id` ou `activity_id` preenchido. Tasks com `board_id = null` são tarefas de checklist não promovidas. Tasks com `activity_id` e `board_id` são tarefas promovidas (aparecem no board E no checklist da atividade).

#### Tabela `activities` — nova tabela

```sql
CREATE TABLE IF NOT EXISTS activities (
  id                          TEXT PRIMARY KEY,
  name                        TEXT NOT NULL,
  categoria                   TEXT NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'rascunho',
  -- Identidade
  descricao                   TEXT,
  foto_capa                   TEXT,             -- base64 data URL (ex: "data:image/jpeg;base64,...")
  vibes                       JSONB NOT NULL DEFAULT '[]',
  -- Logística
  modalidades_duracao         JSONB NOT NULL DEFAULT '[]',
  meios_transporte            JSONB NOT NULL DEFAULT '[]',
  nivel_planejamento          TEXT,
  antecedencia_minima_dias    INTEGER,          -- referência geral da atividade
  decisao_ultima_hora         BOOLEAN DEFAULT FALSE,
  localidade                  TEXT,             -- texto curto para geocodificação (ex: "Cantareira", "Ubatuba")
  distancia_sp                TEXT,
  -- Condições ideais
  condicao_climatica_ideal    JSONB NOT NULL DEFAULT '[]',
  temperatura_minima_celsius  INTEGER,
  epoca_ideal                 JSONB NOT NULL DEFAULT '[]',
  perfil_grupo                JSONB NOT NULL DEFAULT '[]',
  tamanho_grupo               TEXT,
  condicionamento_fisico      TEXT,
  evitar_alta_temporada       BOOLEAN DEFAULT FALSE,
  repetivel                   BOOLEAN DEFAULT TRUE,
  pet_friendly                BOOLEAN,
  -- Custo
  perfis_custo                JSONB NOT NULL DEFAULT '{}',
  -- Variações sazonais
  variacoes                   JSONB NOT NULL DEFAULT '[]',
  -- Planejamento
  notas                       TEXT,
  links                       JSONB NOT NULL DEFAULT '[]',  -- [{ url, titulo }]
  data_inicio                 DATE,             -- preenchida ao mover para planejada
  board_destino_id            TEXT REFERENCES boards(id) ON DELETE SET NULL,
  -- Realizações
  realizacoes                 JSONB NOT NULL DEFAULT '[]',
  -- Metadados
  created_at                  BIGINT,
  updated_at                  BIGINT
);

CREATE INDEX IF NOT EXISTS activities_status_idx     ON activities(status);
CREATE INDEX IF NOT EXISTS activities_categoria_idx  ON activities(categoria);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities(created_at);
```

**Nota sobre `foto_capa`:** armazenada como base64 data URL diretamente no campo TEXT. Para um app pessoal com poucas atividades, isso é aceitável. A imagem deve ser redimensionada no frontend antes de salvar (máx. 800×600, qualidade JPEG 80%) para manter o campo abaixo de ~200 KB.

**Nota sobre `links`:** cada item do array tem a estrutura `{ url: string, titulo: string }`. O `titulo` é opcional — se vazio, exibe a URL encurtada.

**Nota sobre `variacoes`:** o `checklist` foi removido da tabela `activities`. As tarefas do checklist agora vivem na tabela `tasks` com `activity_id` preenchido.

### Estrutura dos campos JSONB

**`perfis_custo`:**
```json
{
  "economico": { "baixa_temporada": [150, 280], "alta_temporada": [350, 500] },
  "padrao":    { "baixa_temporada": [350, 550], "alta_temporada": null },
  "conforto":  null
}
```

**`variacoes`** (array):
```json
[
  {
    "id": "abc123",
    "nome": "Alta temporada",
    "epocas_cobertas": ["Out–Dez", "Jan–Mar"],
    "inclui_feriados_prolongados": true,
    "vibes": ["Agito social"],
    "condicao_climatica_ideal": ["Ensolarado"],
    "temperatura_minima_celsius": 26,
    "antecedencia_minima_dias": 21,
    "decisao_ultima_hora": false,
    "perfis_custo": { "padrao": { "alta_temporada": [700, 1200] } },
    "notas": "Reservar com 3 semanas de antecedência."
  }
]
```

**`realizacoes`** (array):
```json
[
  {
    "id": "uid789",
    "data": "2026-03-15",
    "gasto_total": 850,
    "perfil_vivido": "padrao",
    "variacao_vivida_id": "abc123",
    "com_quem": "Sandy",
    "avaliacao": 5,
    "nota": "Fora de época, incrível."
  }
]
```

### Mapeamento app ↔ banco

**`appTaskToDb(t, boardId, activityId = null)`** — versão estendida:
```js
function appTaskToDb(t, boardId, activityId = null) {
  return {
    id:                      t.id,
    board_id:                boardId ?? t.boardId ?? null,
    activity_id:             activityId ?? t.activityId ?? null,
    name:                    t.name,
    task_date:               t.date        || null,
    delivery_date:           t.deliveryDate || null,
    link:                    t.link        || '',
    duration:                t.duration    ?? 0,
    priority:                t.priority    ?? null,
    urgent:                  t.urgent      ?? false,
    urgent_rank:             t.urgentRank  ?? 0,
    delegated:               t.delegated   ?? false,
    delegated_to:            t.delegatedTo   || '',
    delegated_date:          t.delegatedDate || null,
    completed:               t.completed   ?? false,
    created_at:              t.createdAt   ?? null,
    completed_at:            t.completedAt ?? null,
    field_values:            t.fieldValues ?? {},
    team:                    t.team        ?? [],
    series_id:               t.seriesId       ?? null,
    recurrence_rule:         t.recurrenceRule ?? null,
    is_exception:            t.isException    ?? false,
    antecedencia_minima_dias: t.antecedenciaMiniDias ?? null,
    antecedencia_max_dias:    t.antecedenciaMaxDias  ?? null,
    antecedencia_rec_dias:    t.antecedenciaRecDias  ?? null,
  };
}
```

**`dbTaskToApp(t)`** — versão estendida:
```js
function dbTaskToApp(t) {
  return {
    // ... todos os campos existentes ...
    boardId:              t.board_id    ?? null,
    activityId:           t.activity_id ?? null,
    antecedenciaMiniDias: t.antecedencia_minima_dias ?? null,
    antecedenciaMaxDias:  t.antecedencia_max_dias    ?? null,
    antecedenciaRecDias:  t.antecedencia_rec_dias    ?? null,
    // campos existentes:
    id:            t.id,
    name:          t.name,
    date:          t.task_date      || '',
    deliveryDate:  t.delivery_date  || '',
    link:          t.link           || '',
    duration:      t.duration       ?? 0,
    priority:      t.priority       ?? null,
    urgent:        t.urgent         ?? false,
    urgentRank:    t.urgent_rank    ?? 0,
    delegated:     t.delegated      ?? false,
    delegatedTo:   t.delegated_to   || '',
    delegatedDate: t.delegated_date || '',
    completed:     t.completed      ?? false,
    createdAt:     t.created_at     ?? null,
    completedAt:   t.completed_at   ?? null,
    fieldValues:   t.field_values   ?? {},
    team:          t.team           ?? [],
    seriesId:      t.series_id      ?? null,
    recurrenceRule: t.recurrence_rule ?? null,
    isException:   t.is_exception   ?? false,
  };
}
```

**`appActivityToDb(a)`:**
```js
function appActivityToDb(a) {
  return {
    id:                         a.id,
    name:                       a.name,
    categoria:                  a.categoria,
    status:                     a.status,
    descricao:                  a.descricao               ?? null,
    foto_capa:                  a.fotoCapa                ?? null,
    vibes:                      a.vibes                   ?? [],
    modalidades_duracao:        a.modalidadesDuracao      ?? [],
    meios_transporte:           a.meiosTransporte         ?? [],
    nivel_planejamento:         a.nivelPlanejamento       ?? null,
    antecedencia_minima_dias:   a.antecedenciaMiniDias    ?? null,
    decisao_ultima_hora:        a.decisaoUltimaHora       ?? false,
    localidade:                 a.localidade              ?? null,
    distancia_sp:               a.distanciaSP             ?? null,
    condicao_climatica_ideal:   a.condicaoClimaticaIdeal  ?? [],
    temperatura_minima_celsius: a.temperaturaMiniCelsius  ?? null,
    epoca_ideal:                a.epocaIdeal              ?? [],
    perfil_grupo:               a.perfilGrupo             ?? [],
    tamanho_grupo:              a.tamanhoGrupo            ?? null,
    condicionamento_fisico:     a.condicionamentoFisico   ?? null,
    evitar_alta_temporada:      a.evitarAltaTemporada     ?? false,
    repetivel:                  a.repetivel               ?? true,
    pet_friendly:               a.petFriendly             ?? null,
    perfis_custo:               a.perfisCusto             ?? {},
    variacoes:                  a.variacoes               ?? [],
    notas:                      a.notas                   ?? null,
    links:                      a.links                   ?? [],
    data_inicio:                a.dataInicio              ?? null,
    board_destino_id:           a.boardDestinoId          ?? null,
    realizacoes:                a.realizacoes             ?? [],
    created_at:                 a.createdAt               ?? null,
    updated_at:                 a.updatedAt               ?? null,
  };
}
```

**`dbActivityToApp(a)`:**
```js
function dbActivityToApp(a) {
  return {
    id:                       a.id,
    name:                     a.name,
    categoria:                a.categoria,
    status:                   a.status,
    descricao:                a.descricao               ?? null,
    fotoCapa:                 a.foto_capa               ?? null,
    vibes:                    a.vibes                   ?? [],
    modalidadesDuracao:       a.modalidades_duracao     ?? [],
    meiosTransporte:          a.meios_transporte        ?? [],
    nivelPlanejamento:        a.nivel_planejamento      ?? null,
    antecedenciaMiniDias:     a.antecedencia_minima_dias ?? null,
    decisaoUltimaHora:        a.decisao_ultima_hora     ?? false,
    localidade:               a.localidade              ?? null,
    distanciaSP:              a.distancia_sp            ?? null,
    condicaoClimaticaIdeal:   a.condicao_climatica_ideal ?? [],
    temperaturaMiniCelsius:   a.temperatura_minima_celsius ?? null,
    epocaIdeal:               a.epoca_ideal             ?? [],
    perfilGrupo:              a.perfil_grupo            ?? [],
    tamanhoGrupo:             a.tamanho_grupo           ?? null,
    condicionamentoFisico:    a.condicionamento_fisico  ?? null,
    evitarAltaTemporada:      a.evitar_alta_temporada   ?? false,
    repetivel:                a.repetivel               ?? true,
    petFriendly:              a.pet_friendly            ?? null,
    perfisCusto:              a.perfis_custo            ?? {},
    variacoes:                a.variacoes               ?? [],
    notas:                    a.notas                   ?? null,
    links:                    a.links                   ?? [],
    dataInicio:               a.data_inicio             ?? null,
    boardDestinoId:           a.board_destino_id        ?? null,
    realizacoes:              a.realizacoes             ?? [],
    checklistTasks:           [],  // populado separadamente a partir da tabela tasks
    createdAt:                a.created_at              ?? null,
    updatedAt:                a.updated_at              ?? null,
  };
}
```

### Extensão de `loadState()` em server.js

```js
async function loadState() {
  const [
    { data: boards,     error: e1 },
    { data: tasks,      error: e2 },
    { data: events,     error: e3 },
    { data: people,     error: e4 },
    { data: state,      error: e5 },
    { data: activities, error: e6 },
  ] = await Promise.all([
    supabase.from('boards').select('*'),
    supabase.from('tasks').select('*'),
    supabase.from('calendar_events').select('*'),
    supabase.from('people').select('*'),
    supabase.from('app_state').select('*'),
    supabase.from('activities').select('*'),
  ]);

  // Separar tasks por board e por atividade
  // Tarefas promovidas (com activity_id E board_id) vão APENAS para tasksByActivity —
  // o board as lê via getTasksForDateAndBoard(), evitando duplicação na renderização
  const tasksByBoard = {};
  const tasksByActivity = {};
  for (const t of tasks || []) {
    const mapped = dbTaskToApp(t);
    if (t.board_id && !t.activity_id) {
      // Tarefa de board puro (não pertence a nenhuma atividade)
      if (!tasksByBoard[t.board_id]) tasksByBoard[t.board_id] = [];
      tasksByBoard[t.board_id].push(mapped);
    }
    if (t.activity_id) {
      // Tarefa de checklist (promovida ou não) — fonte de verdade em activity.checklistTasks
      if (!tasksByActivity[t.activity_id]) tasksByActivity[t.activity_id] = [];
      tasksByActivity[t.activity_id].push(mapped);
    }
  }

  const mappedActivities = (activities || []).map(a => {
    const app = dbActivityToApp(a);
    app.checklistTasks = tasksByActivity[a.id] || [];
    return app;
  });

  return {
    boards: (boards || []).map(b => ({
      id: b.id, name: b.name, color: b.color, fields: b.fields,
      tasks: tasksByBoard[b.id] || [],
    })),
    // ... demais campos existentes ...
    activities: mappedActivities,
  };
}
```

**Nota:** tasks com `activity_id` E `board_id` (tarefas promovidas) vão apenas para `tasksByActivity`. O board as renderiza via `getTasksForDateAndBoard()` que lê diretamente de `activity.checklistTasks` — sem duplicação no array `board.tasks`.

### Extensão de `saveState()` em server.js

```js
async function saveState(state) {
  const { boards = [], activities = [], calendarEvents = [], people = [],
          activeBoardId, pomodoroSettings, pomodoro, exportViews = {} } = state;

  // ... upsert boards, calendarEvents, people, app_state (sem alterações) ...

  // Tasks de board puro (sem activity_id) — tarefas promovidas NÃO estão em board.tasks,
  // ficam em activity.checklistTasks e são salvas pelo bloco abaixo
  const boardTasks = boards.flatMap(b =>
    (b.tasks || [])
      .filter(t => !t.activityId)
      .map(t => appTaskToDb(t, b.id))
  );

  // Todas as tasks de checklist (promovidas ou não) — fonte de verdade única em activity.checklistTasks
  // Tarefas promovidas têm boardId preenchido; não-promovidas têm boardId null
  const allChecklistTasks = activities.flatMap(a =>
    (a.checklistTasks || []).map(t => appTaskToDb(t, t.boardId || null, a.id))
  );

  const allTasks = [...boardTasks, ...allChecklistTasks];

  if (allTasks.length > 0) {
    const { error } = await supabase.from('tasks').upsert(allTasks, { onConflict: 'id' });
    if (error) throw error;
  }

  // Deletar tasks que não existem mais (com guarda para não fazer wipe acidental)
  const taskIds = allTasks.map(t => t.id);
  if ((boards.length > 0 || activities.length > 0) && taskIds.length > 0) {
    const { error } = await supabase.from('tasks').delete()
      .not('id', 'in', `(${taskIds.join(',')})`);
    if (error) throw error;
  }

  // Upsert activities
  if (activities.length > 0) {
    const { error } = await supabase.from('activities').upsert(
      activities.map(appActivityToDb), { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const activityIds = activities.map(a => a.id);
  if (activityIds.length > 0) {
    const { error } = await supabase.from('activities').delete()
      .not('id', 'in', `(${activityIds.join(',')})`);
    if (error) throw error;
  }
}
```

### Variáveis globais no frontend (app.js)

```js
let activities = [];  // análogo a boards[], calendarEvents[], people[]
```

`load()` passa a popular `activities = data.activities || []`.

`save()` passa a incluir `activities` no payload:
```js
body: JSON.stringify({
  boards, activeBoardId, pomodoroSettings, pomodoro,
  calendarEvents, people, exportViews,
  activities,  // ← novo
})
```

---

## Arquitetura de Sincronização (Checklist ↔ Board)

### Fonte de verdade

Cada tarefa do checklist existe **uma única vez** em memória, em `activities[i].checklistTasks`. O board não duplica essas tarefas — ele as lê a partir do array de atividades quando necessário.

### Renderização do board

A função `render()` (ou equivalente) passa a incluir as tarefas promovidas do checklist na coluna correta:

```js
function getTasksForDateAndBoard(boardId, dateKey) {
  const board = boards.find(b => b.id === boardId);
  const ownTasks = (board.tasks || []).filter(t => t.date === dateKey);

  // Tarefas promovidas de atividades para este board e data
  const promotedTasks = activities
    .flatMap(a => (a.checklistTasks || []))
    .filter(t => t.boardId === boardId && t.date === dateKey);

  return [...ownTasks, ...promotedTasks];
}
```

### Edição de tarefas no board

O modal de edição de tarefa existente precisa de um `findTaskAnywhere(id)` para localizar a tarefa independente de onde ela está:

```js
function findTaskAnywhere(id) {
  // Tarefas de board
  for (const b of boards) {
    const t = b.tasks.find(t => t.id === id);
    if (t) return { task: t, source: 'board', board: b, activity: null };
  }
  // Tarefas de checklist (promovidas ou não)
  for (const a of activities) {
    const t = (a.checklistTasks || []).find(t => t.id === id);
    if (t) return { task: t, source: 'checklist', board: null, activity: a };
  }
  return null;
}
```

Qualquer operação de edição (abrir modal, drag-and-drop, marcar concluída, deletar) deve usar `findTaskAnywhere` em vez de `findTask`. A atualização sempre ocorre sobre o objeto retornado — que é o mesmo objeto em memória referenciado tanto pelo board quanto pelo card da atividade. Ambos re-renderizam após `save()`.

### Promoção ao board

```js
function promoteChecklistToBoard(activity, boardId, dataInicio) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inicio = new Date(dataInicio + 'T00:00:00');

  activity.checklistTasks.forEach(task => {
    let taskDate = null;
    if (task.antecedenciaMiniDias != null) {
      const d = new Date(inicio);
      d.setDate(d.getDate() - task.antecedenciaMiniDias);
      taskDate = d < today ? toKey(today) : toKey(d);
    }
    task.boardId = boardId;
    task.date = taskDate;
    task.deliveryDate = taskDate;
  });

  activity.status = 'planejada';
  activity.dataInicio = dataInicio;
  activity.boardDestinoId = boardId;
  activity.updatedAt = Date.now();
  save();
  render();
  renderActivities(); // re-renderiza a view de atividades se estiver aberta
}
```

### Cancelamento do plano

```js
function cancelActivityPlan(activity) {
  activity.checklistTasks.forEach(task => {
    task.boardId = null;
    task.date = null;
    task.deliveryDate = null;
    task.completed = false;  // progresso zerado intencionalmente: ao replanejar, o checklist recomeça do zero
  });
  activity.status = 'quero_fazer';
  activity.dataInicio = null;
  activity.boardDestinoId = null;
  activity.updatedAt = Date.now();
  save();
  render();           // atualiza o board (remove as tarefas que saíram)
  renderActivities(); // atualiza o card da atividade (status, botões, checklist)
}
```

### Função renderActivities()

Função responsável por reconstruir o DOM da view `#activitiesView`. Análoga a `render()` para o board e `renderCalendar()` para o calendário.

```js
function renderActivities() {
  if (currentView !== 'activities') return;
  const container = document.getElementById('activitiesView');
  if (!container) return;

  // 1. Aplica filtros ativos e busca fuzzy ao array `activities`
  // 2. Agrupa atividades filtradas por categoria
  // 3. Renderiza banner de rascunhos (se houver)
  // 4. Renderiza cards por grupo no container
}
```

**Quando chamar `renderActivities()`:**
- `setView('activities')` — logo após exibir a view
- `promoteChecklistToBoard()` — status e datas das tarefas mudaram
- `cancelActivityPlan()` — status voltou para `quero_fazer`, tarefas saíram do board
- Ao salvar nova atividade ou editar atividade existente
- Ao registrar ou editar uma realização
- Ao deletar uma atividade

**Relação com `render()`:** `render()` continua sendo chamado normalmente para atualizar o board. Quando checklist tasks mudam (promoção ou cancelamento), ambas são chamadas em sequência — `render()` atualiza o board, `renderActivities()` atualiza o card da atividade.

### Tasks sem data no board

Tarefas do checklist com `antecedenciaMiniDias: null` são promovidas com `date: null`. No board, essas tarefas aparecem em uma **coluna "Sem data"** que fica no início do board (antes das colunas de dias) e só é exibida quando há ao menos uma task com `date: null`. Essa coluna existe tanto para tasks de checklist quanto para qualquer task regular sem data.

---

## Decisoes Definidas

| Decisão | Resolução |
|---|---|
| Tipo de item do checklist | Tarefa real (mesmo objeto do board) acrescida de `antecedenciaMiniDias`, `antecedenciaMaxDias`, `antecedenciaRecDias` |
| Sincronização checklist ↔ board | Fonte de verdade única em `activity.checklistTasks`. Board lê tarefas promovidas a partir do array de atividades. Não há duplicação |
| Promoção ao board | Obrigatório informar `data_inicio` (data da atividade) e selecionar o board de destino. Datas calculadas por `data_inicio − antecedenciaMiniDias`. Fallback: hoje |
| Checklist vazio | Botão "Mover para Planejada" fica desabilitado |
| Cancelamento do plano | Botão "Cancelar planejamento" no rodapé do card quando status = planejada. Confirmação explícita. Tarefas voltam para `boardId: null`, `date: null`, `completed: false` |
| Board de destino | Usuário seleciona o board via dropdown no dialog de promoção. Obrigatório |
| Tasks sem data no board | Coluna "Sem data" no início do board, exibida apenas quando há tasks com `date: null` |
| Categoria personalizada | Texto livre com autocomplete das categorias já existentes. Agrupamento por string exata |
| Épocas cobertas | Trimestres indivisíveis: "Jan–Mar", "Abr–Jun", "Jul–Set", "Out–Dez". Conflito verificado ao nível de trimestre |
| Campos substituíveis na variação | Lista fechada de 10 campos substituíveis; 9 campos invariáveis. Ver tabela na seção Variações Sazonais |
| Foto de capa | Campo `foto_capa TEXT` na tabela `activities`. Armazenada como base64 data URL. Redimensionar no frontend (máx. 800×600, JPEG 80%) |
| Links | Estrutura `{ url: string, titulo: string }`. `titulo` opcional — fallback: URL encurtada |
| Fuse.js | CDN via `<script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js">` no `index.html` antes do `app.js`. Threshold inicial: 0.4 |
| feriadosapi.com | Uma chamada por sessão ao abrir a view. Resultado em `let holidaysCache = null`. Fallback silencioso se falhar |
| Nominatim | Chamada ao avançar etapa 1→2 usando o campo `localidade`. Fallback: seletor manual se vazio ou sem resultado |
| Schema do objeto variação | JSONB com campos da lista fechada. Somente campos que diferem da base são incluídos |
| `board_id` em tasks | Passa a ser nullable (migration necessária) |
| Storage de checklist | Tabela `tasks` com `activity_id` + novos campos de antecedência. Não em JSONB da atividade |
| Foto de capa no JSON de importação | Não importável via JSON (campo visual, não estrutural) |
| Integração com exportar-atividades | Feature separada, sem conflito de nomenclatura |

---

## Tasks de Implementação

> Convenção de commit: `feat: lista-de-atividades - <task-id> <descrição>` (ver `git log` para exemplos do padrão usado nas features anteriores). Cada task é atômica e deve resultar em um único commit.

### Banco de dados

- [x] `db-01` Escrever as alterações de schema em `schema.sql`: `ALTER TABLE tasks` (dropar `NOT NULL` de `board_id`, adicionar `activity_id`, `antecedencia_minima_dias`, `antecedencia_max_dias`, `antecedencia_rec_dias`), `CREATE TABLE IF NOT EXISTS activities` completa (todos os campos do modelo técnico) e os índices (`tasks_activity_id_idx`, `activities_status_idx`, `activities_categoria_idx`, `activities_created_at_idx`).
       Contexto: seguir exatamente o SQL da seção "Alterações no banco de dados" da spec (`docs/features/lista-de-atividades/spec.md`). Adicionar um comentário no topo do bloco novo em `schema.sql` avisando: `-- ATENÇÃO: rodar este bloco manualmente no SQL Editor do Supabase — não é aplicado automaticamente por este repositório (sem acesso de rede ao painel a partir do ambiente de desenvolvimento).`
       **Esta task NÃO aplica a migration no Supabase.** Isso é uma ação manual do usuário fora do repositório. O commit apenas documenta o SQL. Todas as tasks de `be-*` e `fe-*` que dependem de dados reais só funcionarão em runtime depois que o usuário rodar esse SQL manualmente — isso deve ficar registrado como bloqueio conhecido, não impede a implementação do código.
       Depende de: nenhuma

### Backend (server.js)

- [x] `be-01` Estender `appTaskToDb(t, boardId)` para `appTaskToDb(t, boardId, activityId = null)` e `dbTaskToApp(t)`, incluindo `activity_id`/`activityId` e os três campos de antecedência (`antecedencia_minima_dias`/`antecedenciaMiniDias`, `antecedencia_max_dias`/`antecedenciaMaxDias`, `antecedencia_rec_dias`/`antecedenciaRecDias`), conforme os blocos de código já definidos na seção "Mapeamento app ↔ banco" da spec.
       Contexto: funções atuais em `server.js` linhas 152-201. Manter todos os campos existentes intactos — só estender assinatura e objeto de retorno.
       Depende de: `db-01`
- [x] `be-02` Criar as funções `appActivityToDb(a)` e `dbActivityToApp(a)` em `server.js`, copiando fielmente o mapeamento definido na spec (inclui `checklistTasks: []` como placeholder em `dbActivityToApp`, populado depois em `loadState()`).
       Contexto: adicionar próximo às demais funções de mapeamento (`appEventToDb`/`dbEventToApp`, linhas 203-223).
       Depende de: `be-01`
- [x] `be-03` Estender `loadState()` para buscar a tabela `activities` em paralelo com as demais, separar tasks em `tasksByBoard` (apenas tasks com `board_id` e sem `activity_id`) e `tasksByActivity` (todas as tasks com `activity_id`, promovidas ou não), popular `checklistTasks` de cada atividade mapeada e incluir `activities` no objeto retornado.
       Contexto: `loadState()` atual em `server.js` linhas 34-78. Seguir exatamente a lógica da seção "Extensão de `loadState()`" da spec — tasks com `activity_id` E `board_id` (promovidas) vão **apenas** para `tasksByActivity`, nunca duplicadas em `board.tasks`.
       Depende de: `be-02`
- [x] `be-04` Estender `saveState(state)` para receber `activities` no payload, separar `boardTasks` (tasks de board sem `activityId`) de `allChecklistTasks` (tasks de `activity.checklistTasks`, promovidas ou não), fazer upsert conjunto em `tasks`, fazer o delete-guard de tasks órfãs considerando `boards.length > 0 || activities.length > 0`, e fazer upsert/delete de `activities`.
       Contexto: `saveState()` atual em `server.js` linhas 81-149, especialmente os passos 3-4 (upsert/delete de tasks, linhas 101-113). Seguir exatamente a lógica da seção "Extensão de `saveState()`" da spec, com cuidado para não recriar o bug histórico de wipe acidental (ver commit `f5e418d` no `git log` — o guard de delete precisa considerar corretamente quando `activities` está vazio mas `boards` não, e vice-versa).
       Depende de: `be-03`

### Frontend — Estrutura (index.html)

- [x] `fe-01` Adicionar `<script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js"></script>` em `public/index.html` imediatamente antes de `<script src="app.js"></script>` (linha 442).
       Depende de: nenhuma
- [x] `fe-02` Adicionar o botão `#sidebarActivitiesItem` na sidebar, logo abaixo de `#sidebarCalendarItem` (após linha 32 de `public/index.html`), com a marcação exata definida na spec (ícone `.icon-activities-wrap`/`.icon-activities` + label "Atividades").
       Contexto: mesmo padrão estrutural de `#sidebarCalendarItem` (linhas 29-32).
       Depende de: nenhuma
- [x] `fe-03` Adicionar `<main id="activitiesView" class="activities-view hidden"></main>` em `public/index.html`, logo após o fechamento de `#calendarView` (após linha 90).
       Contexto: mesmo padrão de `#board` (linha 80) e `#calendarView` (linha 82) — container vazio, preenchido via JS por `renderActivities()`.
       Depende de: `fe-02`
- [x] `fe-04` Adicionar `<div class="nav-activities hidden" id="navActivitiesControls">` dentro de `.nav` (após `#navCalendarControls`, linha 74), com: input de busca, botão "Filtros" (dropdown/painel a ser preenchido depois), botão "Importar", botão "+ Nova atividade".
       Contexto: mesmo padrão de `#navBoardControls`/`#navCalendarControls` (linhas 63-74).
       Depende de: `fe-03`
- [x] `fe-05` Adicionar o modal shell de criação/edição em etapas: `#activityFormOverlay` (`.modal-overlay`) contendo `.modal` com stepper de 5 etapas (indicador de progresso + containers vazios `#activityFormStep1` a `#activityFormStep5`), botões "Voltar", "Próximo"/"Salvar", "Salvar rascunho" e botão de fechar.
       Contexto: mesmo padrão dos modais existentes (`#modalOverlay`, `#eventModalOverlay`, linhas 116-337 de `index.html`). Apenas a estrutura — conteúdo de cada etapa vem em tasks posteriores de lógica.
       Depende de: `fe-04`
- [x] `fe-06` Adicionar o modal shell de detalhes/edição: `#activityDetailOverlay` com seções vazias (Visão geral / Logística / Condições / Variações / Planejamento / Histórico), botão "Editar" no cabeçalho e área de rodapé para o botão condicional "Cancelar planejamento".
       Depende de: `fe-05`
- [x] `fe-07` Adicionar o modal shell de importação de JSON: `#activityImportOverlay` com textarea para colar o JSON, área de preview vazia e botões "Validar", "Confirmar", "Cancelar".
       Depende de: `fe-06`
- [x] `fe-08` Adicionar o modal shell de registro de realização: `#activityRealizationOverlay` com campos de data, gasto total, perfil vivido, variação vivida, com quem foi, avaliação (estrelas + nota).
       Depende de: `fe-07`
- [x] `fe-09` Adicionar o dialog shell de promoção a Planejada: `#activityPromoteOverlay` com campo de data de início, dropdown de board de destino, área de preview das datas calculadas por tarefa, e botão "Confirmar" (desabilitado por padrão via classe/atributo).
       Depende de: `fe-08`

### Frontend — Lógica (app.js)

- [x] `fe-10` Adicionar as constantes de domínio da feature (arrays/objetos JS): `ACTIVITY_CATEGORIES`, `VIBES`, `MODALIDADES_DURACAO`, `PERFIS_CUSTO_TIPOS`, `MEIOS_TRANSPORTE`, `EPOCAS` (trimestres), `CONDICOES_CLIMATICAS`, `PERFIS_GRUPO`, `TAMANHOS_GRUPO`, `NIVEIS_CONDICIONAMENTO`, `NIVEIS_PLANEJAMENTO` — com os valores exatos das tabelas da spec — e as variáveis globais de estado: `let activities = []`, `editingActivityId`, `activityFormStep`, `activityFormMode`, `holidaysCache = null`, `activityFilters`, `activitySearchQuery`, `activityDetailId`.
       Contexto: adicionar próximo às demais variáveis globais em `public/app.js` (linhas 9-54, ex.: `let boards = []`, `let calendarEvents = []`).
       Depende de: `fe-09`
- [x] `fe-11` Estender `load()` para popular `activities = data.activities || []` e `save()` para incluir `activities` no payload do `POST /api/tasks`.
       Contexto: `load()` em `public/app.js` linhas 166-220 (adicionar próximo à linha 201, junto com `people`/`exportViews`); `save()` linhas 222-227 (incluir `activities` no `JSON.stringify`).
       Depende de: `fe-10`, `be-04`
- [x] `fe-12` Implementar `findTaskAnywhere(id)`, que busca a tarefa em `boards[].tasks` (retornando `{ task, source: 'board', board, activity: null }`) e em `activities[].checklistTasks` (retornando `{ task, source: 'checklist', board: null, activity }`), retornando `null` se não encontrada.
       Contexto: adicionar próximo a `findTask()` (linha 1106 de `public/app.js`). Copiar a implementação já definida na seção "Edição de tarefas no board" da spec.
       Depende de: `fe-11`
- [x] `fe-13` Refatorar o fluxo de edição de tarefa (`openModal`, `patch`, `closeModal`, `currentEditingTask`, e os demais call-sites de `findTask(editingId, board)` — ex.: linhas ~1294, 1393, 1477, 1551, 1591, 1599, 1691, 1702, 1731, 1783, 2492, 2548, 2628 de `public/app.js`, buscar todos via `grep -n "findTask("`) para usar `findTaskAnywhere(editingId)` quando a tarefa não estiver necessariamente em `currentBoard()`. Quando a tarefa vier de um checklist não promovido (`source === 'checklist'` e `task.boardId == null`), ocultar/desabilitar os campos que dependem de contexto de board (data, prioridade, urgência) no modal — o usuário ainda pode editar nome, duração, link, delegação, campos customizados e marcar como concluída.
       Contexto: esta é a mudança mais delicada da feature — o modal de edição de tarefa é hoje fortemente acoplado a `editingTaskBoardId`/`boards.find(...)`. Testar cuidadosamente que a edição de tarefas normais do board continua funcionando exatamente como antes (regressão zero) antes de mexer no comportamento de tarefas de checklist.
       Depende de: `fe-12`
- [x] `fe-14` Implementar `getTasksForDateAndBoard(boardId, dateKey)` e integrar na renderização do board: `tasksFor(key, board)` (linha 613) passa a incluir também as tarefas promovidas de `activities[].checklistTasks` cujo `boardId === board.id && date === key`, além das tarefas próprias do board.
       Contexto: `tasksFor()` é usado por `columnHtml()` (linha 1020) para montar cada coluna. Seguir a lógica de `getTasksForDateAndBoard()` definida na seção "Renderização do board" da spec, mas integrar dentro de `tasksFor()` para não precisar alterar todos os call-sites.
       Depende de: `fe-13`
- [x] `fe-15` Refatorar `cardHtml(t, isMit)` para `cardHtml(t, isMit, board = currentBoard())`, trocando os usos internos de `currentBoard().fields` por `board.fields`, para permitir reaproveitar a mesma função ao renderizar o checklist de uma atividade (que pode não ter board de destino ainda).
       Contexto: `cardHtml()` em `public/app.js` linhas 1071-1092. Atualizar os call-sites existentes (`columnHtml`, linha 1049) para passar `currentBoard()` explicitamente.
       Depende de: `fe-14`
- [x] `fe-16` Adicionar a coluna "Sem data" no início do board (`render()`/`columnHtml`), exibida apenas quando existir ao menos uma tarefa do board (própria ou promovida) com `date === null`. Deve funcionar tanto para tarefas normais do board quanto para tarefas de checklist promovidas sem `antecedenciaMiniDias`.
       Contexto: `render()` em `public/app.js` linhas 999-1016 monta `board.innerHTML` a partir de `days.map(columnHtml)`; adicionar a coluna extra antes desse map, com sua própria busca de tarefas via `getTasksForDateAndBoard`/`tasksFor` filtrando `date == null`.
       Depende de: `fe-15`
- [x] `fe-17` Adicionar o listener de clique em `#sidebarActivitiesItem` chamando `setView('activities')`, e estender `setView(view)` para tratar o caso `'activities'`: ocultar `#board`/`#calendarView`, exibir `#activitiesView`, ocultar `#navBoardControls`/`#navCalendarControls`/`#exportReportBtn`, exibir `#navActivitiesControls`, atualizar `#appTitle` para "Atividades", marcar `#sidebarActivitiesItem` com classe `active`, e chamar `renderActivities()` ao entrar na view.
       Contexto: `setView()` atual em `public/app.js` linhas 523-540; listener de `sidebarCalendarItemEl` na linha 544 é o padrão a seguir.
       Depende de: `fe-16`, `fe-11`
- [x] `fe-18` Implementar o esqueleto de `renderActivities()`: agrupa `activities` por `categoria`, ordena cada grupo por `createdAt` DESC, renderiza um estado vazio quando não há atividades, e monta o container `#activitiesView` com um cabeçalho de grupo por categoria. Ainda sem busca/filtros (virão em tasks posteriores) e sem o conteúdo detalhado do card (task seguinte).
       Contexto: função análoga a `render()` (board) e a `renderCalendar` (calendário). Seguir a assinatura definida na seção "Função renderActivities()" da spec.
       Depende de: `fe-17`
- [x] `fe-19` Implementar `activityCardHtml(activity)` com o resumo definido na spec: nome, chip de categoria, chips de vibes (máx. 3 + "+N"), chip de status colorido, chip de variação ativa (se houver — depende de `fe-30`, pode ser deixado com placeholder até lá), badge "Realizada N×" (se `realizacoes.length > 0`), custo padrão em baixa temporada formatado ("R$ 350–550 / pessoa"), chips compactos de modalidades de duração. Integrar em `renderActivities()`.
       Depende de: `fe-18`
- [x] `fe-20` Implementar o banner "X atividades aguardando detalhamento" no topo de `#activitiesView`, visível apenas quando houver ao menos uma atividade com `status === 'rascunho'`, com contagem dinâmica.
       Depende de: `fe-19`
- [x] `fe-21` Implementar o fluxo de criação rápida (Fluxo 1): clique em "+ Nova atividade" abre um modal simples (nome + seleção de categoria, com autocomplete de categorias personalizadas já existentes derivado do array `activities` em memória), cria a atividade com `status: 'rascunho'` e demais campos default, chama `save()` e `renderActivities()`.
       Contexto: normalização do texto de categoria personalizada (trim, sem forçar caixa) antes de salvar, conforme "Categoria Personalizada" na spec.
       Depende de: `fe-20`
- [x] `fe-22` Implementar abertura/fechamento do modal de detalhes (`#activityDetailOverlay`) ao clicar num card: popula as seções (Visão geral / Logística / Condições / Variações / Planejamento / Histórico) com os dados da atividade, botão "Editar" abre o formulário em etapas (`fe-23`) pré-preenchido.
       Depende de: `fe-21`
- [x] `fe-23` Implementar a navegação do stepper de 5 etapas (`#activityFormOverlay`): troca de etapa visível, botões "Próximo"/"Voltar", validação mínima de campos obrigatórios por etapa antes de avançar, botão "Salvar rascunho" disponível em qualquer etapa. Ainda sem os campos de cada etapa (tasks seguintes populam o conteúdo).
       Depende de: `fe-22`
- [x] `fe-24` Implementar a Etapa 1 — Identidade: campos nome, categoria (+autocomplete de personalizada), vibes (multisseleção), descrição, localidade, e upload de foto de capa (preview local antes do resize/salvamento, que é feito em `fe-25`).
       Depende de: `fe-23`
- [x] `fe-25` Implementar `resizeCoverPhotoToBase64(file)`: redimensiona a imagem (máx. 800×600, qualidade JPEG 80%) via `<canvas>` e retorna a data URL base64, usado no upload da Etapa 1 antes de gravar em `activity.fotoCapa`.
       Depende de: `fe-24`
- [ ] `fe-26` Implementar a Etapa 2 — Logística: modalidades de duração, meios de transporte, os três perfis de custo (Econômico/Padrão/Conforto × baixa/alta temporada, ranges numéricos), nível de planejamento, antecedência mínima geral, decisão de última hora, e o seletor manual de distância de SP (usado como fallback — a chamada real ao Nominatim é `fe-27`).
       Depende de: `fe-25`
- [ ] `fe-27` Implementar a integração com Nominatim: `geocodeLocalidade(query)` chamada ao avançar da Etapa 1 para a Etapa 2 usando o campo `localidade`; se retornar resultado, preenche `distanciaSP` automaticamente; se `localidade` estiver vazio ou a busca não retornar nada, mantém/exibe o seletor manual da Etapa 2 sem bloquear o avanço.
       Depende de: `fe-26`
- [ ] `fe-28` Implementar a Etapa 3 — Condições ideais: condição climática ideal, temperatura mínima ideal, época ideal do ano, perfil de grupo, tamanho do grupo, condicionamento físico exigido, evitar alta temporada, repetível, pet-friendly.
       Depende de: `fe-27`
- [ ] `fe-29` Implementar a Etapa 4 — Variações sazonais: CRUD de variação (nome, épocas cobertas + flag "feriados prolongados", subconjunto de campos substituíveis da lista fechada), com bloqueio de salvamento quando duas variações cobrem a mesma época trimestral (mensagem: "Este período já está coberto pela variação '[nome]'. Ajuste as épocas antes de salvar.").
       Contexto: lista fechada de 10 campos substituíveis / 9 invariáveis, conforme tabela da seção "Variações Sazonais" da spec.
       Depende de: `fe-28`
- [ ] `fe-30` Implementar `getActiveVariation(activity, referenceDate = new Date())`: mapeia mês → época trimestral, retorna a variação cujas `epocasCobertas` incluem a época atual; se `inclui_feriados_prolongados: true`, considera a variação ativa a partir da véspera do feriado prolongado (usa `holidaysCache`, populado em `fe-41` — até lá, tratar como indisponível sem quebrar); se nenhuma variação cobrir a época, retorna `null` (fallback para os atributos da base). Integrar no chip "variação ativa" do card (`fe-19`) e no modal de detalhes.
       Depende de: `fe-29`
- [ ] `fe-31` Implementar a Etapa 5 — Planejamento: UI de checklist (adicionar tarefa com nome + antecedências mínima/máxima/recomendada, editar, reordenar por drag-and-drop, remover), reaproveitando o mesmo modal/card de tarefa do board via `findTaskAnywhere()`/`cardHtml()` (de `fe-13`/`fe-15`) para a interação de cada item; indicador de progresso ("N de M itens concluídos"); campo de notas; editor de lista de links (`{ url, titulo }`).
       Depende de: `fe-30`
- [ ] `fe-32` Implementar o auto-save do formulário: debounce de 250ms reaproveitando `save()`, disparado a cada mudança de campo/etapa, gravando diretamente no objeto da atividade dentro de `activities[]` (mesmo padrão de `patch()` usado nas tarefas). Progresso nunca perdido mesmo se o usuário fechar o modal no meio do preenchimento.
       Depende de: `fe-31`
- [ ] `fe-33` Implementar a máquina de estados: função que calcula/valida a transição automática `rascunho → quero_fazer` (ao menos 1 modalidade de duração + range completo de ao menos 1 perfil de custo em baixa temporada preenchidos), chamada após auto-save de cada etapa; impedir volta manual de `quero_fazer` para `rascunho`.
       Contexto: condição definida na seção "Máquina de Estados e Ciclo de Realizações" e em "Condição para sair do Rascunho" da spec.
       Depende de: `fe-32`
- [ ] `fe-34` Implementar o dialog de promoção a Planejada (`#activityPromoteOverlay`) e `promoteChecklistToBoard(activity, boardId, dataInicio)`: botão "Mover para Planejada" desabilitado com tooltip quando `checklistTasks` vazio; dialog exige data de início (mín. amanhã) e board de destino; preview das datas calculadas por tarefa no formato `DD/MM (ddd)` / "Hoje" / "Sem data"; ao confirmar, aplica a função de promoção definida na spec (fallback para hoje se data calculada < hoje), muda status para `planejada`, chama `save()`, `render()` e `renderActivities()`.
       Depende de: `fe-33`
- [ ] `fe-35` Implementar `cancelActivityPlan(activity)` e o botão "Cancelar planejamento" no rodapé do modal de detalhes (visível apenas quando `status === 'planejada'`): dialog de confirmação com o texto exato da spec; ao confirmar, zera `boardId`/`date`/`completed` de cada tarefa do checklist, volta status para `quero_fazer`, chama `save()`, `render()` e `renderActivities()`.
       Depende de: `fe-34`
- [ ] `fe-36` Implementar o registro de realização (`#activityRealizationOverlay`): botão "Marcar como realizada" no card/modal de detalhes abre o formulário (data ≤ hoje, gasto total, perfil vivido, variação vivida — populada a partir de `activity.variacoes` —, com quem foi, avaliação 1-5 + nota); ao confirmar, adiciona o registro em `activity.realizacoes`, volta `status` para `quero_fazer`, exibe badge "Realizada N×"; registros existentes devem ser editáveis individualmente a partir do histórico no modal de detalhes.
       Depende de: `fe-35`
- [ ] `fe-37` Implementar a exclusão de atividade: bloqueada com mensagem quando `realizacoes.length >= 1` ("Esta atividade já foi realizada e não pode ser excluída."); quando `realizacoes.length === 0`, exibe confirmação detalhando o que será perdido e, se confirmado, remove a atividade de `activities` (e suas `checklistTasks` associadas), chama `save()` e `renderActivities()`.
       Depende de: `fe-36`
- [ ] `fe-38` Implementar o modal de importação de JSON (`#activityImportOverlay`): textarea para colar o JSON gerado pelo prompt, validação em duas camadas (1: campos obrigatórios presentes; 2: tipos corretos por campo, incluindo estrutura de `perfis_custo`, `variacoes` e `checklist_sugerido`), exibição de erros por campo quando inválido, preview editável quando válido, e confirmação que cria a atividade com o status correto (`quero_fazer` se as condições mínimas estiverem presentes no JSON, senão `rascunho`) e converte `checklist_sugerido` em tarefas reais de `checklistTasks`. Foto de capa não é importável via JSON.
       Depende de: `fe-37`
- [ ] `fe-39` Implementar a busca fuzzy: instanciar `Fuse` sobre `activities` (campos `name`, `categoria`, `vibes`, `notas`, threshold 0.4), atualizado a cada mudança em `activities`; ligar o input de busca de `#navActivitiesControls` para filtrar a cada tecla e refletir em `renderActivities()`.
       Depende de: `fe-38`, `fe-01`
- [ ] `fe-40` Implementar os filtros combináveis do painel de "Filtros" em `#navActivitiesControls`: categoria, vibe, status, modalidade de duração, perfil de custo (faixa de valores) e época do ano — todos combináveis entre si e com a busca fuzzy, refletidos em `renderActivities()`.
       Depende de: `fe-39`
- [ ] `fe-41` Implementar a integração com feriadosapi.com: `fetchHolidays()` chamada uma vez por sessão ao entrar em `setView('activities')` (`fe-17`), resultado cacheado em `holidaysCache`; exibir seção "Próximos feriados compatíveis" no modal de detalhes filtrando por modalidades de duração da atividade; fallback silencioso ("Não foi possível carregar feriados") sem bloquear o fluxo se a API falhar; conectar o cache em `getActiveVariation()` (`fe-30`) para a regra de "feriados prolongados".
       Depende de: `fe-40`

### Frontend — Estilos (styles.css)

- [ ] `fe-42` Estilizar `#sidebarActivitiesItem` (mesmo padrão visual de `.sidebar-calendar-item`) e `#navActivitiesControls` (busca, botão de filtros, botão importar, botão nova atividade), usando os tokens de cor existentes (`--color-*`).
       Depende de: `fe-41`
- [ ] `fe-43` Estilizar a view de atividades: grid responsivo de 2-3 colunas agrupado por categoria, cabeçalhos de grupo, cards de atividade (`activityCardHtml`), estado vazio e o banner de rascunhos.
       Depende de: `fe-42`
- [ ] `fe-44` Estilizar o modal de criação/edição em etapas: indicador de progresso do stepper, transições entre etapas, layout de cada etapa (grids de campos, ranges de custo, editor de variações, checklist reaproveitando `.card`/`.column` do board).
       Depende de: `fe-43`
- [ ] `fe-45` Estilizar os chips/badges novos: categoria, vibes, modalidades de duração, status (rascunho/quero_fazer/planejada com cores distintas), variação ativa, badge "Realizada N×", reaproveitando a classe `.tag` existente como base.
       Depende de: `fe-44`
- [ ] `fe-46` Estilizar os modais de importação de JSON, registro de realização e o dialog de promoção a Planejada (incluindo o preview de datas calculadas e o estado desabilitado do botão "Confirmar"), seguindo o padrão visual de `.modal`/`.confirm-modal` já existente.
       Depende de: `fe-45`

### Validação final

- [ ] `fe-47` Subir o servidor local (`node server.js`) e validar manualmente: navegação para "Atividades" pela sidebar, criação de uma atividade rápida (rascunho), abertura do modal de detalhes, e confirmação de que o estado persiste após reload (`GET /api/tasks`/`POST /api/tasks`). Registrar no PR/nota da spec se a migration do `db-01` já foi aplicada manualmente no Supabase pelo usuário — sem ela, `be-03`/`be-04` falharão em runtime (tabela `activities` inexistente).
       Depende de: todas as tasks anteriores

---

## Critérios de Conclusão

1. Ao clicar em "Atividades" na sidebar, a view de atividades é exibida com os controles de navbar corretos (busca, filtros, importar, nova atividade), e o board/calendário ficam ocultos.
2. O usuário consegue criar uma atividade rápida (nome + categoria) que aparece imediatamente como rascunho agrupado por categoria na grade, e o banner "X atividades aguardando detalhamento" reflete a contagem correta.
3. Ao preencher o formulário detalhado com ao menos uma modalidade de duração e um perfil de custo completo em baixa temporada, o status da atividade muda automaticamente de rascunho para "quero fazer".
4. Ao mover uma atividade para Planejada informando data de início e board de destino, as tarefas do checklist passam a aparecer no board na data calculada (data de início − antecedência mínima, com fallback para hoje quando cai no passado) e continuam visíveis no checklist da atividade — editar uma tarefa em qualquer um dos dois lugares reflete imediatamente no outro.
5. Ao cancelar o planejamento de uma atividade planejada, as tarefas somem do board e voltam ao checklist com data e board removidos e progresso zerado, e o status volta para "quero fazer".
6. Uma atividade com ao menos uma realização registrada não pode ser excluída (ação bloqueada com mensagem explicativa), enquanto uma atividade sem realizações pode ser excluída após confirmação detalhando o que será perdido.
7. A busca fuzzy e os filtros combináveis (categoria, vibe, status, modalidade de duração, perfil de custo, época do ano) reduzem corretamente, em tempo real, a lista de cards exibidos na view de Atividades.

---

## Registro de desenvolvimento

> Preenchido durante a implementação autônoma das tasks. Registra desvios do plano original, decisões tomadas diante de ambiguidade, e simplificações/cortes de escopo.

### Desvios de processo

- **fe-21 (criação rápida):** os shells de `fe-05` a `fe-09` cobriam formulário em etapas, detalhes, importação, realização e promoção — nenhum deles correspondia à Fluxo 1 (captura rápida: só nome + categoria). Foi adicionado um shell extra `#activityQuickCreateOverlay` em `index.html` diretamente na task `fe-21`, já que a spec descreve esse fluxo como um modal simples e independente do stepper de 5 etapas.
- **fe-20 (banner de rascunhos):** já havia sido implementado por completo dentro do commit de `fe-18` (`activityDraftBannerHtml()`, chamado em `renderActivities()`), pois a task-planner descreveu o esqueleto de `renderActivities()` incluindo explicitamente "renderiza banner de rascunhos" nas instruções de `fe-18`. Sem alteração de código adicional nesta task — apenas marcada como concluída, já validada.
- **fe-13 (refatoração `findTaskAnywhere` no modal de edição):** introduzido `resolveEditingContext()` (usa `findTaskAnywhere(editingId)` e retorna um board sintético `{ id: null, tasks: [] }` quando a tarefa é de checklist não promovido) e `removeTaskAnywhere(id)`/`deleteTaskAnywhere(id)` para exclusão. Todos os call-sites internos do modal (`currentEditingTask`, `openModal`, `resolveEditScope`, `directPatch`, `patch`, os handlers de exclusão em série e o botão "Excluir tarefa") passaram a resolver a tarefa por esse caminho único. Para tarefas de board, `findTaskAnywhere` devolve exatamente o mesmo objeto `board` real que `findTask(id, board)` devolvia antes — o comportamento de tarefas normais do board é preservado byte a byte (mesmas referências de objeto, mesmas condições). Decisões conservadoras tomadas para tarefas de checklist ainda não promovidas (sem `boardId`): (1) os campos Data de entrega, Prioridade e Urgente ficam ocultos no modal (`#dateField`, `#priorityField`, `#urgentField`) — não fazem sentido sem uma coluna de board; (2) a recorrência (`#recToggleRow`/`#recurrencePanel`) fica oculta e desabilitada — a feature de recorrência nunca foi projetada para tarefas de checklist e habilitá-la exigiria uma decisão de produto fora do escopo desta spec; (3) campos customizados (`f-fields`) só aparecem quando a tarefa já pertence a um board real (checklist já promovido, via `task.boardId`) — antes da promoção não há board de referência, então a lista de campos fica vazia (não é uma perda funcional, é reflexo de não existir board ainda). O usuário continua podendo editar nome, link, duração, delegação e marcar como concluída em qualquer caso.
- **fe-05 a fe-09 (shells de modais):** implementados e commitados juntos num único commit, em vez de 5 commits separados. Justificativa: são 5 blocos de HTML independentes entre si (apenas esqueleto — nenhuma lógica compartilhada nesta etapa), e a convenção "1 commit por task" faria sentido para tasks com lógica própria; para scaffolding puro de marcação, um commit agrupado reduz ruído no histórico sem perda de rastreabilidade (o diff mostra claramente os 5 blocos). Todas as 5 tasks foram de fato implementadas por completo — nenhum corte de escopo aqui.
