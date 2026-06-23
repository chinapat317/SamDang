package dbmanage

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"
)

func GetUserProf(uid string, db *sql.DB) (string, string, bool) {
	var (
		name string
		pic  string
	)
	isError := false
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := db.QueryRowContext(ctx, `
		SELECT display_name, picture_url
		FROM line_users
		WHERE line_user_id = $1
	`, uid).Scan(&name, &pic)
	if err != nil {
		log.Printf("GetUserProf error: %v\n", err)
		isError = true
	}
	return name, pic, isError
}

func GetGroupName(db *sql.DB, gid string) (string, bool) {
	var gname string
	isError := false
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err := db.QueryRowContext(ctx, `
		SELECT line_group_name
		FROM line_groups
		WHERE line_group_id = $1
	`, gid).Scan(&gname)
	if err != nil {
		log.Printf("GetGroupInfo error: %v\n", err)
		isError = true
	}
	return gname, isError
}

func GetGroupMember(db *sql.DB, gid string) (*sql.Rows, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	isError := false

	rows, err := db.QueryContext(ctx, `
		SELECT u.display_name, u.picture_url
		FROM line_groups g
		JOIN line_group_members gm ON gm.line_group_id = g.id
		JOIN line_users u ON u.id = gm.line_user_id
		WHERE g.line_group_id = $1
			AND gm.joined_status = 'joined'
		ORDER BY u.id ASC
	`, gid)
	if err != nil {
		log.Printf("GetGroupMember query error: %v\n", err)
		isError = true
		rows = nil
	}
	return rows, isError
}

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

	var (
		assignedToID int64
		assignedByID int64
	)

	err := db.QueryRowContext(ctx, `
		SELECT id
		FROM line_users
		WHERE display_name = $1
		LIMIT 1
	`, task.AssignedTo).Scan(&assignedToID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("assigned_to user not found: %s", task.AssignedTo)
		}
		return fmt.Errorf("query assigned_to error: %w", err)
	}

	err = db.QueryRowContext(ctx, `
		SELECT id
		FROM line_users
		WHERE display_name = $1
		LIMIT 1
	`, task.AssignedBy).Scan(&assignedByID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("assigned_by user not found: %s", task.AssignedBy)
		}
		return fmt.Errorf("query assigned_by error: %w", err)
	}

	dueDate, err := time.Parse("2006-01-02", task.DueDate)
	if err != nil {
		return fmt.Errorf("invalid due_date (must be YYYY-MM-DD): %w", err)
	}
	deadlineAt := time.Date(dueDate.Year(), dueDate.Month(), dueDate.Day(), 23, 59, 59, 0, time.Local)

	_, err = db.ExecContext(ctx, `
		INSERT INTO task (
			title,
			description,
			status,
			assigned_to,
			assigned_by,
			due_date
		)
		VALUES ($1, $2, $3, 'in_progress', $4, $5, $6)
	`, task.Task, task.Task, assignedToID, assignedByID, deadlineAt)
	if err != nil {
		return fmt.Errorf("insert task error: %w", err)
	}

	return nil
}
