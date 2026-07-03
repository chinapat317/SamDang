package dbmanage

import (
	"context"
	"database/sql"
	"time"
)

func GetGroupTasks(db *sql.DB, gid string) ([]GroupTask, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, `
		SELECT
			t.title,
			t.status,
			u.display_name,
			t.due_date
		FROM task t
		LEFT JOIN line_users u ON u.id = t.assigned_to
		LEFT JOIN line_group_members gm ON gm.line_user_id = t.assigned_to
		LEFT JOIN line_groups g ON g.id = gm.line_group_id
		WHERE g.line_group_id = $1 AND t.status = 'in progress' AND g.id = t.assigned_group 
		ORDER BY
			t.due_date ASC,
			t.id ASC
	`, gid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []GroupTask
	for rows.Next() {
		var task GroupTask
		if err := rows.Scan(
			&task.Title,
			&task.Status,
			&task.AssignedToName,
			&task.DueDate,
		); err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return tasks, nil
}

func UpdateLateTask(db *sql.DB) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := db.ExecContext(ctx, `
		UPDATE task
		SET is_late = 'true'
		WHERE due_date < CURRENT_TIMESTAMP AND status = 'in progress'
	`)
	if err != nil {
		return err
	}
	return nil
}
