import defaultTokenList from "../../public/token-list.json";
import { create } from "zustand";

interface TokenListItem {
  name: string;
  symbol: string;
  decimals: number;
  image: string;
  address: string;
  confidentialAddress: string;
  isCustom?: boolean;
}

interface TokenStore {
  tokens: TokenListItem[];
  updateTokens: () => void;
  addToken: (newToken: TokenListItem) => void;
  removeToken: (token: string) => void;
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
  return allTokens;
}

// Create a Zustand store for tokens
export const useTokenStore = create<TokenStore>(set => ({
  tokens: getTokenList(),

  updateTokens: () => set({ tokens: getTokenList() }),

  addToken: (newToken: TokenListItem) => {
    const existingTokens: TokenListItem[] = JSON.parse(localStorage.getItem("tokenList") || "[]");

    newToken.isCustom = true;

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
}));

export type { TokenListItem };
