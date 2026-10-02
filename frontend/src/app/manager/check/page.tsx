"use client";

import { GetGroupInfo } from "@/commonFunc/group";
import { useRequireLiffSession } from "@/commonFunc/liffSession";
import { ConfirmMyGroupCheckTasks, GetMyGroupDoneTasks } from "@/commonFunc/task";
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

export default function CheckPage() {
  const router = useRouter();
  const liffSession = useLiffSession();
  const { accessToken, liff_loading } = liffSession;
  const hasLiffSession = useRequireLiffSession(liffSession);
  const { selectedGroup } = useMyGroup();
  const [tasks, setTasks] = useState<TaskCanEditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
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

  useEffect(() => {
    if (!accessToken || !activeGroupId) return;

    let cancelled = false;

    async function loadTasks() {
      try {
        setLoading(true);
        setLoaded(false);
        setErrMsg(null);
        const myTasks = await GetMyGroupDoneTasks(accessToken, activeGroupId);
        try {
          const groupInfo = await GetGroupInfo(accessToken, activeGroupId);
          if (!cancelled) setGroupNameJson(groupInfo.group_name ?? groupInfo.line_group_name);
        } catch {
          // Keep task checking available even if the group display name cannot be refreshed.
        }
        if (!cancelled) {
          setTasks(myTasks.map((task) => ({ ...task, checked: false })));
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

  function updateTask(index: number, patch: Partial<TaskCanEditItem>) {
    setTasks((current) =>
      current.map((task, taskIndex) => (taskIndex === index ? { ...task, ...patch } : task)),
    );
  }

  async function confirmCheckTasks() {
    if (!accessToken || !activeGroupId) return;
    if (tasks.length === 0) {
      setConfirmStatus("ไม่มีงานให้อัปเดต");
      return;
    }

    try {
      setConfirming(true);
      setConfirmStatus(null);
      await ConfirmMyGroupCheckTasks(accessToken, activeGroupId, tasks);
      setConfirmStatus("อัปเดตการตรวจงานแล้ว");
    } catch (e: unknown) {
      setConfirmStatus(e instanceof Error ? e.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setConfirming(false);
    }
  }

  if (liff_loading || (!!accessToken && !!activeGroupId && (loading || !loaded))) {
    return <PageMessage title="กำลังโหลด..." detail="กำลังเตรียมงานสำหรับตรวจสอบ" />;
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
    <main className="checkPage">
      <button
        type="button"
        className="backButton"
        onClick={() => navigateInFrontend(router, "/tasks")}
      >
        กลับ
      </button>
      <div className="pageTitle">ตรวจงานสำหรับกลุ่ม: {groupName}</div>

      {tasks.length === 0 ? (
        <div className="emptyState">ไม่พบงาน</div>
      ) : (
        <section className="taskList" aria-label="รายการตรวจงาน">
          {tasks.map((task, index) => (
            <article className="taskItem" key={task.id || `${task.title}-${index}`}>
              <div className="fieldBlock">
                <label>ชื่องาน</label>
                <div className="readonlyField" title={task.title}>
                  {task.title || "-"}
                </div>
              </div>

              <div className="fieldBlock">
                <label>ผู้มอบหมาย</label>
                <div className="readonlyField" title={task.assigned_by}>
                  {task.assigned_by || "-"}
                </div>
              </div>

              <div className="fieldBlock">
                <label>ผู้รับผิดชอบ</label>
                <div className="readonlyField" title={task.assigned_to}>
                  {task.assigned_to || "-"}
                </div>
              </div>

              <div className="fieldBlock">
                <label>วันครบกำหนด</label>
                <div className="readonlyField" title={task.due_date}>
                  {task.due_date || "-"}
                </div>
              </div>

              <div className="fieldBlock fullWidth">
                <label>รายละเอียด</label>
                <div className="readonlyArea">{task.description || "-"}</div>
              </div>

              <div className="fieldBlock">
                <label htmlFor={`status-${index}`}>สถานะ</label>
                <select
                  id={`status-${index}`}
                  className="inputField"
                  value={task.status}
                  onChange={(e) =>
                    updateTask(index, { status: e.target.value as TaskCanEditItem["status"] })
                  }
                >
                  <option value="in progress">กำลังดำเนินการ</option>
                  <option value="done">เสร็จแล้ว</option>
                </select>
              </div>

              <label className="checkControl" htmlFor={`checked-${index}`}>
                <input
                  id={`checked-${index}`}
                  type="checkbox"
                  checked={task.checked}
                  onChange={(e) => updateTask(index, { checked: e.target.checked })}
                />
                <span>ตรวจแล้ว</span>
              </label>
            </article>
          ))}
        </section>
      )}

      <div className="footerActions">
        <div className="confirmStatus">{confirmStatus ?? ""}</div>
        <button
          type="button"
          className="confirmButton"
          disabled={confirming || tasks.length === 0}
          onClick={confirmCheckTasks}
        >
          {confirming ? "กำลังอัปเดต..." : "ยืนยัน"}
        </button>
      </div>

      <style jsx>{`
        .checkPage {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .backButton {
          min-height: 40px;
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

        .taskList {
          display: grid;
          gap: 14px;
        }

        .taskItem {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          padding: 14px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          background: white;
          box-sizing: border-box;
        }

        .fieldBlock {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .fullWidth {
          grid-column: 1 / -1;
        }

        label {
          font-size: 12px;
          font-weight: 800;
          color: #555;
          line-height: 1.3;
        }

        .readonlyField,
        .readonlyArea,
        .inputField {
          width: 100%;
          min-width: 0;
          border-radius: 8px;
          box-sizing: border-box;
          font: inherit;
        }

        .readonlyField,
        .readonlyArea {
          padding: 10px;
          border: 1px solid #eee;
          background: #f7f7f7;
        }

        .readonlyField {
          min-height: 42px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .readonlyArea {
          min-height: 72px;
          line-height: 1.4;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .inputField {
          min-height: 42px;
          padding: 10px;
          border: 1px solid #ddd;
          background: white;
        }

        .checkControl {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          align-self: end;
          color: #111;
          font-size: 14px;
          cursor: pointer;
        }

        .checkControl input {
          width: 18px;
          height: 18px;
          margin: 0;
        }

        .footerActions {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-top: 16px;
        }

        .confirmStatus {
          min-width: 0;
          font-size: 13px;
          line-height: 1.4;
          opacity: 0.9;
          overflow-wrap: anywhere;
        }

        .confirmButton {
          flex: 0 0 auto;
          min-height: 42px;
          padding: 12px 18px;
          border: 0;
          border-radius: 8px;
          background: black;
          color: white;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .confirmButton:disabled {
          background: #444;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .backButton {
            width: 100%;
          }

          .pageTitle {
            text-align: left;
          }

          .taskItem {
            grid-template-columns: 1fr;
          }

          .footerActions {
            flex-direction: column;
          }

          .confirmButton {
            width: 100%;
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
