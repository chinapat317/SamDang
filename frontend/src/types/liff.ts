"use client";

export type LiffProf = {
  pictureUrl: string;
  liff_loading: boolean;
  displayName: string;
  accessToken: string;
  error: string | null;
};

export type LiffProfile = {
  displayName?: string;
  pictureUrl?: string;
};

export type LiffSdk = {
  init: (options: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: (options?: { redirectUri?: string }) => void;
  getProfile: () => Promise<LiffProfile>;
  getAccessToken: () => string | null;
};

export type LiffWindow = Window & {
  liff?: LiffSdk;
};

let liffInitPromise: Promise<void> | null = null;

export async function loadLiffSdk(): Promise<void> {
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

export async function initLiff(liffId: string): Promise<LiffSdk> {
  await loadLiffSdk();

  const liff = (window as LiffWindow).liff;
  if (!liff) throw new Error("window.liff is missing");

  if (!liffInitPromise) {
    liffInitPromise = liff.init({ liffId });
  }
  await liffInitPromise;

  return liff;
}

export function getLiffId() {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
  if (!liffId) throw new Error("NEXT_PUBLIC_LINE_LIFF_ID is not set");
  return liffId;
}
