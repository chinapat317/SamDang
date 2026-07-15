"use client";

import { useSyncExternalStore } from "react";
import type { LiffProf } from "@/types/liff";

export type LiffSession = Pick<
  LiffProf,
  "displayName" | "pictureUrl" | "accessToken"
>;

type LiffSessionState = {
  session: LiffSession | null;
  liff_loading: boolean;
  error: string | null;
};

const LIFF_SESSION_KEY = "samdang.liff.session";
const EMPTY_SESSION_STATE: LiffSessionState = {
  session: null,
  liff_loading: true,
  error: null,
};

let hydrated = false;
let sessionState: LiffSessionState = EMPTY_SESSION_STATE;
const listeners = new Set<() => void>();

function readStoredLiffSession(): LiffSession | null {
  if (typeof window === "undefined") return null;

  const value = window.sessionStorage.getItem(LIFF_SESSION_KEY);
  if (!value) return null;

  try {
    const session = JSON.parse(value) as Partial<LiffSession>;
    if (!session.accessToken) return null;

    return {
      displayName: String(session.displayName || ""),
      pictureUrl: String(session.pictureUrl || ""),
      accessToken: String(session.accessToken),
    };
  } catch {
    clearLiffSession();
    return null;
  }
}

function hydrateSessionState() {
  if (hydrated) return;
  hydrated = true;
  sessionState = {
    ...sessionState,
    session: readStoredLiffSession(),
  };
}

function notifySessionListeners() {
  listeners.forEach((listener) => listener());
}

function setSessionState(nextState: LiffSessionState) {
  sessionState = nextState;
  notifySessionListeners();
}

function getSnapshot() {
  hydrateSessionState();
  return sessionState;
}

function getServerSnapshot() {
  return EMPTY_SESSION_STATE;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLiffSession(): LiffSession | null {
  return readStoredLiffSession();
}

export function beginLiffSessionAuth(): void {
  hydrateSessionState();
  setSessionState({
    session: readStoredLiffSession(),
    liff_loading: true,
    error: null,
  });
}

export function setLiffSession(session: LiffSession): void {
  window.sessionStorage.setItem(LIFF_SESSION_KEY, JSON.stringify(session));
  setSessionState({
    session,
    liff_loading: false,
    error: null,
  });
}

export function clearLiffSession(error: string | null = null, liffLoading = false): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(LIFF_SESSION_KEY);
  }
  setSessionState({
    session: null,
    liff_loading: liffLoading,
    error,
  });
}

export function useLiffSession(): LiffProf {
  const { session, liff_loading, error } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return {
    displayName: session?.displayName ?? "",
    pictureUrl: session?.pictureUrl ?? "",
    accessToken: session?.accessToken ?? "",
    liff_loading,
    error,
  };
}
