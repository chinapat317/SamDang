package dbmanage

import (
	"database/sql"
	"time"
)

type GroupInfo struct {
	LineGroupID   string
	LineGroupName string
}

type GroupTask struct {
	Title          string
	Status         string
	AssignedToName sql.NullString
	DueDate        time.Time
}
