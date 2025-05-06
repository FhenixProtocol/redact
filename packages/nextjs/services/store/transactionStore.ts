import { superjsonStorage } from "./superjsonStorage";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { formatTokenAmount } from "~~/lib/common";

type ChainRecord<T> = Record<number, T>;
type HashRecord<T> = Record<string, T>;

export enum TransactionStatus {
  Pending = 0,
  Failed = 1,
  Confirmed = 2,
}
export type TransactionStatusString = "Pending" | "Failed" | "Confirmed";

export enum TransactionActionType {
  Send = 0,
  EncSend = 1,
  Claim = 2,
  Encrypt = 3,
  Decrypt = 4,
  Deploy = 5,
  Approve = 6,
}
export type TransactionActionString =
  | "Transfer"
  | "Encrypted Transfer"
  | "Claim"
  | "Encrypt"
  | "Decrypt"
  | "Deploy"
  | "Approve";

export interface RedactTransaction {
  hash: string;
  status: TransactionStatus;
  tokenSymbol: string;
  tokenAmount: bigint;
  tokenDecimals: number;
  tokenAddress: string;
  chainId: number;
  actionType: TransactionActionType;
  timestamp: number;
  account: string;
}

export interface TransactionStore {
  transactions: ChainRecord<HashRecord<RedactTransaction>>;
  addTransaction: (transaction: Omit<RedactTransaction, "status" | "timestamp">) => void;
  getTransaction: (chainId: number, hash: string) => RedactTransaction | undefined;
  getAllTransactions: (chainId: number, account?: string) => RedactTransaction[];
  getAllTransactionsByToken: (chainId: number, tokenAddress: string, account?: string) => RedactTransaction[];
  updateTransactionStatus: (chainId: number, hash: string, status: TransactionStatus) => void;
}

const actionToStringMap: Record<TransactionActionType, TransactionActionString> = {
  [TransactionActionType.Send]: "Transfer",
  [TransactionActionType.EncSend]: "Encrypted Transfer",
  [TransactionActionType.Claim]: "Claim",
  [TransactionActionType.Encrypt]: "Encrypt",
  [TransactionActionType.Decrypt]: "Decrypt",
  [TransactionActionType.Deploy]: "Deploy",
  [TransactionActionType.Approve]: "Approve",
};

const stringToActionMap = Object.entries(actionToStringMap).reduce<
  Record<TransactionActionString, TransactionActionType>
>((acc, [k, v]) => {
  acc[v] = Number(k) as TransactionActionType;
  return acc;
}, {} as any);

export const actionToString = (a: TransactionActionType): TransactionActionString => actionToStringMap[a];

export const stringToAction = (s: string): TransactionActionType | undefined =>
  stringToActionMap[s as TransactionActionString];

export const transactionToString = (tx: Omit<RedactTransaction, "status" | "timestamp">): string => {
  if (tx.actionType === TransactionActionType.Deploy) {
    return `${actionToString(tx.actionType)} ${tx.tokenSymbol}`;
  }
  return `${actionToString(tx.actionType)} ${formatTokenAmount(tx.tokenAmount, tx.tokenDecimals)} ${tx.tokenSymbol}`;
};

const statusToStringMap: Record<TransactionStatus, TransactionStatusString> = {
  [TransactionStatus.Pending]: "Pending",
  [TransactionStatus.Failed]: "Failed",
  [TransactionStatus.Confirmed]: "Confirmed",
};

export const statusToString = (a: TransactionStatus): TransactionStatusString => statusToStringMap[a];

export const useTransactionStore = create<TransactionStore>()(
  persist(
    immer((set, get) => ({
      transactions: {},

      addTransaction: (transaction: Omit<RedactTransaction, "status" | "timestamp">) => {
        set(state => {
          if (!state.transactions[transaction.chainId]) {
            state.transactions[transaction.chainId] = {};
          }
          state.transactions[transaction.chainId][transaction.hash] = {
            ...transaction,
            status: TransactionStatus.Pending,
            timestamp: Date.now(),
          };
        });
      },

      updateTransactionStatus: (chainId: number, hash: string, status: TransactionStatus) => {
        set(state => {
          const transaction = state.transactions[chainId]?.[hash];
          if (transaction) {
            transaction.status = status;
          }
        });
      },

      getTransaction: (chainId: number, hash: string): RedactTransaction | undefined => {
        return get().transactions[chainId]?.[hash];
      },

      getAllTransactions: (chainId: number, account?: string): RedactTransaction[] => {
        const chainTxs = get().transactions[chainId];
        return chainTxs
          ? Object.values(chainTxs)
              .filter(tx => !account || !tx.account || tx.account.toLowerCase() === account.toLowerCase())
              .sort((a, b) => b.timestamp - a.timestamp) // newest first
          : [];
      },

      getAllTransactionsByToken: (chainId: number, tokenAddress: string, account?: string): RedactTransaction[] => {
        const chainTxs = get().transactions[chainId];
        return chainTxs
          ? Object.values(chainTxs)
              .filter(tx => {
                if (!tx.tokenAddress || !tokenAddress) return false;
                if (account && tx.account && tx.account.toLowerCase() !== account.toLowerCase()) return false;
                return tx.tokenAddress.toLowerCase() === tokenAddress.toLowerCase();
              })
              .sort((a, b) => b.timestamp - a.timestamp) // newest first
          : [];
      },
    })),
    {
      name: "transaction-store",
      storage: superjsonStorage,
    },
  ),
);
