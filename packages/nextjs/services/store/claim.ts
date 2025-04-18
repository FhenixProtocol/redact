/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useCallback, useEffect, useRef } from "react";
import { wagmiConfig } from "../web3/wagmiConfig";
import { superjsonStorage } from "./superjsonStorage";
import { useConfidentialAddressPairs, useConfidentialTokenPairAddresses, useTokenStore } from "./tokenStore2";
import { Address } from "viem";
import { deepEqual, useAccount, useChainId, usePublicClient } from "wagmi";
import { getPublicClient } from "wagmi/actions";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import confidentialErc20Abi from "~~/contracts/ConfidentialErc20Abi";
import { useRefresh } from "~~/hooks/useRefresh";

// Types
export interface Claim {
  ctHash: bigint;
  requestedAmount: bigint;
  decryptedAmount: bigint;
  decrypted: boolean;
  to: Address;
  claimed: boolean;
}

export interface AddressPair {
  erc20Address: Address;
  fherc20Address: Address | undefined;
}

type ChainRecord<T> = Record<number, T>;
type AddressRecord<T> = Record<string, T>;

interface ClaimStore {
  claims: ChainRecord<AddressRecord<Claim[]>>;
}

// Create the store with immer for immutable updates and persist for storage
export const useClaimStore = create<ClaimStore>()(
  persist(
    immer(() => ({
      claims: {} as ChainRecord<AddressRecord<Claim[]>>,
    })),
    {
      name: "claim-store",
      storage: superjsonStorage,
    },
  ),
);

const _fetchClaims = async (account: Address, addressPairs: AddressPair[]) => {
  const publicClient = getPublicClient(wagmiConfig);

  // const result = await publicClient?.readContract({
  //   address: erc20Addresses[0],
  //   abi: confidentialErc20Abi,
  //   functionName: "getUserClaims",
  //   args: [account],
  // });

  // console.log({ result });

  const results = await publicClient?.multicall({
    contracts: addressPairs
      .filter(({ fherc20Address }) => fherc20Address != null)
      .map(({ fherc20Address }) => ({
        address: fherc20Address!,
        abi: confidentialErc20Abi,
        functionName: "getUserClaims",
        args: [account],
      })),
  });

  console.log({ results });
};

export const useClaimFetcher = () => {
  const { address: account } = useAccount();
  const addressPairs = useConfidentialAddressPairs();

  useEffect(() => {
    if (!account) return;
    _fetchClaims(account, addressPairs);
  }, [account, addressPairs]);
};
