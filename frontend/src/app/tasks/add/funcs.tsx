import { TaskRow } from "@/types/types";
import { Dispatch, SetStateAction } from "react";

//Types
type AssignTasksParams = {
  groupId: string | null | undefined;
  taskRows: TaskRow[];
  currentUserName: string;
  setAssignStatus: Dispatch<SetStateAction<string | null>>;
  setAssigning: Dispatch<SetStateAction<boolean>>;
};

export type AssignPayload = {
  requestedBy: {
    name: string;
    // later: lineUserId, pictureUrl, etc.
  };
  tasks: Array<{
    assignedTo: string;
    assignedBy: string;
    title: string;
    description: string;
    assignDate: string; // ISO
    dueDate: string; // yyyy-mm-dd
  }>;
};

export type AssignPayloadItem = {
  group_id: string;
  assigned_to_line_display_name: string;
  assigned_by_line_display_name: string;
  title: string;
  description: string;
  assign_date: string;
  due_date: string;
};
//Functions

export function nowISO() {
  return new Date().toISOString();
}

export function toPrettyDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function createTaskRow(): TaskRow {
  return {
    id: crypto.randomUUID(),
    assignedToName: "",
    task: "",
    description: "",
    assignDateISO: nowISO(),
    dueDate: "",
  };
}

export function addTaskRow(setTaskRows: Dispatch<SetStateAction<TaskRow[]>>) {
  setTaskRows((prev) => [...prev, createTaskRow()]);
}

export function removeTaskRow(
  setTaskRows: Dispatch<SetStateAction<TaskRow[]>>,
  id: string,
) {
  setTaskRows((prev) => prev.filter((r) => r.id !== id));
}

export function updateTaskRow(
  setTaskRows: Dispatch<SetStateAction<TaskRow[]>>,
  id: string,
  patch: Partial<TaskRow>,
) {
  setTaskRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

export async function assignTasks({
  groupId,
  taskRows,
  currentUserName,
  setAssignStatus,
  setAssigning,
}: AssignTasksParams): Promise<boolean> {
  setAssignStatus(null);
  if (!groupId) {
    setAssignStatus("No groupId. Please open from inside group.");
    return false;
  }
  if (taskRows.length === 0) {
    setAssignStatus("No tasks.");
    return false;
  }

  for (let i = 0; i < taskRows.length; i++) {
    const r = taskRows[i];

    if (!r.assignedToName || r.assignedToName.trim() === "") {
      setAssignStatus(`Row ${i + 1}: please select "assigned to"`);
      return false;
    }
    if (!r.task || r.task.trim() === "") {
      setAssignStatus(`Row ${i + 1}: task cannot be empty`);
      return false;
    }
    if (!r.dueDate || r.dueDate.trim() === "") {
      setAssignStatus(`Row ${i + 1}: please select "due date"`);
      return false;
    }
  }

  const payload: Record<string, AssignPayloadItem> = {};
  taskRows.forEach((r, idx) => {
    payload[String(idx + 1)] = {
      group_id: groupId,
      assigned_to_line_display_name: r.assignedToName,
      assigned_by_line_display_name: currentUserName,
      title: r.task,
      description: r.description,
      assign_date: r.assignDateISO,
      due_date: r.dueDate,
    };
  });

  try {
    setAssigning(true);
    const res = await fetch("/front-api/post/task/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      setAssignStatus(`Error ${res.status}: ${text}`);
      return false;
    }
    setAssignStatus("Assigned");
    console.log("assign payload:", payload);
    return true;
  } catch (e: unknown) {
    setAssignStatus(getErrorMessage(e, "Assign failed"));
    return false;
  } finally {
    setAssigning(false);
  }
}
