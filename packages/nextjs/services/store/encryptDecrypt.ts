import { useCallback } from "react";
import { getDecryptedValue } from "./decrypted";
import { ConfidentialTokenPair, ConfidentialTokenPairBalances, useTokenStore } from "./tokenStore2";
import { FheTypes } from "cofhejs/web";
import { Address, formatUnits, parseUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type EncryptDecryptStore = {
  pair: ConfidentialTokenPair | null;
  balances: ConfidentialTokenPairBalances | null;
  encryptValue: bigint | null;
  decryptValue: bigint | null;
  isEncrypt: boolean;
};

export const useEncryptDecryptStore = create<EncryptDecryptStore>()(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  immer(set => ({
    pair: null,
    balances: null,
    encryptValue: null,
    decryptValue: null,
    isEncrypt: true,
  })),
);

// Actions

const selectToken = (chain: number, account: Address, pairPublicToken: Address | null) => {
  if (pairPublicToken === null) {
    useEncryptDecryptStore.setState({ pair: null, balances: null, encryptValue: null, decryptValue: null });
    return;
  }

  const pair = useTokenStore.getState().pairs[chain]?.[pairPublicToken];
  const balances = useTokenStore.getState().balances[chain]?.[pairPublicToken];

  useEncryptDecryptStore.setState({ pair, balances, encryptValue: 0n, decryptValue: 0n });
};

// Hooks

export const useEncryptDecryptPair = () => {
  return useEncryptDecryptStore(state => state.pair);
};

export const useEncryptDecryptBalances = () => {
  return useEncryptDecryptStore(state => state.balances);
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
  return useCallback((percent: number) => {
    useEncryptDecryptStore.setState(state => {
      if (state.pair == null) return;

      const balance = state.isEncrypt
        ? state.balances?.publicBalance
        : (getDecryptedValue(FheTypes.Uint128, state.balances?.confidentialBalance)?.value ?? undefined);
      if (balance == null) return;

      const amount = (balance * BigInt(percent)) / 100n;
      if (state.isEncrypt) {
        state.encryptValue = amount;
      } else {
        state.decryptValue = amount;
      }
    });
  }, []);
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
  return useEncryptDecryptStore(state => {
    if (state.pair == null) return 0;
    if (state.isEncrypt) {
      const balance = state.balances?.publicBalance;
      if (balance == null || balance === 0n) return 0;
      return Number(((state.encryptValue ?? 0n) * 100n) / balance);
    } else {
      const balance = getDecryptedValue(FheTypes.Uint128, state.balances?.confidentialBalance)?.value ?? undefined;
      if (balance == null || balance === 0n) return 0;
      return Number(((state.decryptValue ?? 0n) * 100n) / balance);
    }
  });
};

export const useEncryptDecryptValueError = () => {
  return useEncryptDecryptStore(state => {
    if (state.pair == null) return "No token selected";
    if (state.balances == null) return "Token balance not found";
    if (state.isEncrypt) {
      if (state.encryptValue == null) return "Amount empty";
      if (state.encryptValue === 0n) return "Amount cannot be 0";
      if (state.encryptValue < 0n) return "Amount cannot be negative";
      if (state.balances.publicBalance == null) return "Public token balance not found";
      if (state.encryptValue > state.balances.publicBalance) return "Insufficient balance";
    } else {
      if (state.decryptValue == null) return "Amount empty";
      if (state.decryptValue === 0n) return "Amount cannot be 0";
      if (state.decryptValue < 0n) return "Amount cannot be negative";
      if (state.balances.confidentialBalance == null) return "Private token balance not found";
      if (state.decryptValue > state.balances.confidentialBalance) return "Insufficient balance";
    }
    return null;
  });
};
