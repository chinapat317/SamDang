package dbmanage

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"
)

func GroupJoined(db *sql.DB, gid string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := db.ExecContext(ctx, `
		INSERT INTO line_groups (line_group_id, joined_status, latest_update)
		VALUES ($1, 'joined', now())
		ON CONFLICT (line_group_id)
		DO UPDATE SET
			joined_status = 'joined'
	`, gid)
	log.Printf("GroupJoined error: %s\n", err)
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
        INSERT INTO group_members (line_group_id, line_user_id, joined_at)
        SELECT g.id, u.id, now()
        FROM line_groups g
        JOIN users u ON u.line_user_id = $1
        WHERE g.line_group_id = $2
        ON CONFLICT (line_group_id, line_user_id) DO NOTHING
    `, uid, gid)
	n, _ := res.RowsAffected()
	if n == 0 {
		err = fmt.Errorf("no row inserted: user or group not found (uid=%s gid=%s) or already member", uid, gid)
	}
	return err
}
