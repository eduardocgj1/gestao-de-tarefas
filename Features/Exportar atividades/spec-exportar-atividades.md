# Exportar Atividades para Report Semanal

---

### Nome
Exportar atividades da semana para report semanal em PPT

---

### Objetivo da Feature
Permitir que o usuário selecione uma semana e gere automaticamente uma lista formatada das atividades — organizada em Progresso e Próximos Passos — pronta para colar no PowerPoint do report semanal.

---

### Descrição Detalhada

**Ideia da Feature**
O usuário aciona um botão no app que abre um pop-up com duas colunas (Progresso e Próximos Passos), já preenchidas com as atividades da semana selecionada. A classificação é automática: atividades finalizadas vão para Progresso, não finalizadas vão para Próximos Passos. O usuário pode filtrar por projeto, excluir itens, editar textos, salvar a visualização e copiar cada coluna separadamente para o PPT.

**Problema Identificado**
A montagem do report semanal é feita manualmente: o usuário precisa lembrar quais atividades avançaram, formatar cada bullet no padrão correto e colar no PPT. Isso consome tempo toda semana e gera inconsistências de formato entre reports.

**Solução Desenhada**
O app gera automaticamente a lista no formato correto (`Descrição (Responsável | Área – DD/MM)`), com agrupamento de pessoas da mesma organização, separando as atividades por status. O usuário ajusta o que precisar, salva a visualização da semana e copia direto para o PPT.

---

### Escopo

**Dentro do Escopo**

- Botão de acionamento da feature no app que abre o pop-up de export (posicionamento a definir)
- Seletor de semana no pop-up: padrão é sempre a semana anterior completa (seg–sex); ao abrir na segunda-feira, carrega a semana da segunda a sexta passadas
- Pop-up com duas colunas: **Progresso** (atividades finalizadas) e **Próximos Passos** (não finalizadas)
- Classificação baseada na **data do board** de cada atividade — todas as tarefas possuem data obrigatória
- Preenchimento automático com atividades da semana selecionada, em ordem cronológica (mais recentes primeiro)
- Filtro por projeto no pop-up: ao adicionar ou remover projetos, a lista é atualizada em tempo real; padrão são todos os projetos com atividades na semana selecionada
- Botão de excluir ao lado de cada item — exclui apenas da lista de export, não do board
- Edição inline do texto de cada item — atualiza apenas na lista de export, não no board
- Botão "Copiar" individual por coluna (Progresso e Próximos Passos)
- **Salvar visualização**: o usuário pode salvar o estado do pop-up (edições, exclusões, projetos filtrados) vinculado à semana selecionada; ao reabrir a mesma semana, a visualização salva é restaurada
- Texto gerado no formato: `Descrição (Responsável | Área – DD/MM)`
- Campo de **Equipe** nos cards: ao abrir um card, o usuário pode adicionar membros com nome e área/empresa
- Cadastro de pessoas em **Configurações** para seleção rápida ao preencher equipe
- Definição de **pessoa principal** em Configurações: usada como responsável padrão quando nenhuma equipe for cadastrada no card
- Texto livre no campo de equipe: ao adicionar uma pessoa por texto livre, ela é automaticamente salva em Configurações
- **Agrupamento automático**: pessoas da mesma organização/área são agrupadas no texto gerado (ex: `Kenzo, Aron e Natan | Wigoo`)

**Fora do Escopo**
- Geração automática do arquivo PPT
- Integração direta com PowerPoint ou Google Slides
- Edição de texto refletindo de volta no board
- Visualizações salvas de semanas diferentes compartilhadas entre usuários

---

### Comportamentos de Borda

- **Atividade sem equipe cadastrada**: usa automaticamente a pessoa principal definida em Configurações como responsável
- **Coluna sem atividades**: a coluna aparece vazia no pop-up, sem mensagem de erro — o usuário vê as colunas em branco
- **Múltiplos membros de equipe**: todos agrupados em um único bullet, com pessoas da mesma organização agrupadas e separadas por `|` entre organizações. Exemplo: `Kickoff e validação de cronograma (Kenzo, Aron e Natan | Wigoo, Marcus | Front, Renan e Matheus | Design, Akad | DL e Gamboa | Produtos – 22/06)`
- **Semana aberta na segunda-feira**: carrega automaticamente a semana anterior (seg–sex da semana passada)

---

### Jornada

**Cadastro de equipe no card (pré-requisito para o formato correto)**

- Ao abrir um card, o usuário vê a opção **"Adicionar equipe"** (similar à opção de delegado)
- Ao clicar, abre um campo de nome e, ao lado, um campo de área/empresa
- O usuário pode digitar livremente ou selecionar de pessoas salvas em Configurações
- Ao salvar por texto livre, a pessoa é automaticamente adicionada em Configurações
- É possível adicionar múltiplos membros por card; pessoas da mesma área são agrupadas automaticamente no texto gerado

**Geração do report**

- O usuário clica no botão de export no app
- Abre um pop-up com seletor de semana (padrão: semana anterior) e duas colunas:
  - **Progresso**: atividades finalizadas da semana selecionada
  - **Próximos Passos**: atividades não finalizadas da semana selecionada
- Atividades aparecem em **ordem cronológica**, da mais recente para a mais antiga, conforme a data do board
- O pop-up exibe um seletor de projetos: padrão são todos os projetos com atividades na semana; ao adicionar ou remover projetos, a lista é atualizada
- Ao lado de cada item há um botão **Excluir** — remove apenas da lista de export
- Cada item é editável inline — o texto alterado reflete apenas na lista de export
- O texto de cada item segue o formato: `Descrição (Responsável | Área – DD/MM)`
- No topo de cada coluna há um botão **"Copiar"** — copia todos os itens daquela coluna
- O usuário pode **salvar a visualização** da semana: ao reabrir o pop-up na mesma semana, os ajustes feitos (exclusões, edições, filtros) são restaurados
- O usuário cola o conteúdo diretamente no slide do PPT

---

### Configurações relacionadas

- Seção **Pessoas** em Configurações: lista de pessoas com nome e área/empresa
- Opção de definir a **pessoa principal** (o próprio usuário), usada como responsável padrão em cards sem equipe cadastrada
- Pessoas adicionadas por texto livre em cards são automaticamente salvas aqui
- Ao preencher equipe em um card, o usuário pode buscar por nome entre as pessoas salvas
