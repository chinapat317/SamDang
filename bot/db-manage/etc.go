package dbmanage

import (
	"context"
	"database/sql"
	"time"
)

func GetAdminCode(db *sql.DB, name string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var code string
	err := db.QueryRowContext(ctx, `
		SELECT code
		FROM admin_code
		WHERE name = $1
	`, name).Scan(&code)
	if err != nil {
		return "", err
	}
	return code, nil
}
