import { useEffect } from "react";
import { useRefresh } from "./useRefresh";
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

  useEffect(() => {
    if (!chain) return;
    fetchTokenPairsData();
  }, [chain]);

  useEffect(() => {
    if (!chain) return;
    if (!account) return;
    fetchTokenPairBalances();
  }, [chain, account, refresh]);
};
