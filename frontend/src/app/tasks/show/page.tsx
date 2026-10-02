"use client";

import { GetGroupInfo } from "@/commonFunc/group";
import { useRequireLiffSession } from "@/commonFunc/liffSession";
import { GetMyGroupShowTasks } from "@/commonFunc/task";
import { useMyGroup } from "@/context/MyGroup";
import { useLiffSession } from "@/lib/liff-session";
import { TaskCanEditItem } from "@/types/types";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

function navigateInFrontend(router: { push: (path: string) => void }, path: string) {
  const isFrontPath =
    window.location.pathname === "/front" || window.location.pathname.startsWith("/front/");
  if (isFrontPath) {
    window.location.assign(`/front${path}`);
    return;
  }
  router.push(path);
}

export default function ShowTasksPage() {
  const router = useRouter();
  const liffSession = useLiffSession();
  const { accessToken, liff_loading } = liffSession;
  const hasLiffSession = useRequireLiffSession(liffSession);
  const { selectedGroup } = useMyGroup();
  const [tasks, setTasks] = useState<TaskCanEditItem[]>([]);
  const [hideDone, setHideDone] = useState(false);
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
    "กลุ่ม";
  const visibleTasks = hideDone ? tasks.filter((task) => task.status !== "done") : tasks;

  function openTaskInfo(task: TaskCanEditItem) {
    if (!activeGroupId) return;
    navigateInFrontend(
      router,
      `/tasks/show/info?gid=${encodeURIComponent(activeGroupId)}&tid=${encodeURIComponent(String(task.id))}`,
    );
  }

  useEffect(() => {
    if (!activeGroupId) return;

    let cancelled = false;

    async function loadTasks() {
      try {
        setLoading(true);
        setLoaded(false);
        setErrMsg(null);
        const groupTasks = await GetMyGroupShowTasks(accessToken, activeGroupId);
        try {
          const groupInfo = await GetGroupInfo(accessToken, activeGroupId);
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
      if (!cancelled) setErrMsg(e instanceof Error ? e.message : "โหลดข้อมูลงานไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTasks();
    return () => {
      cancelled = true;
    };
  }, [accessToken, activeGroupId]);

  if (liff_loading || (!!activeGroupId && (loading || !loaded))) {
    return <PageMessage title="กำลังโหลด..." detail="กำลังเตรียมข้อมูลงาน" />;
  }

  if (!hasLiffSession) {
    return null;
  }

  if (!activeGroupId) {
    return <PageMessage title="ยังไม่ได้เลือกกลุ่ม" detail="กรุณาเลือกกลุ่มจากหน้างาน" />;
  }

  if (errMsg) {
    return <PageMessage title="ไม่สามารถโหลดงานได้" detail={errMsg} />;
  }

  return (
    <main className="showPage">
      <button
        type="button"
        className="backButton"
        onClick={() => navigateInFrontend(router, "/tasks")}
      >
        กลับ
      </button>
      <div className="headerRow">
        <div className="pageTitle">งานของกลุ่ม: {groupName}</div>
        <label className="hideDoneControl">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(event) => setHideDone(event.target.checked)}
          />
          <span>ซ่อนงานที่เสร็จแล้ว</span>
        </label>
      </div>

      {visibleTasks.length === 0 ? (
        <div className="emptyState">ไม่พบงาน</div>
      ) : (
        <section className="taskPanel" aria-label="รายการงาน">
          <div className="taskGrid taskHeader" aria-hidden="true">
            <div>ชื่องาน</div>
            <div>วันครบกำหนด</div>
          </div>

          {visibleTasks.map((task, index) => (
            <button
              type="button"
              className="taskGrid taskRow"
              key={task.id || `${task.title}-${index}`}
              onClick={() => openTaskInfo(task)}
            >
              <div className="taskCell">
                <span className="mobileLabel">ชื่องาน</span>
                <span className="cellText">{task.title || "-"}</span>
              </div>
              <div className="taskCell">
                <span className="mobileLabel">วันครบกำหนด</span>
                <span className="cellText">{task.due_date || "-"}</span>
              </div>
            </button>
          ))}
        </section>
      )}

      <style jsx>{`
        .showPage {
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .backButton {
          min-height: 40px;
          margin-bottom: 12px;
          padding: 9px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          color: #111;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .backButton:hover,
        .backButton:focus-visible {
          border-color: #111;
        }

        .headerRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .pageTitle {
          min-width: 0;
          margin: 8px 0 0;
          font-size: 20px;
          font-weight: 800;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .hideDoneControl {
          flex: 0 0 auto;
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          color: #111;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.3;
          cursor: pointer;
          user-select: none;
        }

        .hideDoneControl input {
          width: 18px;
          height: 18px;
          margin: 0;
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
          grid-template-columns: minmax(0, 1fr) minmax(110px, 160px);
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
          width: 100%;
          border: 0;
          border-bottom: 1px solid #f0f0f0;
          background: white;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .taskRow:last-child {
          border-bottom: 0;
        }

        .taskRow:hover,
        .taskRow:focus-visible {
          background: #fafafa;
        }

        .taskRow:focus-visible {
          outline: 2px solid #111;
          outline-offset: -2px;
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

        @media (max-width: 820px) {
          .backButton {
            width: 100%;
          }

          .headerRow {
            display: grid;
            gap: 10px;
          }

          .hideDoneControl {
            justify-self: start;
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
            grid-template-columns: minmax(86px, 34%) minmax(0, 1fr);
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
