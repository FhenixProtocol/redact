"use client";

import dynamic from "next/dynamic";

// Dynamic import to prevent SSR — @cofhe/react internally imports @cofhe/sdk/web
// which has module-level code referencing `window` (WASM init)
const CofheWrapperInner = dynamic(() => import("./CofheWrapperInner"), { ssr: false });

export function CofheWrapper({ children }: { children: React.ReactNode }) {
  return <CofheWrapperInner>{children}</CofheWrapperInner>;
}
