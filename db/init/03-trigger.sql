\connect "AppDB"

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

CREATE OR REPLACE FUNCTION set_task_is_late()
RETURNS trigger AS $$
BEGIN
  IF NEW.status <> 'done' AND NEW.due_date < now() THEN
    NEW.is_late = true;
  ELSIF NEW.status = 'done' OR NEW.due_date >= now() THEN
    NEW.is_late = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_is_late
ON task;

CREATE TRIGGER trg_task_is_late
BEFORE INSERT OR UPDATE ON task
FOR EACH ROW
EXECUTE FUNCTION set_task_is_late();

UPDATE task
SET is_late = (status <> 'done' AND due_date < now())
WHERE is_late IS DISTINCT FROM (status <> 'done' AND due_date < now());
