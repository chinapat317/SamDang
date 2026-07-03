"use client";

import { useLiffProf } from "@/context/LiffProf";
import { getLiffId, initLiff } from "@/lib/liff";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { error } = useLiffProf();
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (error) return;

    let cancelled = false;

    async function initializeLiff() {
      try {
        await initLiff(getLiffId());
      } catch (e: unknown) {
        if (cancelled) return;
        setInitError(e instanceof Error ? e.message : "LIFF error");
      }
    }

    initializeLiff();
    return () => {
      cancelled = true;
    };
  }, [error]);

  if (error || initError) {
    return <PageMessage title="Failed to authenticate" detail={error || initError || ""} />;
  }

  return <PageMessage title="Loading..." detail="Preparing LINE profile" />;
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
