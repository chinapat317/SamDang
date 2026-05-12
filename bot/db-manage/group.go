package groupmanage

import (
	"context"
	"database/sql"
)

func GroupCreate(ctx context.Context, db *sql.DB, gid string) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO line_groups (line_group_id)
		VALUES ($1)
		ON CONFLICT (line_group_id) DO NOTHING
	`, gid)
	return err
}
