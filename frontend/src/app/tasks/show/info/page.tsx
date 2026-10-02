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

export default function TaskInfoPage() {
  const router = useRouter();
  const liffSession = useLiffSession();
  const { accessToken, liff_loading } = liffSession;
  const hasLiffSession = useRequireLiffSession(liffSession);
  const { selectedGroup } = useMyGroup();
  const [task, setTask] = useState<TaskCanEditItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [groupNameJson, setGroupNameJson] = useState<unknown>(
    selectedGroup?.group_name ?? selectedGroup?.line_group_name ?? null,
  );
  const [queryParams] = useState(() => {
    if (typeof window === "undefined") return { gid: "", tid: "" };
    const params = new URLSearchParams(window.location.search);
    return {
      gid: params.get("gid") || "",
      tid: params.get("tid") || "",
    };
  });

  const activeGroupId = selectedGroup?.group_id || queryParams.gid;
  const groupName =
    (typeof groupNameJson === "string" && groupNameJson) ||
    selectedGroup?.group_name ||
    selectedGroup?.line_group_name ||
    "กลุ่ม";

  useEffect(() => {
    if (!activeGroupId || !queryParams.tid) return;

    let cancelled = false;

    async function loadTaskInfo() {
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
          // Keep task info available even if the group display name cannot be refreshed.
        }

        if (!cancelled) {
          setTask(groupTasks.find((item) => String(item.id) === queryParams.tid) ?? null);
          setLoaded(true);
        }
      } catch (e: unknown) {
      if (!cancelled) setErrMsg(e instanceof Error ? e.message : "โหลดข้อมูลงานไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTaskInfo();
    return () => {
      cancelled = true;
    };
  }, [accessToken, activeGroupId, queryParams.tid]);

  function goBack() {
    if (!activeGroupId) {
      navigateInFrontend(router, "/tasks/show");
      return;
    }
    navigateInFrontend(router, `/tasks/show?gid=${encodeURIComponent(activeGroupId)}`);
  }

  if (liff_loading || (!!activeGroupId && !!queryParams.tid && (loading || !loaded))) {
    return <PageMessage title="กำลังโหลด..." detail="กำลังเตรียมข้อมูลงาน" />;
  }

  if (!hasLiffSession) {
    return null;
  }

  if (!activeGroupId) {
    return <PageMessage title="ยังไม่ได้เลือกกลุ่ม" detail="กรุณาเลือกกลุ่มจากหน้างาน" />;
  }

  if (!queryParams.tid) {
    return <PageMessage title="ยังไม่ได้เลือกงาน" detail="กรุณาเลือกงานจากรายการ" />;
  }

  if (errMsg) {
    return <PageMessage title="ไม่สามารถโหลดงานได้" detail={errMsg} />;
  }

  if (!task) {
    return <PageMessage title="ไม่พบงาน" detail="กรุณากลับไปเลือกงานอื่น" />;
  }

  return (
    <main className="taskInfoPage">
      <div className="headerRow">
        <div>
          <div className="pageTitle">{task.title || "-"}</div>
          <div className="groupName">กลุ่ม: {groupName}</div>
        </div>
        <button type="button" className="backButton" onClick={goBack}>
          กลับ
        </button>
      </div>

      <section className="infoPanel" aria-label="ข้อมูลงาน">
        <InfoRow label="รายละเอียด" value={task.description || "-"} multiline />
        <InfoRow label="ผู้รับผิดชอบ" value={task.assigned_to || "-"} />
        <InfoRow label="ผู้มอบหมาย" value={task.assigned_by || "-"} />
        <InfoRow label="ผู้ตรวจ" value={task.checked_by || "-"} />
        <InfoRow label="วันครบกำหนด" value={task.due_date || "-"} />
        <InfoRow label="สถานะ" value={task.status === "done" ? "เสร็จแล้ว" : task.status === "in progress" ? "กำลังดำเนินการ" : task.status || "-"} />
      </section>

      <style jsx>{`
        .taskInfoPage {
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .headerRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin: 8px 0 16px;
        }

        .pageTitle {
          min-width: 0;
          font-size: 22px;
          font-weight: 800;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .groupName {
          margin-top: 4px;
          color: #555;
          font-size: 13px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .backButton {
          flex: 0 0 auto;
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

        .infoPanel {
          width: 100%;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          overflow: hidden;
          background: white;
        }

        @media (max-width: 560px) {
          .headerRow {
            display: grid;
          }

          .backButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

function InfoRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: ReactNode;
  multiline?: boolean;
}) {
  return (
    <div className="infoRow">
      <div className="label">{label}</div>
      <div className={multiline ? "value multiline" : "value"}>{value}</div>

      <style jsx>{`
        .infoRow {
          display: grid;
          grid-template-columns: minmax(120px, 180px) minmax(0, 1fr);
          gap: 12px;
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
          box-sizing: border-box;
        }

        .infoRow:last-child {
          border-bottom: 0;
        }

        .label {
          color: #555;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.35;
        }

        .value {
          min-width: 0;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .multiline {
          white-space: pre-wrap;
        }

        @media (max-width: 560px) {
          .infoRow {
            grid-template-columns: 1fr;
            gap: 6px;
          }
        }
      `}</style>
    </div>
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
