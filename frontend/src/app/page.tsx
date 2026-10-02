"use client";

import { useLiffSession } from "@/lib/liff-session";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <Suspense fallback={<PageMessage title="กำลังโหลด..." detail="กำลังเตรียมข้อมูลโปรไฟล์ LINE" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { accessToken, displayName, liff_loading, error } = useLiffSession();
  const searchParams = useSearchParams();
  const authFailed = searchParams.get("auth") === "failed";

  if (authFailed || error) {
    return (
      <PageMessage
        title="ยืนยันตัวตนไม่สำเร็จ"
        detail={error || "กรุณาเปิดหน้านี้จาก LINE LIFF อีกครั้ง"}
      />
    );
  }

  if (liff_loading) {
    return <PageMessage title="กำลังโหลด..." detail="กำลังเตรียมข้อมูลโปรไฟล์ LINE" />;
  }

  if (!accessToken) {
    return (
      <PageMessage
        title="ยืนยันตัวตนไม่สำเร็จ"
        detail="กรุณาเปิดหน้านี้จาก LINE LIFF อีกครั้ง"
      />
    );
  }

  return (
    <PageMessage
      title="พร้อมใช้งาน"
      detail={`เข้าสู่ระบบในชื่อ ${displayName || "ผู้ใช้ LINE"}`}
    />
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
