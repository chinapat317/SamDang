import { TaskCanEditItem } from "@/types/types";

export async function GetMyGroupDoneTasks(accessToken: string, gid: string): Promise<TaskCanEditItem[]> {
  const res = await fetch("/front-api/post/tasks/group/done", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ gid }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GetMyGroupDoneTasks failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }

  throw new Error("รูปแบบข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง");
}

export async function GetMyGroupTasks(accessToken: string, gid: string): Promise<TaskCanEditItem[]> {
  const res = await fetch("/front-api/post/tasks/edit/group", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ gid }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GetMyGroupTasks failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }

  throw new Error("รูปแบบข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง");
}

export async function GetMyGroupShowTasks(accessToken: string, gid: string): Promise<TaskCanEditItem[]> {
  const res = await fetch("/front-api/post/tasks/show/group", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ gid }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GetMyGroupShowTasks failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }

  throw new Error("รูปแบบข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง");
}

export async function ConfirmMyGroupTasks(
  accessToken: string,
  gid: string,
  tasks: TaskCanEditItem[],
): Promise<void> {
  const res = await fetch("/front-api/post/tasks/edit/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
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
  accessToken: string,
  gid: string,
  tasks: TaskCanEditItem[],
): Promise<void> {
  const res = await fetch("/front-api/post/tasks/check/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
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
