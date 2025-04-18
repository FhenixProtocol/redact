/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useCallback, useRef } from "react";
import { wagmiConfig } from "../web3/wagmiConfig";
import { superjsonStorage } from "./superjsonStorage";
import { WritableDraft } from "immer";
import { Address, erc20Abi, zeroAddress } from "viem";
import { deepEqual, useChainId } from "wagmi";
import { getAccount, getPublicClient } from "wagmi/actions";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import deployedContracts from "~~/contracts/deployedContracts";
import { chunk } from "~~/lib/common";
import { Contract, ContractName } from "~~/utils/scaffold-eth/contract";

type ChainRecord<T> = Record<number, T>;
type AddressRecord<T> = Record<Address, T>;

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
  confidentialBalance: bigint | undefined;
}

export interface ConfidentialTokenPairWithBalances {
  pair: ConfidentialTokenPair;
  balances: ConfidentialTokenPairBalances;
}

interface TokenStore {
  loadingTokens: boolean;

  pairs: ChainRecord<AddressRecord<ConfidentialTokenPair>>;
  confidentialToPublicMap: ChainRecord<AddressRecord<Address>>;

  balances: ChainRecord<AddressRecord<ConfidentialTokenPairBalances>>;

  arbitraryTokens: ChainRecord<AddressRecord<string>>;
}

export const useTokenStore = create<TokenStore>()(
  persist(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    immer(set => ({
      loadingTokens: false,

      pairs: {},
      confidentialToPublicMap: {},

      balances: {},

      arbitraryTokens: {},
    })),
    {
      name: "token-store",
      storage: superjsonStorage,
    },
  ),
);

// Setters and getters

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
  if (pair.confidentialToken != null) {
    state.confidentialToPublicMap[chain] = {
      ...state.confidentialToPublicMap[chain],
      [pair.confidentialToken.address]: pair.publicToken.address,
    };
  }
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

// OTHER

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

const _removeArbitraryToken = async (chain: number, address: string) => {
  useTokenStore.setState(state => {
    const publicTokenAddress = state.confidentialToPublicMap[chain]?.[address] ?? address;

    if (state.arbitraryTokens[chain]?.[publicTokenAddress] != null) {
      delete state.arbitraryTokens[chain][publicTokenAddress];
    }
    if (state.pairs[chain]?.[publicTokenAddress] != null) {
      delete state.pairs[chain][publicTokenAddress];
    }
    if (state.confidentialToPublicMap[chain]?.[publicTokenAddress] != null) {
      delete state.confidentialToPublicMap[chain][publicTokenAddress];
    }
    if (state.balances[chain]?.[publicTokenAddress] != null) {
      delete state.balances[chain][publicTokenAddress];
    }
  });
};

export const _fetchInitialTokens = async (chain: number) => {
  const tokenListAddresses: string[] = [];
  const arbitraryTokenAddresses = Object.keys(useTokenStore.getState().arbitraryTokens[chain] ?? {});

  const addresses = [...tokenListAddresses, ...arbitraryTokenAddresses];

  useTokenStore.setState({ loadingTokens: true });

  const confidentialPairs = await _fetchTokenData(chain, addresses);
  const tokens = Object.values(confidentialPairs);

  useTokenStore.setState(state => {
    for (const token of tokens) {
      _addPairToStore(state, chain, token);
    }
    state.loadingTokens = false;
  });
};

const _fetchToken = async (chain: number, address: string) => {
  const confidentialPairs = await _fetchTokenData(chain, [address]);
  const token = Object.values(confidentialPairs)[0];

  useTokenStore.setState(state => {
    _addPairToStore(state, chain, token);
  });
};

export async function fetchConfidentialTokenPairs(addresses: Address[]) {
  const chain = await _getChainId();
  const fherc20Addresses = await _getFherc20IfExists(chain, addresses);

  const confidentialPairs: AddressRecord<string> = {};

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    const fherc20 = fherc20Addresses[i] as Address;

    confidentialPairs[address] = fherc20;
  }

  return confidentialPairs;
}

export async function _fetchTokenData(chain: number, addresses: Address[]) {
  const addressMap: Record<string, boolean> = {};
  for (const address of addresses) {
    addressMap[address] = true;
  }

  // Mark as loading
  useTokenStore.setState(state => {
    if (state.pairs[chain] == null) {
      state.pairs[chain] = {};
    }
    for (const address of addresses) {
      if (state.pairs[chain][address] == null) continue;
      const pair = state.pairs[chain][address];
      pair.publicToken.loading = true;
      pair.publicToken.error = null;
      if (pair.confidentialToken) {
        pair.confidentialToken.loading = true;
        pair.confidentialToken.error = null;
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

export const addArbitraryToken = async (pairWithBalances: ConfidentialTokenPairWithBalances) => {
  const chain = await _getChainId();
  await _addArbitraryToken(chain, pairWithBalances);
};

export const fetchInitialTokens = async () => {
  const chain = await _getChainId();
  await _fetchInitialTokens(chain);
};

export const fetchToken = async (address: string) => {
  const chain = await _getChainId();
  await _fetchToken(chain, address);
};

// ARBITRARY TOKEN SEARCH

const getDeployedContract = <TContractName extends ContractName>(
  chain: number,
  contractName: TContractName,
): Contract<TContractName> => {
  const deployedContract = deployedContracts[chain as keyof typeof deployedContracts][contractName];

  if (!deployedContract) {
    throw new Error(`Contract ${contractName} not found on chain ${chain}`);
  }

  return deployedContract;
};

const _checkIsFherc20 = async (chain: number, address: string) => {
  // Fetch public token data
  const publicClient = getPublicClient(wagmiConfig);

  const eETHData = getDeployedContract(chain, "eETH");
  console.log("eETHData", eETHData);

  if (!eETHData) {
    throw new Error(`Contract eETH not found on chain ${chain}`);
  }

  try {
    const isFherc20 = await publicClient.readContract({
      address: address,
      abi: eETHData.abi,
      functionName: "isFherc20",
    });
    return isFherc20;
  } catch {
    return false;
  }
};

const _getUnderlyingERC20 = async (chain: number, address: string) => {
  const publicClient = getPublicClient(wagmiConfig);
  const eETHData = getDeployedContract(chain, "eETH");
  const underlyingERC20 = await publicClient.readContract({
    address: address,
    abi: eETHData.abi,
    functionName: "erc20",
  });
  console.log("underlyingERC20", underlyingERC20);
  return underlyingERC20;
};

interface RedactCoreFlags {
  isStablecoin: boolean;
  isWETH: boolean;
}

const _getRedactCoreFlags = async (chain: number, addresses: Address[]): Promise<RedactCoreFlags[]> => {
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

const _getFherc20IfExists = async (chain: number, addresses: Address[]) => {
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

const _getConfidentialPairPublicData = async (addresses: { erc20Address: Address; fherc20Address: Address }[]) => {
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

const _getConfidentialPairBalances = async (
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
    }));
  }

  const eETHData = getDeployedContract(chain, "eETH");
  const publicClient = getPublicClient(wagmiConfig);

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
        abi: eETHData.abi,
        functionName: "encBalanceOf",
        args: [account],
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

    const publicBalanceResult = results[resultIndex++];
    const confidentialBalanceResult = fherc20Exists ? results[resultIndex++] : null;

    balances.push({
      publicBalance: publicBalanceResult.status === "success" ? (publicBalanceResult.result as bigint) : undefined,
      confidentialBalance:
        confidentialBalanceResult?.status === "success" ? (confidentialBalanceResult.result as bigint) : undefined,
    });
  }

  return balances;
};

export const _fetchTokenPairsData = async (
  chain: number,
  erc20Addresses: Address[],
): Promise<ConfidentialTokenPair[]> => {
  const fherc20Addresses = await _getFherc20IfExists(chain, erc20Addresses);
  const flags = await _getRedactCoreFlags(chain, erc20Addresses);

  const addressPairs = erc20Addresses.map((erc20Address, index) => ({
    erc20Address,
    fherc20Address: fherc20Addresses[index],
  }));

  const pairsPublicData = await _getConfidentialPairPublicData(addressPairs);

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

  console.log("fetchTokenData2 pairs", pairs);
  return pairs;
};

export const fetchTokenPairsData = async () => {
  const chain = await _getChainId();
  const erc20Addresses = Object.keys(useTokenStore.getState().arbitraryTokens[chain]);
  const pairs = await _fetchTokenPairsData(chain, erc20Addresses);
  useTokenStore.setState(state => {
    _addPairsToStore(state, chain, pairs);
  });
};

export const fetchTokenPairBalances = async () => {
  const chain = await _getChainId();
  const { address: account } = getAccount(wagmiConfig);
  if (chain == null || account == null) return;

  const addressPairs: AddressPair[] = Object.values(useTokenStore.getState().pairs[chain]).map(
    ({ publicToken, confidentialToken }) => ({
      erc20Address: publicToken.address,
      fherc20Address: confidentialToken?.address,
    }),
  );

  const pairBalances = await _getConfidentialPairBalances(chain, account, addressPairs);
  console.log("fetchTokenPairBalances pairBalances", pairBalances);

  useTokenStore.setState(state => {
    const pairPublicAddresses = addressPairs.map(({ erc20Address }) => erc20Address);
    _addPairBalancesToStore(state, chain, account, pairPublicAddresses, pairBalances);
  });
};

const _searchArbitraryToken = async (
  chain: number,
  account: Address,
  address: Address,
): Promise<ConfidentialTokenPairWithBalances> => {
  const isFherc20 = await _checkIsFherc20(chain, address);
  const erc20Address = isFherc20 ? await _getUnderlyingERC20(chain, address) : address;
  const [fherc20Address] = isFherc20 ? [address] : await _getFherc20IfExists(chain, [erc20Address]);

  const [flagResults] = await _getRedactCoreFlags(chain, [erc20Address]);
  const { isStablecoin, isWETH } = flagResults;

  const [confidentialPairPublicData] = await _getConfidentialPairPublicData([{ erc20Address, fherc20Address }]);
  const [confidentialPairBalances] = await _getConfidentialPairBalances(chain, account, [
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
  const chain = await _getChainId();
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
  const chain = 31337;
  return useTokenStore(
    useDeepEqual(state => {
      const pairs = state.pairs[chain] ?? {};
      console.log("pairs", pairs);
      return Object.keys(pairs);
    }),
  );
};

export const useConfidentialTokenPair = (address: string) => {
  const chain = useChainId();
  return useTokenStore(state => state.pairs[chain]?.[address]);
};
export const useConfidentialTokenPairBalances = (address: string) => {
  const chain = useChainId();
  const balances = useTokenStore(state => state.balances[chain]?.[address]);
  return {
    publicBalance: balances?.publicBalance,
    confidentialBalance: balances?.confidentialBalance,
  };
};

export const useIsArbitraryToken = (address: string) => {
  const chain = useChainId();
  return useTokenStore(state => state.arbitraryTokens[chain]?.[address]);
};

export const useRemoveArbitraryToken = (address: string) => {
  const chain = useChainId();
  return useCallback(() => {
    _removeArbitraryToken(chain, address);
  }, [address, chain]);
};
