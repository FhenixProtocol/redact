import { useCallback, useState } from "react";
import { useTransactor } from "./scaffold-eth";
import toast from "react-hot-toast";
import { Abi, Address } from "viem";
import { Config, useAccount, useWriteContract } from "wagmi";
import { WriteContractVariables } from "wagmi/query";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import {
  ClaimWithAddresses,
  fetchAndDecryptPendingClaims,
  fetchPairClaims,
  removeClaimedClaim,
  removePairClaimableClaims,
  useClaimStore,
} from "~~/services/store/claim";
import { getChainId } from "~~/lib/common";
import { refetchSingleTokenPairBalances } from "~~/services/store/tokenStore";
import { TransactionActionType } from "~~/services/store/transactionStore";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { simulateContractWriteAndNotifyError } from "~~/utils/scaffold-eth/contract";

export const useDecryptFherc20Action = () => {
  const { writeContractAsync, isError } = useWriteContract();
  const { address: account } = useAccount();
  const writeTx = useTransactor();
  const [isPending, setIsPending] = useState(false);

  const onDecryptFherc20 = useCallback(
    async ({
      publicTokenSymbol,
      publicTokenAddress,
      confidentialTokenAddress,
      amount,
      tokenDecimals,
    }: {
      publicTokenSymbol: string;
      publicTokenAddress: Address;
      confidentialTokenAddress: Address;
      amount: bigint;
      tokenDecimals: number;
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
        console.log("--- decrypt (unshield) start ---");

        const writeContractObject = {
          abi: confidentialErc20Abi,
          address: confidentialTokenAddress,
          functionName: "unshield",
          args: [account, amount],
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
            actionType: TransactionActionType.Decrypt,
          },
          {
            onBlockConfirmation: async () => {
              console.log("--- decrypt TX confirmed, fetching claims ---");
              refetchSingleTokenPairBalances(publicTokenAddress);

              // Retry fetching claims — RPC may return stale data right after TX confirmation
              const pair = { erc20Address: publicTokenAddress, fherc20Address: confidentialTokenAddress };
              for (let attempt = 0; attempt < 3; attempt++) {
                await fetchPairClaims(pair);
                await fetchAndDecryptPendingClaims(publicTokenAddress);
                // Check if we found any pending claims
                const hasNewClaims = Object.values(
                  useClaimStore.getState().claims[await getChainId()]?.[publicTokenAddress] ?? {},
                ).some(c => !c.claimed);
                if (hasNewClaims) {
                  console.log("--- decrypt done (attempt", attempt + 1, ") ---");
                  break;
                }
                console.log("--- claims not found yet, retrying in 2s (attempt", attempt + 1, ") ---");
                await new Promise(r => setTimeout(r, 2000));
              }
            },
          },
        );

        return writeTxResult;
      } catch (error) {
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [writeContractAsync, account],
  );

  return { onDecryptFherc20, isDecrypting: isPending, isDecryptError: isError };
};

export const useClaimFherc20Action = () => {
  const { writeContractAsync } = useWriteContract();
  const { address: account } = useAccount();
  const writeTx = useTransactor();
  const [isPending, setIsPending] = useState(false);

  const onClaimFherc20 = useCallback(
    async ({
      publicTokenSymbol,
      claim,
      tokenDecimals,
    }: {
      publicTokenSymbol: string;
      claim: ClaimWithAddresses;
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

      try {
        setIsPending(true);

        if (!claim.decryptionResult) {
          toast.error("Claim not yet decrypted — please wait");
          return;
        }

        const writeContractObject = {
          abi: confidentialErc20Abi,
          address: claim.fherc20Address,
          functionName: "claimUnshielded",
          args: [claim.ctHash, claim.decryptionResult.decryptedValue, claim.decryptionResult.signature],
        } as WriteContractVariables<Abi, string, any[], Config, number>;

        await simulateContractWriteAndNotifyError({ wagmiConfig, writeContractParams: writeContractObject });
        const makeWriteWithParams = () => writeContractAsync(writeContractObject);

        const writeTxResult = await writeTx(
          makeWriteWithParams,
          {
            tokenSymbol: publicTokenSymbol,
            tokenAddress: claim.erc20Address,
            tokenDecimals,
            tokenAmount: claim.decryptedAmount,
            actionType: TransactionActionType.Claim,
          },
          {
            onBlockConfirmation: () => {
              removeClaimedClaim(claim);
              fetchPairClaims(claim);
              refetchSingleTokenPairBalances(claim.erc20Address);
            },
          },
        );

        return writeTxResult;
      } catch (error) {
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [account, writeContractAsync, writeTx],
  );

  return { onClaimFherc20, isClaiming: isPending };
};

export const useClaimAllAction = () => {
  const { writeContractAsync, isError } = useWriteContract();
  const { address: account } = useAccount();
  const writeTx = useTransactor();
  const [isPending, setIsPending] = useState(false);

  const onClaimAll = useCallback(
    async ({
      publicTokenAddress,
      publicTokenSymbol,
      confidentialTokenAddress,
      claimAmount,
      tokenDecimals,
      claims,
    }: {
      publicTokenAddress: Address;
      publicTokenSymbol: string;
      confidentialTokenAddress: Address;
      claimAmount: bigint;
      tokenDecimals: number;
      claims?: ClaimWithAddresses[];
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

        // Use stored decryption results from decryptForTx (already resolved off-chain)
        const claimsToProcess = (claims ?? []).filter(c => c.decryptionResult);
        if (claimsToProcess.length === 0) {
          toast.error("No claims ready to claim");
          return;
        }

        const ctHashes = claimsToProcess.map(c => c.ctHash);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- filtered above
        const decryptedAmounts = claimsToProcess.map(c => c.decryptionResult!.decryptedValue);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- filtered above
        const signatures = claimsToProcess.map(c => c.decryptionResult!.signature);

        const writeContractObject = {
          abi: confidentialErc20Abi,
          address: confidentialTokenAddress,
          functionName: "claimUnshieldedBatch",
          args: [ctHashes, decryptedAmounts, signatures],
        } as WriteContractVariables<Abi, string, any[], Config, number>;

        await simulateContractWriteAndNotifyError({ wagmiConfig, writeContractParams: writeContractObject });
        const makeWriteWithParams = () => writeContractAsync(writeContractObject);

        const writeTxResult = await writeTx(
          makeWriteWithParams,
          {
            tokenSymbol: publicTokenSymbol,
            tokenAddress: publicTokenAddress,
            tokenDecimals,
            tokenAmount: claimAmount,
            actionType: TransactionActionType.Claim,
          },
          {
            onBlockConfirmation: () => {
              removePairClaimableClaims(publicTokenAddress);
              fetchPairClaims({ erc20Address: publicTokenAddress, fherc20Address: confidentialTokenAddress });
              refetchSingleTokenPairBalances(publicTokenAddress);
            },
          },
        );

        return writeTxResult;
      } catch (error) {
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [account, writeContractAsync, writeTx],
  );

  return { onClaimAll, isClaiming: isPending, isClaimError: isError };
};
