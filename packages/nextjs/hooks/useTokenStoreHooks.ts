import { useEffect } from "react";
import { useRefresh } from "./useRefresh";
import { useToaster } from "react-hot-toast";
import { useAccount, useChainId } from "wagmi";
import { fetchTokenPairBalances, fetchTokenPairsData } from "~~/services/store/tokenStore";

// Data flow
// On load - fetch initial tokens and balances
// Every 5 seconds - fetch balances
// When address changes - fetch balances
// TODO: Add addressrecord to balances in tokenStore2

export const useTokenStoreFetcher = () => {
  const chain = useChainId();
  const { address: account } = useAccount();
  const { refresh } = useRefresh();
  const { toasts } = useToaster();

  useEffect(() => {
    if (!chain) return;
    fetchTokenPairsData();
  }, [chain]);

  useEffect(() => {
    if (!chain) return;
    if (!account) return;

    // Skip fetching only if loading toasts are visible
    if (toasts.some(toast => toast.visible && toast.type === "loading")) {
      return;
    }

    fetchTokenPairBalances();
  }, [chain, account, refresh, toasts]);
};
