"use client";

import { GetGroupInfo, GetMyGroups } from "@/commonFunc/group";
import { useLiffProf } from "@/context/LiffProf";
import { useMyGroup } from "@/context/MyGroup";
import { GroupInfo } from "@/types/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function groupName(group: GroupInfo) {
  return group.group_name || group.line_group_name || "Unknown group";
}

function navigateInFrontend(router: { push: (path: string) => void }, path: string) {
  const isFrontPath =
    window.location.pathname === "/front" || window.location.pathname.startsWith("/front/");
  if (isFrontPath) {
    window.location.assign(`/front${path}`);
    return;
  }
  router.push(path);
}

export default function TasksPage() {
  const router = useRouter();
  const { uid, liff_loading } = useLiffProf();
  const { groups, setGroups, setSelectedGroup } = useMyGroup();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [openingAddPage, setOpeningAddPage] = useState(false);
  const [openingEditPage, setOpeningEditPage] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [showSelectGroupPopup, setShowSelectGroupPopup] = useState(false);
  const [showAssignedPopup, setShowAssignedPopup] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("assigned") === "1";
  });

  const selectedGroup = useMemo(
    () => groups.find((group) => group.group_id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    async function loadGroups() {
      try {
        setLoading(true);
        setErrMsg(null);
        const myGroups = await GetMyGroups(uid);
        if (cancelled) return;

        setGroups(myGroups);
      } catch (e: unknown) {
        if (!cancelled) setErrMsg(e instanceof Error ? e.message : "Failed to load groups");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadGroups();
    return () => {
      cancelled = true;
    };
  }, [setGroups, uid]);

  async function prepareSelectedGroup() {
    if (!selectedGroup) {
      setShowSelectGroupPopup(true);
      return false;
    }

    try {
      setErrMsg(null);
      const selectedGroupInfo = await GetGroupInfo(selectedGroup.group_id);
      setSelectedGroup({
        ...selectedGroup,
        ...selectedGroupInfo,
        group_id: selectedGroup.group_id,
        group_name:
          selectedGroup.group_name ||
          selectedGroup.line_group_name ||
          selectedGroupInfo.group_name ||
          selectedGroupInfo.line_group_name,
      });
      return true;
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Failed to load selected group");
      return false;
    }
  }

  async function goAddTask() {
    try {
      setOpeningAddPage(true);
      const ready = await prepareSelectedGroup();
      if (!ready || !selectedGroup) return;
      navigateInFrontend(router, `/tasks/add?gid=${encodeURIComponent(selectedGroup.group_id)}`);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Failed to open add task page");
    } finally {
      setOpeningAddPage(false);
    }
  }

  async function goEditTask() {
    try {
      setOpeningEditPage(true);
      const ready = await prepareSelectedGroup();
      if (!ready || !selectedGroup) return;
      navigateInFrontend(router, `/tasks/edit?gid=${encodeURIComponent(selectedGroup.group_id)}`);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Failed to open edit task page");
    } finally {
      setOpeningEditPage(false);
    }
  }

  if (liff_loading || loading) {
    return <PageMessage title="Loading..." detail="Preparing your groups" />;
  }

  if (!uid) {
    return <PageMessage title="No LINE profile" detail="Please open this page from LINE LIFF again." />;
  }

  if (errMsg) {
    return <PageMessage title="Cannot load groups" detail={errMsg} />;
  }

  if (groups.length === 0) {
    return (
      <PageMessage
        title="No registered groups"
        detail="Please register as a member in a SamDang group first."
      />
    );
  }

  function closeAssignedPopup() {
    setShowAssignedPopup(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("assigned");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <main className="tasksPage">
      <section className="groupPicker" aria-label="Select group">
        <div className="headerRow">
          <div>
            <h1>Tasks</h1>
            <p>Select a group before adding tasks.</p>
          </div>
          <div className="headerActions">
            <button
              type="button"
              className="primaryButton"
              disabled={openingAddPage}
              onClick={goAddTask}
            >
              {openingAddPage ? "Opening..." : "Add task"}
            </button>
            <button
              type="button"
              className="secondaryButton"
              disabled={openingEditPage}
              onClick={goEditTask}
            >
              {openingEditPage ? "Opening..." : "Edit"}
            </button>
          </div>
        </div>

        <div className="selectPanel">
          <label className="selectLabel" htmlFor="group-select">
            Group
          </label>
          <select
            id="group-select"
            className="groupSelect"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">เลือกกลุ่ม</option>
            {groups.map((group) => (
              <option key={group.group_id} value={group.group_id}>
                {groupName(group)}
              </option>
            ))}
          </select>
        </div>
      </section>

      {showAssignedPopup ? (
        <div className="modalBackdrop" role="presentation">
          <div className="modalBox" role="dialog" aria-modal="true" aria-labelledby="assigned-title">
            <div id="assigned-title" className="modalTitle">
              Assigned
            </div>
            <button type="button" className="modalButton" onClick={closeAssignedPopup}>
              OK
            </button>
          </div>
        </div>
      ) : null}

      {showSelectGroupPopup ? (
        <div className="modalBackdrop" role="presentation">
          <div
            className="modalBox"
            role="dialog"
            aria-modal="true"
            aria-labelledby="select-group-title"
          >
            <div id="select-group-title" className="modalTitle">
              กรุณาเลือกกลุ่ม
            </div>
            <button
              type="button"
              className="modalButton"
              onClick={() => setShowSelectGroupPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .tasksPage {
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
        }

        .groupPicker {
          width: 100%;
        }

        .headerRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .headerActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex: 0 0 auto;
        }

        h1 {
          margin: 0;
          font-size: 24px;
          line-height: 1.2;
        }

        p {
          margin: 6px 0 0;
          color: #555;
          font-size: 14px;
          line-height: 1.4;
        }

        .selectPanel {
          width: 100%;
          display: grid;
          gap: 8px;
        }

        .selectLabel {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.3;
        }

        .groupSelect {
          width: 100%;
          min-height: 46px;
          padding: 10px 12px;
          border: 1px solid #e3e3e3;
          border-radius: 8px;
          background: white;
          color: #111;
          font: inherit;
          font-weight: 700;
        }

        .groupSelect:focus {
          outline: none;
          border-color: #111;
          box-shadow: inset 0 0 0 1px #111;
        }

        .primaryButton,
        .secondaryButton {
          flex: 0 0 auto;
          min-height: 42px;
          padding: 10px 16px;
          border-radius: 8px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .primaryButton {
          border: 0;
          background: black;
          color: white;
        }

        .secondaryButton {
          border: 1px solid #ddd;
          background: white;
          color: #111;
        }

        .primaryButton:disabled,
        .secondaryButton:disabled {
          background: #555;
          border-color: #555;
          color: white;
          cursor: not-allowed;
        }

        .modalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.35);
          box-sizing: border-box;
        }

        .modalBox {
          width: min(100%, 320px);
          display: grid;
          gap: 18px;
          padding: 22px;
          border-radius: 8px;
          background: white;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
          text-align: center;
          box-sizing: border-box;
        }

        .modalTitle {
          font-size: 20px;
          font-weight: 800;
          line-height: 1.3;
        }

        .modalButton {
          min-height: 42px;
          border: 0;
          border-radius: 8px;
          background: black;
          color: white;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 560px) {
          .headerRow {
            display: grid;
          }

          .headerActions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .secondaryButton,
          .primaryButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

function PageMessage({ title, detail }: { title: string; detail: string }) {
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
