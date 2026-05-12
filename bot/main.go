package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	groupmanage "github.com/chinapat317/SamDang/db-manage"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/line/line-bot-sdk-go/v7/linebot"
)

func main() {
	_ = godotenv.Load("../.env")

	secret := os.Getenv("LINE_CHANNEL_SECRET")
	token := os.Getenv("LINE_CHANNEL_ACCESS_TOKEN")
	db_url := os.Getenv("DB_URL")
	if secret == "" ||
		token == "" ||
		db_url == "" {
		log.Fatal("Missing env variable")
	}

	//bot create
	bot, err := linebot.New(secret, token)
	if err != nil {
		log.Fatal(err)
	}

	//db connect
	db, err := sql.Open("pgx", db_url)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		log.Fatal("db ping failed:", err)
	}

	log.Println("connected")

	mux := http.NewServeMux()

	//Check server status
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("Services running"))
	})

	//Post api from linebot
	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		events, err := bot.ParseRequest(r) // verifies X-Line-Signature + parses JSON
		if err != nil {
			if err == linebot.ErrInvalidSignature {
				http.Error(w, "invalid signature", http.StatusBadRequest)
				return
			}
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		for _, event := range events {
			if event.Type == linebot.EventTypeJoin {
				if event.Source != nil {
					if event.Source.Type == linebot.EventSourceTypeGroup {
						groupmanage.GroupCreate(ctx, db, event.Source.GroupID)
					}
				} else {
					log.Printf("JOIN event: source is nil\n")
				}
				continue
			} else if event.Type == linebot.EventTypeMessage {
				switch m := event.Message.(type) {
				case *linebot.TextMessage:
					log.Printf("LINE text from %s: %s\n", event.Source.UserID, m.Text)
				default:
					log.Printf("LINE message type: %T from %s\n", event.Message, event.Source.UserID)
				}
				continue
			} else {
				log.Printf("LINE event type: %s\n", event.Type)
			}
		}

		// HTTP response to LINE server (must be 200)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("Received"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Listening on :" + port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
