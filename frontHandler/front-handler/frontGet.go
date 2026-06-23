package api

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	dbmanage "frontHandler/db-manage"

	"github.com/gin-gonic/gin"
)

func ProfHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ProfReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "ProfReq: invalid json body")
			return
		}

		req.UID = strings.TrimSpace(req.UID)
		if req.UID == "" {
			c.String(http.StatusBadRequest, "ProfHandler: uid is required")
			return
		}

		name, pic, isErr := dbmanage.GetUserProf(req.UID, db)
		if isErr {
			log.Println("GetUserProf error: failed to get profile")
			c.String(http.StatusInternalServerError, "ProfHandler: failed to get profile")
			return
		}

		c.JSON(http.StatusOK, ProfResp{
			DisplayName: name,
			PictureURL:  pic,
		})
	}
}

func GroupInfoHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req GReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "GroupReq: invalid json body")
			return
		}

		gid := strings.TrimSpace(req.GID)
		if gid == "" {
			c.String(http.StatusBadRequest, "GroupInfoHandler: gid is required")
			return
		}

		gname, isErr := dbmanage.GetGroupName(db, gid)
		if isErr {
			log.Println("GetGroupName error: failed to get group name")
			c.String(http.StatusInternalServerError, "GroupInfoHandler: failed to get group name")
			return
		}
		if gname == "" {
			log.Printf("GetGroupName warning: group name not found for gid=%s\n", gid)
			gname = "Unknown Group"
		}
		gmem, err := getGroupMembers(db, gid)
		if err != nil {
			log.Printf("GroupInfoHandler: failed to get group members: %v\n", err)
			c.String(http.StatusInternalServerError, "GroupInfoHandler: failed to get group members")
			return
		}
		c.JSON(http.StatusOK, GroupInfoResp{
			GroupName: gname,
			Members:   gmem,
		})
	}
}

func getGroupMembers(db *sql.DB, gid string) (map[string]MemberInfo, error) {
	rows, isErr := dbmanage.GetGroupMember(db, gid)
	if isErr {
		return nil, fmt.Errorf("query group members failed")
	}
	defer rows.Close()

	out := make(map[string]MemberInfo)
	i := 1
	for rows.Next() {
		var name, pic sql.NullString
		if err := rows.Scan(&name, &pic); err != nil {
			return nil, err
		}
		out[strconv.Itoa(i)] = MemberInfo{
			DisplayName: name.String,
			PictureURL:  pic.String,
		}
		i++
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func TaskAssignHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req TaskAssignRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "TaskAssignHandler: invalid json body")
			return
		}

		if len(req) == 0 {
			c.String(http.StatusBadRequest, "TaskAssignHandler: no tasks")
			return
		}

		for key, task := range req {
			if err := dbmanage.AssignTask(db, task); err != nil {
				log.Printf("TaskAssignHandler: AssignTask failed at key=%s: %v\n", key, err)
				c.String(http.StatusInternalServerError, "TaskAssignHandler: failed to assign task")
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}
