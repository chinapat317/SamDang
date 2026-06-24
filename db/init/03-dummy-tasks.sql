\connect "AppDB"

INSERT INTO task (title, description, status, assigned_to, assigned_by, due_date)
SELECT title, description, status, NULL, NULL, due_date
FROM (
  VALUES
    (
      'Dummy task 1',
      'Prepare project kickoff notes',
      'in progress',
      now() + interval '2 days'
    ),
    (
      'Dummy task 2',
      'Review group member list',
      'in progress',
      now() + interval '4 days'
    ),
    (
      'Dummy task 3',
      'Draft notification message',
      'in progress',
      now() + interval '6 days'
    ),
    (
      'Dummy task 4',
      'Create initial database schema',
      'done',
      now() - interval '1 day'
    ),
    (
      'Dummy task 5',
      'Confirm LINE bot webhook',
      'done',
      now() - interval '2 days'
    )
) AS dummy_tasks(title, description, status, due_date)
WHERE NOT EXISTS (
  SELECT 1
  FROM task
  WHERE task.title = dummy_tasks.title
);
