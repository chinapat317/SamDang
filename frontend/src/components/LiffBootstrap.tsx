"use client";

import { useEffect } from "react";
import { getLiffId, initLiff } from "@/types/liff";
import { beginLiffSessionAuth, clearLiffSession, setLiffSession } from "@/lib/liff-session";

let liffLoginStarted = false;

export default function LiffBootstrap() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        beginLiffSessionAuth();
        const liff = await initLiff(getLiffId());

        if (!liff.isLoggedIn()) {
          clearLiffSession(null, true);
          if (!liffLoginStarted) {
            liffLoginStarted = true;
            liff.login({ redirectUri: window.location.href });
          }
          return;
        }

        const profile = await liff.getProfile();
        const displayName = profile.displayName || "";
        const pictureUrl = profile.pictureUrl || "";
        const accessToken = liff.getAccessToken();

        if (!accessToken) {
          throw new Error("LIFF access token is unavailable");
        }

        if (cancelled) return;

        const session = {
          displayName,
          pictureUrl,
          accessToken,
        };

        setLiffSession(session);
      } catch (e: unknown) {
        if (cancelled) return;
        clearLiffSession(e instanceof Error ? e.message : "LIFF error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
