import { TaskCanEditItem } from "@/types/types";

export async function GetMyGroupDoneTasks(uid: string, gid: string): Promise<TaskCanEditItem[]> {
  const res = await fetch("/front-api/post/tasks/group/done", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uid, gid }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GetMyGroupDoneTasks failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }

  throw new Error("Invalid response format from backend");
}

export async function GetMyGroupTasks(uid: string, gid: string): Promise<TaskCanEditItem[]> {
  const res = await fetch("/front-api/post/tasks/edit/group", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uid, gid }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GetMyGroupTasks failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }

  throw new Error("Invalid response format from backend");
}

export async function GetMyGroupShowTasks(uid: string, gid: string): Promise<TaskCanEditItem[]> {
  const res = await fetch("/front-api/post/tasks/show/group", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uid, gid }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GetMyGroupShowTasks failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }

  throw new Error("Invalid response format from backend");
}

export async function ConfirmMyGroupTasks(
  uid: string,
  gid: string,
  tasks: TaskCanEditItem[],
): Promise<void> {
  const res = await fetch("/front-api/post/tasks/edit/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uid,
      gid,
      tasks: tasks.map((task) => ({
        id: task.id,
        description: task.description,
        status: task.status,
        due_date: task.due_date,
      })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ConfirmMyGroupTasks failed ${res.status}: ${text}`);
  }
}

export async function ConfirmMyGroupCheckTasks(
  uid: string,
  gid: string,
  tasks: TaskCanEditItem[],
): Promise<void> {
  const res = await fetch("/front-api/post/tasks/check/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uid,
      gid,
      tasks: tasks.map((task) => ({
        id: task.id,
        status: task.status,
        checked: task.checked,
      })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ConfirmMyGroupCheckTasks failed ${res.status}: ${text}`);
  }
}
