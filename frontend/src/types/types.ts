// src/types/types.ts
export type GroupInfo = {
  group_id: string;
  group_name?: string;
  line_group_name?: string;
  group_members?: Users[] | Record<string, Users>;
  members?: Users[] | Record<string, Users>;
};

export type Users = {
  userId: string;
  display_name: string;
  picture_url: string;
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
  status: "done" | "in progress";
  title: string;
  description: string;
  due_date: string;
};

export type LiffProf = {
  uid: string;
  groupId?: string;
  sourceType?: string;
  pictureUrl: string;
  liff_loading: boolean;
  displayName: string;
  error: string | null;
};



