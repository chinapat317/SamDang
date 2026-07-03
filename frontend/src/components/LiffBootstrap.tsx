"use client";

import { useEffect } from "react";
import { useSetLiffProf } from "@/context/LiffProf";
import { getLiffId, initLiff } from "@/lib/liff";

let liffLoginStarted = false;

export default function LiffBootstrap() {
  const setProf = useSetLiffProf();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setProf((p) => ({ ...p, liff_loading: true, error: null }));

        const liff = await initLiff(getLiffId());

        if (!liff.isLoggedIn()) {
          if (!liffLoginStarted) {
            liffLoginStarted = true;
            liff.login({ redirectUri: window.location.href });
          }
          return;
        }

        const profile = await liff.getProfile();

        const uid = String(profile.userId || "");
        const displayName = String(profile.displayName || "");
        const pictureUrl = String(profile.pictureUrl || "");

        if (cancelled) return;

        setProf({
          uid,
          displayName,
          pictureUrl,
          liff_loading: false,
          error: null,
        });
      } catch (e: unknown) {
        if (cancelled) return;
        setProf((p) => ({
          ...p,
          liff_loading: false,
          error: e instanceof Error ? e.message : "LIFF error",
        }));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [setProf]);

  return null;
}
