import { useEffect, useRef, useState } from "react";
import { getPublicClient } from "@wagmi/core";
import { FheAllUTypes, FheTypes, cofhejs } from "cofhejs/web";
import { erc20Abi, formatUnits } from "viem";
import { Address } from "viem";
import { useReadContract } from "wagmi";
import { useCofhe } from "~~/hooks/useCofhe";
import { ConfidentialERC20Abi, RedactCoreAbi } from "~~/lib/abis";
import { REDACT_CORE_ADDRESS } from "~~/lib/common";
// Adjust this import path as needed
import { getTokenLogo } from "~~/lib/tokenUtils";
import { TokenListItem, useTokenStore } from "~~/services/store/tokenStore";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

interface UseTokenBalanceProps {
  tokenAddress?: string; // Make it optional
  userAddress?: Address;
  decimals: number;
  isPrivate?: boolean; // Add isPrivate parameter
}

export interface TokenBalanceInfo {
  symbol: string;
  publicBalance: string;
  privateBalance: string;
  logo: string;
  isCustom: boolean;
  address: string;
}

export interface TokenDetails {
  name: string;
  symbol: string;
  decimals: number;
  address: Address;
}

export function useTokenBalance({ tokenAddress, userAddress, decimals, isPrivate = false }: UseTokenBalanceProps) {
  const [privateBalance, setPrivateBalance] = useState<string>("0");
  const [isLoadingPrivate, setIsLoadingPrivate] = useState(false);
  const { tokens } = useTokenStore();
  const isMounted = useRef(true);
  const { isInitialized } = useCofhe();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  if (!tokenAddress) {
    return {
      balance: "0",
      isError: true,
      isLoading: false,
      refreshBalance: () => Promise.resolve(),
    };
  }

  // For public balance
  const {
    data: balance,
    isError,
    isLoading,
    refetch,
  } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress as Address],
  });

  // Function to fetch private balance
  const fetchPrivateBalance = async () => {
    if (!tokenAddress || !userAddress || !isMounted.current || !isInitialized) {
      console.log("Cannot fetch private balance - conditions not met:", {
        tokenAddress: !!tokenAddress,
        userAddress: !!userAddress,
        isMounted: isMounted.current,
        isInitialized,
      });
      return;
    }

    setIsLoadingPrivate(true);
    try {
      const selectedToken = tokens.find(t => t.address === tokenAddress);

      if (!selectedToken?.confidentialAddress) {
        if (isMounted.current) setPrivateBalance("0");
        return;
      }

      const publicClient = getPublicClient(wagmiConfig);

      const privateBalanceData = (await publicClient.readContract({
        address: selectedToken.confidentialAddress as Address,
        abi: ConfidentialERC20Abi,
        functionName: "encBalanceOf",
        args: [userAddress],
      })) as bigint;

      if (privateBalanceData > BigInt(0)) {
        const encryptedData = (privateBalanceData as bigint) || BigInt(0);
        const unsealedData = (await cofhejs.unseal(encryptedData, FheTypes.Uint128)) as any;

        if (unsealedData.data && isMounted.current) {
          const formattedBalance = formatUnits(BigInt(unsealedData.data), decimals);
          setPrivateBalance(formattedBalance);
        }
      } else {
        if (isMounted.current) setPrivateBalance("0");
      }
    } catch (error) {
      if (isMounted.current) setPrivateBalance("0");
    } finally {
      if (isMounted.current) setIsLoadingPrivate(false);
    }
  };

  // Fetch private balance when needed and cofhejs is initialized
  useEffect(() => {
    if (isPrivate && tokenAddress && userAddress && isInitialized) {
      console.log("Fetching private balance - cofhejs is initialized");
      fetchPrivateBalance();
    }
  }, [isPrivate, tokenAddress, userAddress, decimals, isInitialized]);

  // Function to refresh balances
  const refreshBalance = async () => {
    if (isPrivate) {
      await fetchPrivateBalance();
      return;
    }
    return await refetch();
  };

  // Create the return value
  const returnValue = {
    balance: isPrivate ? privateBalance : balance ? formatUnits(balance, decimals) : "0",
    isError: isPrivate ? false : isError,
    isLoading: isPrivate ? isLoadingPrivate : isLoading,
    refreshBalance,
  };

  return returnValue;
}

export async function confidentialTokenExists(erc20Address: Address): Promise<boolean> {
  const publicClient = getPublicClient(wagmiConfig);
  const data = await publicClient.readContract({
    address: REDACT_CORE_ADDRESS,
    abi: RedactCoreAbi,
    functionName: "getFherc20",
    args: [erc20Address],
  });

  // Check if the returned address is not the zero address
  if (data) {
    return data !== "0x0000000000000000000000000000000000000000";
  }
  return false;
}

export function useTokenDetails() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const fetchDetails = async (address: Address): Promise<TokenDetails | undefined> => {
    setIsLoading(true);
    setIsError(false);

    try {
      const publicClient = getPublicClient(wagmiConfig);

      const result = (await publicClient.multicall({
        contracts: [
          {
            address,
            abi: erc20Abi,
            functionName: "name",
          },
          {
            address,
            abi: erc20Abi,
            functionName: "symbol",
          },
          {
            address,
            abi: erc20Abi,
            functionName: "decimals",
          },
        ],
      })) as unknown as [
        { status: "success"; result: string } | { status: "failure"; error: Error },
        { status: "success"; result: string } | { status: "failure"; error: Error },
        { status: "success"; result: number } | { status: "failure"; error: Error },
      ];

      if (result[0].status === "success" && result[1].status === "success" && result[2].status === "success") {
        return {
          name: result[0].result,
          symbol: result[1].result,
          decimals: result[2].result,
          address,
        } satisfies TokenDetails;
      }

      setIsError(true);
      return undefined;
    } catch (error) {
      setIsError(true);
      console.error("Error fetching token details:", error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isError,
    isLoading,
    fetchDetails,
  };
}

export function useAllTokenBalances(userAddress?: Address) {
  const { tokens } = useTokenStore();
  const [tokenBalances, setTokenBalances] = useState<TokenBalanceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPrivateBalances, setIsLoadingPrivateBalances] = useState(true);
  const initialFetchDone = useRef(false);

  // Function to fetch all balances
  const fetchBalances = async () => {
    if (!tokens || !userAddress) {
      const emptyBalances =
        tokens?.map((token: TokenListItem) => ({
          symbol: token.symbol,
          publicBalance: "0",
          privateBalance: "0",
          logo: token.image,
          isCustom: token.isCustom || false,
          address: token.address,
        })) || [];

      setTokenBalances(emptyBalances);
      setIsLoading(false);
      setIsLoadingPrivateBalances(false);
      return;
    }

    setIsLoading(true);
    try {
      const publicClient = getPublicClient(wagmiConfig);

      // First fetch all public balances quickly
      const publicBalancePromises = tokens.map(async (token: TokenListItem) => {
        // Get public balance from regular ERC20
        const publicBalanceData = await publicClient.readContract({
          address: token.address as Address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [userAddress],
        });

        return {
          symbol: token.symbol,
          publicBalance: formatUnits(publicBalanceData || BigInt(0), token.decimals),
          privateBalance: "0", // Will be updated later
          logo: getTokenLogo(token.symbol, token.image),
          isCustom: token.isCustom || false,
          address: token.address,
        };
      });

      // Set public balances first so UI can show them immediately
      const publicBalances = await Promise.all(publicBalancePromises);
      setTokenBalances(publicBalances);
      setIsLoading(false);

      // Then fetch private balances in the background
      setIsLoadingPrivateBalances(true);

      // Create a map of current balances for easy updating
      const balancesMap = new Map(publicBalances.map(balance => [balance.address, balance]));

      // Process private balances one by one to avoid overwhelming the system
      for (const token of tokens) {
        if (token.confidentialAddress) {
          try {
            // Read private balance from the confidential contract
            const privateBalanceData = (await publicClient.readContract({
              address: token.confidentialAddress as Address,
              abi: ConfidentialERC20Abi,
              functionName: "encBalanceOf",
              args: [userAddress],
            })) as bigint;

            if (privateBalanceData > BigInt(0)) {
              const encryptedData = (privateBalanceData as bigint) || BigInt(0);
              console.log("Unsealing data...");
              const unsealedData = (await cofhejs.unseal(encryptedData, FheTypes.Uint128)) as any;
              console.log("Unsealed data:", unsealedData);
              if (unsealedData.data) {
                const privateBalance = formatUnits(BigInt(unsealedData.data), token.decimals);
                const currentBalance = balancesMap.get(token.address);

                if (currentBalance) {
                  const updatedBalance = { ...currentBalance, privateBalance };
                  balancesMap.set(token.address, updatedBalance);

                  // Update the state with the latest balances
                  setTokenBalances(Array.from(balancesMap.values()));
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching private balance for ${token.symbol}:`, error);
          }
        }
      }

      setIsLoadingPrivateBalances(false);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setIsLoading(false);
      setIsLoadingPrivateBalances(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!initialFetchDone.current && tokens && tokens.length > 0 && userAddress) {
      console.log("Fetching balances...");
      fetchBalances();
      initialFetchDone.current = true;
    }
  }, [tokens, userAddress]);

  return {
    tokenBalances,
    isLoading,
    isLoadingPrivateBalances,
    refreshBalances: fetchBalances,
  };
}
