"use client";

import { useEffect, useMemo } from "react";
import { CofheProvider, createCofheConfig, useCofheClient, useCofheConnection } from "@cofhe/react";
import { baseSepolia, sepolia, arbSepolia, hardhat } from "@cofhe/sdk/chains";
import { usePublicClient, useWalletClient } from "wagmi";
import { setCofheClient } from "~~/services/cofhe/cofheClient";
import { updateCofheClientStore } from "~~/services/cofhe/cofheClientStore";

/**
 * Syncs the CofheClient from React context to:
 * 1. Module-level bridge (for non-React code like decrypted.ts)
 * 2. Zustand store (for React hooks that can't import @cofhe/react due to SSR)
 */
function CofheClientBridge() {
  const client = useCofheClient();
  const { connected, account } = useCofheConnection();

  useEffect(() => {
    setCofheClient(connected ? client : null);
    updateCofheClientStore({
      connected,
      account: account ?? null,
    });
    return () => {
      setCofheClient(null);
      updateCofheClientStore({ connected: false, account: null });
    };
  }, [client, connected, account]);

  // Subscribe to permit changes and bump the version counter
  useEffect(() => {
    if (!client) return;
    const unsubscribe = client.permits.subscribe(() => {
      updateCofheClientStore({ permitVersion: Date.now() });
    });
    return unsubscribe;
  }, [client]);

  return null;
}

export default function CofheWrapperInner({ children }: { children: React.ReactNode }) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const cofheConfig = useMemo(
    () =>
      createCofheConfig({
        supportedChains: [sepolia, arbSepolia, baseSepolia, hardhat],
      }),
    [],
  );

  return (
    <CofheProvider config={cofheConfig} publicClient={publicClient} walletClient={walletClient ?? undefined}>
      <CofheClientBridge />
      {children}
    </CofheProvider>
  );
}
