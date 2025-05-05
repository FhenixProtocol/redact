import { useEffect, useMemo } from "react";
import { superjsonStorage } from "./superjsonStorage";
import { FheTypes, UnsealedItem } from "cofhejs/web";
import { cofhejs } from "cofhejs/web";
import { zeroAddress } from "viem";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

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

const _decryptValue = async <T extends FheTypes>(fheType: T, value: bigint): Promise<DecryptionResult<T>> => {
  if (value === 0n) {
    return {
      fheType,
      ctHash: 0n,
      value: fheType === FheTypes.Bool ? false : fheType === FheTypes.Uint160 ? zeroAddress : 0n,
      error: null,
      state: "success",
    } as DecryptionResult<T>;
  }
  const result = await cofhejs.unseal(value, fheType);
  if (result.success) {
    return {
      fheType,
      ctHash: value,
      value: result.data,
      error: null,
      state: "success",
    } as DecryptionResult<T>;
  }
  return {
    fheType,
    ctHash: value,
    value: null,
    error: result.error.message,
    state: "error",
  } as DecryptionResult<T>;
};

export const decryptValue = async <T extends FheTypes>(
  fheType: T,
  ctHash: bigint,
): Promise<DecryptionResult<T> | undefined> => {
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
  const result = useDecryptedStore(
    state => state.decryptions[ctHash?.toString() ?? ""] as DecryptionResult<T> | undefined,
  );

  useEffect(() => {
    if (ctHash == null) return;
    if (result != null && result.state !== "error") return;
    decryptValue(fheType, ctHash).then(result => {
      if (result == null) return;
      useDecryptedStore.setState(state => {
        state.decryptions[ctHash.toString()] = result;
      });
    });
  }, [fheType, result, ctHash]);

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
