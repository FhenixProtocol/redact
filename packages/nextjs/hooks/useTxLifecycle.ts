import { useCallback } from "react";
import { useChainId, usePublicClient } from "wagmi";
import { TransactionActionType, TransactionStatus, useTransactionStore } from "~~/services/store/transactionStore";

export const useTxLifecycle = () => {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const addTx = useTransactionStore(s => s.addTransaction);
  const updateTx = useTransactionStore(s => s.updateTransactionStatus);

  const trackTx = useCallback(
    async (
      hash: `0x${string}`,
      {
        tokenSymbol,
        tokenAmount,
        tokenAddress,
        actionType,
      }: { tokenSymbol: string; tokenAmount: bigint; tokenAddress: string; actionType: TransactionActionType },
    ) => {
      addTx({
        hash,
        tokenSymbol,
        tokenAmount,
        tokenAddress,
        chainId,
        actionType,
      });

      if (!publicClient) {
        console.error("Public client not available");
        return false;
      }

      try {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log("receipt", receipt, hash);
        updateTx(chainId, hash, receipt.status === "success" ? TransactionStatus.Confirmed : TransactionStatus.Failed);
        return receipt.status === "success";
      } catch {
        updateTx(chainId, hash, TransactionStatus.Failed);
        return false;
      }
    },
    [addTx, updateTx, publicClient, chainId],
  );

  return trackTx;
}; 