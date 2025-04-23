import { formatDistanceToNow } from "date-fns";
import { useChainId } from "wagmi";
import {
  TransactionStatus,
  actionToString,
  statusToString,
  useTransactionStore,
} from "~~/services/store/transactionStore";

interface TransactionHistoryProps {
  symbol: string | undefined;
}

export const TransactionHistory = ({ symbol }: TransactionHistoryProps) => {
  const chainId = useChainId();
  const transactionsStore = useTransactionStore();

  const transactions =
    symbol !== undefined
      ? transactionsStore.getAllTransactionsByToken(chainId, symbol)
      : transactionsStore.getAllTransactions(chainId);

  if (!transactions.length) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="space-y-4">
        {transactions.map(tx => (
          <div key={tx.hash} className="bg-base-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-green-500 text-xl">
                <img
                  src={`/icons/${actionToString(tx.actionType)}.svg`}
                  alt={actionToString(tx.actionType)}
                  className="w-6 h-6"
                />
              </div>
              <div className="flex-grow">
                <div className="flex flex-col flex-start items-start gap-1">
                  <div className="font-semibold">{actionToString(tx.actionType)}</div>
                  <div
                    className={`text-xs font-medium ${
                      tx.status === TransactionStatus.Pending
                        ? "text-yellow-800"
                        : tx.status === TransactionStatus.Confirmed
                          ? "text-green-800"
                          : "text-red-800"
                    }`}
                  >
                    {statusToString(tx.status)}
                  </div>
                  <div className="text-xs text-gray-500">{formatDistanceToNow(tx.timestamp, { addSuffix: true })}</div>                  
                </div>
                
              </div>
              <div className="flex flex-col items-end">
                <div className="text-sm text-gray-500">
                    {tx.tokenAmount} {tx.tokenSymbol}
                </div>

                <a
                  href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-blue-500 hover:text-blue-700"
                >
                  ↗️
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
