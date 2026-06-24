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

	go startDailyTaskScheduler(db, bot)

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

func startDailyTaskScheduler(db *sql.DB, bot *linebot.Client) {
	location, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		log.Printf("LoadLocation Asia/Bangkok failed: %s; using UTC+7 fixed zone", err)
		location = time.FixedZone("Asia/Bangkok", 7*60*60)
	}

	for {
		wait := durationUntilNextBangkokSeven(time.Now(), location)
		log.Printf("Next daily group task push in %s", wait.Round(time.Second))
		time.Sleep(wait)

		log.Println("Sending daily group task lists")
		botbackend.SendDailyGroupInProgressTasks(db, bot)
	}
}

func durationUntilNextBangkokSeven(now time.Time, location *time.Location) time.Duration {
	bangkokNow := now.In(location)
	next := time.Date(
		bangkokNow.Year(),
		bangkokNow.Month(),
		bangkokNow.Day(),
		7,
		0,
		0,
		0,
		location,
	)
	if !bangkokNow.Before(next) {
		next = next.Add(24 * time.Hour)
	}
	return next.Sub(bangkokNow)
}
