"use client";

import { useLiffProf } from "@/context/LiffProf";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function normalizeFrontendPath(rawState: string | null) {
  if (!rawState) return null;

  let state = rawState.trim();
  if (!state) return null;

  try {
    state = decodeURIComponent(state);
  } catch {
    // URLSearchParams already decodes normal query values.
  }

  if (state.startsWith(window.location.origin)) {
    state = state.slice(window.location.origin.length);
  }

  if (state === "/front") {
    return null;
  } else if (state.startsWith("/front/")) {
    state = state.slice("/front".length);
  }

  if (!state.startsWith("/")) {
    state = `/${state}`;
  }

  if (state.startsWith("//") || state.startsWith("/http://") || state.startsWith("/https://")) {
    return null;
  }

  return state;
}

function redirectToFrontend(router: { replace: (path: string) => void }, path: string) {
  router.replace(path);
}

export default function HomePage() {
  const router = useRouter();
  const { uid, liff_loading, error } = useLiffProf();

  useEffect(() => {
    if (liff_loading || !uid || error) return;

    const params = new URLSearchParams(window.location.search);
    const targetPath = normalizeFrontendPath(params.get("liff.state"));
    if (!targetPath) return;

    redirectToFrontend(router, targetPath);
  }, [error, liff_loading, router, uid]);

  if (error) {
    return <PageMessage title="Failed to authenticate" detail={error} />;
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
