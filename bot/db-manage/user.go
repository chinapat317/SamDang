package dbmanage

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
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
		INSERT INTO users (line_user_id, line_user_hmac, display_name, picture_url, updated_at)
		VALUES ($1, $2, NULLIF($3,''), NULLIF($4,''), now())
		ON CONFLICT (line_user_id)
		DO UPDATE SET
			line_user_hmac = EXCLUDED.line_user_hmac,
			display_name   = EXCLUDED.display_name,
			picture_url    = EXCLUDED.picture_url,
			updated_at     = now()
	`, uid, h, name, pic)
	return err
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
		FROM users
		WHERE line_user_id = $1
	`, uid).Scan(&name, &pic)
	if err != nil {
		// uid not found OR other error
		log.Printf("GetUserProf error: %v\n", err)
		is_error = true
	}
	return name, pic, is_error
}
