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
	log.Printf("GetGroupName called with gid: %s", gid)
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

func GetGroupMember(ctx context.Context, db *sql.DB, gid string) (*sql.Rows, bool) {
	isError := false

	rows, err := db.QueryContext(ctx, `
		SELECT u.display_name, u.picture_url, u.line_user_hmac
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

func CheckUserInGroup(db *sql.DB, uid string, gid string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var exists bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM line_groups g
			JOIN line_group_members gm ON gm.line_group_id = g.id
			JOIN line_users u ON u.id = gm.line_user_id
			WHERE g.line_group_id = $1
				AND u.line_user_id = $2
				AND gm.joined_status = 'joined'
		)
	`, gid, uid).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func GetMyGroups(db *sql.DB, uid string) ([]MyGroupItem, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, `
		SELECT g.line_group_id, g.line_group_name
		FROM line_groups g
		JOIN line_group_members gm ON gm.line_group_id = g.id
		JOIN line_users u ON u.id = gm.line_user_id
		WHERE u.line_user_id = $1
			AND gm.joined_status = 'joined'
			AND g.joined_status = 'joined'
		ORDER BY g.latest_update DESC, g.line_group_name ASC
	`, uid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groups := make([]MyGroupItem, 0)
	for rows.Next() {
		var group MyGroupItem
		if err := rows.Scan(&group.GroupID, &group.GroupName); err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return groups, nil
}

func MyGroupTasks(db *sql.DB, uid string, gid string) ([]TaskCanEditItem, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, `
		WITH requester AS (
			SELECT role
			FROM line_users
			WHERE line_user_id = $1
		)
		SELECT
			t.id,
			COALESCE(assigned_to.display_name, ''),
			COALESCE(assigned_by.display_name, ''),
			COALESCE(checked_by.display_name, ''),
			t.status,
			t.title,
			COALESCE(t.description, ''),
			t.due_date,
			t.check_by IS NOT NULL
		FROM task t
		JOIN line_groups g ON g.id = t.assigned_group
		LEFT JOIN line_users assigned_to ON assigned_to.id = t.assigned_to
		LEFT JOIN line_users assigned_by ON assigned_by.id = t.assigned_by
		LEFT JOIN line_users checked_by ON checked_by.id = t.check_by
		CROSS JOIN requester
		WHERE g.line_group_id = $2
			AND (
				requester.role IN ('admin', 'manager')
				OR assigned_to.line_user_id = $1
				OR assigned_by.line_user_id = $1
			)
		ORDER BY t.due_date ASC, t.id ASC
	`, uid, gid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := make([]TaskCanEditItem, 0)
	for rows.Next() {
		var task TaskCanEditItem
		var dueDate time.Time
		if err := rows.Scan(
			&task.ID,
			&task.AssignedTo,
			&task.AssignedBy,
			&task.CheckedBy,
			&task.Status,
			&task.Title,
			&task.Description,
			&dueDate,
			&task.Checked,
		); err != nil {
			return nil, err
		}
		task.DueDate = dueDate.Format("2006-01-02")
		tasks = append(tasks, task)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return tasks, nil
}

func UpdateMyGroupTasks(db *sql.DB, uid string, gid string, tasks []TaskEditItem) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, task := range tasks {
		if task.ID == 0 {
			return fmt.Errorf("task id is required")
		}
		if task.Status != "done" && task.Status != "in progress" {
			return fmt.Errorf("invalid status for task %d", task.ID)
		}
		dueDate, err := time.Parse("2006-01-02", task.DueDate)
		if err != nil {
			return fmt.Errorf("invalid due_date for task %d: %w", task.ID, err)
		}
		deadlineAt := time.Date(dueDate.Year(), dueDate.Month(), dueDate.Day(), 23, 59, 59, 0, time.Local)

		result, err := tx.ExecContext(ctx, `
			WITH requester AS (
				SELECT id, role
				FROM line_users
				WHERE line_user_id = $1
			)
			UPDATE task t
			SET
				description = $4,
				status = $5,
				due_date = $6,
				updated_at = now()
			FROM line_groups g, requester
			WHERE t.id = $3
				AND t.assigned_group = g.id
				AND g.line_group_id = $2
				AND (
					requester.role IN ('admin', 'manager')
					OR t.assigned_to = requester.id
					OR t.assigned_by = requester.id
				)
		`, uid, gid, task.ID, task.Description, task.Status, deadlineAt)
		if err != nil {
			return fmt.Errorf("update task %d error: %w", task.ID, err)
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return fmt.Errorf("read affected rows for task %d error: %w", task.ID, err)
		}
		if affected != 1 {
			return fmt.Errorf("task %d not found or not allowed", task.ID)
		}
	}

	return tx.Commit()
}

func CheckMyGroupTasks(db *sql.DB, uid string, tasks []TaskCheckItem) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, task := range tasks {
		if task.ID == 0 {
			return fmt.Errorf("task id is required")
		}
		if task.Status != "done" && task.Status != "in progress" {
			return fmt.Errorf("invalid status for task %d", task.ID)
		}

		result, err := tx.ExecContext(ctx, `
			WITH requester AS (
				SELECT id
				FROM line_users
				WHERE line_user_id = $1
			)
			UPDATE task t
			SET
				status = $3,
				check_by = CASE WHEN $4 THEN requester.id ELSE t.check_by END,
				updated_at = now()
			FROM requester
			WHERE t.id = $2
		`, uid, task.ID, task.Status, task.Checked)
		if err != nil {
			return fmt.Errorf("check task %d error: %w", task.ID, err)
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return fmt.Errorf("read affected rows for task %d error: %w", task.ID, err)
		}
		if affected != 1 {
			return fmt.Errorf("task %d not found or not allowed", task.ID)
		}
	}

	return tx.Commit()
}

func AssignTask(db *sql.DB, assignedByLineUserID string, task TaskAssignItem) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if task.GroupID == "" {
		return fmt.Errorf("group_id is required")
	}
	if task.AssignedTo == "" {
		return fmt.Errorf("assigned_to user hash is required")
	}
	if assignedByLineUserID == "" {
		return fmt.Errorf("assigned_by line user id is required")
	}
	if task.Title == "" {
		return fmt.Errorf("task title is required")
	}

	var (
		groupID      int64
		assignedToID int64
		assignedByID int64
	)

	err := db.QueryRowContext(ctx, `
		SELECT id
		FROM line_groups
		WHERE line_group_id = $1
		LIMIT 1
	`, task.GroupID).Scan(&groupID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("group not found: %s", task.GroupID)
		}
		return fmt.Errorf("query group error: %w", err)
	}

	err = db.QueryRowContext(ctx, `
		SELECT id
		FROM line_users
		WHERE line_user_hmac = $1
		LIMIT 1
	`, task.AssignedTo).Scan(&assignedToID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("assigned_to user hash not found: %s", task.AssignedTo)
		}
		return fmt.Errorf("query assigned_to error: %w", err)
	}

	err = db.QueryRowContext(ctx, `
		SELECT id
		FROM line_users
		WHERE line_user_id = $1
		LIMIT 1
	`, assignedByLineUserID).Scan(&assignedByID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("assigned_by user not found: %s", assignedByLineUserID)
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
			assigned_group,
			due_date
		)
		VALUES ($1, $2, 'in progress', $3, $4, $5, $6)
	`, task.Title, task.Description, assignedToID, assignedByID, groupID, deadlineAt)
	if err != nil {
		return fmt.Errorf("insert task error: %w", err)
	}

	return nil
}

func GetGroupDoneTasks(db *sql.DB, uid string, gid string) ([]TaskCanEditItem, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, `
		select t.id, t.title, coalesce(t.description, ''), t.status, t.due_date, coalesce(assigned_to.display_name, ''), coalesce(assigned_by.display_name, ''), coalesce(checked_by.display_name, '')
		from task t
		join line_groups g on g.id = t.assigned_group
		left join line_users assigned_to on assigned_to.id = t.assigned_to
		left join line_users assigned_by on assigned_by.id = t.assigned_by
		left join line_users checked_by on checked_by.id = t.check_by
		where g.line_group_id = $1 and t.status = 'done'
		order by t.due_date asc, t.id asc
	`, gid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := make([]TaskCanEditItem, 0)
	for rows.Next() {
		var task TaskCanEditItem
		var dueDate time.Time
		if err := rows.Scan(
			&task.ID,
			&task.Title,
			&task.Description,
			&task.Status,
			&dueDate,
			&task.AssignedTo,
			&task.AssignedBy,
			&task.CheckedBy,
		); err != nil {
			return nil, err
		}
		task.DueDate = dueDate.Format("2006-01-02")
		tasks = append(tasks, task)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return tasks, nil
}
