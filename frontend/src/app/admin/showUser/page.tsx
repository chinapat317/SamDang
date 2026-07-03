"use client";

import { GetAllUsers } from "@/commonFunc/user";
import { useLiffProf } from "@/context/LiffProf";
import { LiffProf, Users } from "@/types/types";
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

export default function AdminShowUserPage() {
  const router = useRouter();
  const { uid, liff_loading } = useLiffProf() as LiffProf;
  const [users, setUsers] = useState<Users[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    async function loadUsers() {
      try {
        setLoading(true);
        setLoaded(false);
        setErrMsg(null);
        const adminUsers = await GetAllUsers(uid);
        if (!cancelled) {
          setUsers(adminUsers);
          setLoaded(true);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setErrMsg(e instanceof Error ? e.message : "Failed to load users");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (liff_loading || (!!uid && (loading || !loaded) && !errMsg)) {
    return <PageMessage title="Loading..." detail="Checking admin role" />;
  }

  if (!uid) {
    return <PageMessage title="No LINE profile" detail="Please open this page from LINE LIFF again." />;
  }

  if (errMsg) {
    return <PageMessage title="Cannot show users" detail={errMsg} />;
  }

  return (
    <main className="adminUsersPage">
      <div className="pageTitle">All users</div>
      <div className="titleActions">
        <button
          type="button"
          className="primaryButton"
          onClick={() => navigateInFrontend(router, "/admin/editUser")}
        >
          change role
        </button>
      </div>

      {users.length === 0 ? (
        <div className="emptyState">No users found.</div>
      ) : (
        <section className="userPanel" aria-label="User list">
          <div className="userGrid userHeader" aria-hidden="true">
            <div>line display name</div>
            <div>role</div>
          </div>

          {users.map((user, index) => (
            <article className="userGrid userRow" key={user.uid || `${user.display_name}-${user.role}-${index}`}>
              <div className="userCell">
                <span className="mobileLabel">line display name</span>
                <span className="cellText">{user.display_name || "-"}</span>
              </div>
              <div className="userCell">
                <span className="mobileLabel">role</span>
                <span className={`roleBadge ${user.role}`}>{user.role}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      <style jsx>{`
        .adminUsersPage {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .pageTitle {
          margin: 8px 0 10px;
          text-align: center;
          font-size: 20px;
          font-weight: 800;
          line-height: 1.35;
        }

        .titleActions {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .primaryButton {
          min-height: 42px;
          padding: 10px 16px;
          border: 0;
          border-radius: 8px;
          background: black;
          color: white;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .emptyState {
          margin: 32px auto;
          text-align: center;
          color: #555;
          line-height: 1.5;
        }

        .userPanel {
          width: 100%;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          overflow: hidden;
          background: white;
        }

        .userGrid {
          display: grid;
          grid-template-columns: minmax(180px, 1fr) minmax(120px, 180px);
          align-items: stretch;
        }

        .userHeader {
          background: #fafafa;
          border-bottom: 1px solid #e5e5e5;
          font-size: 13px;
          font-weight: 800;
        }

        .userHeader > div,
        .userCell {
          padding: 12px;
          box-sizing: border-box;
        }

        .userRow {
          border-bottom: 1px solid #f0f0f0;
        }

        .userRow:last-child {
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

        .roleBadge {
          display: inline-flex;
          min-width: 82px;
          height: 28px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 10px;
          box-sizing: border-box;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0;
        }

        .roleBadge.admin {
          background: #fee2e2;
          color: #991b1b;
        }

        .roleBadge.manager {
          background: #dbeafe;
          color: #1e3a8a;
        }

        .roleBadge.member {
          background: #dcfce7;
          color: #166534;
        }

        @media (max-width: 560px) {
          .pageTitle {
            text-align: left;
          }

          .titleActions {
            justify-content: stretch;
          }

          .primaryButton {
            width: 100%;
          }

          .userPanel {
            border: 0;
            border-radius: 0;
            background: transparent;
            overflow: visible;
          }

          .userHeader {
            display: none;
          }

          .userGrid {
            display: block;
          }

          .userRow {
            margin-bottom: 12px;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            background: white;
            overflow: hidden;
          }

          .userCell {
            display: grid;
            grid-template-columns: minmax(116px, 38%) minmax(0, 1fr);
            gap: 10px;
            padding: 10px 12px;
            border-bottom: 1px solid #f3f3f3;
          }

          .userCell:last-child {
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

        @media (max-width: 390px) {
          .userCell {
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
