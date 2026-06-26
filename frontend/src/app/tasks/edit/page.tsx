"use client";

import { GetGroupInfo } from "@/commonFunc/group";
import { ConfirmMyGroupTasks, GetMyGroupTasks } from "@/commonFunc/task";
import { useLiffProf } from "@/context/LiffProf";
import { useMyGroup } from "@/context/MyGroup";
import { LiffProf, TaskCanEditItem } from "@/types/types";
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

function editDraftKey(uid: string, groupId: string) {
  return `samdang.tasks.edit.${uid}.${groupId}`;
}

export default function EditTasksPage() {
  const router = useRouter();
  const { uid, liff_loading } = useLiffProf() as LiffProf;
  const { selectedGroup } = useMyGroup();
  const [tasks, setTasks] = useState<TaskCanEditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadedDraftKey, setLoadedDraftKey] = useState("");
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
    "Group";

  useEffect(() => {
    if (!uid || !activeGroupId) return;

    let cancelled = false;

    async function loadTasks() {
      try {
        setLoading(true);
        setLoaded(false);
        setErrMsg(null);
        const myTasks = await GetMyGroupTasks(uid, activeGroupId);
        try {
          const groupInfo = await GetGroupInfo(activeGroupId);
          if (!cancelled) {
            setGroupNameJson(groupInfo.group_name ?? groupInfo.line_group_name);
          }
        } catch {
          // Keep task editing available even if the group display name cannot be refreshed.
        }
        if (!cancelled) {
          const key = editDraftKey(uid, activeGroupId);
          const savedDraft = window.localStorage.getItem(key);
          if (savedDraft) {
            try {
              const savedTasks = JSON.parse(savedDraft);
              setTasks(Array.isArray(savedTasks) ? mergeTaskDraft(myTasks, savedTasks) : myTasks);
            } catch {
              window.localStorage.removeItem(key);
              setTasks(myTasks);
            }
          } else {
            setTasks(myTasks);
          }
          setLoadedDraftKey(key);
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

  useEffect(() => {
    if (!uid || !activeGroupId || !loaded) return;

    const key = editDraftKey(uid, activeGroupId);
    if (loadedDraftKey !== key) return;

    window.localStorage.setItem(key, JSON.stringify(tasks));
  }, [activeGroupId, loaded, loadedDraftKey, tasks, uid]);

  function updateTask(index: number, patch: Partial<TaskCanEditItem>) {
    setTasks((current) =>
      current.map((task, taskIndex) => (taskIndex === index ? { ...task, ...patch } : task)),
    );
  }

  async function confirmEditTasks() {
    if (!uid || !activeGroupId) return;
    if (tasks.length === 0) {
      setConfirmStatus("No tasks to update.");
      return;
    }

    try {
      setConfirming(true);
      setConfirmStatus(null);
      await ConfirmMyGroupTasks(uid, activeGroupId, tasks);
      window.localStorage.removeItem(editDraftKey(uid, activeGroupId));
      navigateInFrontend(router, "/tasks?edited=1");
    } catch (e: unknown) {
      setConfirmStatus(e instanceof Error ? e.message : "Update failed");
    } finally {
      setConfirming(false);
    }
  }

  if (liff_loading || (!!uid && !!activeGroupId && (loading || !loaded))) {
    return <PageMessage title="Loading..." detail="Preparing editable tasks" />;
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
    <main className="editPage">
      <div className="pageTitle">edit tasks for group: {groupName}</div>

      {tasks.length === 0 ? (
        <div className="emptyState">No tasks found.</div>
      ) : (
        <section className="taskList" aria-label="Editable task list">
          {tasks.map((task, index) => (
            <article className="taskItem" key={task.id || `${task.title}-${index}`}>
              <div className="fieldBlock">
                <label>Task title</label>
                <div className="readonlyField" title={task.title}>
                  {task.title || "-"}
                </div>
              </div>

              <div className="fieldBlock">
                <label>Assigned by</label>
                <div className="readonlyField" title={task.assigned_by}>
                  {task.assigned_by || "-"}
                </div>
              </div>

              <div className="fieldBlock">
                <label>Assigned to</label>
                <div className="readonlyField" title={task.assigned_to}>
                  {task.assigned_to || "-"}
                </div>
              </div>

              <div className="fieldBlock fullWidth">
                <label htmlFor={`description-${index}`}>Description</label>
                <textarea
                  id={`description-${index}`}
                  className="textareaField"
                  value={task.description}
                  onChange={(e) => updateTask(index, { description: e.target.value })}
                />
              </div>

              <div className="fieldBlock">
                <label htmlFor={`due-date-${index}`}>Due date</label>
                <input
                  id={`due-date-${index}`}
                  type="date"
                  className="inputField"
                  value={task.due_date}
                  onChange={(e) => updateTask(index, { due_date: e.target.value })}
                />
              </div>

              <div className="fieldBlock">
                <label htmlFor={`status-${index}`}>Status</label>
                <select
                  id={`status-${index}`}
                  className="inputField"
                  value={task.status}
                  onChange={(e) =>
                    updateTask(index, { status: e.target.value as TaskCanEditItem["status"] })
                  }
                >
                  <option value="in progress">in progress</option>
                  <option value="done">done</option>
                </select>
              </div>
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
          onClick={confirmEditTasks}
        >
          {confirming ? "Updating..." : "Confirm"}
        </button>
      </div>

      <style jsx>{`
        .editPage {
          width: 100%;
          max-width: 980px;
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
        .inputField,
        .textareaField {
          width: 100%;
          min-width: 0;
          border-radius: 8px;
          box-sizing: border-box;
          font: inherit;
        }

        .readonlyField {
          min-height: 42px;
          padding: 10px;
          border: 1px solid #eee;
          background: #f7f7f7;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .inputField {
          min-height: 42px;
          padding: 10px;
          border: 1px solid #ddd;
          background: white;
        }

        .textareaField {
          min-height: 92px;
          resize: vertical;
          padding: 10px;
          border: 1px solid #ddd;
          background: white;
          line-height: 1.4;
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

function mergeTaskDraft(
  serverTasks: TaskCanEditItem[],
  draftTasks: TaskCanEditItem[],
): TaskCanEditItem[] {
  const draftById = new Map(draftTasks.map((task) => [task.id, task]));
  return serverTasks.map((task) => {
    const draft = draftById.get(task.id);
    if (!draft) return task;

    return {
      ...task,
      description: draft.description,
      status: draft.status,
      due_date: draft.due_date,
    };
  });
}
