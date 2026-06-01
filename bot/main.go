package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	botbackend "github.com/chinapat317/SamDang/bot-backend"
	api "github.com/chinapat317/SamDang/front-handler"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/line/line-bot-sdk-go/v7/linebot"
)

func main() {
	_ = godotenv.Load("../.env")

	secret := os.Getenv("LINE_CHANNEL_SECRET")
	token := os.Getenv("LINE_CHANNEL_ACCESS_TOKEN")
	db_url := os.Getenv("DB_URL")
	db_hmac := os.Getenv("LINE_USER_HMAC_KEY")
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
	log.Println("Connected to line api")

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
	log.Println("Connected to DB")

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

	//POST api for Frontend
	mux.HandleFunc("/api/post/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		switch r.URL.Path {
		case "/api/post/prof":
			api.ProfHandler(w, r, db)
			return
		case "/api/post/gmem":
			api.GroupMemHandler(w, r, db)
			return
		case "/api/post/gname":
			api.GroupNameHandler(w, r, db)
		case "/api/post/task/assign":
			api.TaskAssignHandler(w, r, db)
		default:
			http.NotFound(w, r)
			return
		}
	})

	//Post api from linebot
	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		events := botbackend.VerifySig(r, w, bot)
		botbackend.EventController(events, bot, db, db_hmac, token)
		// HTTP response to LINE server (must be 200)
		w.WriteHeader(http.StatusOK)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Listening on :" + port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
