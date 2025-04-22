import React from "react";
import { HashLink } from "../HashLink";
import { TokenIcon } from "../ui/TokenIcon";
import { getConfidentialSymbol } from "~~/lib/common";
import { ConfidentialTokenPair, useConfidentialTokenPair } from "~~/services/store/tokenStore";

export function TokenPage({ pairAddress }: { pairAddress: string }) {
  const pair = useConfidentialTokenPair(pairAddress);
  if (pair == null)
    return (
      <div className="p-4 pb-0 flex flex-col gap-4 h-full">
        <div className="text-3xl text-primary font-semibold mb-12">Token not found</div>
      </div>
    );

  return (
    <div className="p-4 pb-0 flex flex-col gap-4 h-full">
      <TokenHeader pair={pair} />
      <TokenTotalBalance pair={pair} />
      <TokenBalances pair={pair} />
      <TokenSendReceive pair={pair} />
      <TokenHistory pair={pair} />
    </div>
  );
}

const TokenHeader = ({ pair }: { pair: ConfidentialTokenPair }) => {
  return (
    <div className="flex flex-row items-center mb-12 gap-4">
      <TokenIcon token={pair.publicToken} size={36} />
      <div className="flex flex-col flex-1">
        <div className="flex flex-row gap-2 items-center justify-between">
          <div className="text-lg text-primary">{pair?.publicToken.symbol}</div>
          <HashLink type="token" hash={pair.publicToken.address} copyable />
        </div>
        <div className="flex flex-row gap-2 items-center justify-between">
          <div className="text-lg text-primary">{getConfidentialSymbol(pair)}</div>
          {pair.confidentialToken?.address ? (
            <HashLink type="token" hash={pair.confidentialToken?.address} copyable />
          ) : (
            <div className="whitespace-pre font-mono text-primary italic text-sm">(not deployed)</div>
          )}
        </div>
      </div>
    </div>
  );
};

const TokenTotalBalance = ({ pair }: { pair: ConfidentialTokenPair }) => {
  return (
    <div className="flex flex-row items-center mb-12 gap-4">
      <div className="text-3xl text-primary font-semibold">Total Balance</div>
    </div>
  );
};

const TokenBalances = ({ pair }: { pair: ConfidentialTokenPair }) => {
  return (
    <div className="flex flex-row items-center mb-12 gap-4">
      <div className="text-3xl text-primary font-semibold">Balances</div>
    </div>
  );
};

const TokenSendReceive = ({ pair }: { pair: ConfidentialTokenPair }) => {
  return (
    <div className="flex flex-row items-center mb-12 gap-4">
      <div className="text-3xl text-primary font-semibold">Send / Receive</div>
    </div>
  );
};

const TokenHistory = ({ pair }: { pair: ConfidentialTokenPair }) => {
  return (
    <div className="flex flex-row items-center mb-12 gap-4">
      <div className="text-3xl text-primary font-semibold">History</div>
    </div>
  );
};
