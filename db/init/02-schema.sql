\connect "AppDB"

CREATE TABLE IF NOT EXISTS tenant (
  id            BIGSERIAL PRIMARY KEY,
  tenant_name   TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS line_users (
  id              BIGSERIAL PRIMARY KEY,
  line_user_id    TEXT NOT NULL UNIQUE,
  line_user_hmac  TEXT NOT NULL UNIQUE,
  display_name    TEXT,
  picture_url     TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_members (
  tenant_id    BIGINT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  line_user_id BIGINT NOT NULL REFERENCES line_users(id) ON DELETE CASCADE,
  tenant_role  TEXT NOT NULL CHECK (tenant_role IN ('admin', 'proj_manage')),
  PRIMARY KEY (tenant_id, line_user_id)
);

CREATE TABLE IF NOT EXISTS tenant_line_groups (
  id              BIGSERIAL PRIMARY KEY,
  line_group_id   TEXT NOT NULL UNIQUE,
  line_group_name TEXT NOT NULL,
  tenant_id       BIGINT NULL REFERENCES tenant(id)
                  ON UPDATE CASCADE
                  ON DELETE SET NULL,
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

DROP TRIGGER IF EXISTS trg_tenant_line_groups_latest_update
ON tenant_line_groups;

CREATE TRIGGER trg_tenant_line_groups_latest_update
BEFORE UPDATE ON tenant_line_groups
FOR EACH ROW
EXECUTE FUNCTION set_latest_update();

CREATE TABLE IF NOT EXISTS line_group_members (
  line_group_id BIGINT NOT NULL REFERENCES tenant_line_groups(id)
                ON DELETE CASCADE,
  line_user_id  BIGINT NOT NULL REFERENCES line_users(id)
                ON DELETE CASCADE,
  joined_status       TEXT NOT NULL CHECK (joined_status IN ('joined', 'leave')),
  latest_update       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (line_group_id, line_user_id)
);

CREATE TABLE IF NOT EXISTS task (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL CHECK (status IN ('in_progress', 'done')),
  assigned_to     BIGINT REFERENCES line_users(id) ON DELETE SET NULL,
  assigned_by     BIGINT REFERENCES line_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date        TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
)