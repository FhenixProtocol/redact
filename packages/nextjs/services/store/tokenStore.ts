/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useCallback, useRef } from "react";
import { wagmiConfig } from "../web3/wagmiConfig";
import { decryptValue } from "./decrypted";
import { superjsonStorage } from "./superjsonStorage";
import { FheTypes } from "cofhejs/web";
import { WritableDraft } from "immer";
import { Address, erc20Abi, zeroAddress } from "viem";
import { deepEqual, useChainId } from "wagmi";
import { getAccount, getPublicClient } from "wagmi/actions";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import { ETH_ADDRESS, chunk, getChainId, getDeployedContract } from "~~/lib/common";

type ChainRecord<T> = Record<number, T>;
type AddressRecord<T> = Record<Address, T>;

// existing list array of public token addresses

export interface AddressPair {
  erc20Address: Address;
  fherc20Address: Address | undefined;
}

export interface TokenItemData {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  image?: string;

  // State
  loading: boolean;
  error: string | null;
}

export interface ConfidentialTokenPair {
  publicToken: TokenItemData;
  confidentialToken?: TokenItemData;
  confidentialTokenDeployed: boolean;
  isStablecoin: boolean;
  isWETH: boolean;
}

export interface ConfidentialTokenPairBalances {
  publicBalance: bigint | undefined;
  // Stored as a ctHash rather than the decrypted balance. The decrypt store is used to map this ctHash into the true decrypted balance.
  confidentialBalance: bigint | undefined;
  fherc20Allowance: bigint | undefined;
}

export interface ConfidentialTokenPairWithBalances {
  pair: ConfidentialTokenPair;
  balances: ConfidentialTokenPairBalances;
}

interface TokenStore {
  loadingTokens: boolean;

  pairs: ChainRecord<AddressRecord<ConfidentialTokenPair>>;

  balances: ChainRecord<AddressRecord<ConfidentialTokenPairBalances>>;

  arbitraryTokens: ChainRecord<AddressRecord<string>>;
}

export const useTokenStore = create<TokenStore>()(
  persist(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    immer(set => ({
      loadingTokens: false,

      pairs: {},

      balances: {},

      arbitraryTokens: {},
    })),
    {
      name: "token-store",
      storage: superjsonStorage,
    },
  ),
);

// Setters

const _addPairToStore = (
  state: WritableDraft<TokenStore>,
  chain: number,
  pair: ConfidentialTokenPair,
  balances?: ConfidentialTokenPairBalances,
) => {
  state.pairs[chain] = {
    ...state.pairs[chain],
    [pair.publicToken.address]: pair,
  };
  if (balances != null) {
    state.balances[chain] = {
      ...state.balances[chain],
      [pair.publicToken.address]: balances,
    };
  }
};

const _addPairsToStore = (state: WritableDraft<TokenStore>, chain: number, pairs: ConfidentialTokenPair[]) => {
  for (const pair of pairs) {
    _addPairToStore(state, chain, pair);
  }
};

const _addPairBalanceToStore = (
  state: WritableDraft<TokenStore>,
  chain: number,
  account: Address,
  pairPublicAddress: Address,
  pairBalance: ConfidentialTokenPairBalances,
) => {
  state.balances[chain] = {
    ...state.balances[chain],
    [pairPublicAddress]: pairBalance,
  };
};

const _addPairBalancesToStore = (
  state: WritableDraft<TokenStore>,
  chain: number,
  account: Address,
  pairPublicAddresses: Address[],
  pairBalances: ConfidentialTokenPairBalances[],
) => {
  for (let i = 0; i < pairPublicAddresses.length; i++) {
    _addPairBalanceToStore(state, chain, account, pairPublicAddresses[i], pairBalances[i]);
  }
};

const _addArbitraryToken = async (chain: number, { pair, balances }: ConfidentialTokenPairWithBalances) => {
  useTokenStore.setState(state => {
    _addPairToStore(state, chain, pair, balances);
    state.arbitraryTokens[chain] = {
      ...state.arbitraryTokens[chain],
      [pair.publicToken.address]: pair.publicToken.address,
    };
  });
  // await _fetchToken(chain, pair.publicToken.address);
};

const _removeArbitraryToken = async (chain: number, publicTokenAddress: string) => {
  useTokenStore.setState(state => {
    if (state.arbitraryTokens[chain]?.[publicTokenAddress] != null) {
      delete state.arbitraryTokens[chain][publicTokenAddress];
    }
    if (state.pairs[chain]?.[publicTokenAddress] != null) {
      delete state.pairs[chain][publicTokenAddress];
    }
    if (state.balances[chain]?.[publicTokenAddress] != null) {
      delete state.balances[chain][publicTokenAddress];
    }
  });
};

// Utils

// ARBITRARY TOKEN

export const addArbitraryToken = async (pairWithBalances: ConfidentialTokenPairWithBalances) => {
  const chain = await getChainId();
  await _addArbitraryToken(chain, pairWithBalances);
};

const _fetchIsFherc20 = async (chain: number, address: string) => {
  // Fetch public token data
  const publicClient = getPublicClient(wagmiConfig);

  try {
    const isFherc20 = await publicClient.readContract({
      address: address,
      abi: confidentialErc20Abi,
      functionName: "isFherc20",
    });
    return isFherc20;
  } catch {
    return false;
  }
};

const _fetchUnderlyingERC20 = async (chain: number, address: string) => {
  const publicClient = getPublicClient(wagmiConfig);
  const underlyingERC20 = await publicClient.readContract({
    address: address,
    abi: confidentialErc20Abi,
    functionName: "erc20",
  });
  return underlyingERC20;
};

interface RedactCoreFlags {
  isStablecoin: boolean;
  isWETH: boolean;
}

const _fetchRedactCoreFlags = async (chain: number, addresses: Address[]): Promise<RedactCoreFlags[]> => {
  const publicClient = getPublicClient(wagmiConfig);
  const redactCoreData = getDeployedContract(chain, "RedactCore");

  const results = await publicClient.multicall({
    contracts: addresses.flatMap(address => [
      {
        address: redactCoreData.address,
        abi: redactCoreData.abi,
        functionName: "getIsStablecoin",
        args: [address],
      },
      {
        address: redactCoreData.address,
        abi: redactCoreData.abi,
        functionName: "getIsWETH",
        args: [address],
      },
    ]),
  });

  const flagResults: RedactCoreFlags[] = [];
  for (let i = 0; i < addresses.length; i++) {
    const offset = i * 2;
    const isStablecoinResult = results[offset];
    const isWETHResult = results[offset + 1];

    flagResults.push({
      isStablecoin: Boolean(isStablecoinResult.result),
      isWETH: Boolean(isWETHResult.result),
    });
  }

  return flagResults;
};

const _fetchFherc20IfExists = async (chain: number, addresses: Address[]) => {
  const publicClient = getPublicClient(wagmiConfig);
  const redactCoreData = getDeployedContract(chain, "RedactCore");

  const results = await publicClient.multicall({
    contracts: addresses.map(address => ({
      address: redactCoreData.address,
      abi: redactCoreData.abi,
      functionName: "getFherc20",
      args: [address],
    })),
  });

  return results.map(result => result.result as Address);
};

const _parsePublicDataResults = (results: any[]) => {
  const [name, symbol, decimals] = results;

  const error =
    name.status === "failure"
      ? name.error
      : symbol.status === "failure"
        ? symbol.error
        : decimals.status === "failure"
          ? decimals.error
          : null;

  return {
    name: (name.result ?? "") as string,
    symbol: (symbol.result ?? "") as string,
    decimals: (decimals.result ?? 0) as number,
    error: error?.message ?? null,
  };
};

const _fetchConfidentialPairPublicData = async (addresses: { erc20Address: Address; fherc20Address: Address }[]) => {
  const publicClient = getPublicClient(wagmiConfig);

  const addressesToFetch: Address[] = [];
  const addressMap: Record<number, { erc20Index: number; fherc20Index: number | null }> = {};

  let currentIndex = 0;

  for (let i = 0; i < addresses.length; i++) {
    const { erc20Address, fherc20Address } = addresses[i];
    const fherc20Exists = fherc20Address !== zeroAddress;

    addressesToFetch.push(erc20Address);
    addressMap[currentIndex] = { erc20Index: i, fherc20Index: null };
    currentIndex++;

    if (fherc20Exists) {
      addressesToFetch.push(fherc20Address);
      addressMap[currentIndex] = { erc20Index: i, fherc20Index: i };
      currentIndex++;
    }
  }

  const result = await publicClient.multicall({
    contracts: addressesToFetch.flatMap(address => [
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

  const chunks = chunk(result, 3);
  const results: Array<{
    publicTokenData: ReturnType<typeof _parsePublicDataResults>;
    confidentialTokenData?: ReturnType<typeof _parsePublicDataResults>;
  }> = [];

  // Initialize results array
  for (let i = 0; i < addresses.length; i++) {
    results.push({
      publicTokenData: {} as any,
      confidentialTokenData: undefined,
    });
  }

  // Process chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const { erc20Index, fherc20Index } = addressMap[i];

    const parsedData = _parsePublicDataResults(chunk);

    if (fherc20Index === null) {
      // This is an ERC20 token
      results[erc20Index].publicTokenData = parsedData;
    } else {
      // This is an FHERC20 token
      results[erc20Index].confidentialTokenData = parsedData;
    }
  }

  return results;
};

const _fetchConfidentialPairBalances = async (
  chain: number,
  account: Address,
  addresses: {
    erc20Address: Address;
    fherc20Address?: Address;
  }[],
): Promise<ConfidentialTokenPairBalances[]> => {
  if (!account) {
    return addresses.map(() => ({
      publicBalance: undefined,
      confidentialBalance: undefined,
      fherc20Allowance: undefined,
    }));
  }

  const publicClient = getPublicClient(wagmiConfig);

  const ethBalance = await publicClient.getBalance({
    address: account,
  });

  const contracts = [];

  for (let i = 0; i < addresses.length; i++) {
    const { erc20Address, fherc20Address } = addresses[i];
    const fherc20Exists = fherc20Address != null && fherc20Address !== zeroAddress;

    contracts.push({
      address: erc20Address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account],
    });

    if (fherc20Exists) {
      contracts.push({
        address: fherc20Address,
        abi: confidentialErc20Abi,
        functionName: "encBalanceOf",
        args: [account],
      });
      contracts.push({
        address: erc20Address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, fherc20Address],
      });
    }
  }

  const results = await publicClient.multicall({
    contracts,
  });

  const balances: ConfidentialTokenPairBalances[] = [];
  let resultIndex = 0;

  for (let i = 0; i < addresses.length; i++) {
    const { fherc20Address } = addresses[i];
    const fherc20Exists = fherc20Address != null && fherc20Address !== zeroAddress;

    let publicBalanceResult = results[resultIndex++];
    const confidentialBalanceResult = fherc20Exists ? results[resultIndex++] : null;
    let fherc20AllowanceResult = fherc20Exists ? results[resultIndex++] : null;

    const isEth = addresses[i].erc20Address.toLowerCase() === ETH_ADDRESS.toLowerCase();
    if (isEth) {
      publicBalanceResult = {
        status: "success",
        result: ethBalance,
      };
      fherc20AllowanceResult = {
        status: "success",
        result: ethBalance,
      };
    }

    balances.push({
      publicBalance: publicBalanceResult.status === "success" ? (publicBalanceResult.result as bigint) : undefined,
      confidentialBalance:
        confidentialBalanceResult?.status === "success" ? (confidentialBalanceResult.result as bigint) : undefined,
      fherc20Allowance:
        fherc20AllowanceResult?.status === "success" ? (fherc20AllowanceResult.result as bigint) : undefined,
    });
  }

  return balances;
};

const _decryptConfidentialBalances = async (chain: number, account: Address, ctHashes: bigint[]) => {
  ctHashes.map(ctHash => decryptValue(FheTypes.Uint128, ctHash));
};

export const _fetchTokenPairsData = async (
  chain: number,
  erc20Addresses: Address[],
): Promise<ConfidentialTokenPair[]> => {
  const fherc20Addresses = await _fetchFherc20IfExists(chain, erc20Addresses);
  const flags = await _fetchRedactCoreFlags(chain, erc20Addresses);

  const addressPairs = erc20Addresses.map((erc20Address, index) => ({
    erc20Address,
    fherc20Address: fherc20Addresses[index],
  }));

  const pairsPublicData = await _fetchConfidentialPairPublicData(addressPairs);

  const pairs = addressPairs.map(({ erc20Address, fherc20Address }, index) => {
    const fherc20Exists = fherc20Address !== zeroAddress;
    return {
      publicToken: {
        ...pairsPublicData[index].publicTokenData,
        address: erc20Address,
        loading: false,
      },
      confidentialToken: fherc20Exists
        ? {
            ...pairsPublicData[index].confidentialTokenData!,
            address: fherc20Address,
            loading: false,
          }
        : undefined,
      confidentialTokenDeployed: fherc20Exists,
      isStablecoin: flags[index].isStablecoin,
      isWETH: flags[index].isWETH,
    };
  });

  return pairs;
};

export const fetchTokenPairsData = async () => {
  const chain = await getChainId();

  try {
    await loadPredefinedValues("http://redact-resources.s3.eu-west-1.amazonaws.com/predefined-token-list.json");
  } catch (error) {
    console.error("Error loading predefined values:", error);
  }

  const erc20Addresses = Object.keys(useTokenStore.getState().arbitraryTokens?.[chain] ?? {});
  const pairs = await _fetchTokenPairsData(chain, erc20Addresses);
  useTokenStore.setState(state => {
    _addPairsToStore(state, chain, pairs);
  });
};

export const refetchSingleTokenPairData = async (address: Address) => {
  const chain = await getChainId();
  const pairs = await _fetchTokenPairsData(chain, [address]);
  useTokenStore.setState(state => {
    _addPairsToStore(state, chain, pairs);
  });
};

export const fetchTokenPairBalances = async () => {
  const chain = await getChainId();
  const { address: account } = getAccount(wagmiConfig);
  if (chain == null || account == null) return;

  const addressPairs: AddressPair[] = Object.values(useTokenStore.getState().pairs[chain]).map(
    ({ publicToken, confidentialToken }) => ({
      erc20Address: publicToken.address,
      fherc20Address: confidentialToken?.address,
    }),
  );

  const pairBalances = await _fetchConfidentialPairBalances(chain, account, addressPairs);

  // Request decryption of the confidential balance ctHashes
  const confidentialBalanceCtHashes = pairBalances
    .map(balance => balance.confidentialBalance)
    .filter((ctHashMaybe): ctHashMaybe is bigint => ctHashMaybe != null);
  _decryptConfidentialBalances(chain, account, confidentialBalanceCtHashes);

  useTokenStore.setState(state => {
    const pairPublicAddresses = addressPairs.map(({ erc20Address }) => erc20Address);
    _addPairBalancesToStore(state, chain, account, pairPublicAddresses, pairBalances);
  });
};

export const refetchSingleTokenPairBalances = async (erc20Address: Address) => {
  const chain = await getChainId();
  const { address: account } = getAccount(wagmiConfig);
  if (chain == null || account == null) return;

  const addressPair = {
    erc20Address,
    fherc20Address: (await _fetchFherc20IfExists(chain, [erc20Address]))[0],
  };

  const pairBalances = await _fetchConfidentialPairBalances(chain, account, [addressPair]);
  useTokenStore.setState(state => {
    const pairPublicAddresses = [addressPair.erc20Address];
    _addPairBalancesToStore(state, chain, account, pairPublicAddresses, pairBalances);
  });
};

const _searchArbitraryToken = async (
  chain: number,
  account: Address,
  address: Address,
): Promise<ConfidentialTokenPairWithBalances> => {
  const isFherc20 = await _fetchIsFherc20(chain, address);
  const erc20Address = isFherc20 ? await _fetchUnderlyingERC20(chain, address) : address;
  const [fherc20Address] = isFherc20 ? [address] : await _fetchFherc20IfExists(chain, [erc20Address]);

  const [flagResults] = await _fetchRedactCoreFlags(chain, [erc20Address]);
  const { isStablecoin, isWETH } = flagResults;

  const [confidentialPairPublicData] = await _fetchConfidentialPairPublicData([{ erc20Address, fherc20Address }]);
  const [confidentialPairBalances] = await _fetchConfidentialPairBalances(chain, account, [
    { erc20Address, fherc20Address },
  ]);

  const fherc20Exists = fherc20Address !== zeroAddress;

  return {
    pair: {
      publicToken: {
        ...confidentialPairPublicData.publicTokenData,
        address: erc20Address,
        loading: false,
      },
      confidentialToken: fherc20Exists
        ? {
            ...confidentialPairPublicData.confidentialTokenData!,
            address: fherc20Address,
            loading: false,
          }
        : undefined,
      confidentialTokenDeployed: fherc20Exists,
      isStablecoin,
      isWETH,
    },
    balances: confidentialPairBalances,
  };
};

export const searchArbitraryToken = async (address: string) => {
  const chain = await getChainId();
  const { address: account } = getAccount(wagmiConfig);
  if (!account) {
    throw new Error("Not connected");
  }
  return _searchArbitraryToken(chain, account, address);
};

// HOOKS

export function useDeepEqual<S, U>(selector: (state: S) => U): (state: S) => U {
  // https://github.com/pmndrs/zustand/blob/main/src/react/shallow.ts
  const prev = useRef<U>(undefined);
  return state => {
    const next = selector(state);
    return deepEqual(prev.current, next) ? (prev.current as U) : (prev.current = next);
  };
}

export const useConfidentialTokenPairAddresses = () => {
  const chain = useChainId();
  return useTokenStore(
    useDeepEqual(state => {
      const pairs = state.pairs[chain] ?? {};
      return Object.keys(pairs);
    }),
  );
};

export const useConfidentialAddressPairs = () => {
  const chain = useChainId();
  return useTokenStore(
    useDeepEqual(state =>
      Object.values(state.pairs[chain] ?? {}).map(({ publicToken, confidentialToken }) => ({
        erc20Address: publicToken.address,
        fherc20Address: confidentialToken?.address,
      })),
    ),
  );
};

export const useConfidentialTokenPair = (address: string | undefined) => {
  const chain = useChainId();
  return useTokenStore(state => (address ? state.pairs[chain]?.[address] : undefined));
};
export const useDefaultConfidentialTokenPair = (): ConfidentialTokenPair | undefined => {
  const chain = useChainId();
  return useTokenStore(state => Object.values(state.pairs[chain])[0]);
};
export const useConfidentialTokenPairBalances = (address: string | undefined) => {
  const chain = useChainId();
  const balances = useTokenStore(state => (address ? state.balances[chain]?.[address] : undefined));
  return {
    publicBalance: balances?.publicBalance,
    confidentialBalance: balances?.confidentialBalance,
    fherc20Allowance: balances?.fherc20Allowance,
  };
};

export const useIsArbitraryToken = (address: string | undefined) => {
  const chain = useChainId();
  return useTokenStore(state => (address ? state.arbitraryTokens[chain]?.[address] : undefined));
};

export const useRemoveArbitraryToken = (address?: string) => {
  const chain = useChainId();
  return useCallback(() => {
    if (address == null) return;
    _removeArbitraryToken(chain, address);
  }, [address, chain]);
};

// Add this new function to load predefined values
export const loadPredefinedValues = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch predefined values: ${response.statusText}`);
    }

    const data = await response.json();

    useTokenStore.setState(state => {
      // Merge the predefined values with existing state
      state.pairs = {
        ...state.pairs,
        ...data.pairs,
      };
    });

    return true;
  } catch (error) {
    console.error("Error loading predefined values:", error);
    return false;
  }
};
