import { useCallback, useMemo } from "react";
import { useDecryptValue } from "./decrypted";
import { setDrawerPairAddress, useDrawerPairAddress } from "./drawerStore";
import { useConfidentialTokenPair, useConfidentialTokenPairBalances } from "./tokenStore";
import { FheTypes } from "cofhejs/web";
import { Address, formatUnits, isAddress, parseUnits, zeroAddress } from "viem";
import { useAccount, useChainId } from "wagmi";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type SendStore = {
  publicSendValue: bigint | null;
  confidentialSendValue: bigint | null;
  isPublic: boolean;
  recipient: Address | null;
};

export const useSendStore = create<SendStore>()(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  immer(set => ({
    publicSendValue: null,
    confidentialSendValue: null,
    isPublic: true,
    recipient: null,
  })),
);

// Actions

// Hooks

export const useSendPair = () => {
  const pairAddress = useDrawerPairAddress();
  return useConfidentialTokenPair(pairAddress);
};

export const useSendBalances = () => {
  const pair = useSendPair();
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

export const useSelectSendToken = () => {
  const chainId = useChainId();
  const { address: account } = useAccount();

  return useCallback(
    (pairPublicToken: Address | null) => {
      if (chainId === undefined || account === undefined) {
        return;
      }

      setDrawerPairAddress(pairPublicToken ?? undefined);
      useSendStore.setState(state => {
        state.publicSendValue = null;
        state.confidentialSendValue = null;
      });
    },
    [chainId, account],
  );
};

export const useUpdateSendValue = () => {
  const pair = useSendPair();

  return useCallback(
    (value: string) => {
      useSendStore.setState(state => {
        if (pair == null) return;
        const amount = value ? parseUnits(value, pair.publicToken.decimals) : 0n;
        if (state.isPublic) {
          state.publicSendValue = amount;
        } else {
          state.confidentialSendValue = amount;
        }
      });
    },
    [pair],
  );
};

export const useSendRawInputValue = () => {
  const isPublic = useSendIsPublic();
  const { publicSendValue, confidentialSendValue } = useSendStore();

  return useMemo(() => {
    const value = isPublic ? publicSendValue : confidentialSendValue;
    return value ?? 0n;
  }, [isPublic, publicSendValue, confidentialSendValue]);
};

export const useSendInputValue = () => {
  const rawInputValue = useSendRawInputValue();
  const pair = useSendPair();

  return useMemo(() => {
    if (pair == null) return "";
    return formatUnits(rawInputValue, pair.publicToken.decimals);
  }, [pair, rawInputValue]);
};

export const useUpdateSendValueByPercent = () => {
  const pair = useSendPair();
  const balances = useSendBalances();

  return useCallback(
    (percent: number) => {
      useSendStore.setState(state => {
        if (pair == null) return;

        const balance = state.isPublic ? balances?.publicBalance : balances?.confidentialBalance;
        if (balance == null) return;

        const amount = (balance * BigInt(percent)) / 100n;
        if (state.isPublic) {
          state.publicSendValue = amount;
        } else {
          state.confidentialSendValue = amount;
        }
      });
    },
    [pair, balances],
  );
};

export const useSendSetIsPublic = () => {
  return useCallback((isPublic: boolean) => {
    useSendStore.setState(state => {
      state.isPublic = isPublic;
    });
  }, []);
};

export const useSendIsPublic = () => {
  return useSendStore(state => state.isPublic);
};

export const useSendPercentValue = () => {
  const balances = useSendBalances();
  const isPublic = useSendIsPublic();
  const rawInputValue = useSendRawInputValue();

  return useMemo(() => {
    if (balances == null) return 0;
    const balance = isPublic ? balances.publicBalance : balances.confidentialBalance;
    if (balance == null || balance === 0n) return 0;
    return Number(((rawInputValue ?? 0n) * 100n) / balance);
  }, [balances, isPublic, rawInputValue]);
};

export const useSendValueError = () => {
  const rawInputValue = useSendRawInputValue();
  const balances = useSendBalances();
  const isPublic = useSendIsPublic();

  return useMemo(() => {
    if (rawInputValue == null) return "No token selected";
    if (balances == null) return "Token balance not found";
    if (rawInputValue == null) return "Amount empty";
    if (rawInputValue === 0n) return "Amount cannot be 0";
    if (rawInputValue < 0n) return "Amount cannot be negative";

    if (isPublic) {
      if (balances.publicBalance == null) return "Public token balance not found";
      if (rawInputValue > balances.publicBalance) return "Insufficient balance";
    } else {
      if (balances.confidentialBalance == null) return "Private token balance not found";
      if (rawInputValue > balances.confidentialBalance) return "Insufficient balance";
    }

    return null;
  }, [rawInputValue, balances, isPublic]);
};

export const useSendRecipient = () => {
  return useSendStore(state => state.recipient);
};

export const useUpdateSendRecipient = () => {
  return useCallback((recipient: Address | null) => {
    useSendStore.setState(state => {
      state.recipient = recipient;
    });
  }, []);
};

export const useSendRecipientError = () => {
  const recipient = useSendRecipient();
  return useMemo(() => {
    if (recipient == null || recipient.length === 0) return "Empty address";
    if (!isAddress(recipient)) return "Invalid address";
    if (recipient === zeroAddress) return "Zero address";
    return null;
  }, [recipient]);
};

export const useSendFormattedAllowance = () => {
  const pair = useSendPair();
  const balances = useSendBalances();

  return useMemo(
    () =>
      balances?.fherc20Allowance != null
        ? formatUnits(balances.fherc20Allowance, pair?.publicToken.decimals ?? 18)
        : "0",
    [balances, pair],
  );
};

export const useSendRequiresDeployment = () => {
  const pair = useSendPair();
  return pair != null && !pair.confidentialTokenDeployed;
};

export const useSendRequiresApproval = () => {
  const isPublic = useSendIsPublic();
  const balances = useSendBalances();
  const rawInputValue = useSendRawInputValue();

  return useMemo(() => {
    if (!isPublic) return false;
    if (balances == null) return false;
    if (balances.fherc20Allowance == null) return true;
    if (rawInputValue > 0n && balances.fherc20Allowance < rawInputValue) return true;
    return false;
  }, [isPublic, balances, rawInputValue]);
};
