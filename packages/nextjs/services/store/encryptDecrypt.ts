import { useCallback, useMemo } from "react";
import { getDecryptedValue } from "./decrypted";
import { useConfidentialTokenPair, useConfidentialTokenPairBalances, useTokenStore } from "./tokenStore2";
import { FheTypes } from "cofhejs/web";
import { Address, formatUnits, parseUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type EncryptDecryptStore = {
  pairPublicToken: Address | null;
  encryptValue: bigint | null;
  decryptValue: bigint | null;
  isEncrypt: boolean;
};

export const useEncryptDecryptStore = create<EncryptDecryptStore>()(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  immer(set => ({
    pairPublicToken: null,
    encryptValue: null,
    decryptValue: null,
    isEncrypt: true,
  })),
);

// Actions

const selectToken = (chain: number, account: Address, pairPublicToken: Address | null) => {
  if (pairPublicToken === null) {
    useEncryptDecryptStore.setState({ pairPublicToken: null, encryptValue: null, decryptValue: null });
    return;
  }

  // const pair = useTokenStore.getState().pairs[chain]?.[pairPublicToken];

  useEncryptDecryptStore.setState({ pairPublicToken, encryptValue: 0n, decryptValue: 0n });
};

// Hooks

export const useEncryptDecryptPairPublicToken = () => {
  return useEncryptDecryptStore(state => state.pairPublicToken);
};

export const useEncryptDecryptPair = () => {
  const pairPublicToken = useEncryptDecryptPairPublicToken();
  return useConfidentialTokenPair(pairPublicToken ?? undefined);
};

export const useEncryptDecryptBalances = () => {
  const pair = useEncryptDecryptPair();
  const balances = useConfidentialTokenPairBalances(pair?.publicToken.address);
  const decryptedConfidentialBalance = getDecryptedValue(FheTypes.Uint128, balances?.confidentialBalance);

  return useMemo(
    () => ({
      publicBalance: balances?.publicBalance,
      confidentialBalance: decryptedConfidentialBalance?.value,
      fherc20Allowance: balances?.fherc20Allowance,
    }),
    [balances, decryptedConfidentialBalance],
  );
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
  const pair = useEncryptDecryptPair();

  return useCallback(
    (value: string) => {
      useEncryptDecryptStore.setState(state => {
        if (pair == null) return;
        const amount = value ? parseUnits(value, pair.publicToken.decimals) : 0n;
        if (state.isEncrypt) {
          state.encryptValue = amount;
        } else {
          state.decryptValue = amount;
        }
      });
    },
    [pair],
  );
};

export const useEncryptDecryptRawInputValue = () => {
  const isEncrypt = useEncryptDecryptIsEncrypt();
  const { encryptValue, decryptValue } = useEncryptDecryptStore();

  return useMemo(() => {
    console.log("Raw input value", { isEncrypt, encryptValue, decryptValue });
    const value = isEncrypt ? encryptValue : decryptValue;
    console.log("Raw input value", { value });
    return value ?? 0n;
  }, [isEncrypt, encryptValue, decryptValue]);
};

export const useEncryptDecryptInputValue = () => {
  const rawInputValue = useEncryptDecryptRawInputValue();
  const pair = useEncryptDecryptPair();

  console.log("Input value", { rawInputValue });

  return useMemo(() => {
    if (pair == null) return "";
    return formatUnits(rawInputValue, pair.publicToken.decimals);
  }, [pair, rawInputValue]);
};

export const useUpdateEncryptDecryptValueByPercent = () => {
  const pair = useEncryptDecryptPair();
  const balances = useEncryptDecryptBalances();

  return useCallback(
    (percent: number) => {
      useEncryptDecryptStore.setState(state => {
        if (pair == null) return;

        const balance = state.isEncrypt ? balances?.publicBalance : balances?.confidentialBalance;
        console.log("Update by percent", { balance, percent, isEncrypt: state.isEncrypt });
        if (balance == null) return;

        const amount = (balance * BigInt(percent)) / 100n;
        if (state.isEncrypt) {
          state.encryptValue = amount;
        } else {
          state.decryptValue = amount;
        }

        console.log("Updated", { stateDecryptedValue: state.decryptValue, isEncrypt: state.isEncrypt });
      });
    },
    [pair, balances],
  );
};

export const useEncryptDecryptSetIsEncrypt = () => {
  return useCallback((isEncrypt: boolean) => {
    useEncryptDecryptStore.setState(state => {
      state.isEncrypt = isEncrypt;
    });
  }, []);
};

export const useEncryptDecryptIsEncrypt = () => {
  return useEncryptDecryptStore(state => state.isEncrypt);
};

export const useEncryptDecryptPercentValue = () => {
  const balances = useEncryptDecryptBalances();
  const isEncrypt = useEncryptDecryptIsEncrypt();
  const rawInputValue = useEncryptDecryptRawInputValue();

  return useMemo(() => {
    if (balances == null) return 0;
    const balance = isEncrypt ? balances.publicBalance : balances.confidentialBalance;
    if (balance == null || balance === 0n) return 0;
    return Number(((rawInputValue ?? 0n) * 100n) / balance);
  }, [balances, isEncrypt, rawInputValue]);
};

export const useEncryptDecryptValueError = () => {
  const rawInputValue = useEncryptDecryptRawInputValue();
  const balances = useEncryptDecryptBalances();
  const isEncrypt = useEncryptDecryptIsEncrypt();

  return useMemo(() => {
    if (rawInputValue == null) return "No token selected";
    if (balances == null) return "Token balance not found";
    if (rawInputValue == null) return "Amount empty";
    if (rawInputValue === 0n) return "Amount cannot be 0";
    if (rawInputValue < 0n) return "Amount cannot be negative";

    if (isEncrypt) {
      if (balances.publicBalance == null) return "Public token balance not found";
      if (rawInputValue > balances.publicBalance) return "Insufficient balance";
    } else {
      if (balances.confidentialBalance == null) return "Private token balance not found";
      if (rawInputValue > balances.confidentialBalance) return "Insufficient balance";
    }

    return null;
  }, [rawInputValue, balances, isEncrypt]);
};

export const useEncryptDecryptFormattedAllowance = () => {
  const pair = useEncryptDecryptPair();
  const balances = useEncryptDecryptBalances();
  return useMemo(
    () =>
      balances?.fherc20Allowance != null
        ? formatUnits(balances.fherc20Allowance, pair?.publicToken.decimals ?? 18)
        : "0",
    [balances, pair],
  );
};

export const useEncryptDecryptRequiresDeployment = () => {
  const pair = useEncryptDecryptPair();
  return pair != null && !pair.confidentialTokenDeployed;
};

export const useEncryptDecryptRequiresApproval = () => {
  const isEncrypt = useEncryptDecryptIsEncrypt();
  const balances = useEncryptDecryptBalances();
  const rawInputValue = useEncryptDecryptRawInputValue();

  return useMemo(() => {
    if (!isEncrypt) return false;
    if (balances == null) return false;
    if (balances.fherc20Allowance == null) return true;
    if (balances.fherc20Allowance < rawInputValue) return true;
    return false;
  }, [isEncrypt, balances, rawInputValue]);
};
