"use client";
import React from "react";
import { AppStateProvider } from "@/src/state/AppStateProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}

