import { GroupInfo, Users } from "@/types/types";

export async function GetGroupInfo(gid: string): Promise<GroupInfo> {
  const res = await fetch("/front-api/post/ginfo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gid }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GetGroupInfo failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  if (data && typeof data === "object") {
    console.log("GetGroupInfo response:", data);
    return data;
  }
  throw new Error("Invalid response format from backend");
}

export function MemberList(groupMemJson: unknown): Users[] {
  if (!groupMemJson || typeof groupMemJson !== "object") {
    return [];
  }

  const groupInfo = groupMemJson as Partial<GroupInfo> & {
    members?: Users[] | Record<string, Users>;
  };
  const members = groupInfo.group_members ?? groupInfo.members;

  if (Array.isArray(members)) {
    return members;
  }
  if (members && typeof members === "object") {
    return Object.values(members);
  }
  return [];
}

export function GetSelectedPic(groupMemJson: unknown, selectedName: string): string {
  const members = MemberList(groupMemJson);
  const member = members.find((m) => m.display_name === selectedName);
  return member ? member.picture_url : "";
}

export async function GetMyGroups(uid: string): Promise<GroupInfo[]> {  
    const res = await fetch("/front-api/post/my_groups", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ uid })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GetMyGroups failed ${res.status}: ${text}`);
    }
    const data = await res.json();
    console.log("GetMyGroups response:", data);
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === "object" && Array.isArray(data.groups)) {
      return data.groups;
    }
    throw new Error("Invalid response format from backend");
  }
