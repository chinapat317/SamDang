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

type MemberInfo struct {
	DisplayName string `json:"display_name"`
	PictureURL  string `json:"picture_url"`
}

type Gname struct {
	GroupName string `json:"line_group_name"`
}

type TaskAssignItem = dbmanage.TaskAssignItem

type TaskAssignRequest map[string]TaskAssignItem
