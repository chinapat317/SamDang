package dbmanage

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log"
	"time"
)

func lineUserHMAC(db_hmac, uid string) string {
	mac := hmac.New(sha256.New, []byte(db_hmac))
	mac.Write([]byte(uid))
	return hex.EncodeToString(mac.Sum(nil))
}

func AddUser(db *sql.DB,
	uid string,
	name string,
	pic string, db_hmac string) error {
	h := lineUserHMAC(db_hmac, uid)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := db.ExecContext(ctx, `
		INSERT INTO line_users (line_user_id, line_user_hmac, display_name, picture_url, updated_at)
		VALUES ($1, $2, NULLIF($3,''), NULLIF($4,''), now())
		ON CONFLICT (line_user_id)
		DO UPDATE SET
			display_name   = EXCLUDED.display_name,
			picture_url    = EXCLUDED.picture_url,
			updated_at     = now()
	`, uid, h, name, pic)
	return err
}

func CheckUserRole(uid string, db *sql.DB, role string) (bool, error) {
	var user_role string
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
	return user_role == role, nil
}

func CheckCode(db *sql.DB, name string, code string) (bool, error) {
	var exists bool
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM admin_code
			WHERE name = $1
				AND code = $2
		)
	`, name, code).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func UpdateUserRole(db *sql.DB, uid string, role string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := db.ExecContext(ctx, `
		UPDATE line_users
		SET role = $1,
			updated_at = now()
		WHERE line_user_id = $2
	`, role, uid)
	if err != nil {
		return err
	}

	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("user not found: %s", uid)
	}
	return nil
}

func GetUserProf(uid string, db *sql.DB) (string, string, bool) {
	var (
		name string
		pic  string
	)
	is_error := false
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err := db.QueryRowContext(ctx, `
		SELECT display_name, picture_url
		FROM line_users
		WHERE line_user_id = $1
	`, uid).Scan(&name, &pic)
	if err != nil {
		// uid not found OR other error
		log.Printf("GetUserProf error: %v\n", err)
		is_error = true
	}
	return name, pic, is_error
}

func ChangeCode(name string, length int, db *sql.DB) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := db.ExecContext(ctx, `
		UPDATE admin_code
		SET code = substr(md5(random()::text), 1, $2)
		WHERE name = $1
	`, name, length)
	return err
}
