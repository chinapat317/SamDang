package dbmanage

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

func AssignTask(db *sql.DB, task TaskAssignItem) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if task.GroupID == "" {
		return fmt.Errorf("group_id is required")
	}
	if task.AssignedTo == "" || task.AssignedBy == "" {
		return fmt.Errorf("assigned_to/assigned_by display_name is required")
	}
	if task.Task == "" {
		return fmt.Errorf("task description is required")
	}

	// 1) Resolve group PK id from LINE group id string
	var groupPK int64
	err := db.QueryRowContext(ctx, `
		SELECT id
		FROM line_groups
		WHERE line_group_id = $1
	`, task.GroupID).Scan(&groupPK)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("group not found: %s", task.GroupID)
		}
		return fmt.Errorf("query group error: %w", err)
	}

	// 2) Resolve user PKs from display_name (LIMIT 1)
	var assignedToPK int64
	err = db.QueryRowContext(ctx, `
		SELECT id
		FROM users
		WHERE display_name = $1
		LIMIT 1
	`, task.AssignedTo).Scan(&assignedToPK)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("assigned_to user not found: %s", task.AssignedTo)
		}
		return fmt.Errorf("query assigned_to error: %w", err)
	}
	var assignedByPK int64
	err = db.QueryRowContext(ctx, `
		SELECT id
		FROM users
		WHERE display_name = $1
		LIMIT 1
	`, task.AssignedBy).Scan(&assignedByPK)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("assigned_by user not found: %s", task.AssignedBy)
		}
		return fmt.Errorf("query assigned_by error: %w", err)
	}

	// 3) Parse assign_date (ISO) and due_date (YYYY-MM-DD)
	assignedAt, err := time.Parse(time.RFC3339, task.AssignDate)
	if err != nil {
		// sometimes frontend sends ISO with milliseconds but still RFC3339; this covers it
		return fmt.Errorf("invalid assign_date (must be RFC3339): %w", err)
	}

	// due date: set to end of that day (23:59:59) in local time
	d, err := time.Parse("2006-01-02", task.DueDate)
	if err != nil {
		return fmt.Errorf("invalid due_date (must be YYYY-MM-DD): %w", err)
	}
	deadlineAt := time.Date(d.Year(), d.Month(), d.Day(), 23, 59, 59, 0, time.Local)

	// 4) Insert task (status default 'open', created_at/updated_at default now())
	_, err = db.ExecContext(ctx, `
		INSERT INTO tasks (line_group_id, description, assigned_to, assigned_by, assigned_at, deadline_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, groupPK, task.Task, assignedToPK, assignedByPK, assignedAt, deadlineAt)
	if err != nil {
		return fmt.Errorf("insert task error: %w", err)
	}

	return nil
}

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
		WHERE g.line_group_id = $1 && t.status == 'in progress'
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
