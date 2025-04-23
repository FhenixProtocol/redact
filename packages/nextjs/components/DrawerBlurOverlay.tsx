"use client";

import React from "react";
import { cn } from "~~/lib/utils";
import { useDrawerOpen, useSetDrawerOpen } from "~~/services/store/drawerStore";

export const DrawerBlurOverlay: React.FC = () => {
  const open = useDrawerOpen();
  const setDrawerOpen = useSetDrawerOpen();
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 bg-white/0 transition-[backdrop-filter] duration-500",
        open ? "pointer-events-auto backdrop-blur-xs" : "pointer-events-none backdrop-blur-none",
      )}
      onClick={() => setDrawerOpen(false)}
    />
  );
};
