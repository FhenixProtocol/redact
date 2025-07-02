"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useTokenStoreFetcher } from "~~/hooks/useTokenStoreHooks";
import { checkAndCleanupClaims, useClaimFetcher, useRefetchPendingClaims } from "~~/services/store/claim";
import { checkAllPendingTransactions, stopPendingTransactionPolling } from "~~/services/store/transactionStore";

export const TokenStoreFetcher = () => {
  const { status } = useAccount();

  useTokenStoreFetcher();
  useClaimFetcher();
  useRefetchPendingClaims();

  // Check all pending transactions and claims after wagmi is ready (not connecting/reconnecting)
  useEffect(() => {
    const initializeChecks = async () => {
      // Only check when wagmi is fully initialized (connected or disconnected, but not connecting)
      if (status === "connecting" || status === "reconnecting") {
        return;
      }

      // Check both pending transactions and claims
      await Promise.all([checkAllPendingTransactions(), checkAndCleanupClaims()]);
    };

    initializeChecks();

    // Cleanup polling when component unmounts or status changes
    return () => {
      stopPendingTransactionPolling();
    };
  }, [status]);

  return null;
};
