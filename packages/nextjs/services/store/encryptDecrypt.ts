import { useCallback, useMemo } from "react";
import { useDecryptValue } from "./decrypted";
import { useConfidentialTokenPair, useConfidentialTokenPairBalances } from "./tokenStore";
import { FheTypes } from "cofhejs/web";
import { Address, formatUnits, parseUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { formatTokenAmount } from "~~/lib/common";

type EncryptDecryptStore = {
  pairPublicToken: Address | null;
  encryptValue: bigint | null;
  decryptValue: bigint | null;
  isEncrypt: boolean;
  inputString: string;
  hasInteracted: boolean;
};

export const useEncryptDecryptStore = create<EncryptDecryptStore>()(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  immer(set => ({
    pairPublicToken: null,
    encryptValue: null,
    decryptValue: null,
    isEncrypt: true,
    inputString: "",
    hasInteracted: false,
  })),
);

// Actions

const selectToken = (chain: number, account: Address, pairPublicToken: Address | null, isEncrypt?: boolean) => {
  if (pairPublicToken === null) {
    useEncryptDecryptStore.setState({ pairPublicToken: null, encryptValue: null, decryptValue: null });
    return;
  }

  useEncryptDecryptStore.setState(state => {
    state.pairPublicToken = pairPublicToken;
    state.encryptValue = 0n;
    state.decryptValue = 0n;
    if (isEncrypt != null) state.isEncrypt = isEncrypt;
  });
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
  const decryptedConfidentialBalance = useDecryptValue(FheTypes.Uint128, balances?.confidentialBalance);

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
    (pairPublicToken: Address | null, isEncrypt?: boolean) => {
      if (chainId === undefined || account === undefined) {
        return;
      }

      selectToken(chainId, account, pairPublicToken, isEncrypt);
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
        // Disallow negative numbers
        if (value.startsWith("-")) return;

        // If empty, treat as "0"
        const sanitized = value === "" ? "0" : value;

        state.inputString = sanitized;

        // Allow only numbers and optional single decimal point, no negatives
        if (/^\d*\.?\d*$/.test(sanitized)) {
          try {
            const amount = sanitized ? parseUnits(sanitized, pair.publicToken.decimals) : 0n;
            if (state.isEncrypt) {
              state.encryptValue = amount;
            } else {
              state.decryptValue = amount;
            }
          } catch {
            // Ignore parse errors for in-progress input
          }
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
    const value = isEncrypt ? encryptValue : decryptValue;
    return value ?? 0n;
  }, [isEncrypt, encryptValue, decryptValue]);
};

export const useEncryptDecryptInputValue = () => {
  const rawInputValue = useEncryptDecryptRawInputValue();
  const pair = useEncryptDecryptPair();

  return useMemo(() => {
    if (pair == null) return "";
    return formatUnits(rawInputValue, pair.publicToken.decimals);
  }, [pair, rawInputValue]);
};

export const useEncryptDecryptInputString = () => {
  return useEncryptDecryptStore(state => state.inputString);
};

export const useUpdateEncryptDecryptValueByPercent = () => {
  const pair = useEncryptDecryptPair();
  const balances = useEncryptDecryptBalances();

  return useCallback(
    (percent: number) => {
      useEncryptDecryptStore.setState(state => {
        if (pair == null) return;

        const balance = state.isEncrypt ? balances?.publicBalance : balances?.confidentialBalance;
        if (balance == null) return;

        const amount = (balance * BigInt(percent)) / 100n;
        if (state.isEncrypt) {
          state.encryptValue = amount;
        } else {
          state.decryptValue = amount;
        }
        // Update the input string with the formatted amount
        state.inputString = formatUnits(amount, pair.publicToken.decimals);
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
        ? formatTokenAmount(balances.fherc20Allowance, pair?.publicToken.decimals ?? 18)
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
    if (rawInputValue > 0n && balances.fherc20Allowance < rawInputValue) return true;
    return false;
  }, [isEncrypt, balances, rawInputValue]);
};

export const useEncryptDecryptHasInteracted = () => {
  return useEncryptDecryptStore(state => state.hasInteracted);
};

export const useSetEncryptDecryptHasInteracted = () => {
  return useCallback((value: boolean) => {
    useEncryptDecryptStore.setState(state => {
      state.hasInteracted = value;
    });
  }, []);
};
