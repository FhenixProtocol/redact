"use client";

import { useEffect, useState } from "react";
import { Encryptable, Environment, FheTypes, Permit, cofhejs } from "cofhejs/web";
import { arbitrum, arbitrumSepolia, hardhat, mainnet, sepolia } from "viem/chains";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";

// Track initialization state globally
let isInitializedGlobally = false;

interface CofheConfig {
  environment: Environment;
  coFheUrl?: string;
  verifierUrl?: string;
  thresholdNetworkUrl?: string;
  ignoreErrors?: boolean;
  generatePermit?: boolean;
}

const ChainEnvironments = {
  // Ethereum
  [mainnet.id]: "MAINNET",
  // Arbitrum
  [arbitrum.id]: "MAINNET",
  // Ethereum Sepolia
  [sepolia.id]: "TESTNET",
  // Arbitrum Sepolia
  [arbitrumSepolia.id]: "TESTNET",
  // Hardhat
  [hardhat.id]: "MOCK",
} as const;

export function useCofhe(config?: Partial<CofheConfig>) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address: accountAddress } = useAccount();

  console.log("accountAddress", accountAddress);

  const chainId = useChainId();
  const [isInitialized, setIsInitialized] = useState(isInitializedGlobally);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [permit, setPermit] = useState<Permit | undefined>(undefined);

  // Add checks to ensure we're in a browser environment
  const isBrowser = typeof window !== "undefined";

  // Reset initialization when chain changes
  useEffect(() => {
    isInitializedGlobally = false;
    setIsInitialized(false);
  }, [chainId, accountAddress]);

  // Initialize when wallet is connected
  useEffect(() => {
    // Skip initialization if not in browser
    if (!isBrowser) return;

    const initialize = async () => {
      console.log("Re-run initialize");
      if (isInitializedGlobally || isInitializing || !publicClient || !walletClient) return;
      try {
        setIsInitializing(true);

        console.log("Re-initializing Cofhe", accountAddress);

        const environment = ChainEnvironments[chainId as keyof typeof ChainEnvironments] ?? "TESTNET";

        const defaultConfig = {
          environment,
          verifierUrl: undefined,
          coFheUrl: undefined,
          thresholdNetworkUrl: undefined,
          ignoreErrors: false,
          generatePermit: true,
        };

        // Merge default config with user-provided config
        const mergedConfig = { ...defaultConfig, ...config };

        const result = await cofhejs.initializeWithViem({
          viemClient: publicClient,
          viemWalletClient: walletClient,
          environment: mergedConfig.environment,
          verifierUrl: mergedConfig.verifierUrl,
          coFheUrl: mergedConfig.coFheUrl,
          thresholdNetworkUrl: mergedConfig.thresholdNetworkUrl,
          ignoreErrors: mergedConfig.ignoreErrors,
          generatePermit: mergedConfig.generatePermit,
        });

        if (result.success) {
          console.log("Cofhe initialized successfully");
          isInitializedGlobally = true;
          setIsInitialized(true);
          setPermit(result.data);
          setError(null);
        } else {
          setError(new Error(result.error.message || String(result.error)));
        }
      } catch (err) {
        console.error("Failed to initialize Cofhe:", err);
        setError(err instanceof Error ? err : new Error("Unknown error initializing Cofhe"));
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [walletClient, publicClient, config, chainId, isInitializing, accountAddress]);

  return {
    isInitialized,
    isInitializing,
    error,
    permit,
    // Expose the original library functions directly
    ...cofhejs,
    FheTypes,
    Encryptable,
  };
}

// Export FheTypes directly for convenience
export { FheTypes } from "cofhejs/web";
