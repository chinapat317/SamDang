package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	botbackend "github.com/chinapat317/SamDang/bot-backend"
	"github.com/gin-gonic/gin"
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

	go botbackend.StartDailyTaskScheduler(db, bot)

	router := gin.Default()
	router.HandleMethodNotAllowed = true

	//Check server status
	router.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "Services running")
	})

	//Post api from linebot
	router.POST("/callback", func(c *gin.Context) {
		events := botbackend.VerifySig(c, bot)
		if events == nil {
			return
		}
		botbackend.EventController(events, bot, db, db_hmac)
		// HTTP response to LINE server (must be 200)
		c.Status(http.StatusOK)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Listening on :" + port)
	log.Fatal(router.Run(":" + port))
}
