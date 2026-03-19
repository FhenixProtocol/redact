"use client";

import { useEffect, useMemo } from "react";
import { FheTypes } from "@cofhe/sdk";
import {
  useCofheActivePermit,
  useCofheAllPermits,
  useCofheClient,
  useCofheConnection,
} from "@cofhe/react";
import { Chain } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { setCofheClient } from "~~/services/cofhe/cofheClient";

export const targetNetworksNoHardhat = scaffoldConfig.targetNetworks.filter(
  (network: Chain) => network.id !== hardhat.id,
);

export const useIsConnectedChainSupported = () => {
  const { chainId } = useAccount();
  return useMemo(() => targetNetworksNoHardhat.some((network: Chain) => network.id === chainId), [chainId]);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useCofhe(_config?: Record<string, unknown>) {
  const client = useCofheClient();
  const { connected } = useCofheConnection();

  // Sync client to the module-level bridge for non-React code (decrypted.ts, tokenStore.ts)
  useEffect(() => {
    setCofheClient(connected ? client : null);
    return () => setCofheClient(null);
  }, [client, connected]);

  return {
    isInitialized: connected,
    isInitializing: false,
    error: null,
  };
}

export const useCofhejsInitialized = () => {
  const { connected } = useCofheConnection();
  return connected;
};

export const useCofhejsAccount = () => {
  const { account } = useCofheConnection();
  return account ?? null;
};

export const useCofhejsActivePermitHash = () => {
  const activePermit = useCofheActivePermit();
  return activePermit?.permit.hash;
};

export const useCofhejsActivePermit = () => {
  const activePermit = useCofheActivePermit();
  return activePermit?.permit;
};

export const useCofhejsAllPermits = () => {
  const allPermits = useCofheAllPermits();
  return allPermits.length > 0 ? allPermits : undefined;
};

// Re-export FheTypes for convenience
export { FheTypes } from "@cofhe/sdk";
