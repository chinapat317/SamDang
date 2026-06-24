"use client";

import { GroupInfo } from "@/types/types";
import React, { createContext, useContext, useMemo, useState } from "react";

type MyGroupContextValue = {
  groups: GroupInfo[];
  selectedGroup: GroupInfo | null;
  setGroups: React.Dispatch<React.SetStateAction<GroupInfo[]>>;
  setSelectedGroup: React.Dispatch<React.SetStateAction<GroupInfo | null>>;
};

const MyGroupCtx = createContext<MyGroupContextValue | null>(null);

export function MyGroupProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);

  const value = useMemo(
    () => ({
      groups,
      selectedGroup,
      setGroups,
      setSelectedGroup,
    }),
    [groups, selectedGroup],
  );

  return <MyGroupCtx.Provider value={value}>{children}</MyGroupCtx.Provider>;
}

export function useMyGroup() {
  const ctx = useContext(MyGroupCtx);
  if (!ctx) throw new Error("useMyGroup must be used inside <MyGroupProvider>");
  return ctx;
}
