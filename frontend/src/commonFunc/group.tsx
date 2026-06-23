import { GroupInfo, Users } from "@/types/types";

export async function GetGroupInfo(gid: string) {
  const res = await fetch("/front-api/api/post/ginfo", {
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
    return data
  }
  throw new Error("Invalid response format from backend");
}

export function MemberList(groupMemJson: unknown): Users[] {
  const members = (groupMemJson as GroupInfo).group_members;
  if (Array.isArray(members)) {
    return members;
  }
  return [];
}

export function GetSelectedPic(groupMemJson: unknown, selectedName: string): string {
  const members = MemberList(groupMemJson);
  const member = members.find((m) => m.display_name === selectedName);
  return member ? member.picture_url : "";
}

export async function CheckUserInGroup(uid: string, gid: string): Promise<boolean> {
    const res = await fetch("/front-api/api/post/check_user_in_group", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ uid, gid })
    });
    const data = await res.json();
    return data.is_in_group === true;
}