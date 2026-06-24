"use client";

import { useEffect } from "react";
import { useSetLiffProf } from "@/context/LiffProf";

type LiffProfile = {
  userId?: string;
  displayName?: string;
  pictureUrl?: string;
};

type LiffSdk = {
  init: (options: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: () => void;
  getProfile: () => Promise<LiffProfile>;
};

type LiffWindow = Window & {
  liff?: LiffSdk;
};

async function loadLiffSdk(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-liff-sdk="1"]');
    if (existing) return resolve();

    const s = document.createElement("script");
    s.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    s.async = true;
    s.dataset.liffSdk = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load LIFF SDK"));
    document.body.appendChild(s);
  });
}

export default function LiffBootstrap() {
  const setProf = useSetLiffProf();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setProf((p) => ({ ...p, liff_loading: true, error: null }));

        await loadLiffSdk();
        const liff = (window as LiffWindow).liff;
        if (!liff) throw new Error("window.liff is missing");

        const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
        if (!liffId) throw new Error("NEXT_PUBLIC_LINE_LIFF_ID is not set");

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
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
