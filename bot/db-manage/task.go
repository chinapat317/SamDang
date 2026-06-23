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
