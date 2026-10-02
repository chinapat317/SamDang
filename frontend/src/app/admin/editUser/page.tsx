"use client";

import { GetUsersByRole, UpdateUsersRole } from "@/commonFunc/user";
import { useRequireLiffSession } from "@/commonFunc/liffSession";
import { useLiffSession } from "@/lib/liff-session";
import { EditUserRole, Users } from "@/types/types";
import { ReactNode, useEffect, useState } from "react";

type EditableUser = Users & { role: EditUserRole["role"] };

function isEditableUser(user: Users): user is EditableUser {
  return user.role === "member" || user.role === "manager";
}

export default function EditUserPage() {
  const liffSession = useLiffSession();
  const { accessToken, liff_loading } = liffSession;
  const hasLiffSession = useRequireLiffSession(liffSession);
  const [users, setUsers] = useState<EditableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    async function loadUsers() {
      try {
        setLoading(true);
        setLoaded(false);
        setErrMsg(null);
        setSuccessMsg(null);
        const allUsers = await GetUsersByRole(accessToken, ["member", "manager"]);
        if (!cancelled) {
          setUsers(allUsers.filter(isEditableUser));
          setLoaded(true);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setErrMsg(e instanceof Error ? e.message : "โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function confirmChanges() {
    try {
      setSaving(true);
      setErrMsg(null);
      setSuccessMsg(null);
      await UpdateUsersRole(
        accessToken,
        users.map((user) => ({ uid: user.uid, role: user.role })),
      );
      setSuccessMsg("อัปเดตสิทธิ์ผู้ใช้แล้ว");
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "อัปเดตสิทธิ์ผู้ใช้ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function setUserRole(userUid: string, role: EditUserRole["role"]) {
    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.uid === userUid ? { ...user, role } : user)),
    );
  }

  if (liff_loading || (!!accessToken && (loading || !loaded) && !errMsg)) {
    return <PageMessage title="กำลังโหลด..." detail="กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ" />;
  }

  if (!hasLiffSession) {
    return null;
  }

  if (errMsg && !loaded) {
    return <PageMessage title="ไม่สามารถแก้ไขผู้ใช้ได้" detail={errMsg} />;
  }

  return (
    <main className="editUsersPage">
      <div className="pageTitle">แก้ไขสิทธิ์ผู้ใช้</div>

      {errMsg ? <div className="statusText errorText">{errMsg}</div> : null}
      {successMsg ? <div className="statusText successText">{successMsg}</div> : null}

      {users.length === 0 ? (
        <div className="emptyState">ไม่พบผู้ใช้ที่แก้ไขสิทธิ์ได้</div>
      ) : (
        <section className="userPanel" aria-label="รายชื่อผู้ใช้ที่แก้ไขได้">
          <div className="userGrid userHeader" aria-hidden="true">
            <div>ชื่อที่แสดงใน LINE</div>
            <div>สิทธิ์</div>
          </div>

          {users.map((user) => (
            <article className="userGrid userRow" key={user.uid}>
              <div className="userCell">
                <span className="mobileLabel">ชื่อที่แสดงใน LINE</span>
                <div className="userIdentity">
                  {user.picture_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="avatar" src={user.picture_url} alt="" width={32} height={32} />
                  ) : null}
                  <span className="cellText">{user.display_name || user.uid}</span>
                </div>
              </div>
              <div className="userCell">
                <span className="mobileLabel">สิทธิ์</span>
                <select
                  className="roleSelect"
                  value={user.role}
                  onChange={(e) => setUserRole(user.uid, e.target.value as EditUserRole["role"])}
                  aria-label={`สิทธิ์ของ ${user.display_name || user.uid}`}
                >
                  <option value="member">สมาชิก</option>
                  <option value="manager">ผู้จัดการ</option>
                </select>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="footerActions">
        <button
          type="button"
          className="primaryButton"
          disabled={saving || users.length === 0}
          onClick={confirmChanges}
        >
          {saving ? "กำลังบันทึก..." : "ยืนยัน"}
        </button>
      </div>

      <style jsx>{`
        .editUsersPage {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .pageTitle {
          margin: 8px 0 16px;
          text-align: center;
          font-size: 20px;
          font-weight: 800;
          line-height: 1.35;
        }

        .statusText {
          margin-bottom: 12px;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .errorText {
          color: #b91c1c;
        }

        .successText {
          color: #166534;
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
          grid-template-columns: minmax(220px, 1fr) minmax(140px, 220px);
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

        .userIdentity {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          flex: 0 0 auto;
          border-radius: 999px;
          border: 1px solid #ddd;
        }

        .cellText {
          display: block;
          min-width: 0;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .roleSelect {
          width: 100%;
          min-height: 42px;
          padding: 9px 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          color: #111;
          font: inherit;
          font-weight: 700;
        }

        .roleSelect:focus {
          outline: none;
          border-color: #111;
          box-shadow: inset 0 0 0 1px #111;
        }

        .footerActions {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .primaryButton {
          min-height: 42px;
          padding: 10px 18px;
          border: 0;
          border-radius: 8px;
          background: black;
          color: white;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .primaryButton:disabled {
          background: #555;
          cursor: not-allowed;
        }

        @media (max-width: 560px) {
          .pageTitle,
          .statusText {
            text-align: left;
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

          .footerActions {
            justify-content: stretch;
          }

          .primaryButton {
            width: 100%;
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
