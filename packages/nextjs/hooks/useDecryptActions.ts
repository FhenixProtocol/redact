import { useCallback } from "react";
import toast from "react-hot-toast";
import { Address } from "viem";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import { ClaimWithAddresses, fetchPairClaims, removeClaimedClaim } from "~~/services/store/claim";
import { refetchSingleTokenPairBalances } from "~~/services/store/tokenStore";

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
        fetchPairClaims({ erc20Address: publicTokenAddress, fherc20Address: confidentialTokenAddress });

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

export const useClaimFherc20Action = () => {
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();
  const { address: account } = useAccount();

  const onClaimFherc20 = useCallback(
    async ({ publicTokenSymbol, claim }: { publicTokenSymbol: string; claim: ClaimWithAddresses }) => {
      if (account == null) {
        toast.error("No account found");
        return;
      }

      if (!writeContractAsync) {
        toast.error("Could not initialize contract write");
        return;
      }

      try {
        const tx = await writeContractAsync({
          address: claim.fherc20Address,
          abi: confidentialErc20Abi,
          functionName: "claimDecrypted",
          args: [claim.ctHash],
        });

        toast.success(`Claimed ${publicTokenSymbol}`);

        removeClaimedClaim(claim);
        fetchPairClaims(claim);
        refetchSingleTokenPairBalances(claim.erc20Address);

        return tx;
      } catch (error) {
        console.error("Failed to claim token:", error);
        toast.error("Failed to claim token");
        throw error;
      }
    },
    [account, writeContractAsync, chainId],
  );

  return { onClaimFherc20, isClaiming: isPending };
};
