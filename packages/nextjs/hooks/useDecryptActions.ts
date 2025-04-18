import { useCallback } from "react";
import toast from "react-hot-toast";
import { Address } from "viem";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import { refetchSingleTokenPairBalances } from "~~/services/store/tokenStore2";

export const useDecryptFherc20Action = () => {
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();
  const { address: account } = useAccount();

  const onDecryptFherc20 = useCallback(
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
        const tx = await writeContractAsync({
          address: confidentialTokenAddress,
          abi: confidentialErc20Abi,
          functionName: "decrypt",
          args: [account, amount],
        });

        toast.success(`Decrypted ${publicTokenSymbol}`);

        refetchSingleTokenPairBalances(publicTokenAddress);

        return tx;
      } catch (error) {
        console.error("Failed to decrypt token:", error);
        toast.error("Failed to decrypt token");
        throw error;
      }
    },
    [writeContractAsync, chainId, account],
  );

  return { onDecryptFherc20, isDecrypting: isPending };
};
