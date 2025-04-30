"use client";

import { useEffect, useState } from "react";
import { Encryptable, Environment, FheTypes, Permit, cofhejs } from "cofhejs/web";
import { arbitrum, arbitrumSepolia, hardhat, mainnet, sepolia } from "viem/chains";
import { usePublicClient, useWalletClient } from "wagmi";

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
  const [isInitialized, setIsInitialized] = useState(isInitializedGlobally);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [permit, setPermit] = useState<Permit | undefined>(undefined);

  // Add checks to ensure we're in a browser environment
  const isBrowser = typeof window !== "undefined";

  // Initialize when wallet is connected
  useEffect(() => {
    // Only run initialization in browser environment
    if (!isBrowser && !isInitializing) return;

    const initialize = async () => {
      if (isInitializedGlobally || isInitializing || !publicClient || !walletClient) return;
      try {
        setIsInitializing(true);

        const chainId = await publicClient.getChainId();
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
  }, [walletClient, publicClient]);

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
