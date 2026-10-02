"use client";

import LiffBootstrap from "@/components/LiffBootstrap";
import { useLiffSession } from "@/lib/liff-session";

type TopBarProps = {
  title?: string;
};

export default function TopBar({ title = "SamDang" }: TopBarProps) {
  const { displayName, pictureUrl, liff_loading } = useLiffSession();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #eee",
        width: "100%",
      }}
    >
      {/* Runs once (TopBar mounted once in layout) */}
      <LiffBootstrap />

      <div
        style={{
          minHeight: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px clamp(12px, 3vw, 20px)",
          maxWidth: 1180,
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            minWidth: 0,
            fontWeight: 800,
            fontSize: 16,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>

        {liff_loading ? (
          <div style={{ flexShrink: 0, fontSize: 13, opacity: 0.7 }}>กำลังโหลด...</div>
        ) : displayName ? (
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0, textAlign: "right", lineHeight: 1.1 }}>
              <div
                style={{
                  maxWidth: "min(44vw, 260px)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {displayName}
              </div>
            </div>

            {pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pictureUrl}
                alt="รูปโปรไฟล์"
                width={34}
                height={34}
                style={{ flexShrink: 0, borderRadius: 999, border: "1px solid #ddd" }}
              />
            ) : null}
          </div>
        ) : (
          <div style={{ flexShrink: 0, fontSize: 13, opacity: 0.7 }}>ไม่มีข้อมูลโปรไฟล์</div>
        )}
      </div>
    </header>
  );
}
