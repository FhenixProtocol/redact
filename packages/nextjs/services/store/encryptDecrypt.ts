import { useCallback, useMemo } from "react";
import { getDecryptedValue } from "./decrypted";
import {
  ConfidentialTokenPair,
  ConfidentialTokenPairBalances,
  useConfidentialTokenPairBalances,
  useTokenStore,
} from "./tokenStore2";
import { FheTypes } from "cofhejs/web";
import { Address, formatUnits, parseUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type EncryptDecryptStore = {
  pair: ConfidentialTokenPair | null;
  encryptValue: bigint | null;
  decryptValue: bigint | null;
  isEncrypt: boolean;
};

export const useEncryptDecryptStore = create<EncryptDecryptStore>()(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  immer(set => ({
    pair: null,
    encryptValue: null,
    decryptValue: null,
    isEncrypt: true,
  })),
);

// Actions

const selectToken = (chain: number, account: Address, pairPublicToken: Address | null) => {
  if (pairPublicToken === null) {
    useEncryptDecryptStore.setState({ pair: null, encryptValue: null, decryptValue: null });
    return;
  }

  const pair = useTokenStore.getState().pairs[chain]?.[pairPublicToken];

  useEncryptDecryptStore.setState({ pair, encryptValue: 0n, decryptValue: 0n });
};

// Hooks

export const useEncryptDecryptPair = () => {
  return useEncryptDecryptStore(state => state.pair);
};

export const useEncryptDecryptBalances = () => {
  const pair = useEncryptDecryptPair();
  return useConfidentialTokenPairBalances(pair?.publicToken.address);
};

export const useSelectEncryptDecryptToken = () => {
  const chainId = useChainId();
  const { address: account } = useAccount();

  return useCallback(
    (pairPublicToken: Address | null) => {
      if (chainId === undefined || account === undefined) {
        return;
      }

      selectToken(chainId, account, pairPublicToken);
    },
    [chainId, account],
  );
};

export const useUpdateEncryptDecryptValue = () => {
  return useCallback((value: string) => {
    useEncryptDecryptStore.setState(state => {
      if (state.pair == null) return;
      const amount = value ? parseUnits(value, state.pair.publicToken.decimals) : 0n;
      if (state.isEncrypt) {
        state.encryptValue = amount;
      } else {
        state.decryptValue = amount;
      }
    });
  }, []);
};

export const useEncryptDecryptInputValue = () => {
  return useEncryptDecryptStore(state => {
    if (state.pair == null) return "";
    const value = state.isEncrypt ? state.encryptValue : state.decryptValue;
    return formatUnits(value ?? 0n, state.pair.publicToken.decimals);
  });
};

export const useEncryptDecryptRawInputValue = () => {
  return useEncryptDecryptStore(state => {
    if (state.pair == null) return 0n;
    const value = state.isEncrypt ? state.encryptValue : state.decryptValue;
    return value ?? 0n;
  });
};

export const useUpdateEncryptDecryptValueByPercent = () => {
  const pair = useEncryptDecryptPair();
  const balances = useEncryptDecryptBalances();
  return useCallback(
    (percent: number) => {
      useEncryptDecryptStore.setState(state => {
        if (state.pair == null) return;

        const balance = state.isEncrypt ? balances?.publicBalance : balances?.confidentialBalance;
        if (balance == null) return;

        const amount = (balance * BigInt(percent)) / 100n;
        if (state.isEncrypt) {
          state.encryptValue = amount;
        } else {
          state.decryptValue = amount;
        }
      });
    },
    [pair, balances],
  );
};

export const useEncryptDecryptIsEncrypt = () => {
  const setIsEncrypt = useCallback((isEncrypt: boolean) => {
    useEncryptDecryptStore.setState(state => {
      state.isEncrypt = isEncrypt;
    });
  }, []);
  const isEncrypt = useEncryptDecryptStore(state => state.isEncrypt);
  return { setIsEncrypt, isEncrypt };
};

export const useEncryptDecryptPercentValue = () => {
  const balances = useEncryptDecryptBalances();
  const isEncrypt = useEncryptDecryptIsEncrypt();
  const rawInputValue = useEncryptDecryptRawInputValue();

  return useMemo(() => {
    if (balances == null) return 0;
    if (isEncrypt) {
      const balance = balances?.publicBalance;
      if (balance == null || balance === 0n) return 0;
      return Number(((rawInputValue ?? 0n) * 100n) / balance);
    } else {
      const balance = getDecryptedValue(FheTypes.Uint128, balances?.confidentialBalance)?.value ?? undefined;
      if (balance == null || balance === 0n) return 0;
      return Number(((rawInputValue ?? 0n) * 100n) / balance);
    }
  }, [balances, isEncrypt, rawInputValue]);
};

export const useEncryptDecryptValueError = () => {
  const rawInputValue = useEncryptDecryptRawInputValue();
  const balances = useEncryptDecryptBalances();
  const isEncrypt = useEncryptDecryptIsEncrypt();

  return useMemo(() => {
    if (rawInputValue == null) return "No token selected";
    if (balances == null) return "Token balance not found";
    if (isEncrypt) {
      if (rawInputValue == null) return "Amount empty";
      if (rawInputValue === 0n) return "Amount cannot be 0";
      if (rawInputValue < 0n) return "Amount cannot be negative";
      if (balances.publicBalance == null) return "Public token balance not found";
      if (rawInputValue > balances.publicBalance) return "Insufficient balance";
    } else {
      if (rawInputValue == null) return "Amount empty";
      if (rawInputValue === 0n) return "Amount cannot be 0";
      if (rawInputValue < 0n) return "Amount cannot be negative";
      if (balances.confidentialBalance == null) return "Private token balance not found";
      if (rawInputValue > balances.confidentialBalance) return "Insufficient balance";
    }
    return null;
  }, [rawInputValue, balances, isEncrypt]);
};
