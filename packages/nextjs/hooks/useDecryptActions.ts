import { useCallback, useState } from "react";
import { useTransactor } from "./scaffold-eth";
import toast from "react-hot-toast";
import { Abi, Address } from "viem";
import { Config, useAccount, useWriteContract } from "wagmi";
import { WriteContractVariables } from "wagmi/query";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import {
  ClaimWithAddresses,
  fetchPairClaims,
  removeClaimedClaim,
  removePairClaimableClaims,
} from "~~/services/store/claim";
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

        const writeContractObject = {
          abi: confidentialErc20Abi,
          address: confidentialTokenAddress,
          functionName: "decrypt",
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
            onBlockConfirmation: () => {
              refetchSingleTokenPairBalances(publicTokenAddress);
              fetchPairClaims({ erc20Address: publicTokenAddress, fherc20Address: confidentialTokenAddress });
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

        const writeContractObject = {
          abi: confidentialErc20Abi,
          address: claim.fherc20Address,
          functionName: "claimDecrypted",
          args: [claim.ctHash],
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
    }: {
      publicTokenAddress: Address;
      publicTokenSymbol: string;
      confidentialTokenAddress: Address;
      claimAmount: bigint;
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

        const writeContractObject = {
          abi: confidentialErc20Abi,
          address: confidentialTokenAddress,
          functionName: "claimAllDecrypted",
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
