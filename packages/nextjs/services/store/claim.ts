/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { wagmiConfig } from "../web3/wagmiConfig";
import { superjsonStorage } from "./superjsonStorage";
import { useConfidentialAddressPairs, useConfidentialTokenPairAddresses, useTokenStore } from "./tokenStore2";
import { WritableDraft } from "immer";
import { Address } from "viem";
import { deepEqual, useAccount, useChainId, usePublicClient } from "wagmi";
import { getAccount, getPublicClient } from "wagmi/actions";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import { useRefresh } from "~~/hooks/useRefresh";
import { getChainId } from "~~/lib/common";

// Types
export type Claim = {
  ctHash: bigint;
  requestedAmount: bigint;
  decryptedAmount: bigint;
  decrypted: boolean;
  to: Address;
  claimed: boolean;
};

export type ClaimWithAddresses = Claim & {
  erc20Address: Address;
  fherc20Address: Address;
};

type ClaimCtHashAndAddresses = Pick<ClaimWithAddresses, "ctHash" | "erc20Address" | "fherc20Address">;

export interface AddressPair {
  erc20Address: Address;
  fherc20Address: Address | undefined;
}

type ChainRecord<T> = Record<number, T>;
type AddressRecord<T> = Record<string, T>;
type StringRecord<T> = Record<string, T>;

interface ClaimStore {
  claims: ChainRecord<AddressRecord<StringRecord<ClaimWithAddresses>>>;
}

// Create the store with immer for immutable updates and persist for storage
export const useClaimStore = create<ClaimStore>()(
  persist(
    immer(() => ({
      claims: {} as ChainRecord<AddressRecord<StringRecord<ClaimWithAddresses>>>,
    })),
    {
      name: "claim-store",
      storage: superjsonStorage,
    },
  ),
);

// ACTIONS

const _addClaimsToStore = (
  state: WritableDraft<ClaimStore>,
  chain: number,
  claimsMap: Record<Address, ClaimWithAddresses[]>,
) => {
  if (state.claims[chain] == null) state.claims[chain] = {};

  Object.entries(claimsMap).forEach(([erc20Address, claims]) => {
    console.log("ADDING CLAIMS", { erc20Address, claims });
    if (state.claims[chain][erc20Address] == null) state.claims[chain][erc20Address] = {};
    claims.forEach(claim => {
      state.claims[chain][erc20Address][claim.ctHash.toString()] = claim;
    });
  });
};

const _fetchClaims = async (account: Address, addressPairs: AddressPair[]) => {
  const publicClient = getPublicClient(wagmiConfig);

  const pairsWithFherc20 = addressPairs.filter(({ fherc20Address }) => fherc20Address != null);

  const results = await publicClient?.multicall({
    contracts: pairsWithFherc20.map(({ fherc20Address }) => ({
      address: fherc20Address!,
      abi: confidentialErc20Abi,
      functionName: "getUserClaims",
      args: [account],
    })),
  });

  const erc20Claims = {} as Record<Address, ClaimWithAddresses[]>;

  results.forEach(({ status, result }, index) => {
    console.log("fetchClaims result", { status, result });
    if (status === "failure") return;

    const claimsWithAddresses = (result as unknown as Claim[]).map(claim => ({
      ...claim,
      ...pairsWithFherc20[index],
    })) as ClaimWithAddresses[];

    if (erc20Claims[pairsWithFherc20[index].erc20Address] == null)
      erc20Claims[pairsWithFherc20[index].erc20Address] = [];

    erc20Claims[pairsWithFherc20[index].erc20Address] = claimsWithAddresses;
  });

  console.log({ erc20Claims });

  return erc20Claims;
};

const _refetchPendingClaims = async (pendingClaims: ClaimWithAddresses[]) => {
  const publicClient = getPublicClient(wagmiConfig);

  const results = await publicClient?.multicall({
    contracts: pendingClaims.map(({ fherc20Address, ctHash }) => ({
      address: fherc20Address,
      abi: confidentialErc20Abi,
      functionName: "getClaim",
      args: [ctHash],
    })),
  });

  console.log({ results });

  const erc20Claims = {} as Record<Address, ClaimWithAddresses[]>;

  results.forEach(({ status, result }, index) => {
    console.log("fetchClaims result", { status, result });
    if (status === "failure") return;

    const { erc20Address, fherc20Address } = pendingClaims[index];

    const claimWithAddresses = {
      ...(result as unknown as Claim),
      erc20Address,
      fherc20Address,
    } as ClaimWithAddresses;

    if (erc20Claims[erc20Address] == null) erc20Claims[erc20Address] = [];
    erc20Claims[erc20Address].push(claimWithAddresses);
  });

  console.log("PENDING", { erc20Claims });

  return erc20Claims;
};

export const fetchPairClaims = async (addressPair: AddressPair) => {
  const chain = await getChainId();
  const { address: account } = await getAccount(wagmiConfig);

  if (chain == null) return;
  if (account == null) return;

  const claimsMap = await _fetchClaims(account, [addressPair]);
  useClaimStore.setState(state => {
    _addClaimsToStore(state, chain, claimsMap);
  });
};

export const removeClaimedClaim = async (claim: ClaimWithAddresses) => {
  const chain = await getChainId();
  const { address: account } = await getAccount(wagmiConfig);

  if (chain == null) return;
  if (account == null) return;

  useClaimStore.setState(state => {
    console.log("Remaving CLAIM CLAIMED", { claim, chain, chainClaims: state.claims[chain] });
    if (state.claims[chain]?.[claim.erc20Address]?.[claim.ctHash.toString()] == null) return;
    delete state.claims[chain][claim.erc20Address][claim.ctHash.toString()];
  });
};

// HOOKS

export const useClaimFetcher = () => {
  const chain = useChainId();
  const { address: account } = useAccount();
  const addressPairs = useConfidentialAddressPairs();

  useEffect(() => {
    if (!account) return;

    const fetchAndStoreClaims = async () => {
      const claimsMap = await _fetchClaims(account, addressPairs);
      useClaimStore.setState(state => {
        _addClaimsToStore(state, chain, claimsMap);
      });
    };

    fetchAndStoreClaims();
  }, [chain, account, addressPairs]);
};

const usePendingClaims = () => {
  const chain = useChainId();
  const { address: account } = useAccount();
  const claims = useClaimStore(state => state.claims[chain]);

  return useMemo(() => {
    return Object.values(claims ?? {}).flatMap(claims => Object.values(claims).filter(claim => !claim.decrypted));
  }, [claims, account]);
};

export const useRefetchPendingClaims = () => {
  const chain = useChainId();
  const { address: account } = useAccount();
  const pendingClaims = usePendingClaims();
  const { refresh } = useRefresh(5000);

  useEffect(() => {
    if (pendingClaims.length === 0) return;
    if (account == null) return;

    const fetchAndStoreClaims = async () => {
      const refetchedClaimsMap = await _refetchPendingClaims(pendingClaims);
      useClaimStore.setState(state => {
        _addClaimsToStore(state, chain, refetchedClaimsMap);
      });
    };

    fetchAndStoreClaims();
  }, [pendingClaims, refresh]);
};

export const useAllClaims = () => {
  const chain = useChainId();
  const claims = useClaimStore(state => state.claims[chain]);

  return useMemo(() => {
    return Object.values(claims ?? {}).flatMap(claims => Object.values(claims));
  }, [claims]);
};
