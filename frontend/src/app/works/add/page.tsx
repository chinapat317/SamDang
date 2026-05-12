"use client";

import { useState } from "react";

export default function AddWorkPage() {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    // For now: just show a success message.
    // If you have a backend later, you can POST this data to /api/work/add or your proxy path.
    const payload = { title, assignee, dueDate, detail };
    console.log("Work payload:", payload);

    setStatus("Saved ✅ (check console for payload)");
  }

  return (
    <main style={{ padding: 24, maxWidth: 560 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Add Work</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Prepare report"
            required
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Assignee</span>
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="e.g. Chinapat"
            required
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Due date</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Detail</span>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Describe the task..."
            rows={5}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "none",
            background: "black",
            color: "white",
            cursor: "pointer",
          }}
        >
          Submit
        </button>
      </form>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </main>
  );
}