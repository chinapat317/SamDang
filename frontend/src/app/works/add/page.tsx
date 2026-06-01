"use client";
import { useLiffProf } from "@/context/LiffProf";
import { TaskRow } from "@/types/work";
import { useEffect, useState } from "react";

function nowISO() {
  return new Date().toISOString();
}

function toPrettyDate(iso: string) {
  return new Date(iso).toLocaleString();
}

async function GetGroupName(gid: string) {
  const res = await fetch("/bot/api/post/gname", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gid }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GetGroupMember failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  // data should be an object whose values have display_name and picture_url
  if (data && typeof data === "object") {
    return data;
  }
  throw new Error("Invalid response format from backend");
}

async function GetGroupMember(gid: string) {
  const res = await fetch("/bot/api/post/gmem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gid }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GetGroupMember failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  // data should be an object whose values have display_name and picture_url
  if (data && typeof data === "object") {
    return data;
  }
  throw new Error("Invalid response format from backend");
}

export default function AddWork() {
  const { uid, groupId, liff_loading, displayName } = useLiffProf() as any;
  const currentUserName = displayName || uid || "Unknown";
  if (!groupId && !liff_loading) {
    return <div>Please open this LIFF from inside a group chat.</div>;
  }

  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [assignStatus, setAssignStatus] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [groupMemJson, setGroupMemJson] = useState<any>(null);
  const [groupNameJson, setGroupNameJson] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  function addTaskRow() {
    const newRow: TaskRow = {
      id: crypto.randomUUID(),
      assignedToName: "",
      task: "",
      assignDateISO: nowISO(),
      dueDate: "",
    };
    setTaskRows((prev) => [...prev, newRow]);
  }

  function removeTaskRow(id: string) {
    setTaskRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateTaskRow(id: string, patch: Partial<TaskRow>) {
    setTaskRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function memberList(): Array<{ display_name: string; picture_url: string }> {
    if (!groupMemJson || typeof groupMemJson !== "object") return [];
    // expected: { "1": {display_name, picture_url}, "2": {...} }
    const values = Object.values(groupMemJson) as any[];
    return values
      .filter((v) => v && typeof v === "object")
      .map((v) => ({
        display_name: String(v.display_name || ""),
        picture_url: String(v.picture_url || ""),
      }))
      .filter((m) => m.display_name.length > 0);
  }

  function getSelectedPic(name: string) {
    const m = memberList().find((x) => x.display_name === name);
    return m?.picture_url || "";
  }

  function getGroupNameText() {
    if (!groupNameJson) return "";
    // support both: {group_name:"X"} or {line_group_name:"X"} or "X"
    if (typeof groupNameJson === "string") return groupNameJson;
    if (typeof groupNameJson === "object") {
      return (
        (groupNameJson.group_name as string) ||
        (groupNameJson.line_group_name as string) ||
        (groupNameJson.name as string) ||
        ""
      );
    }
    return "";
  }

  async function assignTasks() {
    setAssignStatus(null);
    if (!groupId) {
    setAssignStatus("No groupId. Please open from inside group.");
    return;
    }
    if (taskRows.length === 0) {
      setAssignStatus("No tasks.");
      return;
    }
    // Validate required fields in every row
    for (let i = 0; i < taskRows.length; i++) {
      const r = taskRows[i];

      if (!r.assignedToName || r.assignedToName.trim() === "") {
        setAssignStatus(`Row ${i + 1}: please select "assigned to"`);
        return;
      }
      if (!r.task || r.task.trim() === "") {
        setAssignStatus(`Row ${i + 1}: task cannot be empty`);
        return;
      }
      if (!r.dueDate || r.dueDate.trim() === "") {
        setAssignStatus(`Row ${i + 1}: please select "due date"`);
        return;
      }
    }
    const payload: Record<string, any> = {};
    taskRows.forEach((r, idx) => {
      payload[String(idx + 1)] = {
        "group_id": groupId,
        "assigned_to_line_display_name": r.assignedToName,
        "assigned_by_line_display_name": currentUserName,
        task: r.task,
        "assign_date": r.assignDateISO,
        "due_date": r.dueDate,
      };
    });

    try {
      setAssigning(true);
      const res = await fetch("/bot/api/post/task/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) {
        setAssignStatus(`Error ${res.status}: ${text}`);
        return;
      }
      setAssignStatus("Assigned ✅");
      console.log("assign payload:", payload);
    } catch (e: any) {
      setAssignStatus(e?.message ?? "Assign failed");
    } finally {
      setAssigning(false);
    }
  }

  useEffect(() => {
    if (!groupId) return; // no group id yet

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrMsg(null);

        const gmem_data = await GetGroupMember(groupId);
        const gname_data = await GetGroupName(groupId)
        if (!cancelled) {
          setGroupMemJson(gmem_data);
          setGroupNameJson(gname_data);
        }
      } catch (e: any) {
        if (!cancelled) setErrMsg(e?.message ?? "failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [groupId]);
  return (
  <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
    {/* Optional: loading / error UI */}
    {loading && <div style={{ marginBottom: 10 }}>Loading group data...</div>}
    {errMsg && <div style={{ marginBottom: 10, color: "crimson" }}>{errMsg}</div>}

    {/* Group name centered */}
    <div
      style={{
        textAlign: "center",
        fontWeight: 800,
        fontSize: 18,
        margin: "12px 0 16px",
      }}
    >
      {getGroupNameText() || "Group"}
    </div>

    {/* Table container */}
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1.2fr 2.2fr 1.2fr 1.2fr 0.7fr",
          background: "#fafafa",
          borderBottom: "1px solid #e5e5e5",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        <div style={{ padding: 12 }}>assigned to</div>
        <div style={{ padding: 12 }}>assigned by</div>
        <div style={{ padding: 12 }}>task</div>
        <div style={{ padding: 12 }}>assign date</div>
        <div style={{ padding: 12 }}>due date</div>
        <div style={{ padding: 12, textAlign: "right" }}>action</div>
      </div>

      {/* Rows */}
      {taskRows.map((r) => (
        <div
          key={r.id}
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1.2fr 2.2fr 1.2fr 1.2fr 0.7fr",
            borderBottom: "1px solid #f0f0f0",
            alignItems: "center",
          }}
        >
          {/* assigned to: dropdown + selected picture */}
          <div style={{ padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
            <select
              value={r.assignedToName}
              onChange={(e) => updateTaskRow(r.id, { assignedToName: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "white",
              }}
            >
              <option value="">Select member</option>
              {memberList().map((m) => (
                <option key={m.display_name} value={m.display_name}>
                  {m.display_name}
                </option>
              ))}
            </select>

            {r.assignedToName && getSelectedPic(r.assignedToName) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getSelectedPic(r.assignedToName)}
                alt=""
                width={28}
                height={28}
                style={{ borderRadius: 999, border: "1px solid #ddd" }}
              />
            ) : null}
          </div>

          {/* assigned by: fixed current user */}
          <div style={{ padding: 12 }}>
            <div
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: 10,
                border: "1px solid #eee",
                background: "#f7f7f7",
              }}
              title={currentUserName}
            >
              {currentUserName}
            </div>
          </div>

          {/* task input */}
          <div style={{ padding: 12 }}>
            <input
              value={r.task}
              onChange={(e) => updateTaskRow(r.id, { task: e.target.value })}
              placeholder="Type task..."
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
          </div>

          {/* assign date fixed */}
          <div style={{ padding: 12 }}>
            <div
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: 10,
                border: "1px solid #eee",
                background: "#f7f7f7",
              }}
              title={r.assignDateISO}
            >
              {toPrettyDate(r.assignDateISO)}
            </div>
          </div>

          {/* due date picker */}
          <div style={{ padding: 12 }}>
            <input
              type="date"
              value={r.dueDate}
              onChange={(e) => updateTaskRow(r.id, { dueDate: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
          </div>

          {/* remove */}
          <div style={{ padding: 12, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => removeTaskRow(r.id)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "white",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {/* Add task button row */}
      <div style={{ padding: 12 }}>
        <button
          type="button"
          onClick={addTaskRow}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          + Add task
        </button>
      </div>
    </div>

    {/* Bottom right Assign */}
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, gap: 12 }}>
      <div style={{ fontSize: 13, opacity: 0.9 }}>{assignStatus ?? ""}</div>

      <button
        type="button"
        onClick={assignTasks}
        disabled={assigning}
        style={{
          padding: "12px 18px",
          borderRadius: 12,
          border: "none",
          background: assigning ? "#444" : "black",
          color: "white",
          cursor: assigning ? "not-allowed" : "pointer",
          fontWeight: 800,
        }}
      >
        {assigning ? "Assigning..." : "Assign"}
      </button>
    </div>
  </main>
);
}

