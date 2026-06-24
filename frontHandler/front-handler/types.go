package api

import dbmanage "frontHandler/db-manage"

type GroupInfoResp struct {
	GroupName string                `json:"line_group_name"`
	Members   map[string]MemberInfo `json:"members"`
}

type ProfReq struct {
	UID string `json:"uid"`
}

type ProfResp struct {
	DisplayName string `json:"display_name"`
	PictureURL  string `json:"picture_url"`
}

type GReq struct {
	GID string `json:"gid"`
}

type UserGroupReq struct {
	UID string `json:"uid"`
	GID string `json:"gid"`
}

type CheckUserInGroupResp struct {
	IsInGroup bool `json:"is_in_group"`
}

type MyGroupsResp []dbmanage.MyGroupItem

type MyGroupTasksResp []dbmanage.TaskCanEditItem

type MemberInfo struct {
	DisplayName string `json:"display_name"`
	PictureURL  string `json:"picture_url"`
}

type Gname struct {
	GroupName string `json:"line_group_name"`
}

type TaskAssignItem = dbmanage.TaskAssignItem

type TaskAssignRequest map[string]TaskAssignItem

type TaskEditRequest struct {
	UID   string                  `json:"uid"`
	GID   string                  `json:"gid"`
	Tasks []dbmanage.TaskEditItem `json:"tasks"`
}
