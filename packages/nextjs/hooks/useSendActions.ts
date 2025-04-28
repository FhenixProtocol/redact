import { useCallback, useState } from "react";
import { useTxLifecycle } from "./useTxLifecycle";
import { CoFheInUint128, Encryptable } from "cofhejs/web";
import { cofhejs } from "cofhejs/web";
import toast from "react-hot-toast";
import { Address, erc20Abi } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import { refetchSingleTokenPairBalances } from "~~/services/store/tokenStore";
import { TransactionActionType } from "~~/services/store/transactionStore";

export const useSendPublicTokenAction = () => {
  const { writeContractAsync } = useWriteContract();
  const { address: account } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const trackTx = useTxLifecycle();

  const onSend = useCallback(
    async ({
      publicTokenSymbol,
      publicTokenAddress,
      amount,
      recipient,
    }: {
      publicTokenSymbol: string;
      publicTokenAddress: Address;
      amount: bigint;
      recipient: Address;
    }) => {
      if (!account) {
        toast.error("No account found");
        return;
      }

      if (!writeContractAsync) {
        toast.error("Could not initialize contract write");
        return;
      }

      try {
        setIsPending(true);
        const tx = await writeContractAsync({
          address: publicTokenAddress,
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipient, amount],
        });

        const success = await trackTx(tx, {
          tokenSymbol: publicTokenSymbol,
          tokenAddress: publicTokenAddress,
          tokenAmount: amount,
          actionType: TransactionActionType.Send,
        });

        setIsPending(false);
        if (success) {
          toast.success(`Sent ${publicTokenSymbol}`);
          refetchSingleTokenPairBalances(publicTokenAddress);
        } else {
          toast.error(`Failed to send ${publicTokenSymbol}`);
        }
        return tx;
      } catch (error) {
        setIsPending(false);
        console.error("Failed to send token:", error);
        toast.error("Failed to send token");
        throw error;
      }
    },
    [writeContractAsync, account, trackTx],
  );

  return { onSend, isSending: isPending };
};

export const useSendConfidentialTokenAction = () => {
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const { address: account } = useAccount();
  const trackTx = useTxLifecycle();

  const onSend = useCallback(
    async ({
      publicTokenSymbol,
      confidentialTokenSymbol,
      publicTokenAddress,
      confidentialTokenAddress,
      amount,
      recipient,
    }: {
      publicTokenSymbol: string;
      confidentialTokenSymbol: string;
      publicTokenAddress: Address;
      confidentialTokenAddress: Address;
      amount: bigint;
      recipient: Address;
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

      let encryptedAmount: CoFheInUint128;
      try {
        const encryptedAmountResult = await cofhejs.encrypt([Encryptable.uint128(amount)]);
        if (encryptedAmountResult.error) {
          throw encryptedAmountResult.error;
        }
        encryptedAmount = encryptedAmountResult.data[0];
      } catch (error) {
        console.error("Failed to encrypt amount:", error);
        toast.error("Failed to encrypt amount");
        throw error;
      }

      try {
        const tx = await writeContractAsync({
          address: confidentialTokenAddress,
          abi: confidentialErc20Abi,
          functionName: "encTransfer",
          args: [recipient, encryptedAmount],
        });

        const success = await trackTx(tx, {
          tokenSymbol: publicTokenSymbol,
          tokenAddress: publicTokenAddress,
          tokenAmount: amount,
          actionType: TransactionActionType.EncSend,
        });
        setIsPending(false);

        if (success) {
          toast.success(`Sent ${confidentialTokenSymbol}`);
          refetchSingleTokenPairBalances(publicTokenAddress);
        } else {
          toast.error(`Failed to send ${confidentialTokenSymbol}`);
        }

        return tx;
      } catch (error) {
        setIsPending(false);
        console.error("Failed to send token:", error);
        toast.error("Failed to send token");
        throw error;
      }
    },
    [account, writeContractAsync, trackTx],
  );

  return { onSend, isSending: isPending };
};
