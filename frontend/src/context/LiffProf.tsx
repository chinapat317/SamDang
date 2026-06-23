"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type LiffProf = {
  uid: string;
  groupId: string;
  displayName: string;
  pictureUrl: string;
  liff_loading: boolean;
  error: string | null;
};

const LiffProfCtx = createContext<LiffProf | null>(null);
const SetLiffProfCtx = createContext<React.Dispatch<React.SetStateAction<LiffProf>> | null>(null);

export function LiffProfProvider({ children }: { children: React.ReactNode }) {
  const [prof, setProf] = useState<LiffProf>({
    uid: "",
    groupId: "",
    displayName: "",
    pictureUrl: "",
    liff_loading: true,
    error: null,
  });

  const value = useMemo(() => prof, [prof]);

  return (
    <LiffProfCtx.Provider value={value}>
      <SetLiffProfCtx.Provider value={setProf}>{children}</SetLiffProfCtx.Provider>
    </LiffProfCtx.Provider>
  );
}

export function useLiffProf() {
  const ctx = useContext(LiffProfCtx);
  if (!ctx) throw new Error("useLiffProf must be used inside <LiffProfProvider>");
  return ctx;
}
export function useSetLiffProf() {
  const ctx = useContext(SetLiffProfCtx);
  if (!ctx) throw new Error("useSetLiffProf must be used inside <LiffProfProvider>");
  return ctx;
}