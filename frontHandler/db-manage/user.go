package dbmanage

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

func CheckUserRole(uid string, db *sql.DB, role []string) (bool, error) {
	var user_role string
	var is_match = false
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err := db.QueryRowContext(ctx, `
		SELECT role
		FROM line_users
		WHERE line_user_id = $1
	`, uid).Scan(&user_role)
	if err != nil {
		return false, err
	}
	for _, each_role := range role {
		if user_role == each_role {
			is_match = true
			break
		}
	}
	return is_match, nil
}

func GetAllUsers(db *sql.DB) ([]UserItem, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, `
		SELECT
			line_user_id,
			COALESCE(display_name, ''),
			COALESCE(picture_url, ''),
			role
		FROM line_users
		ORDER BY role ASC, display_name ASC, id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query all users error: %w", err)
	}
	defer rows.Close()

	users := make([]UserItem, 0)
	for rows.Next() {
		var user UserItem
		if err := rows.Scan(
			&user.UID,
			&user.DisplayName,
			&user.PictureURL,
			&user.Role,
		); err != nil {
			return nil, fmt.Errorf("scan all users error: %w", err)
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read all users rows error: %w", err)
	}
	return users, nil
}

func UpdateUsersRole(db *sql.DB, users []UserRoleUpdateItem) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, user := range users {
		if user.UID == "" {
			return fmt.Errorf("uid is required")
		}
		if user.Role != "member" && user.Role != "manager" {
			return fmt.Errorf("invalid role for user %s: %s", user.UID, user.Role)
		}

		result, err := tx.ExecContext(ctx, `
			UPDATE line_users
			SET role = $2,
				updated_at = now()
			WHERE line_user_id = $1
				AND role <> 'admin'
		`, user.UID, user.Role)
		if err != nil {
			return fmt.Errorf("update role for user %s error: %w", user.UID, err)
		}

		affected, err := result.RowsAffected()
		if err != nil {
			return fmt.Errorf("read affected rows for user %s error: %w", user.UID, err)
		}
		if affected != 1 {
			return fmt.Errorf("user not found or cannot edit admin role: %s", user.UID)
		}
	}

	return tx.Commit()
}
