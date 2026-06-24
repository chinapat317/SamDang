package dbmanage

type TaskAssignItem struct {
	GroupID     string `json:"group_id"`
	AssignedTo  string `json:"assigned_to_line_display_name"`
	AssignedBy  string `json:"assigned_by_line_display_name"`
	Title       string `json:"title"`
	Description string `json:"description"`
	AssignDate  string `json:"assign_date"`
	DueDate     string `json:"due_date"`
}

type MyGroupItem struct {
	GroupID   string `json:"group_id"`
	GroupName string `json:"group_name"`
}

type TaskCanEditItem struct {
	ID          int64  `json:"id"`
	AssignedTo  string `json:"assigned_to"`
	AssignedBy  string `json:"assigned_by"`
	Status      string `json:"status"`
	Title       string `json:"title"`
	Description string `json:"description"`
	DueDate     string `json:"due_date"`
}

type TaskEditItem struct {
	ID          int64  `json:"id"`
	Description string `json:"description"`
	Status      string `json:"status"`
	DueDate     string `json:"due_date"`
}
