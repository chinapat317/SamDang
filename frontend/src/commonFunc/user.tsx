import { EditUserRole, Users } from "@/types/types";

export async function GetAllUsers(uid: string): Promise<Users[]> {
  const res = await fetch("/front-api/post/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) {
      throw new Error("Only admin users can view this page.");
    }
    throw new Error(`GetAllUsers failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }
  throw new Error("Invalid response format from backend");
}

export async function GetUsersByRole(uid: string, role: string[]): Promise<Users[]> {
  const res = await fetch("/front-api/post/admin/users/role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, role }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) {
      throw new Error("Only admin users can view this page.");
    }
    throw new Error(`GetUsersByRole failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }
  throw new Error("Invalid response format from backend");
}

export async function UpdateUsersRole(uid: string, users: EditUserRole[]): Promise<void> {
  const res = await fetch("/front-api/post/admin/edit/users/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, users }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) {
      throw new Error("Only admin users can edit roles.");
    }
    throw new Error(`UpdateUsersRole failed ${res.status}: ${text}`);
  }
}
