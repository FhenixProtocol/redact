/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { wagmiConfig } from "../web3/wagmiConfig";
import { Address, MulticallReturnType, erc20Abi, zeroAddress } from "viem";
import { getAccount, getPublicClient } from "wagmi/actions";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import deployedContracts from "~~/contracts/deployedContracts";
import { RedactCoreAbi } from "~~/lib/abis";
import { REDACT_CORE_ADDRESS, chunk } from "~~/lib/common";
import { Contract, ContractName } from "~~/utils/scaffold-eth/contract";

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

export async function _fetchTokenData(chain: number, addresses: Address[]) {
  const addressMap: Record<string, boolean> = {};
  for (const address of addresses) {
    addressMap[address] = true;
  }

  // Mark as loading
  useTokenStore.setState(state => {
    const tokens = state.tokens[chain] ?? [];
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

const _getRedactCoreFlags = async (chain: number, address: string) => {
  const publicClient = getPublicClient(wagmiConfig);
  const redactCoreData = getDeployedContract(chain, "RedactCore");
  const flags = await publicClient.multicall({
    contracts: [
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
    ],
  });

  const [isStablecoinResult, isWETHResult] = flags;

  const isStablecoin = isStablecoinResult.result ?? false;
  const isWETH = isWETHResult.result ?? false;

  return {
    isStablecoin,
    isWETH,
  };
};

const _getFherc20IfExists = async (chain: number, address: string) => {
  const publicClient = getPublicClient(wagmiConfig);
  const redactCoreData = getDeployedContract(chain, "RedactCore");
  const fherc20Address = await publicClient.readContract({
    address: redactCoreData.address,
    abi: redactCoreData.abi,
    functionName: "getFherc20",
    args: [address],
  });
  return fherc20Address;
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

const _getConfidentialPairPublicData = async (erc20Address: string, fherc20Address: string) => {
  const publicClient = getPublicClient(wagmiConfig);

  const fherc20Exists = fherc20Address !== zeroAddress;

  const addresses = [erc20Address];
  if (fherc20Exists) {
    addresses.push(fherc20Address);
  }

  const result = await publicClient.multicall({
    contracts: addresses.flatMap(address => [
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

  const publicTokenData = _parsePublicDataResults(chunks[0]);
  const confidentialTokenData = fherc20Exists ? _parsePublicDataResults(chunks[1]) : undefined;

  return {
    publicTokenData,
    confidentialTokenData,
  };
};

const _getConfidentialPairBalances = async (chain: number, erc20Address: string, fherc20Address: string) => {
  const { address } = getAccount(wagmiConfig);
  if (!address) {
    return {
      erc20Balance: { result: 0n, error: "Address not found", status: "failure" },
      fherc20Balance: { result: 0n, error: "Address not found", status: "failure" },
    };
  }

  const fherc20Exists = fherc20Address !== zeroAddress;
  const eETHData = getDeployedContract(chain, "eETH");

  const erc20Call = {
    address: erc20Address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  } as const;
  const fherc20Call = {
    address: fherc20Address,
    abi: eETHData.abi,
    functionName: "encBalanceOf",
    args: [address],
  } as const;

  const calls = fherc20Exists ? [erc20Call, fherc20Call] : [erc20Call];

  const publicClient = getPublicClient(wagmiConfig);
  const balances = await publicClient.multicall({
    contracts: calls,
  });

  return {
    erc20Balance: balances[0],
    fherc20Balance: fherc20Exists ? balances[1] : undefined,
  };
};

const _searchArbitraryToken = async (chain: number, address: string): Promise<ConfidentialTokenPair> => {
  const isFherc20 = await _checkIsFherc20(chain, address);
  const erc20Address = isFherc20 ? await _getUnderlyingERC20(chain, address) : address;
  const { isStablecoin, isWETH } = await _getRedactCoreFlags(chain, address);
  const fherc20Address = isFherc20 ? address : await _getFherc20IfExists(chain, erc20Address);
  const fherc20Exists = fherc20Address !== zeroAddress;

  console.log({ isFherc20, erc20Address, fherc20Address, isStablecoin, isWETH });
  const confidentialPairPublicData = await _getConfidentialPairPublicData(erc20Address, fherc20Address);
  const confidentialPairBalances = await _getConfidentialPairBalances(chain, erc20Address, fherc20Address);

  console.log({ confidentialPairPublicData, confidentialPairBalances });

  return {
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
  };
};

export const searchArbitraryToken = async (address: string) => {
  const chain = await _getChainId();
  return _searchArbitraryToken(chain, address);
};
