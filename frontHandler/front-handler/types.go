package api

import dbmanage "frontHandler/db-manage"

type GroupInfoResp struct {
	GroupName string                `json:"line_group_name"`
	Members   map[string]MemberInfo `json:"members"`
}

type RoleReq struct {
	ROLE []string `json:"role"`
}

type ProfResp struct {
	DisplayName string `json:"display_name"`
	PictureURL  string `json:"picture_url"`
}

type GIDReq struct {
	GID string `json:"gid"`
}

type CheckUserInGroupResp struct {
	IsInGroup bool `json:"is_in_group"`
}

type CheckUserRoleResp struct {
	IsAllowed bool `json:"is_allowed"`
}

type MyGroupsResp []dbmanage.MyGroupItem

type UsersResp []dbmanage.UserItem

type MyGroupTasksResp []dbmanage.TaskCanEditItem

type MemberInfo struct {
	UserHash    string `json:"user_hash"`
	DisplayName string `json:"display_name"`
	PictureURL  string `json:"picture_url"`
}

type Gname struct {
	GroupName string `json:"line_group_name"`
}

type TaskAssignItem = dbmanage.TaskAssignItem

type TaskAssignRequest map[string]TaskAssignItem

type UpdateUsersRoleReq struct {
	Users []dbmanage.UserRoleUpdateItem `json:"users"`
}

type TaskEditRequest struct {
	GID   string                  `json:"gid"`
	Tasks []dbmanage.TaskEditItem `json:"tasks"`
}

type TaskCheckRequest struct {
	GID   string                   `json:"gid"`
	Tasks []dbmanage.TaskCheckItem `json:"tasks"`
}

type CheckRoleResp struct {
	IsAllowed bool `json:"is_allowed"`
}
