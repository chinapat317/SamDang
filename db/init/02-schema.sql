\connect "AppDB"

CREATE TABLE IF NOT EXISTS line_users (
  id              BIGSERIAL PRIMARY KEY,
  line_user_id    TEXT NOT NULL UNIQUE,
  line_user_hmac  TEXT NOT NULL UNIQUE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  display_name    TEXT,
  picture_url     TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

Create table if not exists admin_code (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  code            TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO admin_code (name, code)
VALUES
  ('addManager', substr(md5(random()::text), 1, 7)),
  ('addAdmin', "dangtuaD")
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code;

CREATE TABLE IF NOT EXISTS line_groups (
  id              BIGSERIAL PRIMARY KEY,
  line_group_id   TEXT NOT NULL UNIQUE,
  line_group_name TEXT NOT NULL,
  joined_status   TEXT NOT NULL CHECK (joined_status IN ('joined', 'leave')),
  latest_update   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_latest_update()
RETURNS trigger AS $$
BEGIN
  NEW.latest_update = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_line_groups_latest_update
ON line_groups;

CREATE TRIGGER trg_line_groups_latest_update
BEFORE UPDATE ON line_groups
FOR EACH ROW
EXECUTE FUNCTION set_latest_update();

CREATE TABLE IF NOT EXISTS line_group_members (
  line_group_id BIGINT NOT NULL REFERENCES line_groups(id)
                ON DELETE CASCADE,
  line_user_id  BIGINT NOT NULL REFERENCES line_users(id)
                ON DELETE CASCADE,
  joined_status       TEXT NOT NULL CHECK (joined_status IN ('joined', 'leave')),
  latest_update       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (line_group_id, line_user_id)
);

CREATE TABLE IF NOT EXISTS task (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL CHECK (status IN ('in progress', 'done')),
  assigned_to     BIGINT REFERENCES line_users(id) ON DELETE SET NULL,
  assigned_by     BIGINT REFERENCES line_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date        TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
)
