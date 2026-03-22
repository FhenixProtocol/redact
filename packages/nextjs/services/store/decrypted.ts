import { useEffect, useMemo } from "react";
import { superjsonStorage } from "./superjsonStorage";
import { FheTypes, type UnsealedItem } from "@cofhe/sdk";
import superjson from "superjson";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useCofhejsAccount } from "~~/hooks/useCofhe";
import { getCofheClient, isCofheInitialized } from "~~/services/cofhe/cofheClient";

type DecryptionResult<T extends FheTypes> =
  | {
      fheType: T;
      ctHash: bigint;
      value: UnsealedItem<T>;
      error: null;
      state: "success";
    }
  | {
      fheType: T;
      ctHash: bigint;
      value: null;
      error: null;
      state: "pending";
    }
  | {
      fheType: T;
      ctHash: bigint;
      value: null;
      error: string;
      state: "error";
    };

type DecryptedStore = {
  decryptions: Record<string, DecryptionResult<FheTypes>>;
  lastDecryptionTimestamp: Record<string, number>;
};

const DecryptionRateLimit = 1000 * 5;

export const useDecryptedStore = create<DecryptedStore>()(
  persist(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    immer(set => ({
      decryptions: {},
      lastDecryptionTimestamp: {},
    })),
    {
      name: "decrypted-store",
      storage: superjsonStorage,
    },
  ),
);

const _decryptValue = async <T extends FheTypes>(
  fheType: T,
  value: bigint,
): Promise<DecryptionResult<T>> => {
  if (!value || value === 0n || BigInt(value) === 0n) {
    return {
      fheType,
      ctHash: 0n,
      value: fheType === FheTypes.Bool ? false : fheType === FheTypes.Uint160 ? zeroAddress : 0n,
      error: null,
      state: "success",
    } as DecryptionResult<T>;
  }

  const client = getCofheClient();
  if (!client) {
    return {
      fheType,
      ctHash: value,
      value: null,
      error: "Cofhe client not initialized",
      state: "error",
    } as DecryptionResult<T>;
  }

  try {
    const result = await client.decryptForView(value, fheType).withPermit().execute();
    return {
      fheType,
      ctHash: value,
      value: result,
      error: null,
      state: "success",
    } as DecryptionResult<T>;
  } catch (err: any) {
    return {
      fheType,
      ctHash: value,
      value: null,
      error: err?.message ?? String(err),
      state: "error",
    } as DecryptionResult<T>;
  }
};

const _pendingIfCofhejsNotInitialized = <T extends FheTypes>(
  fheType: T,
  ctHash: bigint,
): DecryptionResult<T> | undefined => {
  if (!isCofheInitialized()) {
    return {
      fheType,
      ctHash,
      value: null,
      error: null,
      state: "pending",
    } as DecryptionResult<T>;
  }
  return undefined;
};

export const decryptValue = async <T extends FheTypes>(
  fheType: T,
  ctHash: bigint,
  address: string,
): Promise<DecryptionResult<T> | undefined> => {
  // Skip zero handles — no encrypted balance exists
  if (ctHash == null || ctHash === 0n) {
    return {
      fheType,
      ctHash: ctHash ?? 0n,
      value: fheType === FheTypes.Bool ? false : fheType === FheTypes.Uint160 ? zeroAddress : 0n,
      error: null,
      state: "success",
    } as DecryptionResult<T>;
  }

  // Check if cofhejs is initialized, if not return a pending decryption
  const pending = _pendingIfCofhejsNotInitialized(fheType, ctHash);
  if (pending != null) return pending;

  // Return existing decryption if it exists and is not an error
  const existing = useDecryptedStore.getState().decryptions[ctHash.toString()];
  if (existing && existing.state !== "error") {
    return existing as DecryptionResult<T>;
  }

  // Rate limit decryption to 5 seconds
  const lastDecryptionTimestamp = useDecryptedStore.getState().lastDecryptionTimestamp[ctHash.toString()];
  if (lastDecryptionTimestamp != null && lastDecryptionTimestamp > Date.now() - DecryptionRateLimit) {
    return undefined;
  }
  useDecryptedStore.setState(state => {
    state.lastDecryptionTimestamp[ctHash.toString()] = Date.now();
    state.decryptions[ctHash.toString()] = {
      fheType,
      ctHash,
      value: null,
      error: null,
      state: "pending",
    };
  });

  const result = await _decryptValue(fheType, ctHash);

  useDecryptedStore.setState(state => {
    state.decryptions[ctHash.toString()] = result;
  });

  return result;
};

export const getDecryptedValue = <T extends FheTypes>(
  fheType: T,
  ctHash: bigint | null | undefined,
): DecryptionResult<T> | undefined => {
  if (ctHash == null) return undefined;

  const existing = useDecryptedStore.getState().decryptions[ctHash.toString()];
  if (existing != null && existing.value != null) return existing as DecryptionResult<T>;

  return undefined;
};

export const useDecryptValue = <T extends FheTypes>(
  fheType: T,
  ctHash: bigint | null | undefined,
): DecryptionResult<T> => {
  const cofhejsAccount = useCofhejsAccount();

  const result = useDecryptedStore(
    state => state.decryptions[ctHash?.toString() ?? ""] as DecryptionResult<T> | undefined,
  );
  const strResult = superjson.stringify(result);

  useEffect(() => {
    if (ctHash == null || ctHash === 0n || cofhejsAccount == null) return;
    if (result != null && result.state !== "error") return;
    decryptValue(fheType, ctHash, cofhejsAccount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fheType, strResult, ctHash, cofhejsAccount]);

  return useMemo(() => {
    if (result != null) return result;
    return {
      fheType,
      ctHash: ctHash,
      value: null,
      error: null,
      state: "pending",
    } as DecryptionResult<T>;
  }, [fheType, result, ctHash]);
};
