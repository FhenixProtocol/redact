"use client";

import { useMemo } from "react";
import { FheTypes } from "@cofhe/sdk";
import type { Permit } from "@cofhe/sdk/permits";
import { Chain } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { getCofheClient, isCofheInitialized } from "~~/services/cofhe/cofheClient";
import { useCofheClientStore } from "~~/services/cofhe/cofheClientStore";

export const targetNetworksNoHardhat = scaffoldConfig.targetNetworks.filter(
  (network: Chain) => network.id !== hardhat.id,
);

export const useIsConnectedChainSupported = () => {
  const { chainId } = useAccount();
  return useMemo(() => targetNetworksNoHardhat.some((network: Chain) => network.id === chainId), [chainId]);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useCofhe(_config?: Record<string, unknown>) {
  const isInitialized = useCofheClientStore(state => state.connected);

  return {
    isInitialized,
    isInitializing: false,
    error: null,
  };
}

export const useCofhejsInitialized = () => {
  return useCofheClientStore(state => state.connected);
};

export const useCofhejsAccount = () => {
  return useCofheClientStore(state => state.account);
};

export const useCofhejsActivePermitHash = () => {
  const account = useCofhejsAccount();
  const { chainId } = useAccount();
  const initialized = useCofhejsInitialized();
  const version = useCofheClientStore(state => state.permitVersion);

  return useMemo(() => {
    if (!account || !chainId || !initialized) return undefined;
    const client = getCofheClient();
    return client?.permits.getActivePermitHash(chainId, account);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, chainId, initialized, version]);
};

export const useCofhejsActivePermit = () => {
  const account = useCofhejsAccount();
  const initialized = useCofhejsInitialized();
  const activePermitHash = useCofhejsActivePermitHash();
  const { chainId } = useAccount();

  return useMemo(() => {
    if (!account || !initialized || !chainId || !activePermitHash) return undefined;
    const client = getCofheClient();
    return client?.permits.getPermit(activePermitHash, chainId, account);
  }, [account, initialized, activePermitHash, chainId]);
};

export const useCofhejsAllPermits = () => {
  const account = useCofhejsAccount();
  const initialized = useCofhejsInitialized();
  const { chainId } = useAccount();
  const version = useCofheClientStore(state => state.permitVersion);

  return useMemo(() => {
    if (!account || !initialized || !chainId) return undefined;
    const client = getCofheClient();
    if (!client) return undefined;
    const permits = client.permits.getPermits(chainId, account);
    if (!permits) return undefined;
    return Object.values(permits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, initialized, chainId, version]);
};

// Re-export FheTypes for convenience
export { FheTypes } from "@cofhe/sdk";
