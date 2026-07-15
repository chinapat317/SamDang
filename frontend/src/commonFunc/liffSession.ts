"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { LiffProf } from "@/types/liff";

type LiffSessionCheck = Pick<LiffProf, "accessToken">;
type LiffSessionGuard = Pick<LiffProf, "accessToken" | "liff_loading">;
type RedirectRouter = {
  replace: (path: string) => void;
};

const AUTH_FAILED_PATH = "/?auth=failed";

export function checkLiffSession(session: LiffSessionCheck | null): boolean {
  return Boolean(session?.accessToken);
}

export function getAuthFailedPath(): string {
  return AUTH_FAILED_PATH;
}

export function redirectToAuthFailedPage(router: RedirectRouter): void {
  if (typeof window !== "undefined") {
    const isFrontPath =
      window.location.pathname === "/front" || window.location.pathname.startsWith("/front/");

    if (isFrontPath) {
      window.location.replace(`/front${AUTH_FAILED_PATH}`);
      return;
    }
  }

  router.replace(AUTH_FAILED_PATH);
}

export function useRequireLiffSession(session: LiffSessionGuard): boolean {
  const router = useRouter();
  const hasSession = checkLiffSession(session);

  useEffect(() => {
    if (session.liff_loading || hasSession) return;
    redirectToAuthFailedPage(router);
  }, [hasSession, router, session.liff_loading]);

  return hasSession;
}
