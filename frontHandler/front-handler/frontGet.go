package api

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

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
		log.Printf("GroupInfoHandler gid from frontend: %s", gid)

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

func CheckUserInGroupHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req UserGroupReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "CheckUserInGroupHandler: invalid json body")
			return
		}

		uid := strings.TrimSpace(req.UID)
		gid := strings.TrimSpace(req.GID)
		if uid == "" || gid == "" {
			c.String(http.StatusBadRequest, "CheckUserInGroupHandler: uid and gid are required")
			return
		}
		log.Printf("CheckUserInGroupHandler uid=%s gid=%s", uid, gid)

		isInGroup, err := dbmanage.CheckUserInGroup(db, uid, gid)
		if err != nil {
			log.Printf("CheckUserInGroupHandler: failed to check membership: %v\n", err)
			c.String(http.StatusInternalServerError, "CheckUserInGroupHandler: failed to check membership")
			return
		}

		c.JSON(http.StatusOK, CheckUserInGroupResp{
			IsInGroup: isInGroup,
		})
	}
}

func MyGroupsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ProfReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "MyGroupsHandler: invalid json body")
			return
		}

		uid := strings.TrimSpace(req.UID)
		if uid == "" {
			c.String(http.StatusBadRequest, "MyGroupsHandler: uid is required")
			return
		}

		groups, err := dbmanage.GetMyGroups(db, uid)
		if err != nil {
			log.Printf("MyGroupsHandler: failed to get groups: %v\n", err)
			c.String(http.StatusInternalServerError, "MyGroupsHandler: failed to get groups")
			return
		}

		c.JSON(http.StatusOK, MyGroupsResp(groups))
	}
}

func getGroupMembers(db *sql.DB, gid string) (map[string]MemberInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, isErr := dbmanage.GetGroupMember(ctx, db, gid)
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

func EditGroupShow(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req UserGroupReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "EditGroupShow: invalid json body")
			return
		}
		uid := strings.TrimSpace(req.UID)
		gid := strings.TrimSpace(req.GID)
		if uid == "" || gid == "" {
			c.String(http.StatusBadRequest, "EditGroupShow: uid and gid are required")
			return
		}
		myGroupTasks, err := dbmanage.MyGroupTasks(db, uid, gid)
		if err != nil {
			log.Printf("EditGroupShow: failed to get tasks: %v\n", err)
			c.String(http.StatusInternalServerError, "EditGroupShow: failed to get tasks")
			return
		}
		c.JSON(http.StatusOK, MyGroupTasksResp(myGroupTasks))
	}
}

func ShowGroupTasks(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req UserGroupReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "ShowGroupTasks: invalid json body")
			return
		}

		uid := strings.TrimSpace(req.UID)
		gid := strings.TrimSpace(req.GID)
		if uid == "" || gid == "" {
			c.String(http.StatusBadRequest, "ShowGroupTasks: uid and gid are required")
			return
		}

		groupTasks, err := dbmanage.MyGroupTasks(db, uid, gid)
		if err != nil {
			log.Printf("ShowGroupTasks: failed to get tasks: %v\n", err)
			c.String(http.StatusInternalServerError, "ShowGroupTasks: failed to get tasks")
			return
		}

		c.JSON(http.StatusOK, MyGroupTasksResp(groupTasks))
	}
}

func EditGroupConfirm(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req TaskEditRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "EditGroupConfirm: invalid json body")
			return
		}

		uid := strings.TrimSpace(req.UID)
		gid := strings.TrimSpace(req.GID)
		if uid == "" || gid == "" {
			c.String(http.StatusBadRequest, "EditGroupConfirm: uid and gid are required")
			return
		}
		if len(req.Tasks) == 0 {
			c.String(http.StatusBadRequest, "EditGroupConfirm: no tasks")
			return
		}

		if err := dbmanage.UpdateMyGroupTasks(db, uid, gid, req.Tasks); err != nil {
			log.Printf("EditGroupConfirm: failed to update tasks: %v\n", err)
			c.String(http.StatusInternalServerError, "EditGroupConfirm: failed to update tasks")
			return
		}

		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}
