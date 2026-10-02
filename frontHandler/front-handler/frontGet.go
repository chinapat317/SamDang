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

func CheckRoleHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

		var req RoleReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "CheckRoleHandler: invalid json body")
			return
		}
		if len(req.ROLE) == 0 {
			c.String(http.StatusBadRequest, "CheckRoleHandler: role is required")
			return
		}
		isAllowed, err := dbmanage.CheckUserRole(uid, db, req.ROLE)
		if err != nil {
			log.Printf("CheckRoleHandler: failed to check user role: %v\n", err)
			c.String(http.StatusInternalServerError, "CheckRoleHandler: failed to check user role")
			return
		}
		c.JSON(http.StatusOK, CheckRoleResp{
			IsAllowed: isAllowed,
		})
	}
}

func ProfHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

		name, pic, isErr := dbmanage.GetUserProf(uid, db)
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
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

		var req GIDReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "GroupReq: invalid json body")
			return
		}

		gid := strings.TrimSpace(req.GID)
		if gid == "" {
			c.String(http.StatusBadRequest, "GroupInfoHandler: gid is required")
			return
		}
		isInGroup, err := dbmanage.CheckUserInGroup(db, uid, gid)
		if err != nil {
			log.Printf("GroupInfoHandler: failed to check membership: %v\n", err)
			c.String(http.StatusInternalServerError, "GroupInfoHandler: failed to check membership")
			return
		}
		if !isInGroup {
			c.String(http.StatusForbidden, "Only group members can access this group")
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
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

		var req GIDReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "CheckUserInGroupHandler: invalid json body")
			return
		}

		gid := strings.TrimSpace(req.GID)
		if gid == "" {
			c.String(http.StatusBadRequest, "CheckUserInGroupHandler: gid is required")
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
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
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

func GetAllUsersHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}
		isAdmin, err := dbmanage.CheckUserRole(uid, db, []string{"admin"})
		if err != nil {
			log.Printf("GetAllUsersHandler: failed to check user role: %v\n", err)
			c.String(http.StatusInternalServerError, "GetAllUsersHandler: failed to check user role")
			return
		}
		if !isAdmin {
			c.String(http.StatusForbidden, "Only admin can access this page")
			return
		}
		allUsers, err := dbmanage.GetAllUsers(db)
		if err != nil {
			log.Printf("GetAllUsersHandler: failed to get all users: %v\n", err)
			c.String(http.StatusInternalServerError, "GetAllUsersHandler: failed to get all users")
			return
		}
		c.JSON(http.StatusOK, UsersResp(allUsers))
	}
}

func UpdateUsersRoleHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

		var req UpdateUsersRoleReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "UpdateUsersRoleHandler: invalid json body")
			return
		}

		isAdmin, err := dbmanage.CheckUserRole(uid, db, []string{"admin"})
		if err != nil {
			log.Printf("UpdateUsersRoleHandler: failed to check user role: %v\n", err)
			c.String(http.StatusInternalServerError, "UpdateUsersRoleHandler: failed to check user role")
			return
		}
		if !isAdmin {
			c.String(http.StatusForbidden, "Only admin can access")
			return
		}

		if len(req.Users) == 0 {
			c.String(http.StatusBadRequest, "UpdateUsersRoleHandler: users are required")
			return
		}

		if err := dbmanage.UpdateUsersRole(db, req.Users); err != nil {
			log.Printf("UpdateUsersRoleHandler: failed to update user roles: %v\n", err)
			c.String(http.StatusInternalServerError, "UpdateUsersRoleHandler: failed to update user roles")
			return
		}

		c.JSON(http.StatusOK, gin.H{"ok": true})
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
		var name, pic, userHash sql.NullString
		if err := rows.Scan(&name, &pic, &userHash); err != nil {
			return nil, err
		}
		out[strconv.Itoa(i)] = MemberInfo{
			UserHash:    userHash.String,
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
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

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
			if err := dbmanage.AssignTask(db, uid, task); err != nil {
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
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

		var req GIDReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "EditGroupShow: invalid json body")
			return
		}
		gid := strings.TrimSpace(req.GID)
		if gid == "" {
			c.String(http.StatusBadRequest, "EditGroupShow: gid is required")
			return
		}
		myGroupTasks, err := dbmanage.MyEditableGroupTasks(db, uid, gid)
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
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

		var req GIDReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "ShowGroupTasks: invalid json body")
			return
		}

		gid := strings.TrimSpace(req.GID)
		if gid == "" {
			c.String(http.StatusBadRequest, "ShowGroupTasks: gid is required")
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

func GetUsersByRoleHandler(db *sql.DB, role []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

		var req RoleReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "GetUsersByRoleHandler: invalid json body")
			return
		}
		filterRole := req.ROLE
		if len(filterRole) == 0 {
			c.String(http.StatusBadRequest, "GetUsersByRoleHandler: role is required")
			return
		}

		log.Printf("GetUsersByRoleHandler uid=%s role=%v", uid, filterRole)
		isAdmin, err := dbmanage.CheckUserRole(uid, db, role)
		if err != nil {
			log.Printf("GetUsersByRoleHandler: failed to check user role: %v\n", err) // Tobe Deleted
			c.String(http.StatusInternalServerError, "GetUsersByRoleHandler: failed to check user role")
			return
		}
		if !isAdmin {
			c.String(http.StatusForbidden, "Only admin can access this page")
			return
		}
		users, err := dbmanage.GetUsersByRole(db, filterRole)
		if err != nil {
			log.Printf("GetUsersByRoleHandler: failed to get users by role: %v\n", err)
			c.String(http.StatusInternalServerError, "GetUsersByRoleHandler: failed to get users by role")
			return
		}
		c.JSON(http.StatusOK, users)
	}
}

func EditGroupConfirm(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

		var req TaskEditRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "EditGroupConfirm: invalid json body")
			return
		}

		gid := strings.TrimSpace(req.GID)
		if gid == "" {
			c.String(http.StatusBadRequest, "EditGroupConfirm: gid is required")
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

func CheckGroupConfirm(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

		var req TaskCheckRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "CheckGroupConfirm: invalid json body")
			return
		}

		if len(req.Tasks) == 0 {
			c.String(http.StatusBadRequest, "CheckGroupConfirm: no tasks")
			return
		}

		if err := dbmanage.CheckMyGroupTasks(db, uid, req.Tasks); err != nil {
			log.Printf("CheckGroupConfirm: failed to check tasks: %v\n", err)
			c.String(http.StatusInternalServerError, "CheckGroupConfirm: failed to check tasks")
			return
		}

		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}

func GetGroupDoneTasks(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := lineUserIDFromRequest(c)
		if !ok {
			return
		}

		var req GIDReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "GetGroupDoneTasks: invalid json body")
			return
		}

		gid := strings.TrimSpace(req.GID)
		if gid == "" {
			c.String(http.StatusBadRequest, "GetGroupDoneTasks: gid is required")
			return
		}

		doneTasks, err := dbmanage.GetGroupDoneTasks(db, uid, gid)
		if err != nil {
			log.Printf("GetGroupDoneTasks: failed to get done tasks: %v\n", err)
			c.String(http.StatusInternalServerError, "GetGroupDoneTasks: failed to get done tasks")
			return
		}

		c.JSON(http.StatusOK, MyGroupTasksResp(doneTasks))
	}
}
