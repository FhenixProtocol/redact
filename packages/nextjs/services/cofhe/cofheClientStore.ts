/**
 * Lightweight Zustand store for cofhe client state reactivity.
 * Updated by the CofheClientBridge component inside the CofheProvider.
 * Consumed by hooks in useCofhe.ts (which can't import @cofhe/react due to SSR).
 */
import { create } from "zustand";

interface CofheClientStoreState {
  connected: boolean;
  account: string | null;
  permitVersion: number;
}

export const useCofheClientStore = create<CofheClientStoreState>()(() => ({
  connected: false,
  account: null,
  permitVersion: 0,
}));

export function updateCofheClientStore(state: Partial<CofheClientStoreState>): void {
  useCofheClientStore.setState(state);
}

export function incrementPermitVersion(): void {
  useCofheClientStore.setState(s => ({ permitVersion: s.permitVersion + 1 }));
}
