package botbackend

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	dbmanage "github.com/chinapat317/SamDang/db-manage"
)

func GetCode(text string, length int) (string, bool, error) {
	text = strings.TrimSpace(text)
	if length <= 0 {
		return "", false, fmt.Errorf("Code not found in message")
	}
	chars := []rune(text)
	if len(chars) <= length {
		return string(chars), false, fmt.Errorf("Code too short: text='%s' length=%d", text, length)
	}
	code := string(chars[len(chars)-length:])
	log.Printf("GetCode: extracted code '%s' from text '%s'\n", code, text)
	return code, true, nil
}

func BuildGroupInProgressTaskMessage(db *sql.DB, groupId string) (string, error) {
	tasks, err := dbmanage.GetGroupTasks(db, groupId)
	if err != nil {
		return "", err
	}
	if len(tasks) == 0 {
		return "ยังไม่มีงานในกลุ่มนี้ค่ะ", nil
	}

	var taskList []string
	for _, task := range tasks {
		assignedTo := "ไม่ระบุผู้รับผิดชอบ"
		if task.AssignedToName.Valid && strings.TrimSpace(task.AssignedToName.String) != "" {
			assignedTo = task.AssignedToName.String
		}

		taskList = append(taskList, fmt.Sprintf(
			"-[%s] %s / %s / ครบกำหนด %s",
			task.Title,
			assignedTo,
			task.DueDate.Format("2006-01-02"),
		))
	}
	return "งานในกลุ่ม:\n" + strings.Join(taskList, "\n"), nil
}
