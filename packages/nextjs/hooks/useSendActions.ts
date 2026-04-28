import { useCallback, useState } from "react";
import { useTransactor } from "./scaffold-eth";
import { Encryptable, type EncryptedItemInput } from "@cofhe/sdk";
import { getCofheClient } from "~~/services/cofhe/cofheClient";
import toast from "react-hot-toast";
import { Abi, Address, erc20Abi } from "viem";
import { Config, useAccount, useWriteContract } from "wagmi";
import { WriteContractVariables } from "wagmi/query";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import { ETH_ADDRESS } from "~~/lib/common";
import { useResetSendForm } from "~~/services/store/sendStore";
import { refetchSingleTokenPairBalances } from "~~/services/store/tokenStore";
import { TransactionActionType } from "~~/services/store/transactionStore";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { simulateContractWriteAndNotifyError } from "~~/utils/scaffold-eth/contract";

export const useSendPublicTokenAction = () => {
  const { writeContractAsync } = useWriteContract();
  const { address: account } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const writeTx = useTransactor();
  const resetForm = useResetSendForm();

  const onSend = useCallback(
    async ({
      publicTokenSymbol,
      publicTokenAddress,
      amount,
      recipient,
      tokenDecimals,
    }: {
      publicTokenSymbol: string;
      publicTokenAddress: Address;
      amount: bigint;
      recipient: Address;
      tokenDecimals: number;
    }) => {
      if (!account) {
        toast.error("No account found");
        return;
      }

      try {
        setIsPending(true);

        // Check if this is a native ETH transfer
        if (publicTokenAddress.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
          // Native ETH transfer
          const sendTransactionParams = {
            to: recipient,
            value: amount,
          };

          const writeTxResult = await writeTx(
            sendTransactionParams,
            {
              tokenSymbol: publicTokenSymbol,
              tokenAddress: publicTokenAddress,
              tokenDecimals,
              tokenAmount: amount,
              actionType: TransactionActionType.Send,
            },
            {
              onBlockConfirmation: () => {
                refetchSingleTokenPairBalances(publicTokenAddress);
                resetForm();
              },
            },
          );

          return writeTxResult;
        } else {
          // ERC20 token transfer
          if (!writeContractAsync) {
            toast.error("Could not initialize contract write");
            return;
          }

          const writeContractObject = {
            abi: erc20Abi,
            address: publicTokenAddress,
            functionName: "transfer",
            args: [recipient, amount],
          } as WriteContractVariables<Abi, string, any[], Config, number>;

          await simulateContractWriteAndNotifyError({ wagmiConfig, writeContractParams: writeContractObject });
          const makeWriteWithParams = () => writeContractAsync(writeContractObject);

          const writeTxResult = await writeTx(
            makeWriteWithParams,
            {
              tokenSymbol: publicTokenSymbol,
              tokenAddress: publicTokenAddress,
              tokenDecimals,
              tokenAmount: amount,
              actionType: TransactionActionType.Send,
            },
            {
              onBlockConfirmation: () => {
                refetchSingleTokenPairBalances(publicTokenAddress);
                resetForm();
              },
            },
          );

          return writeTxResult;
        }
      } catch (error) {
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [writeContractAsync, account, writeTx, resetForm],
  );

  return { onSend, isSending: isPending };
};

export const useSendConfidentialTokenAction = () => {
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const { address: account } = useAccount();
  const writeTx = useTransactor();
  const resetForm = useResetSendForm();

  const onSend = useCallback(
    async ({
      publicTokenSymbol,
      confidentialTokenSymbol,
      publicTokenAddress,
      confidentialTokenAddress,
      amount,
      recipient,
      tokenDecimals,
    }: {
      publicTokenSymbol: string;
      confidentialTokenSymbol: string;
      publicTokenAddress: Address;
      confidentialTokenAddress: Address;
      amount: bigint;
      recipient: Address;
      tokenDecimals: number;
    }) => {
      if (account == null) {
        toast.error("No account found");
        return;
      }

      if (!writeContractAsync) {
        toast.error("Could not initialize contract write");
        return;
      }

      setIsPending(true);

      let encryptedAmount: EncryptedItemInput;
      try {
        setIsEncrypting(true);
        const client = getCofheClient();
        if (!client) throw new Error("Cofhe client not initialized");
        const encrypted = await client.encryptInputs([Encryptable.uint64(amount)]).execute();
        setIsEncrypting(false);
        encryptedAmount = encrypted[0];
      } catch (error) {
        setIsEncrypting(false);
        console.error("Failed to encrypt amount:", error);
        toast.error("Failed to encrypt amount");
        throw error;
      }

      try {
        const writeContractObject = {
          abi: confidentialErc20Abi,
          address: confidentialTokenAddress,
          functionName: "confidentialTransfer",
          args: [recipient, encryptedAmount],
        } as WriteContractVariables<Abi, string, any[], Config, number>;

        await simulateContractWriteAndNotifyError({ wagmiConfig, writeContractParams: writeContractObject });
        const makeWriteWithParams = () => writeContractAsync(writeContractObject);

        const writeTxResult = await writeTx(
          makeWriteWithParams,
          {
            tokenSymbol: publicTokenSymbol,
            tokenAddress: publicTokenAddress,
            tokenDecimals,
            tokenAmount: amount,
            actionType: TransactionActionType.EncSend,
          },
          {
            onBlockConfirmation: () => {
              refetchSingleTokenPairBalances(publicTokenAddress);
              resetForm();
            },
          },
        );
        setIsPending(false);

        return writeTxResult;
      } catch (error) {
        setIsPending(false);
        console.error("Failed to send token:", error);
        toast.error("Failed to send token");
        throw error;
      }
    },
    [account, writeContractAsync, writeTx, resetForm],
  );

  return { onSend, isSending: isPending, isEncrypting };
};
