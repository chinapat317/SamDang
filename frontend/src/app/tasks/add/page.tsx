"use client";

import {
  GetGroupInfo,
  GetSelectedPic,
  MemberList,
} from "@/commonFunc/group";
import { useLiffProf } from "@/context/LiffProf";
import { useMyGroup } from "@/context/MyGroup";
import { GroupInfo, LiffProf, TaskRow } from "@/types/types";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  addTaskRow,
  assignTasks,
  removeTaskRow,
  toPrettyDate,
  updateTaskRow,
} from "./funcs";

function navigateInFrontend(router: { push: (path: string) => void }, path: string) {
  const isFrontPath =
    window.location.pathname === "/front" || window.location.pathname.startsWith("/front/");
  if (isFrontPath) {
    window.location.assign(`/front${path}`);
    return;
  }
  router.push(path);
}

function addDraftKey(uid: string, groupId: string) {
  return `samdang.tasks.add.${uid}.${groupId}`;
}

export default function AddWork() {
  const router = useRouter();
  const { uid, liff_loading, displayName } = useLiffProf() as LiffProf;
  const { selectedGroup, setSelectedGroup } = useMyGroup();
  const currentUserName = displayName || uid || "Unknown";
  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [assignStatus, setAssignStatus] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [groupMemJson, setGroupMemJson] = useState<unknown>(selectedGroup);
  const [groupNameJson, setGroupNameJson] = useState<unknown>(
    selectedGroup?.group_name ?? selectedGroup?.line_group_name ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [groupDataLoaded, setGroupDataLoaded] = useState(Boolean(selectedGroup));
  const [loadedDraftKey, setLoadedDraftKey] = useState("");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [selectedGroupFromUrl] = useState(() => {
    if (typeof window === "undefined") {
      return { id: "", name: null as string | null };
    }

    const params = new URLSearchParams(window.location.search);
    return { id: params.get("gid") || "", name: null as string | null };
  });

  const activeGroupId = selectedGroup?.group_id || selectedGroupFromUrl.id || "";

  useEffect(() => {
    if (!uid || !activeGroupId) return;

    const timer = window.setTimeout(() => {
      const key = addDraftKey(uid, activeGroupId);
      const savedDraft = window.localStorage.getItem(key);
      if (!savedDraft) {
        setLoadedDraftKey(key);
        return;
      }

      try {
        const savedRows = JSON.parse(savedDraft);
        if (Array.isArray(savedRows)) {
          setTaskRows(savedRows);
        }
      } catch {
        window.localStorage.removeItem(key);
      } finally {
        setLoadedDraftKey(key);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeGroupId, uid]);

  useEffect(() => {
    if (!uid || !activeGroupId) return;

    const key = addDraftKey(uid, activeGroupId);
    if (loadedDraftKey !== key) return;

    window.localStorage.setItem(key, JSON.stringify(taskRows));
  }, [activeGroupId, loadedDraftKey, taskRows, uid]);

  useEffect(() => {
    if (!activeGroupId || !uid) return;
    if (selectedGroup?.group_id === activeGroupId && MemberList(selectedGroup).length > 0) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setGroupDataLoaded(false);
        setErrMsg(null);
        const groupInfo = await GetGroupInfo(activeGroupId);
        if (!cancelled) {
          setGroupMemJson(groupInfo);
          setGroupNameJson(groupInfo.group_name ?? groupInfo.line_group_name);
          setSelectedGroup(normalizeSelectedGroup(activeGroupId, groupInfo));
          setGroupDataLoaded(true);
        }
      } catch (e: unknown) {
        if (!cancelled) setErrMsg(e instanceof Error ? e.message : "failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeGroupId, selectedGroup, setSelectedGroup, uid]);

  if (liff_loading || (!!activeGroupId && !!uid && (loading || !groupDataLoaded))) {
    return <LoadingScreen />;
  }

  if (errMsg) {
    return <PageMessage>{errMsg}</PageMessage>;
  }

  if (!uid) {
    return <PageMessage>Cannot load LINE profile. Please open this page from LINE LIFF again.</PageMessage>;
  }

  const groupName =
    (typeof groupNameJson === "string" && groupNameJson) ||
    selectedGroup?.group_name ||
    selectedGroup?.line_group_name ||
    "Group";

  return (
    <main className="taskPage">
      <div className="taskTitle">Assign tasks for group: {groupName}</div>

      {loading && <div className="taskNotice">Loading group data...</div>}
      {errMsg && <div className="taskError">{errMsg}</div>}

      <section className="taskPanel" aria-label="Task assignment table">
        <div className="taskGrid taskHeader" aria-hidden="true">
          <div>assigned to</div>
          <div>assigned by</div>
          <div>task</div>
          <div>description</div>
          <div>assign date</div>
          <div>due date</div>
          <div className="alignRight">action</div>
        </div>

        {taskRows.map((r, index) => {
          const selectedPic = GetSelectedPic(groupMemJson, r.assignedToName);

          return (
            <div className="taskGrid taskRow" key={r.id}>
              <div className="taskCell">
                <span className="mobileLabel">assigned to</span>
                <div className="memberSelectWrap">
                  <select
                    value={r.assignedToName}
                    onChange={(e) =>
                      updateTaskRow(setTaskRows, r.id, { assignedToName: e.target.value })
                    }
                    className="field"
                    aria-label={`Row ${index + 1} assigned to`}
                  >
                    <option value="">Select member</option>
                    {MemberList(groupMemJson).map((m) => (
                      <option key={m.display_name} value={m.display_name}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>

                  {r.assignedToName && selectedPic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="avatar" src={selectedPic} alt="" width={28} height={28} />
                  ) : null}
                </div>
              </div>

              <div className="taskCell">
                <span className="mobileLabel">assigned by</span>
                <div className="readonlyField" title={currentUserName}>
                  {currentUserName}
                </div>
              </div>

              <div className="taskCell">
                <span className="mobileLabel">task</span>
                <input
                  value={r.task}
                  onChange={(e) => updateTaskRow(setTaskRows, r.id, { task: e.target.value })}
                  placeholder="Type task..."
                  className="field"
                  aria-label={`Row ${index + 1} task`}
                />
              </div>

              <div className="taskCell descriptionCell">
                <span className="mobileLabel">description</span>
                <textarea
                  value={r.description}
                  onChange={(e) =>
                    updateTaskRow(setTaskRows, r.id, { description: e.target.value })
                  }
                  placeholder="Type description..."
                  className="field textareaField"
                  aria-label={`Row ${index + 1} description`}
                />
              </div>

              <div className="taskCell">
                <span className="mobileLabel">assign date</span>
                <div className="readonlyField" title={r.assignDateISO}>
                  {toPrettyDate(r.assignDateISO)}
                </div>
              </div>

              <div className="taskCell">
                <span className="mobileLabel">due date</span>
                <input
                  type="date"
                  value={r.dueDate}
                  onChange={(e) => updateTaskRow(setTaskRows, r.id, { dueDate: e.target.value })}
                  className="field"
                  aria-label={`Row ${index + 1} due date`}
                />
              </div>

              <div className="taskCell actionCell">
                <span className="mobileLabel">action</span>
                <button
                  type="button"
                  onClick={() => removeTaskRow(setTaskRows, r.id)}
                  className="secondaryButton"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}

        <div className="addRow">
          <button type="button" onClick={() => addTaskRow(setTaskRows)} className="secondaryButton">
            + Add task
          </button>
        </div>
      </section>

      <div className="footerActions">
        <div className="assignStatus">{assignStatus ?? ""}</div>

        <button
          type="button"
          onClick={async () => {
            const assigned = await assignTasks({
              groupId: activeGroupId,
              taskRows,
              currentUserName,
              setAssignStatus,
              setAssigning,
            });
            if (assigned) {
              window.localStorage.removeItem(addDraftKey(uid, activeGroupId));
              navigateInFrontend(router, "/tasks?assigned=1");
            }
          }}
          disabled={assigning}
          className="primaryButton"
        >
          {assigning ? "Assigning..." : "Assign"}
        </button>
      </div>

      <style jsx>{`
        .taskPage {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .taskEmpty {
          width: 100%;
          max-width: 720px;
          margin: 32px auto;
          padding: 0 12px;
          box-sizing: border-box;
          line-height: 1.5;
          text-align: center;
        }

        .taskTitle {
          margin: 8px 0 16px;
          text-align: center;
          font-size: clamp(16px, 2.5vw, 20px);
          font-weight: 800;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .taskNotice,
        .taskError {
          margin-bottom: 10px;
          font-size: 14px;
          line-height: 1.4;
        }

        .taskError {
          color: crimson;
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
            minmax(140px, 1.2fr) minmax(120px, 1fr) minmax(160px, 1.5fr)
            minmax(180px, 1.7fr) minmax(130px, 1fr) minmax(120px, 1fr)
            minmax(90px, 0.7fr);
          align-items: center;
        }

        .taskHeader {
          background: #fafafa;
          border-bottom: 1px solid #e5e5e5;
          font-size: 13px;
          font-weight: 700;
        }

        .taskHeader > div,
        .taskCell,
        .addRow {
          padding: 12px;
          box-sizing: border-box;
        }

        .taskRow {
          border-bottom: 1px solid #f0f0f0;
        }

        .taskRow:last-of-type {
          border-bottom: 0;
        }

        .alignRight {
          text-align: right;
        }

        .mobileLabel {
          display: none;
        }

        .memberSelectWrap {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .field,
        .readonlyField {
          width: 100%;
          min-width: 0;
          min-height: 42px;
          padding: 10px;
          border-radius: 8px;
          box-sizing: border-box;
          font: inherit;
        }

        .field {
          border: 1px solid #ddd;
          background: white;
        }

        .textareaField {
          min-height: 72px;
          resize: vertical;
          line-height: 1.4;
        }

        .readonlyField {
          border: 1px solid #eee;
          background: #f7f7f7;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .avatar {
          flex: 0 0 auto;
          border-radius: 999px;
          border: 1px solid #ddd;
        }

        .actionCell {
          display: flex;
          justify-content: flex-end;
        }

        .secondaryButton,
        .primaryButton {
          min-height: 42px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          font: inherit;
        }

        .secondaryButton {
          padding: 10px 12px;
          border: 1px solid #ddd;
          background: white;
          color: #111;
        }

        .primaryButton {
          flex: 0 0 auto;
          padding: 12px 18px;
          border: 0;
          background: black;
          color: white;
          font-weight: 800;
        }

        .primaryButton:disabled {
          background: #444;
          cursor: not-allowed;
        }

        .footerActions {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-top: 16px;
        }

        .assignStatus {
          min-width: 0;
          font-size: 13px;
          line-height: 1.4;
          opacity: 0.9;
          overflow-wrap: anywhere;
        }

        @media (max-width: 820px) {
          .taskHeader {
            display: none;
          }

          .taskPanel {
            border-radius: 8px;
            overflow: visible;
            border: 0;
            background: transparent;
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
            grid-template-columns: minmax(92px, 34%) minmax(0, 1fr);
            gap: 10px;
            align-items: center;
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
            font-weight: 700;
            line-height: 1.3;
          }

          .actionCell {
            justify-content: stretch;
          }

          .actionCell .secondaryButton,
          .addRow .secondaryButton,
          .primaryButton {
            width: 100%;
          }

          .addRow {
            padding: 0;
          }

          .footerActions {
            flex-direction: column;
          }
        }

        @media (max-width: 430px) {
          .taskTitle {
            text-align: left;
          }

          .taskCell {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .memberSelectWrap {
            align-items: stretch;
          }

          .avatar {
            margin-top: 7px;
          }
        }
      `}</style>
    </main>
  );
}

function normalizeSelectedGroup(groupId: string, groupInfo: GroupInfo): GroupInfo {
  return {
    ...groupInfo,
    group_id: groupInfo.group_id || groupId,
    group_name: groupInfo.group_name || groupInfo.line_group_name,
  };
}

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", lineHeight: 1.5 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Loading...</div>
        <div style={{ fontSize: 13, opacity: 0.72 }}>Preparing group task data</div>
      </div>
    </div>
  );
}

function PageMessage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "32px auto",
        padding: "0 12px",
        boxSizing: "border-box",
        lineHeight: 1.5,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
