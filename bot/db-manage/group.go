package dbmanage

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"
)

func GroupRegister(db *sql.DB, gid string, gname string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := db.ExecContext(ctx, `
		INSERT INTO line_groups (line_group_id, line_group_name, joined_status, latest_update)
		VALUES ($1, $2, 'joined', now())
		ON CONFLICT (line_group_id)
		DO UPDATE SET
			joined_status = 'joined',
			line_group_name = $2
	`, gid, gname)
	log.Printf("GroupRegister error: %s\n", err)
	return err
}

func GroupLeave(db *sql.DB, gid string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := db.ExecContext(ctx, `
		UPDATE line_groups
		SET joined_status = 'leave'
		WHERE line_group_id = $1
		`, gid)
	log.Printf("GroupLeave error: %s\n", err)
	return err
}

func AddMemberToGroup(db *sql.DB, uid string, gid string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := db.ExecContext(ctx, `
        INSERT INTO line_group_members (line_group_id, line_user_id, joined_status, latest_update)
        SELECT g.id, u.id, 'joined', now()
        FROM line_groups g
        JOIN line_users u ON u.line_user_id = $1
        WHERE g.line_group_id = $2
        ON CONFLICT (line_group_id, line_user_id) DO NOTHING
    `, uid, gid)
	n, _ := res.RowsAffected()
	if n == 0 {
		err = fmt.Errorf("no row inserted: user or group not found (uid=%s gid=%s) or already member", uid, gid)
	}
	return err
}

func GetGroupMember(db *sql.DB, gid string) (*sql.Rows, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	is_error := false

	rows, err := db.QueryContext(ctx, `
		SELECT u.display_name, u.picture_url
		FROM line_groups g
		JOIN line_group_members gm ON gm.line_group_id = g.id
		JOIN line_users u ON u.id = gm.line_user_id
		WHERE g.line_group_id = $1
		ORDER BY u.id ASC
	`, gid)

	if err != nil {
		log.Printf("GetGroupMemberRows query error: %v\n", err)
		is_error = true
		rows = nil
	}
	return rows, is_error
}

func GetJoinedGroups(db *sql.DB) ([]GroupInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, `
		SELECT line_group_id
		FROM line_groups
		WHERE joined_status = 'joined'
		ORDER BY line_group_name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []GroupInfo
	for rows.Next() {
		var group GroupInfo
		if err := rows.Scan(&group.LineGroupID); err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return groups, nil
}
