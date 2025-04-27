import { useCallback, useState } from "react";
import { useTxLifecycle } from "./useTxLifecycle";
import toast from "react-hot-toast";
import { Address } from "viem";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import {
  ClaimWithAddresses,
  fetchPairClaims,
  removeClaimedClaim,
  removePairClaimableClaims,
} from "~~/services/store/claim";
import { refetchSingleTokenPairBalances } from "~~/services/store/tokenStore";
import { TransactionActionType } from "~~/services/store/transactionStore";

export const useDecryptFherc20Action = () => {
  const { writeContractAsync, isError } = useWriteContract();
  const { address: account } = useAccount();
  const trackTx = useTxLifecycle();
  const [isPending, setIsPending] = useState(false);

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
        setIsPending(true);
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
        setIsPending(false);
        if (success) {
          toast.success(`Decrypted ${publicTokenSymbol}`);
          refetchSingleTokenPairBalances(publicTokenAddress);
          fetchPairClaims({ erc20Address: publicTokenAddress, fherc20Address: confidentialTokenAddress });
        } else {
          toast.error(`Failed to decrypt ${publicTokenSymbol}`);
        }
        return tx;
      } catch (error) {
        setIsPending(false);
        console.error("Failed to decrypt token:", error);
        toast.error("Failed to decrypt token");
        throw error;
      }
    },
    [writeContractAsync, account, trackTx],
  );

  return { onDecryptFherc20, isDecrypting: isPending, isDecryptError: isError };
};

export const useClaimFherc20Action = () => {
  const { writeContractAsync } = useWriteContract();
  const { address: account } = useAccount();
  const trackTx = useTxLifecycle();
  const [isPending, setIsPending] = useState(false);

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
        setIsPending(true);
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
        setIsPending(false);
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
        setIsPending(false);
        console.error("Failed to claim token:", error);
        toast.error("Failed to claim token");
        throw error;
      }
    },
    [account, writeContractAsync, trackTx],
  );

  return { onClaimFherc20, isClaiming: isPending };
};

export const useClaimAllAction = () => {
  const { writeContractAsync, isError } = useWriteContract();
  const { address: account } = useAccount();
  const trackTx = useTxLifecycle();
  const [isPending, setIsPending] = useState(false);

  const onClaimAll = useCallback(
    async ({
      publicTokenAddress,
      publicTokenSymbol,
      confidentialTokenAddress,
      claimAmount,
    }: {
      publicTokenAddress: Address;
      publicTokenSymbol: string;
      confidentialTokenAddress: Address;
      claimAmount: bigint;
    }) => {
      if (account == null) {
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
          address: confidentialTokenAddress,
          abi: confidentialErc20Abi,
          functionName: "claimAllDecrypted",
        });

        const success = await trackTx(tx, {
          tokenSymbol: publicTokenSymbol,
          tokenAddress: publicTokenAddress,
          tokenAmount: claimAmount,
          actionType: TransactionActionType.Claim,
        });
        setIsPending(false);

        if (success) {
          toast.success(`Claimed ${publicTokenSymbol}`);
          removePairClaimableClaims(publicTokenAddress);
          fetchPairClaims({ erc20Address: publicTokenAddress, fherc20Address: confidentialTokenAddress });
          refetchSingleTokenPairBalances(publicTokenAddress);
        } else {
          toast.error(`Failed to claim ${publicTokenSymbol}`);
        }

        return tx;
      } catch (error) {
        setIsPending(false);
        console.error("Failed to claim token:", error);
        toast.error("Failed to claim token");
        throw error;
      }
    },
    [account, writeContractAsync, trackTx],
  );

  return { onClaimAll, isClaiming: isPending, isClaimError: isError };
};
