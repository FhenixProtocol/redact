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
    }
  | {
      fheType: T;
      ctHash: bigint;
      value: null;
      error: string;
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
    } as DecryptionResult<T>;
  }
  console.log("decrypting", value, fheType);
  const result = await cofhejs.unseal(value, fheType);
  console.log("result", result, value);
  if (result.success) {
    return {
      fheType,
      ctHash: value,
      value: result.data,
      error: null,
    } as DecryptionResult<T>;
  }
  return {
    fheType,
    ctHash: value,
    value: null,
    error: result.error.message,
  } as DecryptionResult<T>;
};

export const decryptValue = async <T extends FheTypes>(
  fheType: T,
  value: bigint,
): Promise<DecryptionResult<T> | undefined> => {
  const existing = useDecryptedStore.getState().decryptions[value.toString()];
  console.log("decryptValue", { fheType, value, existing });
  if (existing && existing.value != null) {
    return existing as DecryptionResult<T>;
  }

  // Rate limit decryption to 5 seconds
  const lastDecryptionTimestamp = useDecryptedStore.getState().lastDecryptionTimestamp[value.toString()];
  if (lastDecryptionTimestamp != null && lastDecryptionTimestamp > Date.now() - DecryptionRateLimit) {
    return undefined;
  }
  useDecryptedStore.setState(state => {
    state.lastDecryptionTimestamp[value.toString()] = Date.now();
  });

  const result = await _decryptValue(fheType, value);

  useDecryptedStore.setState(state => {
    state.decryptions[value.toString()] = result;
  });

  return result;
};

export const getDecryptedValue = <T extends FheTypes>(
  fheType: T,
  value: bigint | null | undefined,
): DecryptionResult<T> | undefined => {
  if (value == null) return undefined;

  const existing = useDecryptedStore.getState().decryptions[value.toString()];
  if (existing != null && existing.value != null) return existing as DecryptionResult<T>;

  return undefined;
};

export const useDecryptValue = <T extends FheTypes>(
  fheType: T,
  value: bigint | null | undefined,
): DecryptionResult<T> => {
  const result = useDecryptedStore(state => state.decryptions[value?.toString() ?? ""]);

  useEffect(() => {
    if (result != null || value == null) return;
    decryptValue(fheType, value).then(result => {
      if (result == null) return;
      useDecryptedStore.setState(state => {
        state.decryptions[value.toString()] = result;
      });
    });
  }, [fheType, result, value]);

  return useMemo(() => {
    if (result != null) return result as DecryptionResult<T>;
    return {
      fheType,
      ctHash: value,
      value: null,
      error: "Missing value",
    } as DecryptionResult<T>;
  }, [result, value]);
};
