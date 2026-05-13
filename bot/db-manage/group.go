package dbmanage

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"
)

func GroupCreate(db *sql.DB, gid string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := db.ExecContext(ctx, `
		INSERT INTO line_groups (line_group_id)
		VALUES ($1)
		ON CONFLICT (line_group_id) DO NOTHING
	`, gid)
	log.Printf("GroupCreate error: %s\n", err)
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
