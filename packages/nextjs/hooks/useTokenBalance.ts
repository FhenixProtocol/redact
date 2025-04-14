import { useReadContract } from 'wagmi'
import { formatUnits, erc20Abi } from 'viem'
import { Address } from 'viem'
import { TokenListItem, useTokenStore} from '~~/services/store/tokenStore'
import { useEffect, useState } from 'react'
import { getPublicClient } from '@wagmi/core'
import { wagmiConfig } from '~~/services/web3/wagmiConfig'  // Adjust this import path as needed
import { getTokenLogo } from '~~/lib/tokenUtils'
import { ConfidentialERC20Abi, RedactCoreAbi } from '~~/lib/abis'
import { REDACT_CORE_ADDRESS } from '~~/lib/common'
import { cofhejs, FheAllUTypes, FheTypes } from 'cofhejs/web'
interface UseTokenBalanceProps {
  tokenAddress?: string;  // Make it optional
  userAddress?: Address;
  decimals?: number;
}

export interface TokenBalanceInfo {
  symbol: string
  publicBalance: string
  privateBalance: string
  logo: string
  isCustom: boolean
  address: string
}

export interface TokenDetails {
  name: string
  symbol: string
  decimals: number
  address: Address
}

export function useTokenBalance({ tokenAddress, userAddress, decimals = 18 }: UseTokenBalanceProps) {
  
  if (!tokenAddress) {
    return {
      balance: '0',
      isError: true,
      isLoading: false,
      refreshBalance: () => Promise.resolve() 
    }
  }
  
  const { data: balance, isError, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress as Address],
    //enabled: Boolean(tokenAddress && userAddress),
  })

  // Function to refresh balances
  const refreshBalance = async () => {
    console.log("Refreshing balance for token:", tokenAddress);
    return await refetch();
  };

  return {
    balance: balance ? formatUnits(balance, decimals) : '0',
    isError,
    isLoading,
    refreshBalance
  }
}

export async function confidentialTokenExists(erc20Address: Address) : Promise<boolean> {
  const publicClient = getPublicClient(wagmiConfig)
  const data = await publicClient.readContract({
    address: REDACT_CORE_ADDRESS,
    abi: RedactCoreAbi,
    functionName: 'getFherc20',
    args: [erc20Address]
  })
  
  // Check if the returned address is not the zero address
  if (data) {
    return data !== "0x0000000000000000000000000000000000000000";
  }
  return false;
}

export function useTokenDetails() {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)

  const fetchDetails = async (address: Address): Promise<TokenDetails | undefined> => {
    setIsLoading(true)
    setIsError(false)
    
    try {
      const publicClient = getPublicClient(wagmiConfig)
      
      const result = await publicClient.multicall({
        contracts: [
          {
            address,
            abi: erc20Abi,
            functionName: 'name',
          },
          {
            address,
            abi: erc20Abi,
            functionName: 'symbol',
          },
          {
            address,
            abi: erc20Abi,
            functionName: 'decimals',
          },
        ]
      }) as unknown as [
        { status: 'success', result: string } | { status: 'failure', error: Error },
        { status: 'success', result: string } | { status: 'failure', error: Error },
        { status: 'success', result: number } | { status: 'failure', error: Error }
      ];

      if (
        result[0].status === 'success' && 
        result[1].status === 'success' && 
        result[2].status === 'success'
      ) {
        return {
          name: result[0].result,
          symbol: result[1].result,
          decimals: result[2].result,
          address
        } satisfies TokenDetails;
      }
      
      setIsError(true)
      return undefined;
    } catch (error) {
      setIsError(true)
      console.error('Error fetching token details:', error)
      return undefined;
    } finally {
      setIsLoading(false)
    }
  };

  return {
    isError,
    isLoading,
    fetchDetails
  }
}

export function useAllTokenBalances(userAddress?: Address) {
  const { tokens } = useTokenStore();
  const [tokenBalances, setTokenBalances] = useState<TokenBalanceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch all balances
  const fetchBalances = async () => {
    if (!tokens || !userAddress) {
      const emptyBalances = tokens?.map((token: TokenListItem) => ({
        symbol: token.symbol,
        publicBalance: '0',
        privateBalance: '0',
        logo: token.image,
        isCustom: token.isCustom || false,
        address: token.address
      })) || [];
      
      setTokenBalances(emptyBalances);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const publicClient = getPublicClient(wagmiConfig);
      
      const balancePromises = tokens.map(async (token: TokenListItem) => {
        // Get public balance from regular ERC20
        const publicBalanceData = await publicClient.readContract({
          address: token.address as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [userAddress]
        });

        // Get private balance from confidential contract
        let privateBalance = BigInt(0);
        if (token.confidentialAddress) {
          try {
            // Read private balance from the confidential contract
            const privateBalanceData = await publicClient.readContract({
              address: token.confidentialAddress as Address,
              abi: ConfidentialERC20Abi, // Make sure this ABI has the right function
              functionName: 'encBalanceOf', // Or whatever function returns private balance
              args: [userAddress]
            });
            const encryptedData = privateBalanceData as bigint || BigInt(0);
            console.log("Unsealing data...");
            const unsealedData = await cofhejs.unseal(encryptedData, FheTypes.Uint128) as any;
            console.log("Unsealed data:", unsealedData);
            if (unsealedData.data) {
              privateBalance = BigInt(unsealedData.data);
            }
          } catch (error) {
            console.error(`Error fetching private balance for ${token.symbol}:`, error);
          }
        }

        return {
          symbol: token.symbol,
          publicBalance: formatUnits(publicBalanceData || BigInt(0), token.decimals),
          privateBalance: formatUnits(privateBalance, token.decimals),
          logo: getTokenLogo(token.symbol, token.image),
          isCustom: token.isCustom || false,
          address: token.address
        };
      });

      const balances = await Promise.all(balancePromises);
      setTokenBalances(balances);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchBalances();
  }, [tokens, userAddress]);

  return {
    tokenBalances,
    isLoading,
    refreshBalances: fetchBalances
  };
} 