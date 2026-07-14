-- ============================================================
-- Schema para o app Gestão de Tarefas
-- Rodar no SQL Editor do Supabase
-- ============================================================

-- Boards (quadros kanban)
CREATE TABLE IF NOT EXISTS boards (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT,
  fields      JSONB NOT NULL DEFAULT '[]'  -- lista de campos customizados com seus valores/cores
);

-- Tasks (tarefas, vinculadas a um board)
CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  board_id        TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  task_date       DATE,
  delivery_date   DATE,
  link            TEXT,
  duration        INTEGER DEFAULT 0,
  priority        TEXT,
  urgent          BOOLEAN DEFAULT FALSE,
  urgent_rank     INTEGER DEFAULT 0,
  delegated       BOOLEAN DEFAULT FALSE,
  delegated_to    TEXT,
  delegated_date  DATE,
  completed       BOOLEAN DEFAULT FALSE,
  created_at      BIGINT,   -- timestamp em ms (mantendo o formato do app)
  completed_at    BIGINT,
  field_values    JSONB NOT NULL DEFAULT '{}',  -- { fieldId: valueId }
  team            JSONB NOT NULL DEFAULT '[]',  -- lista de person ids
  series_id       TEXT DEFAULT NULL,       -- id da série recorrente (gerado com uid(), mesmo formato dos ids de task); NULL para tarefas não recorrentes
  recurrence_rule JSONB DEFAULT NULL,      -- regra da série (replicada em todas as instâncias não-exceção); ver docs/features/tarefas-recorrentes/spec.md
  is_exception    BOOLEAN DEFAULT FALSE    -- true quando a instância foi editada/movida individualmente e saiu da série
);

-- Eventos de calendário
CREATE TABLE IF NOT EXISTS calendar_events (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  start_date  DATE,
  end_date    DATE,
  board_ids   JSONB NOT NULL DEFAULT '[]',  -- lista de board ids vinculados
  is_holiday  BOOLEAN DEFAULT FALSE
);

-- Pessoas / time
CREATE TABLE IF NOT EXISTS people (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  area      TEXT,
  principal BOOLEAN DEFAULT FALSE
);

-- Estado global do app (activeBoardId, pomodoroSettings, pomodoro, exportViews)
CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS tasks_board_id_idx ON tasks(board_id);
CREATE INDEX IF NOT EXISTS tasks_task_date_idx ON tasks(task_date);
CREATE INDEX IF NOT EXISTS calendar_events_start_date_idx ON calendar_events(start_date);

-- ============================================================
-- Feature: Gerenciar Lista de Atividades
-- Ver docs/features/lista-de-atividades/spec.md
--
-- ATENÇÃO: rodar este bloco manualmente no SQL Editor do Supabase —
-- não é aplicado automaticamente por este repositório (sem acesso de
-- rede ao painel a partir do ambiente de desenvolvimento).
-- ============================================================

-- board_id passa a ser nullable (tarefas de checklist existem antes de serem promovidas)
ALTER TABLE tasks
  ALTER COLUMN board_id DROP NOT NULL;

-- Tabela de atividades
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

-- Novos campos em tasks para suporte a checklist de atividades
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS activity_id              TEXT REFERENCES activities(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS antecedencia_minima_dias INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS antecedencia_max_dias    INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS antecedencia_rec_dias    INTEGER DEFAULT NULL;

-- Índices
CREATE INDEX IF NOT EXISTS tasks_activity_id_idx     ON tasks(activity_id);
CREATE INDEX IF NOT EXISTS activities_status_idx     ON activities(status);
CREATE INDEX IF NOT EXISTS activities_categoria_idx  ON activities(categoria);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities(created_at);
