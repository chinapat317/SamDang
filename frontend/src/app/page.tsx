"use client";

import { useLiffSession } from "@/lib/liff-session";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <Suspense fallback={<PageMessage title="Loading..." detail="Preparing LINE profile" />}>
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
        title="Failed to authenticate"
        detail={error || "Please open this page from LINE LIFF again."}
      />
    );
  }

  if (liff_loading) {
    return <PageMessage title="Loading..." detail="Preparing LINE profile" />;
  }

  if (!accessToken) {
    return (
      <PageMessage
        title="Failed to authenticate"
        detail="Please open this page from LINE LIFF again."
      />
    );
  }

  return (
    <PageMessage
      title="Ready"
      detail={`Authenticated as ${displayName || "LINE user"}`}
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
