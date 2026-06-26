"use client";

import { GetGroupInfo } from "@/commonFunc/group";
import { GetMyGroupShowTasks } from "@/commonFunc/task";
import { useLiffProf } from "@/context/LiffProf";
import { useMyGroup } from "@/context/MyGroup";
import { LiffProf, TaskCanEditItem } from "@/types/types";
import { ReactNode, useEffect, useState } from "react";

export default function ShowTasksPage() {
  const { uid, liff_loading } = useLiffProf() as LiffProf;
  const { selectedGroup } = useMyGroup();
  const [tasks, setTasks] = useState<TaskCanEditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [groupNameJson, setGroupNameJson] = useState<unknown>(
    selectedGroup?.group_name ?? selectedGroup?.line_group_name ?? null,
  );
  const [selectedGroupFromUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("gid") || "";
  });

  const activeGroupId = selectedGroup?.group_id || selectedGroupFromUrl;
  const groupName =
    (typeof groupNameJson === "string" && groupNameJson) ||
    selectedGroup?.group_name ||
    selectedGroup?.line_group_name ||
    "Group";

  useEffect(() => {
    if (!uid || !activeGroupId) return;

    let cancelled = false;

    async function loadTasks() {
      try {
        setLoading(true);
        setLoaded(false);
        setErrMsg(null);
        const groupTasks = await GetMyGroupShowTasks(uid, activeGroupId);
        try {
          const groupInfo = await GetGroupInfo(activeGroupId);
          if (!cancelled) {
            setGroupNameJson(groupInfo.group_name ?? groupInfo.line_group_name);
          }
        } catch {
          // Keep showing tasks even if the display name cannot be refreshed.
        }
        if (!cancelled) {
          setTasks(groupTasks);
          setLoaded(true);
        }
      } catch (e: unknown) {
        if (!cancelled) setErrMsg(e instanceof Error ? e.message : "Failed to load tasks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTasks();
    return () => {
      cancelled = true;
    };
  }, [activeGroupId, uid]);

  if (liff_loading || (!!uid && !!activeGroupId && (loading || !loaded))) {
    return <PageMessage title="Loading..." detail="Preparing tasks" />;
  }

  if (!uid) {
    return <PageMessage title="No LINE profile" detail="Please open this page from LINE LIFF again." />;
  }

  if (!activeGroupId) {
    return <PageMessage title="No group selected" detail="Please choose a group from the tasks page." />;
  }

  if (errMsg) {
    return <PageMessage title="Cannot load tasks" detail={errMsg} />;
  }

  return (
    <main className="showPage">
      <div className="pageTitle">tasks for group: {groupName}</div>

      {tasks.length === 0 ? (
        <div className="emptyState">No tasks found.</div>
      ) : (
        <section className="taskPanel" aria-label="Task list">
          <div className="taskGrid taskHeader" aria-hidden="true">
            <div>task title</div>
            <div>description</div>
            <div>assigned to</div>
            <div>assigned by</div>
            <div>due date</div>
            <div>status</div>
          </div>

          {tasks.map((task, index) => (
            <article className="taskGrid taskRow" key={task.id || `${task.title}-${index}`}>
              <div className="taskCell">
                <span className="mobileLabel">task title</span>
                <span className="cellText">{task.title || "-"}</span>
              </div>
              <div className="taskCell">
                <span className="mobileLabel">description</span>
                <span className="cellText descriptionText">{task.description || "-"}</span>
              </div>
              <div className="taskCell">
                <span className="mobileLabel">assigned to</span>
                <span className="cellText">{task.assigned_to || "-"}</span>
              </div>
              <div className="taskCell">
                <span className="mobileLabel">assigned by</span>
                <span className="cellText">{task.assigned_by || "-"}</span>
              </div>
              <div className="taskCell">
                <span className="mobileLabel">due date</span>
                <span className="cellText">{task.due_date || "-"}</span>
              </div>
              <div className="taskCell">
                <span className="mobileLabel">status</span>
                <span className="cellText">{task.status || "-"}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      <style jsx>{`
        .showPage {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .pageTitle {
          margin: 8px 0 16px;
          text-align: center;
          font-size: 20px;
          font-weight: 800;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .emptyState {
          margin: 32px auto;
          text-align: center;
          color: #555;
          line-height: 1.5;
        }

        .taskPanel {
          width: 100%;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          overflow: hidden;
          background: white;
        }

        .taskGrid {
          display: grid;
          grid-template-columns:
            minmax(150px, 1.4fr) minmax(180px, 1.7fr) minmax(130px, 1.1fr)
            minmax(130px, 1.1fr) minmax(110px, 0.9fr) minmax(110px, 0.9fr);
          align-items: stretch;
        }

        .taskHeader {
          background: #fafafa;
          border-bottom: 1px solid #e5e5e5;
          font-size: 13px;
          font-weight: 800;
        }

        .taskHeader > div,
        .taskCell {
          padding: 12px;
          box-sizing: border-box;
        }

        .taskRow {
          border-bottom: 1px solid #f0f0f0;
        }

        .taskRow:last-child {
          border-bottom: 0;
        }

        .mobileLabel {
          display: none;
        }

        .cellText {
          display: block;
          min-width: 0;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .descriptionText {
          white-space: pre-wrap;
        }

        @media (max-width: 820px) {
          .pageTitle {
            text-align: left;
          }

          .taskPanel {
            border: 0;
            border-radius: 0;
            background: transparent;
            overflow: visible;
          }

          .taskHeader {
            display: none;
          }

          .taskGrid {
            display: block;
          }

          .taskRow {
            margin-bottom: 12px;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            background: white;
            overflow: hidden;
          }

          .taskCell {
            display: grid;
            grid-template-columns: minmax(96px, 34%) minmax(0, 1fr);
            gap: 10px;
            padding: 10px 12px;
            border-bottom: 1px solid #f3f3f3;
          }

          .taskCell:last-child {
            border-bottom: 0;
          }

          .mobileLabel {
            display: block;
            color: #555;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.3;
          }
        }

        @media (max-width: 430px) {
          .taskCell {
            grid-template-columns: 1fr;
            gap: 6px;
          }
        }
      `}</style>
    </main>
  );
}

function PageMessage({ title, detail }: { title: string; detail: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "55vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", lineHeight: 1.5 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, opacity: 0.72 }}>{detail}</div>
      </div>
    </div>
  );
}
