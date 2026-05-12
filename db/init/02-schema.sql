\connect "AppDB";

-- put your CREATE TABLE statements here
-- (users, line_groups, group_members, works)

CREATE TABLE users (
  id             BIGSERIAL PRIMARY KEY,
  line_user_id   TEXT NOT NULL UNIQUE,          -- real ID for LINE API
  line_user_hmac TEXT NOT NULL UNIQUE,          -- privacy-friendly ID (HMAC)

  display_name   TEXT,
  picture_url    TEXT,
  phone_number   TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS line_groups (
  id            BIGSERIAL PRIMARY KEY,
  line_group_id TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id   BIGINT NOT NULL REFERENCES line_groups(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','manager')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS group_one_manager
ON group_members(group_id)
WHERE role = 'manager';

CREATE TABLE IF NOT EXISTS works (
  id           BIGSERIAL PRIMARY KEY,
  group_id     BIGINT NOT NULL REFERENCES line_groups(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  assigned_to  BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by  BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at  TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','in_progress','done','cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS works_by_group    ON works(group_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS works_by_assignee ON works(assigned_to, status, deadline_at);
CREATE INDEX IF NOT EXISTS works_by_assigner ON works(assigned_by, assigned_at DESC);