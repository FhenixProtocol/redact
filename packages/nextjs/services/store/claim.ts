/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useEffect, useMemo, useRef } from "react";
import { wagmiConfig } from "../web3/wagmiConfig";
import { superjsonStorage } from "./superjsonStorage";
import { useConfidentialAddressPairs, useDeepEqual } from "./tokenStore";
import { WritableDraft } from "immer";
import { Address } from "viem";
import { useAccount, useChainId } from "wagmi";
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

export interface AddressPair {
  erc20Address: Address;
  fherc20Address: Address | undefined;
}

type ChainRecord<T> = Record<number, T>;
type AddressRecord<T> = Record<string, T>;
type StringRecord<T> = Record<string, T>;

interface ClaimStore {
  // { chain: { erc20Address: { ctHash: ClaimWithAddresses } } }
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
  console.log("REFETCHING PENDING CLAIMS", { pendingClaims });
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

export const removePairClaimableClaims = async (pairAddress: Address) => {
  const chain = await getChainId();
  const { address: account } = await getAccount(wagmiConfig);

  if (chain == null) return;
  if (account == null) return;

  useClaimStore.setState(state => {
    console.log("Removing pair claimable claims", { pairAddress, chain, chainClaims: state.claims[chain] });
    if (state.claims[chain]?.[pairAddress] == null) return;

    Object.keys(state.claims[chain][pairAddress]).forEach(ctHash => {
      const claim = state.claims[chain][pairAddress][ctHash];

      // Dont remove claims that are pending
      if (!claim.decrypted) return;

      console.log("Actually removing claim", { ctHash, claim });

      // Delete the claim
      delete state.claims[chain][pairAddress][ctHash];
    });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims, account]);
};

export const usePairClaims = (pairAddress?: Address) => {
  const chain = useChainId();
  const { address: account } = useAccount();

  return useClaimStore(
    useDeepEqual(state => {
      if (account == null || pairAddress == null) return null;
      const claims = state.claims[chain]?.[pairAddress];

      // Collect the total requested amount, decrypted amount, and pending amount for the pair
      return Object.values(claims ?? {}).reduce(
        (acc, claim) => {
          if (claim.claimed) return acc;
          if (claim.to.toLowerCase() !== account.toLowerCase()) return acc;

          const totalRequestedAmount = acc.totalRequestedAmount + claim.requestedAmount;
          const totalDecryptedAmount = acc.totalDecryptedAmount + (claim.decrypted ? claim.decryptedAmount : 0n);
          const totalPendingAmount = acc.totalPendingAmount + (claim.decrypted ? 0n : claim.requestedAmount);

          return {
            totalRequestedAmount,
            totalDecryptedAmount,
            totalPendingAmount,
          };
        },
        { totalRequestedAmount: 0n, totalDecryptedAmount: 0n, totalPendingAmount: 0n },
      );
    }),
  );
};

export const useRefetchPendingClaims = () => {
  const chain = useChainId();
  const { address: account } = useAccount();
  const pendingClaims = usePendingClaims();
  const { refresh } = useRefresh(10000);
  const lastFetchTime = useRef<number>(0);

  useEffect(() => {
    if (pendingClaims.length === 0) return;
    if (account == null) return;

    const now = Date.now();
    if (now - lastFetchTime.current < 10_000) return; // Prevent refetching too frequently

    const fetchAndStoreClaims = async () => {
      lastFetchTime.current = now;
      const refetchedClaimsMap = await _refetchPendingClaims(pendingClaims);
      useClaimStore.setState(state => {
        _addClaimsToStore(state, chain, refetchedClaimsMap);
      });
    };

    fetchAndStoreClaims();
  }, [account, chain, pendingClaims, refresh]);
};

export const useAllClaims = () => {
  const chain = useChainId();
  const claims = useClaimStore(state => state.claims[chain]);

  return useMemo(() => {
    return Object.values(claims ?? {}).flatMap(claims => Object.values(claims));
  }, [claims]);
};
