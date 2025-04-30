import React from "react";
import { getPublicClient } from "@wagmi/core";
import { Hash, SendTransactionParameters, TransactionReceipt, WalletClient } from "viem";
import { Config, useWalletClient } from "wagmi";
import { SendTransactionMutate } from "wagmi/query";
import { HashLink } from "~~/components/HashLink";
import {
  TransactionActionType,
  TransactionStatus,
  transactionToString,
  useTransactionStore,
} from "~~/services/store/transactionStore";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { getParsedError, notification } from "~~/utils/scaffold-eth";
import { TransactorFuncOptions } from "~~/utils/scaffold-eth/contract";

type TransactionFunc = (
  tx: (() => Promise<Hash>) | Parameters<SendTransactionMutate<Config, undefined>>[0],
  storeTxOptions?: {
    tokenSymbol: string;
    tokenAddress: string;
    tokenDecimals: number;
    tokenAmount: bigint;
    actionType: TransactionActionType;
  },
  options?: TransactorFuncOptions,
) => Promise<Hash | undefined>;

/**
 * Custom notification content for TXs.
 */
const TxnNotification = ({ message, txHash }: { message: React.ReactNode; txHash?: string }) => {
  return (
    <div className={`flex flex-col cursor-default gap-1 text-primary`}>
      <p className="my-0">{message}</p>
      <div className="flex flex-row gap-1">
        {txHash && (
          <>
            <p className="text-sm text-muted-foreground font-reddit-mono">Tx link:</p>
            <HashLink type="tx" hash={txHash} />
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Runs Transaction passed in to returned function showing UI feedback.
 * @param _walletClient - Optional wallet client to use. If not provided, will use the one from useWalletClient.
 * @returns function that takes in transaction function as callback, shows UI feedback for transaction and returns a promise of the transaction hash
 */
export const useTransactor = (_walletClient?: WalletClient): TransactionFunc => {
  let walletClient = _walletClient;
  const { data } = useWalletClient();
  const addTx = useTransactionStore(state => state.addTransaction);
  const updateTx = useTransactionStore(state => state.updateTransactionStatus);
  if (walletClient === undefined && data) {
    walletClient = data;
  }

  const result: TransactionFunc = async (tx, storeTxOptions, options) => {
    if (!walletClient) {
      notification.error("Cannot access account");
      console.error("⚡️ ~ file: useTransactor.tsx ~ error");
      return;
    }

    let notificationId = null;
    let transactionHash: Hash | undefined = undefined;
    let transactionReceipt: TransactionReceipt | undefined;
    let txHash: string | undefined = undefined;
    let txString = "Transaction";
    try {
      const network = await walletClient.getChainId();
      // Get full transaction from public client
      const publicClient = getPublicClient(wagmiConfig);

      notificationId = notification.loading(<TxnNotification message="Waiting for wallet confirmation" />);

      if (typeof tx === "function") {
        // Tx is already prepared by the caller
        const result = await tx();
        transactionHash = result;
      } else if (tx != null) {
        transactionHash = await walletClient.sendTransaction(tx as SendTransactionParameters);
      } else {
        throw new Error("Incorrect transaction passed to transactor");
      }
      notification.remove(notificationId);

      // Add tx to store
      const redactTx = storeTxOptions
        ? {
            hash: transactionHash,
            chainId: network,
            ...storeTxOptions,
          }
        : undefined;
      txString = redactTx ? transactionToString(redactTx) : "Transaction";
      if (redactTx) addTx(redactTx);

      txHash = transactionHash ? transactionHash : undefined;

      notificationId = notification.loading(
        <TxnNotification
          message={
            <>
              <b>{txString}</b> pending...
            </>
          }
          txHash={txHash}
        />,
      );

      transactionReceipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
        confirmations: options?.blockConfirmations,
      });
      notification.remove(notificationId);

      if (transactionReceipt.status === "reverted") {
        updateTx(network, transactionHash, TransactionStatus.Failed);
        throw new Error(`${txString} reverted`);
      }

      updateTx(network, transactionHash, TransactionStatus.Confirmed);

      notification.success(
        <TxnNotification
          message={
            <>
              <b>{txString}</b> complete!
            </>
          }
          txHash={txHash}
        />,
      );

      if (options?.onBlockConfirmation) options.onBlockConfirmation(transactionReceipt);
    } catch (error: any) {
      if (notificationId) {
        notification.remove(notificationId);
      }
      console.error("⚡️ ~ file: useTransactor.ts ~ error", error);
      const message = getParsedError(error);

      // if receipt was reverted, show notification with block explorer link and return error
      if (transactionReceipt?.status === "reverted") {
        notification.error(<TxnNotification message={message} txHash={txHash} />);
        throw error;
      }

      notification.error(message);
      throw error;
    }

    return transactionHash;
  };

  return result;
};
