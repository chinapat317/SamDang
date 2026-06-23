package dbmanage

type TaskAssignItem struct {
	GroupID    string `json:"group_id"`
	AssignedTo string `json:"assigned_to_line_display_name"`
	AssignedBy string `json:"assigned_by_line_display_name"`
	Task       string `json:"task"`
	AssignDate string `json:"assign_date"`
	DueDate    string `json:"due_date"`
}

type TaskAssignRequest map[string]TaskAssignItem
