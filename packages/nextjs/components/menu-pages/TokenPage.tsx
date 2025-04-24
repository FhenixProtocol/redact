import React, { useMemo } from "react";
import { HashLink } from "../HashLink";
import { TransactionHistory } from "../TransactionHistory";
import { BalanceDisplay } from "../ui/BalanceDisplay";
import { Button } from "../ui/Button";
import { DisplayValue } from "../ui/DisplayValue";
import { EncryptedBalance } from "../ui/EncryptedValue";
import { PublicBalance } from "../ui/PublicBalance";
import { Separator } from "../ui/Separator";
import { TokenIcon } from "../ui/TokenIcon";
import { FheTypes } from "cofhejs/web";
import { MoveDownLeft, MoveUpRight } from "lucide-react";
import { getConfidentialSymbol } from "~~/lib/common";
import { useDecryptValue } from "~~/services/store/decrypted";
import { DrawerPageName, useDrawerPushPage } from "~~/services/store/drawerStore";
import {
  ConfidentialTokenPair,
  ConfidentialTokenPairBalances,
  useConfidentialTokenPair,
  useConfidentialTokenPairBalances,
} from "~~/services/store/tokenStore";

export function TokenPage({ pairAddress }: { pairAddress: string | undefined }) {
  const pair = useConfidentialTokenPair(pairAddress);
  const balances = useConfidentialTokenPairBalances(pairAddress);

  if (pair == null || pairAddress == null)
    return (
      <div className="p-4 pb-0 flex flex-col gap-4 h-full">
        <div className="text-3xl text-primary font-semibold mb-12">Token not found / provided</div>
      </div>
    );

  return (
    <div className="flex flex-col gap-6 h-full">
      <TokenHeader pair={pair} />
      <TokenTotalBalance pair={pair} balances={balances} />
      <TokenBalances pair={pair} balances={balances} />
      <TokenSendReceive pair={pair} />
      <TokenHistory pair={pair} />
    </div>
  );
}

const TokenHeader = ({ pair }: { pair: ConfidentialTokenPair }) => {
  return (
    <div className="flex flex-row items-center gap-4">
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
            <div className="whitespace-pre font-reddit-mono text-primary italic text-sm">(not deployed)</div>
          )}
        </div>
      </div>
    </div>
  );
};

const TokenTotalBalance = ({
  pair,
  balances,
}: {
  pair: ConfidentialTokenPair;
  balances: ConfidentialTokenPairBalances | undefined;
}) => {
  const { value: decryptedBalance } = useDecryptValue(FheTypes.Uint128, balances?.confidentialBalance);

  const totalBalance = useMemo(() => {
    return (balances?.publicBalance ?? 0n) + (decryptedBalance != null ? decryptedBalance : 0n);
  }, [decryptedBalance, balances?.publicBalance]);

  return (
    <div className="flex flex-col items-start">
      <div className="text-sm text-primary font-semibold ml-1">Total amount:</div>
      <BalanceDisplay balance={totalBalance} decimals={pair.publicToken.decimals} className="text-xl" left />
    </div>
  );
};

const TokenBalances = ({
  pair,
  balances,
}: {
  pair: ConfidentialTokenPair;
  balances: ConfidentialTokenPairBalances;
}) => {
  return (
    <div className="flex flex-row items-center w-full bg-primary-foreground rounded-4xl p-4 gap-4">
      <div className="flex flex-col flex-1 gap-2">
        <div className="flex flex-row gap-1">
          <TokenIcon token={pair.publicToken} size={24} />
          <DisplayValue value={pair.publicToken.symbol} left />
        </div>

        <div className="flex flex-row justify-between text-primary items-center">
          <PublicBalance balance={balances.publicBalance} decimals={pair.publicToken.decimals} className="w-full" />
        </div>

        <Button variant="outline" size="sm" className="w-min">
          ENCRYPT
        </Button>
      </div>
      <Separator orientation="vertical" />
      <div className="flex flex-col flex-1 gap-2">
        <div className="flex flex-row gap-1">
          <TokenIcon token={pair.confidentialToken} size={24} confidential />
          <DisplayValue value={getConfidentialSymbol(pair)} left />
        </div>

        <div className="flex flex-row justify-end">
          <EncryptedBalance
            ctHash={balances.confidentialBalance}
            decimals={pair.confidentialToken?.decimals}
            className="w-full"
          />
        </div>

        <Button variant="outline" size="sm" className="w-min" disabled={pair.confidentialToken == null}>
          DECRYPT
        </Button>
      </div>
    </div>
  );
};

const TokenSendReceive = ({ pair }: { pair: ConfidentialTokenPair }) => {
  const pushPage = useDrawerPushPage();

  return (
    <div className="flex gap-4 w-full">
      <Button
        variant="surface"
        className="min-w-36 justify-center font-bold flex-1"
        size="lg"
        iconSize="lg"
        icon={MoveUpRight}
        onClick={() => pushPage({ page: DrawerPageName.Send, pairAddress: pair.publicToken.address })}
      >
        SEND
      </Button>

      <Button
        variant="surface"
        className="min-w-36 justify-center font-bold flex-1"
        size="lg"
        iconSize="lg"
        icon={MoveDownLeft}
        onClick={() => pushPage({ page: DrawerPageName.Receive, pairAddress: pair.publicToken.address })}
      >
        RECEIVE
      </Button>
    </div>
  );
};

const TokenHistory = ({ pair }: { pair: ConfidentialTokenPair }) => {
  return (
    <div className="flex flex-col gap-4 flex-grow overflow-hidden">
      <div className="text-lg text-primary font-semibold">{pair.publicToken.symbol} history:</div>
      <Separator />
      <TransactionHistory pair={pair} />
    </div>
  );
};
