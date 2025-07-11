import Image from "next/image";
import { HashLink } from "./HashLink";
import { formatDistanceToNow } from "date-fns";
import { useAccount, useChainId } from "wagmi";
import { formatTokenAmount } from "~~/lib/common";
import { ConfidentialTokenPair } from "~~/services/store/tokenStore";
import {
  RedactTransaction,
  TransactionStatus,
  actionToString,
  statusToString,
  useTransactionStore,
} from "~~/services/store/transactionStore";

interface TransactionHistoryProps {
  pair?: ConfidentialTokenPair;
}

const TransactionItem = ({ tx }: { tx: RedactTransaction }) => {
  return (
    <div key={tx.hash} className="bg-surface-alt p-4 rounded-2xl">
      <div className="flex h-13 gap-4">
        <div className="text-green-500 text-xl flex items-center w-6">
          <Image
            src={`/icons/${actionToString(tx.actionType)}.svg`}
            alt={actionToString(tx.actionType)}
            width={32}
            height={32}
            className="dark:brightness-0 dark:invert"
          />
        </div>

        <div className="flex flex-col flex-grow justify-between items-stretch">
          <div className="text-md font-semibold text-primary self-start mb-auto p-0 m-0 whitespace-nowrap">
            {actionToString(tx.actionType)}
          </div>
          <div
            className={`text-sm font-semibold self-start mt-auto ${
              tx.status === TransactionStatus.Pending
                ? "text-yellow-800"
                : tx.status === TransactionStatus.Confirmed
                  ? "text-success-500"
                  : "text-error"
            }`}
          >
            {statusToString(tx.status)}
          </div>
          <div className="text-xs text-base-content/60 dark:text-white/70">{formatDistanceToNow(tx.timestamp, { addSuffix: true })}</div>
        </div>

        <div className="flex flex-col justify-between items-stretch">
          <div className="text-md font-semibold text-primary self-end">
            {formatTokenAmount(tx.tokenAmount, tx.tokenDecimals)} {tx.tokenSymbol}
          </div>
          <HashLink
            className="text-xs text-base-content/60 dark:text-white/70"
            buttonSize={3}
            copyStrokeWidth={1.0}
            type="tx"
            hash={tx.hash}
            copyable
          />
        </div>
      </div>
    </div>
  );
};

export const TransactionHistory = ({ pair }: TransactionHistoryProps) => {
  const chainId = useChainId();
  const transactionsStore = useTransactionStore();
  const { address: currentAccount } = useAccount();

  const transactions =
    pair !== undefined
      ? transactionsStore.getAllTransactionsByToken(chainId, pair.publicToken.address, currentAccount)
      : transactionsStore.getAllTransactions(chainId, currentAccount);

  if (!transactions.length) {
    return (
      <div className="p-4 text-center">
        <p className="text-base-content/60 dark:text-white/70">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-x-hidden overflow-y-auto w-full max-w-4xl mx-auto styled-scrollbar">
      <div className="space-y-4">
        {transactions.map(tx => {
          return <TransactionItem key={tx.hash} tx={tx} />;
        })}
      </div>
    </div>
  );
};
