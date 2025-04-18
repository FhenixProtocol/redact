import { useCallback } from "react";
import toast from "react-hot-toast";
import { Address, erc20Abi } from "viem";
import { useChainId, useConfig, useWriteContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { refetchSingleTokenPairBalances, refetchSingleTokenPairData } from "~~/services/store/tokenStore2";

export const useDeployFherc20Action = () => {
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();

  const onDeployFherc20 = useCallback(
    async ({ tokenAddress, publicTokenSymbol }: { tokenAddress: Address; publicTokenSymbol: string }) => {
      if (!writeContractAsync) {
        toast.error("Could not initialize contract write");
        return;
      }

      try {
        // Get contract data from deployedContracts
        const redactCoreContract = deployedContracts[chainId as keyof typeof deployedContracts]?.["RedactCore"];

        if (!redactCoreContract) {
          toast.error("RedactCore contract not found on current network");
          return;
        }

        // Call deployFherc20
        const tx = await writeContractAsync({
          address: redactCoreContract.address as Address,
          abi: redactCoreContract.abi,
          functionName: "deployFherc20",
          args: [tokenAddress],
        });

        // Show success notification once the transaction is confirmed
        toast.success(`e${publicTokenSymbol} deployed`);

        refetchSingleTokenPairData(tokenAddress);
        refetchSingleTokenPairBalances(tokenAddress);

        return tx;
      } catch (error) {
        console.error("Failed to deploy confidential token:", error);
        toast.error("Failed to deploy confidential token");
        throw error;
      }
    },
    [writeContractAsync, chainId],
  );

  return { onDeployFherc20, isDeploying: isPending };
};

export const useApproveFherc20Action = () => {
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();

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
        const tx = await writeContractAsync({
          address: publicTokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [confidentialTokenAddress, amount],
        });

        toast.success(`${publicTokenSymbol} approved`);

        refetchSingleTokenPairBalances(publicTokenAddress);

        return tx;
      } catch (error) {
        console.error("Failed to approve confidential token:", error);
        toast.error("Failed to approve confidential token");
        throw error;
      }
    },
    [writeContractAsync, chainId],
  );

  return { onApproveFherc20, isApproving: isPending };
};
