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
import { getCofheClient } from "~~/services/cofhe/cofheClient";
import { useRefresh } from "~~/hooks/useRefresh";
import { getChainId } from "~~/lib/common";

// On-chain claim struct returned by getUserClaims/getClaim
export type Claim = {
  ctHash: string; // bytes32
  requestedAmount: bigint;
  decryptedAmount: bigint;
  decrypted: boolean;
  to: Address;
  claimed: boolean;
};

// Off-chain decryption result from decryptForTx (Threshold Network)
export type DecryptionResult = {
  decryptedValue: bigint;
  signature: string;
};

export type ClaimWithAddresses = Claim & {
  erc20Address: Address;
  fherc20Address: Address;
  // Stored locally after calling decryptForTx — needed to submit claimUnshielded
  decryptionResult?: DecryptionResult;
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
    // Replace all claims for this pair — removes stale claims that no longer exist on-chain
    // but preserve locally-stored decryptionResult from previous decryptForTx calls
    const existing = state.claims[chain][erc20Address] ?? {};
    const newClaims: StringRecord<ClaimWithAddresses> = {};
    claims.forEach(claim => {
      const key = claim.ctHash.toString();
      const existingDecryptionResult = existing[key]?.decryptionResult;
      newClaims[key] = existingDecryptionResult
        ? { ...claim, decryptionResult: existingDecryptionResult }
        : claim;
    });
    state.claims[chain][erc20Address] = newClaims;
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
    if (status === "failure") {
      return;
    }

    const rawClaims = result as unknown as Claim[];

    const claimsWithAddresses = rawClaims.map(claim => ({
      ...claim,
      ...pairsWithFherc20[index],
    })) as ClaimWithAddresses[];

    if (erc20Claims[pairsWithFherc20[index].erc20Address] == null)
      erc20Claims[pairsWithFherc20[index].erc20Address] = [];

    erc20Claims[pairsWithFherc20[index].erc20Address] = claimsWithAddresses;
  });

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

  const erc20Claims = {} as Record<Address, ClaimWithAddresses[]>;

  results.forEach(({ status, result }, index) => {
    if (status === "failure") {
      return;
    }

    const { erc20Address, fherc20Address } = pendingClaims[index];
    const onChainClaim = result as unknown as Claim;

    const claimWithAddresses = {
      ...onChainClaim,
      erc20Address,
      fherc20Address,
    } as ClaimWithAddresses;

    if (erc20Claims[erc20Address] == null) erc20Claims[erc20Address] = [];
    erc20Claims[erc20Address].push(claimWithAddresses);
  });

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
    if (state.claims[chain]?.[pairAddress] == null) return;

    Object.keys(state.claims[chain][pairAddress]).forEach(ctHash => {
      const claim = state.claims[chain][pairAddress][ctHash];

      // Only remove claims that have been decrypted off-chain (have decryptionResult)
      if (!claim.decryptionResult) return;

      delete state.claims[chain][pairAddress][ctHash];
    });
  });
};

/**
 * Attempts to call decryptForTx for claims that don't have a decryptionResult yet.
 * Stores the result locally so it can be passed to claimUnshielded later.
 */
export const decryptPendingClaims = async (pendingClaims: ClaimWithAddresses[]) => {
  const client = getCofheClient();
  if (!client) return;

  const chain = await getChainId();
  if (chain == null) return;

  for (const claim of pendingClaims) {
    if (claim.decryptionResult) continue; // Already decrypted off-chain

    try {
      const result = await client.decryptForTx(claim.ctHash).withoutPermit().execute();

      const decryptionResult = {
        decryptedValue: result.decryptedValue,
        signature: result.signature,
      };
      useClaimStore.setState(state => {
        const key = claim.ctHash.toString();
        const stored = state.claims[chain]?.[claim.erc20Address]?.[key];
        if (stored) {
          // Replace the entire claim object to ensure immer detects the change
          state.claims[chain][claim.erc20Address][key] = { ...stored, decryptionResult };
        } else {
          console.log("[Claims] WARNING: claim not found in store for", claim.ctHash, "erc20:", claim.erc20Address, "chain:", chain);
        }
      });
    } catch (err) {
      // Threshold Network may not have the result yet — this is expected, will retry on next poll
      console.log("[Claims] decryptForTx not ready yet for ctHash", claim.ctHash, err);
    }
  }
};

/**
 * Fetches pending claims for a pair from the store and immediately attempts decryptForTx.
 * Called after unshield TX confirms so the user doesn't have to wait for the 10s poll.
 */
export const fetchAndDecryptPendingClaims = async (erc20Address: Address) => {
  const chain = await getChainId();
  if (chain == null) return;

  const pairClaims = Object.values(useClaimStore.getState().claims[chain]?.[erc20Address] ?? {});
  const pending = pairClaims.filter(c => !c.claimed && !c.decryptionResult);
  if (pending.length > 0) {
    await decryptPendingClaims(pending);
  }
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

// "Pending" = claim exists on-chain but we don't have the off-chain decryptForTx result yet
const usePendingClaims = () => {
  const chain = useChainId();
  const { address: account } = useAccount();
  const claims = useClaimStore(state => state.claims[chain]);

  return useMemo(() => {
    return Object.values(claims ?? {}).flatMap(claims =>
      Object.values(claims).filter(claim => !claim.claimed && !claim.decryptionResult),
    );
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

      // Collect totals based on off-chain decryption state:
      // - pending: claim exists but no decryptForTx result yet
      // - claimable: has decryptForTx result, ready to submit claimUnshielded
      return Object.values(claims ?? {}).reduce(
        (acc, claim) => {
          if (claim.claimed) return acc;
          if (claim.to.toLowerCase() !== account.toLowerCase()) return acc;

          const hasDecryptionResult = !!claim.decryptionResult;
          const decryptedValue = claim.decryptionResult?.decryptedValue ?? 0n;

          const totalRequestedAmount = acc.totalRequestedAmount + claim.requestedAmount;
          const totalDecryptedAmount = acc.totalDecryptedAmount + (hasDecryptionResult ? decryptedValue : 0n);
          const totalPendingAmount = acc.totalPendingAmount + (hasDecryptionResult ? 0n : claim.requestedAmount);

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

export const usePairClaimableItems = (pairAddress?: Address): ClaimWithAddresses[] => {
  const chain = useChainId();
  const { address: account } = useAccount();

  return useClaimStore(
    useDeepEqual(state => {
      if (account == null || pairAddress == null) return [];
      const claims = state.claims[chain]?.[pairAddress];
      return Object.values(claims ?? {}).filter(
        claim => !claim.claimed && !!claim.decryptionResult && claim.to.toLowerCase() === account.toLowerCase(),
      );
    }),
  );
};

// Polls decryptForTx for claims that don't have a decryption result yet
export const useRefetchPendingClaims = () => {
  const { address: account } = useAccount();
  const pendingClaims = usePendingClaims();
  const { refresh } = useRefresh(10000);
  const lastFetchTime = useRef<number>(0);

  useEffect(() => {
    if (pendingClaims.length === 0) return;
    if (account == null) return;

    const now = Date.now();
    if (now - lastFetchTime.current < 10_000) return;

    lastFetchTime.current = now;
    decryptPendingClaims(pendingClaims);
  }, [account, pendingClaims, refresh]);
};

export const useAllClaims = () => {
  const chain = useChainId();
  const claims = useClaimStore(state => state.claims[chain]);

  return useMemo(() => {
    return Object.values(claims ?? {}).flatMap(claims => Object.values(claims));
  }, [claims]);
};

// Function to check and cleanup claims - validates ALL claims against on-chain data
export const checkAndCleanupClaims = async () => {
  const chain = await getChainId();
  const { address: account } = await getAccount(wagmiConfig);

  if (chain == null || account == null) {
    console.log("📭 Cannot check claims - no chain or account");
    return;
  }

  // Get all claims from the store for current chain
  const state = useClaimStore.getState();
  const chainClaims = state.claims[chain];

  if (!chainClaims) {
    console.log("📭 No claims to check");
    return;
  }

  // Collect ALL claims from the store
  const allClaims: ClaimWithAddresses[] = [];

  Object.values(chainClaims).forEach(addressClaims => {
    Object.values(addressClaims).forEach(claim => {
      allClaims.push(claim);
    });
  });

  if (allClaims.length === 0) {
    console.log("📭 No claims to check");
    return;
  }

  console.log(`🔍 Validating ${allClaims.length} claims against on-chain data...`);

  // Check ALL claims against blockchain data
  const publicClient = getPublicClient(wagmiConfig);
  if (!publicClient) {
    console.error("❌ No public client available");
    return;
  }

  try {
    // Call getClaim for each claim to get current on-chain status
    const results = await publicClient.multicall({
      contracts: allClaims.map(claim => ({
        address: claim.fherc20Address,
        abi: confidentialErc20Abi,
        functionName: "getClaim",
        args: [claim.ctHash],
      })),
    });

    let updatedCount = 0;
    let removedCount = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const storedClaim = allClaims[i];

      try {
        if (result.status === "failure") {
          // If the call failed, the claim might no longer exist on-chain
          console.log(`🗑️ Removing invalid claim: ${storedClaim.ctHash.toString()} (on-chain call failed)`);
          await removeClaimedClaim(storedClaim);
          removedCount++;
          continue;
        }

        // Get the current on-chain claim data
        const onChainClaim = result.result as unknown as Claim;

        // Compare stored claim with on-chain data
        const hasChanged =
          storedClaim.decrypted !== onChainClaim.decrypted ||
          storedClaim.claimed !== onChainClaim.claimed ||
          storedClaim.decryptedAmount !== onChainClaim.decryptedAmount;

        if (hasChanged) {
          console.log(
            `🔄 Updating claim ${storedClaim.ctHash.toString()}: decrypted=${onChainClaim.decrypted}, claimed=${onChainClaim.claimed}`,
          );

          // Update the claim in the store with current on-chain data
          useClaimStore.setState(state => {
            const claimKey = storedClaim.ctHash.toString();
            if (state.claims[chain]?.[storedClaim.erc20Address]?.[claimKey]) {
              state.claims[chain][storedClaim.erc20Address][claimKey] = {
                ...storedClaim,
                decrypted: onChainClaim.decrypted,
                claimed: onChainClaim.claimed,
                decryptedAmount: onChainClaim.decryptedAmount,
              };
            }
          });
          updatedCount++;
        }

        // Remove claim if it's been claimed
        if (onChainClaim.claimed) {
          console.log(`🗑️ Removing claimed claim: ${storedClaim.ctHash.toString()}`);
          await removeClaimedClaim(storedClaim);
          removedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing claim ${storedClaim.ctHash.toString()}:`, error);
      }
    }

    console.log(`✅ Claim validation complete: ${updatedCount} updated, ${removedCount} removed`);
  } catch (error) {
    console.error("❌ Error validating claims against on-chain data:", error);
  }
};
