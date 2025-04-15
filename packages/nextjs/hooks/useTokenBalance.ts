import { useEffect, useRef, useState } from "react";
import { getPublicClient } from "@wagmi/core";
import { FheTypes, cofhejs } from "cofhejs/web";
import { erc20Abi, formatUnits } from "viem";
import { Address } from "viem";
import { useReadContract } from "wagmi";
import { useCofhe } from "~~/hooks/useCofhe";
import { ConfidentialERC20Abi, RedactCoreAbi } from "~~/lib/abis";
import { REDACT_CORE_ADDRESS } from "~~/lib/common";
import { getTokenLogo } from "~~/lib/tokenUtils";
import { TokenListItem, useTokenStore } from "~~/services/store/tokenStore";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

//TODO: Refactor and reduce code duplication
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
  const { tokens, updateTokenBalance, setTokenLoading } = useTokenStore();
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

  // Update loading state in store
  useEffect(() => {
    if (!isPrivate) {
      setTokenLoading(tokenAddress, isLoading);
    }
  }, [isLoading, tokenAddress, isPrivate, setTokenLoading]);

  // Update public balance in store when it changes
  useEffect(() => {
    if (balance !== undefined && !isPrivate) {
      const formattedBalance = formatUnits(balance, decimals);
      updateTokenBalance(tokenAddress, formattedBalance);
    }
  }, [balance, tokenAddress, decimals, updateTokenBalance, isPrivate]);

  // Function to fetch private balance
  const fetchPrivateBalance = async () => {
    if (!tokenAddress || !userAddress || !isInitialized) {
      console.log("Cannot fetch private balance - conditions not met:", {
        tokenAddress: !!tokenAddress,
        userAddress: !!userAddress,
        isInitialized,
      });
      return;
    }

    if (isMounted.current) {
      setTokenLoading(tokenAddress, undefined, true);
    }
    
    try {
      const selectedToken = tokens.find(t => t.address === tokenAddress);

      if (!selectedToken?.confidentialAddress) {
        if (isMounted.current) {
          updateTokenBalance(tokenAddress, undefined, "0");
        }
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
          updateTokenBalance(tokenAddress, undefined, formattedBalance);
        }
      } else {
        if (isMounted.current) {
          updateTokenBalance(tokenAddress, undefined, "0");
        }
      }
    } catch (error) {
      if (isMounted.current) {
        updateTokenBalance(tokenAddress, undefined, "0");
      }
    } finally {
      if (isMounted.current) {
        setTokenLoading(tokenAddress, undefined, false);
      }
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

  // Get current token from store to access balance and loading state
  const token = tokens.find(t => t.address === tokenAddress);
  const currentBalance = isPrivate 
    ? token?.privateBalance || "0" 
    : token?.publicBalance || "0";
  const currentIsLoading = isPrivate
    ? token?.isLoadingPrivate || false
    : token?.isLoadingPublic || false;

  // Create the return value
  const returnValue = {
    balance: currentBalance,
    isError: isPrivate ? false : isError,
    isLoading: currentIsLoading,
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
  const { tokens, updateTokenBalance, setTokenLoading } = useTokenStore();
  const [isLoadingAllPublic, setIsLoadingAllPublic] = useState(true);
  const [isLoadingAllPrivate, setIsLoadingAllPrivate] = useState(true);
  const { isInitialized } = useCofhe();
  const publicClient = getPublicClient(wagmiConfig);

  const fetchPublicBalances = async () => {
    if (!tokens || !userAddress) return;
    
    try {
      const promises = tokens.map(async (token) => {
        try {
          setTokenLoading(token.address, true);
          const balance = await publicClient.readContract({
            address: token.address as Address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [userAddress],
          });
          
          const formattedBalance = formatUnits(balance || BigInt(0), token.decimals);
          updateTokenBalance(token.address, formattedBalance);
        } catch (error) {
          console.error(`Error fetching public balance for ${token.symbol}:`, error);
          updateTokenBalance(token.address, "0");
        } finally {
          setTokenLoading(token.address, false);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error("Error fetching public balances:", error);
    }
  };

  const fetchPrivateBalances = async () => {
    if (!tokens || !userAddress || !isInitialized) return;

    for (const token of tokens) {
      if (!token.confidentialAddress) continue;

      try {
        setTokenLoading(token.address, undefined, true);
        
        const privateBalanceData = (await publicClient.readContract({
          address: token.confidentialAddress as Address,
          abi: ConfidentialERC20Abi,
          functionName: "encBalanceOf",
          args: [userAddress],
        })) as bigint;

        if (privateBalanceData > BigInt(0)) {
          console.log("unsealing for ", token.symbol);
          const unsealedData = (await cofhejs.unseal(privateBalanceData, FheTypes.Uint128)) as any;
          console.log("unsealedData", unsealedData);
          if (unsealedData.data) {
            const privateBalance = formatUnits(BigInt(unsealedData.data), token.decimals);
            updateTokenBalance(token.address, undefined, privateBalance);
          }
        } else {
          updateTokenBalance(token.address, undefined, "0");
        }
      } catch (error) {
        console.error(`Error fetching private balance for ${token.symbol}:`, error);
        updateTokenBalance(token.address, undefined, "0");
      } finally {
        setTokenLoading(token.address, undefined, false);
      }
    }
  };

  const fetchBalances = async () => {
    if (!tokens || !userAddress) {
      setIsLoadingAllPublic(false);
      setIsLoadingAllPrivate(false);
      return;
    }

    setIsLoadingAllPublic(true);
    try {
      await fetchPublicBalances();
    } finally {
      setIsLoadingAllPublic(false);
    }

    setIsLoadingAllPrivate(true);
    try {
      await fetchPrivateBalances();
    } finally {
      setIsLoadingAllPrivate(false);
    }
  };

  return {
    isLoadingPublic: isLoadingAllPublic,
    isLoadingPrivate: isLoadingAllPrivate,
    refreshBalances: fetchBalances,
  };
}
