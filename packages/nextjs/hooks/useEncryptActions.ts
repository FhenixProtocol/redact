import { useCallback } from "react";
import { Address } from "viem";
import { useChainId, useConfig, useWriteContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { refetchSingleTokenPairBalances, refetchSingleTokenPairData } from "~~/services/store/tokenStore2";
import { notification } from "~~/utils/scaffold-eth";

export const useDeployFherc20Action = () => {
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();

  const onDeployFherc20 = useCallback(
    async ({ tokenAddress, publicTokenSymbol }: { tokenAddress: Address; publicTokenSymbol: string }) => {
      if (!writeContractAsync) {
        notification.error("Could not initialize contract write");
        return;
      }

      try {
        // Get contract data from deployedContracts
        const redactCoreContract = deployedContracts[chainId as keyof typeof deployedContracts]?.["RedactCore"];

        if (!redactCoreContract) {
          notification.error("RedactCore contract not found on current network");
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
        notification.success(`e${publicTokenSymbol} deployed`);

        // Refetch data in parallel
        await Promise.all([refetchSingleTokenPairData(tokenAddress), refetchSingleTokenPairBalances(tokenAddress)]);

        return tx;
      } catch (error) {
        console.error("Failed to deploy confidential token:", error);
        notification.error("Failed to deploy confidential token");
        throw error;
      }
    },
    [writeContractAsync, chainId],
  );

  return { onDeployFherc20, isDeploying: isPending };
};
