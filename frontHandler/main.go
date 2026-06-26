package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"time"

	api "frontHandler/front-handler"

	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load("../.env")

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Fatal("Missing DB_URL env variable")
	}

	db, err := sql.Open("pgx", dbURL)
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

	router := gin.Default()
	router.HandleMethodNotAllowed = true

	router.GET("/", func(c *gin.Context) {
		c.String(200, "Front handler service running")
	})

	postGroup := router.Group("/post")
	{
		postGroup.POST("/prof", api.ProfHandler(db))
		postGroup.POST("/ginfo", api.GroupInfoHandler(db))
		postGroup.POST("/my_groups", api.MyGroupsHandler(db))
		postGroup.POST("/task/assign", api.TaskAssignHandler(db))
		postGroup.POST("/tasks/show/group", api.ShowGroupTasks(db))
		postGroup.POST("/tasks/edit/group", api.EditGroupShow(db))
		postGroup.POST("/tasks/edit/confirm", api.EditGroupConfirm(db))
	}

	port := os.Getenv("FRONT_HANDLER_PORT")
	if port == "" {
		port = "8082"
	}

	log.Println("Listening on :" + port)
	log.Fatal(router.Run(":" + port))
}
