// src/types/types.ts
export type GroupInfo = {
  group_name: string;
  group_members: Users[];
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
  assignDateISO: string; // ISO string
  dueDate: string; // yyyy-mm-dd
};

export type LiffProfile = {
  uid?: string;
  groupId?: string;
  liff_loading?: boolean;
  displayName?: string;
};



