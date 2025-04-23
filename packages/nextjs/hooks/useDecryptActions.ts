import { useCallback } from "react";
import toast from "react-hot-toast";
import { Address } from "viem";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import { ClaimWithAddresses, fetchPairClaims, removeClaimedClaim } from "~~/services/store/claim";
import { refetchSingleTokenPairBalances } from "~~/services/store/tokenStore";
import { useTxLifecycle } from "./useTxLifecycle";
import { TransactionActionType } from "~~/services/store/transactionStore";

export const useDecryptFherc20Action = () => {
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();
  const { address: account } = useAccount();
  const trackTx = useTxLifecycle();

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

        const success = await trackTx(tx, {
          tokenSymbol: publicTokenSymbol,
          tokenAddress: publicTokenAddress,
          tokenAmount: amount,
          actionType: TransactionActionType.Decrypt,
        });

        if (success) {
          toast.success(`Decrypted ${publicTokenSymbol}`);
          refetchSingleTokenPairBalances(publicTokenAddress);
          fetchPairClaims({ erc20Address: publicTokenAddress, fherc20Address: confidentialTokenAddress });
        } else {
          toast.error(`Failed to decrypt ${publicTokenSymbol}`);
        }
        return tx;
      } catch (error) {
        console.error("Failed to decrypt token:", error);
        toast.error("Failed to decrypt token");
        throw error;
      }
    },
    [writeContractAsync, chainId, account, trackTx],
  );

  return { onDecryptFherc20, isDecrypting: isPending };
};

export const useClaimFherc20Action = () => {
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();
  const { address: account } = useAccount();
  const trackTx = useTxLifecycle();
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

        const success = await trackTx(tx, {
          tokenSymbol: publicTokenSymbol,
          tokenAddress: claim.erc20Address,
          tokenAmount: claim.decryptedAmount,
          actionType: TransactionActionType.Claim,
        });

        if (success) {
          toast.success(`Claimed ${publicTokenSymbol}`);
          removeClaimedClaim(claim);
          fetchPairClaims(claim);
          refetchSingleTokenPairBalances(claim.erc20Address);
        } else {
          toast.error(`Failed to claim ${publicTokenSymbol}`);
        }

        return tx;
      } catch (error) {
        console.error("Failed to claim token:", error);
        toast.error("Failed to claim token");
        throw error;
      }
    },
    [account, writeContractAsync, chainId, trackTx],
  );

  return { onClaimFherc20, isClaiming: isPending };
};
