import { useCallback, useState } from "react";
import { useTransactor } from "./scaffold-eth";
import { Abi } from "abitype";
import { Address, erc20Abi } from "viem";
import { Config, useAccount, useChainId, useWriteContract } from "wagmi";
import { WriteContractVariables } from "wagmi/query";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import confidentialEthAbi from "~~/contracts/ConfidentialEthAbi";
import deployedContracts from "~~/contracts/deployedContracts";
import { ETH_ADDRESS } from "~~/lib/common";
import { refetchSingleTokenPairBalances, refetchSingleTokenPairData } from "~~/services/store/tokenStore";
import { TransactionActionType } from "~~/services/store/transactionStore";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { notification } from "~~/utils/scaffold-eth";
import { simulateContractWriteAndNotifyError } from "~~/utils/scaffold-eth/contract";

export const useDeployFherc20Action = () => {
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const [isPending, setIsPending] = useState(false);
  const writeTx = useTransactor();

  const onDeployFherc20 = useCallback(
    async ({ tokenAddress, publicTokenSymbol }: { tokenAddress: Address; publicTokenSymbol: string }) => {
      if (!writeContractAsync) {
        notification.error("Could not initialize contract write");
        return;
      }

      const redactCoreContract = deployedContracts[chainId as keyof typeof deployedContracts]?.["RedactCore"];
      if (!redactCoreContract) {
        notification.error("RedactCore contract not found on current network");
        return;
      }

      try {
        setIsPending(true);

        const writeContractObject = {
          abi: redactCoreContract.abi,
          address: redactCoreContract.address as Address,
          functionName: "deployFherc20",
          args: [tokenAddress],
        } as WriteContractVariables<Abi, string, any[], Config, number>;

        await simulateContractWriteAndNotifyError({ wagmiConfig, writeContractParams: writeContractObject });
        const makeWriteWithParams = () => writeContractAsync(writeContractObject);

        const writeTxResult = await writeTx(
          makeWriteWithParams,
          {
            tokenSymbol: publicTokenSymbol,
            tokenAddress: tokenAddress,
            tokenDecimals: 18,
            tokenAmount: BigInt(0),
            actionType: TransactionActionType.Deploy,
          },
          {
            onBlockConfirmation: () => {
              refetchSingleTokenPairData(tokenAddress);
              refetchSingleTokenPairBalances(tokenAddress);
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
    [chainId, writeContractAsync, writeTx],
  );

  return { onDeployFherc20, isDeploying: isPending };
};

export const useApproveFherc20Action = () => {
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const writeTx = useTransactor();

  const onApproveFherc20 = useCallback(
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
      if (!writeContractAsync) {
        notification.error("Could not initialize contract write");
        return;
      }

      try {
        setIsPending(true);

        const writeContractObject = {
          abi: erc20Abi,
          address: publicTokenAddress,
          functionName: "approve",
          args: [confidentialTokenAddress, amount],
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
            actionType: TransactionActionType.Approve,
          },
          {
            onBlockConfirmation: () => {
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
    [writeContractAsync, writeTx],
  );

  return { onApproveFherc20, isApproving: isPending };
};

export const useEncryptErc20Action = () => {
  const { writeContractAsync, isError } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const { address: account } = useAccount();
  const writeTx = useTransactor();

  const onEncryptErc20 = useCallback(
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
        notification.error("No account found");
        return;
      }

      if (!writeContractAsync) {
        notification.error("Could not initialize contract write");
        return;
      }

      const isEth = publicTokenSymbol === "ETH";
      const isWeth = publicTokenSymbol === "WETH";

      try {
        setIsPending(true);

        const abi = isWeth || isEth ? confidentialEthAbi : confidentialErc20Abi;
        const functionName = isWeth ? "encryptWETH" : isEth ? "encryptETH" : "encrypt";

        const writeContractObject = {
          abi,
          address: confidentialTokenAddress,
          functionName,
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
            actionType: TransactionActionType.Encrypt,
          },
          {
            onBlockConfirmation: () => {
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

  return { onEncryptErc20, isEncrypting: isPending, isEncryptError: isError };
};
