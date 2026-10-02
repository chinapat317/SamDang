import { GetSelectedUserHash } from "@/commonFunc/group";
import { TaskRow } from "@/types/types";
import { Dispatch, SetStateAction } from "react";

type AssignTasksParams = {
  groupId: string | null | undefined;
  groupMemJson: unknown;
  taskRows: TaskRow[];
  setAssignStatus: Dispatch<SetStateAction<string | null>>;
  setAssigning: Dispatch<SetStateAction<boolean>>;
};

type AssignPayloadItem = {
  group_id: string;
  assigned_to_line_display_name: string;
  title: string;
  description: string;
  assign_date: string;
  due_date: string;
};

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

export async function assignTasks(accessToken: string, {
  groupId,
  groupMemJson,
  taskRows,
  setAssignStatus,
  setAssigning,
}: AssignTasksParams): Promise<boolean> {
  setAssignStatus(null);
  if (!groupId) {
    setAssignStatus("ไม่พบรหัสกลุ่ม กรุณาเปิดจากภายในกลุ่ม");
    return false;
  }
  if (taskRows.length === 0) {
    setAssignStatus("ไม่มีงาน");
    return false;
  }

  for (let i = 0; i < taskRows.length; i++) {
    const r = taskRows[i];

    if (!r.assignedToName || r.assignedToName.trim() === "") {
      setAssignStatus(`แถวที่ ${i + 1}: กรุณาเลือกผู้รับผิดชอบ`);
      return false;
    }
    if (!GetSelectedUserHash(groupMemJson, r.assignedToName)) {
      setAssignStatus(`แถวที่ ${i + 1}: ไม่พบข้อมูลผู้ใช้ของสมาชิกที่เลือก`);
      return false;
    }
    if (!r.task || r.task.trim() === "") {
      setAssignStatus(`แถวที่ ${i + 1}: กรุณาระบุชื่องาน`);
      return false;
    }
    if (!r.dueDate || r.dueDate.trim() === "") {
      setAssignStatus(`แถวที่ ${i + 1}: กรุณาเลือกวันครบกำหนด`);
      return false;
    }
  }

  const payload: Record<string, AssignPayloadItem> = {};
  taskRows.forEach((r, idx) => {
    payload[String(idx + 1)] = {
      group_id: groupId,
      assigned_to_line_display_name: GetSelectedUserHash(groupMemJson, r.assignedToName),
      title: r.task,
      description: r.description,
      assign_date: r.assignDateISO,
      due_date: r.dueDate,
    };
  });

  try {
    setAssigning(true);
    const res = await fetch("/front-api/post/tasks/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json", 
        "authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      setAssignStatus(`ข้อผิดพลาด ${res.status}: ${text}`);
      return false;
    }
    setAssignStatus("มอบหมายงานแล้ว");
    console.log("assign payload:", payload);
    return true;
  } catch (e: unknown) {
    setAssignStatus(e instanceof Error ? e.message : "มอบหมายงานไม่สำเร็จ");
    return false;
  } finally {
    setAssigning(false);
  }
}
