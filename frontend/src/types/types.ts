// src/types/types.ts
export type GroupInfo = {
  group_id: string;
  group_name?: string;
  line_group_name?: string;
  group_members?: ListUsers[] | Record<string, ListUsers>;
  members?: ListUsers[] | Record<string, ListUsers>;
};

export type ListUsers = {
  userId?: string;
  user_hash?: string;
  display_name: string;
  picture_url: string;
};

export type Users = {
  uid: string;
  display_name: string;
  picture_url: string;
  role: "admin" | "manager" | "member";
};

export type EditUserRole = {
  uid: string;
  role: "manager" | "member";
};

export type TaskRow = {
  id: string;
  assignedToName: string;
  task: string;
  description: string;
  assignDateISO: string; // ISO string
  dueDate: string; // yyyy-mm-dd
};

export type TaskCanEditItem = {
  id: number;
  assigned_to: string;
  assigned_by: string;
  checked_by: string;
  status: "done" | "in progress";
  title: string;
  description: string;
  due_date: string;
  checked: boolean;
};
