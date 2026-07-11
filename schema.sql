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
  team            JSONB NOT NULL DEFAULT '[]'   -- lista de person ids
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
