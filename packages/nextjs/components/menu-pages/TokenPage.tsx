import React, { useMemo } from "react";
import { HashLink } from "../HashLink";
import { TransactionHistory } from "../TransactionHistory";
import { Button } from "../ui/Button";
import { CleartextBalance } from "../ui/CleartextBalance";
import { DisplayBalance } from "../ui/DisplayBalance";
import { DisplayValue } from "../ui/DisplayValue";
import { EncryptedBalance } from "../ui/EncryptedValue";
import { Separator } from "../ui/Separator";
import { Spinner } from "../ui/Spinner";
import { TokenIcon } from "../ui/TokenIcon";
import { TokenIconSymbol } from "../ui/TokenIconSymbol";
import { ArrowBack } from "@mui/icons-material";
import { FheTypes } from "cofhejs/web";
import { MoveDownLeft, MoveUpRight, X } from "lucide-react";
import toast from "react-hot-toast";
import { useClaimAllAction } from "~~/hooks/useDecryptActions";
import { getConfidentialSymbol } from "~~/lib/common";
import { usePairClaims } from "~~/services/store/claim";
import { useDecryptValue } from "~~/services/store/decrypted";
import {
  DrawerPageName,
  useDrawerBackButtonAction,
  useDrawerPushPage,
  useSetDrawerOpen,
} from "~~/services/store/drawerStore";
import { useEncryptDecryptSetIsEncrypt, useSelectEncryptDecryptToken } from "~~/services/store/encryptDecrypt";
import {
  ConfidentialTokenPair,
  ConfidentialTokenPairBalances,
  useConfidentialTokenPair,
  useConfidentialTokenPairBalances,
  useIsArbitraryToken,
  useRemoveArbitraryToken,
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
      <TokenTotalBalanceRow pair={pair} balances={balances} />
      <TokenBalancesRow pair={pair} balances={balances} />
      <TokenClaimRow pair={pair} />
      <TokenSendReceiveRow pair={pair} />
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

const TokenTotalBalanceRow = ({
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
      <DisplayBalance balance={totalBalance} decimals={pair.publicToken.decimals} className="text-xl" left />
    </div>
  );
};

const TokenBalancesRow = ({
  pair,
  balances,
}: {
  pair: ConfidentialTokenPair;
  balances: ConfidentialTokenPairBalances;
}) => {
  const setIsEncrypt = useEncryptDecryptSetIsEncrypt();
  const setToken = useSelectEncryptDecryptToken();
  const setDrawerOpen = useSetDrawerOpen();
  const handleEncryptDecrypt = (isEncrypt: boolean) => {
    setIsEncrypt(isEncrypt);
    setToken(pair.publicToken.address);
    setDrawerOpen(false);
  };

  return (
    <div className="flex flex-row items-center w-full bg-primary-foreground rounded-4xl p-4 gap-4">
      <div className="flex flex-col flex-1 gap-2">
        <div className="flex flex-row gap-1">
          <TokenIcon token={pair.publicToken} size={24} />
          <DisplayValue value={pair.publicToken.symbol} left />
        </div>

        <div className="flex flex-row justify-between text-primary items-center">
          <CleartextBalance balance={balances.publicBalance} decimals={pair.publicToken.decimals} className="w-full" />
        </div>

        <Button variant="outline" size="sm" className="w-min" onClick={() => handleEncryptDecrypt(true)}>
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

        <Button
          variant="outline"
          size="sm"
          className="w-min"
          disabled={pair.confidentialToken == null}
          onClick={() => handleEncryptDecrypt(false)}
        >
          DECRYPT
        </Button>
      </div>
    </div>
  );
};

const TokenClaimRow = ({ pair }: { pair: ConfidentialTokenPair }) => {
  const pairClaims = usePairClaims(pair.publicToken.address);
  const { onClaimAll, isClaiming } = useClaimAllAction();

  if (pairClaims == null) return null;
  if (pairClaims.totalRequestedAmount === 0n) return null;

  const isPending = pairClaims.totalPendingAmount > 0n;
  const isClaimable = pairClaims.totalDecryptedAmount > 0n;

  const handleClaim = () => {
    if (isClaiming) return;
    if (!isClaimable) return;

    if (pair == null) {
      toast.error("No token selected");
      return;
    }
    if (pair.confidentialToken == null) {
      toast.error("No confidential token deployed");
      return;
    }

    onClaimAll({
      publicTokenSymbol: pair.publicToken.symbol,
      publicTokenAddress: pair.publicToken.address,
      confidentialTokenAddress: pair.confidentialToken.address,
      claimAmount: pairClaims.totalDecryptedAmount,
    });
  };

  return (
    <div className="flex flex-row items-center w-full bg-primary-foreground rounded-4xl p-4 gap-4">
      <div className="flex flex-col flex-1 gap-2">
        <div className="flex flex-row gap-2 items-center">
          <MoveDownLeft className="w-6 h-6 text-primary" />
          <div className="text-primary text-lg font-semibold">Claim {isClaimable ? "Available" : "Pending"}</div>
        </div>

        <div className="flex flex-row gap-2 justify-between items-center">
          <TokenIconSymbol token={pair.publicToken} />

          <div className="flex flex-row gap-2 items-center justify-center">
            {isPending && (
              <div className="flex flex-row items-center text-warning-500 italic font-reddit-mono">
                <span>(+</span>
                <DisplayBalance
                  balance={pairClaims.totalPendingAmount}
                  decimals={pair.publicToken.decimals}
                  className="font-normal"
                />
                <Spinner className="w-4 h-4" size={20} />
                <span>)</span>
              </div>
            )}
            {isClaimable && (
              <DisplayBalance balance={pairClaims.totalDecryptedAmount} decimals={pair.publicToken.decimals} left />
            )}
            <Button variant="default" size="md" className="w-min" disabled={!isClaimable} onClick={handleClaim}>
              CLAIM
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TokenSendReceiveRow = ({ pair }: { pair: ConfidentialTokenPair }) => {
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

export const TokenPageButtonFooter = ({ pairAddress }: { pairAddress: string | undefined }) => {
  const pair = useConfidentialTokenPair(pairAddress);
  const isArbitraryToken = useIsArbitraryToken(pairAddress);
  const backAction = useDrawerBackButtonAction();
  const removeArbitraryToken = useRemoveArbitraryToken(pairAddress);

  const handleRemove = () => {
    if (pair == null) return;
    backAction();
    removeArbitraryToken();
  };

  return (
    <div className="flex flex-row gap-4">
      <Button size="md" iconSize="lg" variant="surface" className="flex-1" icon={ArrowBack} onClick={backAction}>
        Back
      </Button>
      {isArbitraryToken && (
        <Button size="md" iconSize="lg" variant="destructive" className="flex-1" icon={X} onClick={handleRemove}>
          Remove
        </Button>
      )}
    </div>
  );
};
