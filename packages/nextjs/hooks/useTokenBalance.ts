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
    if (!tokenAddress || !userAddress || !isMounted.current || !isInitialized) {
      console.log("Cannot fetch private balance - conditions not met:", {
        tokenAddress: !!tokenAddress,
        userAddress: !!userAddress,
        isMounted: isMounted.current,
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
  const initialFetchDone = useRef(false);
  const { isInitialized } = useCofhe();

  // Function to fetch all balances
  const fetchBalances = async () => {
    if (!tokens || !userAddress || !isInitialized) {
      setIsLoadingAllPublic(false);
      setIsLoadingAllPrivate(false);
      return;
    }

    setIsLoadingAllPublic(true);
    try {
      const publicClient = getPublicClient(wagmiConfig);

      // First fetch all public balances quickly
      for (const token of tokens) {
        try {
          // Set loading state
          setTokenLoading(token.address, true);
          
          // Get public balance from regular ERC20
          const publicBalanceData = await publicClient.readContract({
            address: token.address as Address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [userAddress],
          });

          const formattedPublicBalance = formatUnits(publicBalanceData || BigInt(0), token.decimals);
          updateTokenBalance(token.address, formattedPublicBalance);
          setTokenLoading(token.address, false);
        } catch (error) {
          console.error(`Error fetching public balance for ${token.symbol}:`, error);
          updateTokenBalance(token.address, "0");
          setTokenLoading(token.address, false);
        }
      }
      
      setIsLoadingAllPublic(false);

      // Then fetch private balances in the background
      setIsLoadingAllPrivate(true);

      // Process private balances one by one to avoid overwhelming the system
      for (const token of tokens) {
        if (token.confidentialAddress) {
          try {
            // Set loading state
            setTokenLoading(token.address, undefined, true);
            
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
                updateTokenBalance(token.address, undefined, privateBalance);
              }
            } else {
              updateTokenBalance(token.address, undefined, "0");
            }
            setTokenLoading(token.address, undefined, false);
          } catch (error) {
            console.error(`Error fetching private balance for ${token.symbol}:`, error);
            updateTokenBalance(token.address, undefined, "0");
            setTokenLoading(token.address, undefined, false);
          }
        }
      }

      setIsLoadingAllPrivate(false);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setIsLoadingAllPublic(false);
      setIsLoadingAllPrivate(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!initialFetchDone.current && tokens && tokens.length > 0 && userAddress && isInitialized) {
      console.log("Fetching balances...");
      fetchBalances();
      initialFetchDone.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, userAddress, isInitialized]);

  return {
    isLoadingPublic: isLoadingAllPublic,
    isLoadingPrivate: isLoadingAllPrivate,
    refreshBalances: fetchBalances,
  };
}
