import { useCallback } from "react";
import toast from "react-hot-toast";
import { Address, erc20Abi } from "viem";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import deployedContracts from "~~/contracts/deployedContracts";
import { refetchSingleTokenPairBalances, refetchSingleTokenPairData } from "~~/services/store/tokenStore";
import { TransactionActionType, TransactionStatus, useTransactionStore } from "~~/services/store/transactionStore";
import { useTxLifecycle } from "./useTxLifecycle";

export const useDeployFherc20Action = () => {
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();
  const trackTx = useTxLifecycle();

  const onDeployFherc20 = useCallback(
    async ({ tokenAddress, publicTokenSymbol }: { tokenAddress: Address; publicTokenSymbol: string }) => {
      if (!writeContractAsync) {
        toast.error("Could not initialize contract write");
        return;
      }

      const redactCoreContract = deployedContracts[chainId as keyof typeof deployedContracts]?.["RedactCore"];
      if (!redactCoreContract) {
        toast.error("RedactCore contract not found on current network");
        return;
      }

      try {
        const txHash = await writeContractAsync({
          address: redactCoreContract.address as Address,
          abi: redactCoreContract.abi,
          functionName: "deployFherc20",
          args: [tokenAddress],
        });

        const success = await trackTx(txHash, {
          tokenSymbol: publicTokenSymbol,
          tokenAmount: "0",
          actionType: TransactionActionType.Deploy,
        });

        if (success) {
          toast.success(`e${publicTokenSymbol} deployed`);
          refetchSingleTokenPairData(tokenAddress);
          refetchSingleTokenPairBalances(tokenAddress);
        } else {
          toast.error(`Failed to deploy e${publicTokenSymbol}`);
        }

        return txHash;
      } catch (error) {
        toast.error("Failed to deploy confidential token");
        throw error;
      }
    },
    [writeContractAsync, chainId, trackTx],
  );

  return { onDeployFherc20, isDeploying: isPending };
};


export const useApproveFherc20Action = () => {
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();
  const trackTx = useTxLifecycle();

  const onApproveFherc20 = useCallback(
    async ({
      publicTokenSymbol,
      publicTokenAddress,
      confidentialTokenAddress,
      amount,
    }: {
      publicTokenSymbol: string;
      publicTokenAddress: Address;
      confidentialTokenAddress: Address;
      amount: bigint;
    }) => {
      if (!writeContractAsync) {
        toast.error("Could not initialize contract write");
        return;
      }

      try {
        const txHash = await writeContractAsync({
          address: publicTokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [confidentialTokenAddress, amount],
        });

        const success = await trackTx(txHash, {
          tokenSymbol: publicTokenSymbol,
          tokenAmount: amount.toString(),
          actionType: TransactionActionType.Approve,
        });

        if (success) {
          toast.success(`${publicTokenSymbol} approved`);
          refetchSingleTokenPairBalances(publicTokenAddress);
        } else {
          toast.error(`Failed to approve ${publicTokenSymbol}`);
        }

        return txHash;
      } catch (error) {
        toast.error("Failed to approve confidential token");
        throw error;
      }
    },
    [writeContractAsync, trackTx],
  );

  return { onApproveFherc20, isApproving: isPending };
};


export const useEncryptErc20Action = () => {
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();
  const { address: account } = useAccount();
  const trackTx = useTxLifecycle();

  const onEncryptErc20 = useCallback(
    async ({
      publicTokenSymbol,
      publicTokenAddress,
      confidentialTokenAddress,
      amount,
    }: {
      publicTokenSymbol: string;
      publicTokenAddress: Address;
      confidentialTokenAddress: Address;
      amount: bigint;
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
        const txHash = await writeContractAsync({
          address: confidentialTokenAddress,
          abi: confidentialErc20Abi,
          functionName: "encrypt",
          args: [account, amount],
        });

        const success = await trackTx(txHash, {
          tokenSymbol: publicTokenSymbol,
          tokenAmount: amount.toString(),
          actionType: TransactionActionType.Encrypt,
        });

        if (success) {
          toast.success(`Encrypted ${publicTokenSymbol}`);
          refetchSingleTokenPairBalances(publicTokenAddress);
        } else {
          toast.error(`Failed to encrypt ${publicTokenSymbol}`);
        }

        return txHash;
      } catch (error) {
        toast.error("Failed to encrypt token");
        throw error;
      }
    },
    [account, writeContractAsync, trackTx],
  );

  return { onEncryptErc20, isEncrypting: isPending };
};
