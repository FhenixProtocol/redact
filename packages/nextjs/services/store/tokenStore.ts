import defaultTokenList from "../../public/token-list.json";
import { create } from "zustand";
import { getPublicClient, waitForTransactionReceipt } from "wagmi/actions";
import { writeContract } from "wagmi/actions";
import { RedactCoreAbi } from "~~/lib/abis";
import { Address } from "viem";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { getTokenLogo } from "~~/lib/tokenUtils";
import { REDACT_CORE_ADDRESS } from "~~/lib/common";

interface TokenListItem {
  name: string;
  symbol: string;
  decimals: number;
  image: string;
  address: string;
  confidentialAddress: string;
  isCustom?: boolean;
  publicBalance?: string;
  privateBalance?: string;
  isLoadingPublic?: boolean;
  isLoadingPrivate?: boolean;
}

interface TokenStore {
  tokens: TokenListItem[];
  updateTokens: () => void;
  addToken: (newToken: TokenListItem) => void;
  removeToken: (token: string) => void;
  updateTokenBalance: (tokenAddress: string, publicBalance?: string, privateBalance?: string) => void;
  setTokenLoading: (tokenAddress: string, isLoadingPublic?: boolean, isLoadingPrivate?: boolean) => void;
  deployToken: (newToken: TokenListItem) => Promise<string | null>;
}

export function getTokenList(): TokenListItem[] {
  // Get default tokens from JSON file
  const defaultTokens: TokenListItem[] = defaultTokenList;

  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return defaultTokens;
  }

  // Get custom tokens from localStorage
  const customTokens: TokenListItem[] = JSON.parse(localStorage.getItem("tokenList") || "[]");

  // Combine both lists, avoiding duplicates by address
  const allTokens = [...defaultTokens];

  customTokens.forEach(customToken => {
    customToken.isCustom = true;
    const exists = allTokens.some(token => token.address.toLowerCase() === customToken.address.toLowerCase());
    if (!exists) {
      allTokens.push(customToken);
    }
  });
  
  // Fix image URLs for all tokens
  allTokens.forEach(token => {
    token.image = token.image ? token.image : getTokenLogo(token.symbol)
  });
  
  return allTokens;
}

// Create a Zustand store for tokens
export const useTokenStore = create<TokenStore>(set => ({
  tokens: getTokenList(),

  updateTokens: () => set({ tokens: getTokenList() }),

  addToken: (newToken: TokenListItem) => {
    const existingTokens: TokenListItem[] = JSON.parse(localStorage.getItem("tokenList") || "[]");

    newToken.isCustom = true;
    // Fix the image URL before adding
    newToken.image = newToken.image ? newToken.image : getTokenLogo(newToken.symbol)

    const updatedTokens = [...existingTokens, newToken];
    localStorage.setItem("tokenList", JSON.stringify(updatedTokens));

    set({ tokens: getTokenList() });
  },

  removeToken: (tokenAddress: string) => {
    const existingTokens: TokenListItem[] = JSON.parse(localStorage.getItem("tokenList") || "[]");
    const filteredTokens = existingTokens.filter(t => t.address !== tokenAddress);
    localStorage.setItem("tokenList", JSON.stringify(filteredTokens));

    set({ tokens: getTokenList() });
  },
  
  updateTokenBalance: (tokenAddress: string, publicBalance?: string, privateBalance?: string) => {
    set(state => ({
      tokens: state.tokens.map(token => 
        token.address === tokenAddress 
          ? { 
              ...token, 
              ...(publicBalance !== undefined && { publicBalance }), 
              ...(privateBalance !== undefined && { privateBalance })
            } 
          : token
      )
    }));
  },

  setTokenLoading: (tokenAddress: string, isLoadingPublic?: boolean, isLoadingPrivate?: boolean) => {
    set(state => ({
      tokens: state.tokens.map(token => 
        token.address === tokenAddress 
          ? { 
              ...token, 
              ...(isLoadingPublic !== undefined && { isLoadingPublic }), 
              ...(isLoadingPrivate !== undefined && { isLoadingPrivate })
            } 
          : token
      )
    }));
  },
  
  // New function to deploy a confidential token
  deployToken: async (newToken: TokenListItem) => {
    try {
      // Call the deployFherc20 function on the RedactCore contract
      const hash = await writeContract(wagmiConfig, {
        address: REDACT_CORE_ADDRESS,
        abi: RedactCoreAbi,
        functionName: 'deployFherc20',
        args: [newToken.address],
      });
      
      console.log('Deployment transaction hash:', hash);
      
      // Wait for the transaction to be mined
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      console.log('Transaction receipt:', receipt);
      
      // Find the Fherc20Deployed event in the logs
      const publicClient = getPublicClient(wagmiConfig);
      const logs = await publicClient.getContractEvents({
        address: REDACT_CORE_ADDRESS,
        abi: RedactCoreAbi,
        eventName: 'Fherc20Deployed',
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });
      
      // Find the event that matches our token address
      const deployEvent = logs.find(log => 
        log.args.erc20?.toLowerCase() === newToken.address.toLowerCase()
      );
      
      if (deployEvent && deployEvent.args.fherc20) {
        const confidentialAddress = deployEvent.args.fherc20 as string;
        console.log('Confidential token deployed at:', confidentialAddress);
        

        newToken.confidentialAddress = confidentialAddress;

        const { addToken } = useTokenStore.getState();

        addToken(newToken);
        return confidentialAddress;
      }
      
      return null;
    } catch (error) {
      console.error('Error deploying confidential token:', error);
      return null;
    }
  },
}));

export type { TokenListItem };
