import { wagmiConfig } from "../web3/wagmiConfig";
import { Address, erc20Abi } from "viem";
import { getPublicClient } from "wagmi/actions";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { RedactCoreAbi } from "~~/lib/abis";
import { REDACT_CORE_ADDRESS, chunk } from "~~/lib/common";

type ChainRecord<T> = Record<number, T>;
type AddressRecord<T> = Record<Address, T>;

interface TokenItemData {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  image?: string;

  // State
  loading: boolean;
  error: string | null;
}

interface ConfidentialTokenPair {
  publicToken: TokenItemData;
  confidentialToken?: TokenItemData;
  confidentialTokenDeployed: boolean;
  isStablecoin: boolean;
  isWETH: boolean;
}

interface TokenStore {
  loadingTokens: boolean;
  tokens: ChainRecord<ConfidentialTokenPair[]>;
  arbitraryTokens: ChainRecord<string[]>;
}

export const useTokenStore = create<TokenStore>()(
  persist(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    immer(set => ({
      loadingTokens: false,
      tokens: {},
      arbitraryTokens: {},
    })),
    {
      name: "token-store",
    },
  ),
);

const _addArbitraryToken = async (chain: number, address: string) => {
  useTokenStore.setState(state => {
    state.arbitraryTokens[chain] = [...(state.arbitraryTokens[chain] ?? []), address];
  });

  await _fetchToken(chain, address);
};

const _fetchInitialTokens = async (chain: number) => {
  const tokenListAddresses: string[] = [];
  const arbitraryTokenAddresses = useTokenStore.getState().arbitraryTokens[chain] ?? [];

  const addresses = [...tokenListAddresses, ...arbitraryTokenAddresses];

  useTokenStore.setState({ loadingTokens: true });

  const confidentialPairs = await _fetchTokenData(chain, addresses);
  const tokens = Object.values(confidentialPairs);

  useTokenStore.setState(state => {
    state.tokens[chain] = tokens;
    state.loadingTokens = false;
  });
};

const _fetchToken = async (chain: number, address: string) => {
  const confidentialPairs = await _fetchTokenData(chain, [address]);
  const token = Object.values(confidentialPairs)[0];

  useTokenStore.setState(state => {
    state.tokens[chain] = [...(state.tokens[chain] ?? []), token];
  });
};

export async function fetchConfidentialTokenPairs(addresses: Address[]) {
  const publicClient = getPublicClient(wagmiConfig);

  const results = await publicClient.multicall({
    contracts: addresses.flatMap(address => [
      {
        address: REDACT_CORE_ADDRESS,
        abi: RedactCoreAbi,
        functionName: "getFherc20",
        args: [address],
      },
    ]),
  });

  const confidentialPairs: AddressRecord<string> = {};

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    if (result.status === "failure") continue;

    const address = addresses[i];
    const fherc20 = result.result as Address;

    confidentialPairs[address] = fherc20;
  }

  return confidentialPairs;
}

async function _fetchTokenData(chain: number, addresses: Address[]) {
  const addressMap: Record<string, boolean> = {};
  for (const address of addresses) {
    addressMap[address] = true;
  }

  // Mark as loading
  useTokenStore.setState(state => {
    const tokens = state.tokens[chain];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (!addressMap[token.publicToken.address]) continue;

      token.publicToken.loading = true;
      token.publicToken.error = null;
      if (token.confidentialToken) {
        token.confidentialToken.loading = true;
        token.confidentialToken.error = null;
      }
    }
  });

  // Fetch and list confidential tokens
  const confidentialAddressPairs = await fetchConfidentialTokenPairs(addresses);
  const confidentialTokenAddresses = Object.values(confidentialAddressPairs);
  const allAddresses = [...confidentialTokenAddresses, ...addresses];

  // Fetch public token data
  const publicClient = getPublicClient(wagmiConfig);
  const result = await publicClient.multicall({
    contracts: allAddresses.flatMap(address => [
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
    ]),
  });

  // Create map of token addresses to token data (includes confidential tokens)
  const tokenDetails: AddressRecord<TokenItemData> = {};

  const results = chunk(result, 3);

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const address = addresses[i];

    const [name, symbol, decimals] = result;

    const error =
      name.status === "failure"
        ? name.error
        : symbol.status === "failure"
          ? symbol.error
          : decimals.status === "failure"
            ? decimals.error
            : null;

    tokenDetails[address] = {
      name: (name.result ?? "") as string,
      symbol: (symbol.result ?? "") as string,
      decimals: (decimals.result ?? 0) as number,
      address,
      loading: false,
      error: error?.message ?? null,
    };
  }

  // Create map of confidential pairs
  const confidentialPairs: AddressRecord<ConfidentialTokenPair> = {};

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    const confidentialTokenAddress = confidentialAddressPairs[address];

    confidentialPairs[address] = {
      publicToken: tokenDetails[address],
      confidentialToken: confidentialTokenAddress ? tokenDetails[confidentialTokenAddress] : undefined,
      confidentialTokenDeployed: !!confidentialTokenAddress,
      isStablecoin: false,
      isWETH: false,
    };
  }

  return confidentialPairs;
}

// With Injected Chain

const _getChainId = async () => {
  const publicClient = getPublicClient(wagmiConfig);
  return await publicClient.getChainId();
};

export const addArbitraryToken = async (address: string) => {
  const chain = await _getChainId();
  await _addArbitraryToken(chain, address);
  await _fetchInitialTokens(chain);
};

export const fetchInitialTokens = async () => {
  const chain = await _getChainId();
  await _fetchInitialTokens(chain);
};

export const fetchToken = async (address: string) => {
  const chain = await _getChainId();
  await _fetchToken(chain, address);
};
