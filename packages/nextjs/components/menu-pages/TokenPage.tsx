import React, { useMemo } from "react";
import { HashLink } from "../HashLink";
import { TransactionHistory } from "../TransactionHistory";
import { BalanceBar } from "../ui/BalanceBar";
import { Button } from "../ui/Button";
import { CleartextBalance } from "../ui/CleartextBalance";
import { ConfirmButton } from "../ui/ConfirmButton";
import { DisplayBalance } from "../ui/DisplayBalance";
import { EncryptedBalance } from "../ui/EncryptedValue";
import { Separator } from "../ui/Separator";
import { TokenIconSymbol } from "../ui/TokenIconSymbol";
import { ArrowBack } from "@mui/icons-material";
import { FheTypes } from "cofhejs/web";
import { MoveDownLeft, MoveUpRight, X } from "lucide-react";
import toast from "react-hot-toast";
import { useClaimAllAction } from "~~/hooks/useDecryptActions";
import { ETH_ADDRESS } from "~~/lib/common";
import { cn } from "~~/lib/utils";
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
  const fragmentedPair = useConfidentialTokenPair(pair?.fragmentedPair);
  const fragmentedBalances = useConfidentialTokenPairBalances(pair?.fragmentedPair);

  if (pair == null || pairAddress == null)
    return (
      <div className="p-4 pb-0 flex flex-col gap-4 h-full">
        <div className="text-3xl text-primary font-semibold mb-12">Token not found / provided</div>
      </div>
    );

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="bg-surface-alt p-sm rounded-xl ">
        <TokenHeader pair={pair} balances={balances} fragmentedBalances={fragmentedBalances} className="mb-4" />
        {/* <TokenTotalBalanceRow pair={pair} balances={balances} /> */}
        <TokenBalancesSection pair={pair} fragmentedPair={fragmentedPair} balances={balances} />
      </div>
      <TokenSendReceiveRow pair={pair} />
      <TokenHistory pair={pair} />
    </div>
  );
}

const TokenHeader = ({
  pair,
  balances,
  fragmentedBalances,
  className,
}: {
  pair: ConfidentialTokenPair;
  balances: ConfidentialTokenPairBalances;
  fragmentedBalances: ConfidentialTokenPairBalances | undefined;
  className?: string;
}) => {
  const pairClaims = usePairClaims(pair?.publicToken.address ?? "");
  //const { onClaimAll, isClaiming } = useClaimAllAction();

  return (
    <div className={cn("flex flex-col items-start relative w-full", className)}>
      <TokenTotalBalanceRow pair={pair} balances={balances} />
      <BalanceBar
        publicBalance={balances?.publicBalance ?? 0n}
        confidentialBalance={balances?.confidentialBalance ?? 0n}
        claimableAmount={pairClaims?.totalDecryptedAmount ?? 0n}
        decimals={pair.publicToken.decimals}
        showBalance={false}
        infoRowPosition="bottom"
        fragmentedBalance={fragmentedBalances?.publicBalance ?? 0n}
      />
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
  const pairClaims = usePairClaims(pair?.publicToken.address);
  const fragmentedPair = useConfidentialTokenPair(pair?.fragmentedPair);
  const fragmentedBalances = useConfidentialTokenPairBalances(fragmentedPair?.publicToken.address);
  const fragmentedBalance = fragmentedBalances?.publicBalance ?? 0n;

  const totalBalance = useMemo(() => {
    if (decryptedBalance == null) return -1n;
    return (
      (balances?.publicBalance ?? 0n) + decryptedBalance + (pairClaims?.totalDecryptedAmount ?? 0n) + fragmentedBalance
    );
  }, [decryptedBalance, balances?.publicBalance, pairClaims?.totalDecryptedAmount, fragmentedBalance]);

  return (
    <div className="flex flex-col items-start">
      <div className="text-md text-primary font-semibold ml-1">Total amount:</div>
      <DisplayBalance balance={totalBalance} decimals={pair.publicToken.decimals} className="text-xl leading-lg" left />
    </div>
  );
};

const TokenBalanceRow = ({
  pair,
  balance,
  isConfidential,
  onAction,
  actionLabel,
  actionDisabled,
  legendColor,
}: {
  pair: ConfidentialTokenPair;
  balance: bigint | undefined;
  isConfidential: boolean;
  onAction: () => void;
  actionLabel: string;
  actionDisabled: boolean;
  legendColor: string;
}) => {
  const pairClaims = usePairClaims(pair?.publicToken.address ?? "");
  const tokenAddress = isConfidential ? pair.confidentialToken?.address : pair.publicToken.address;
  const isEth = tokenAddress === ETH_ADDRESS.toLowerCase();
  return (
    <div className="flex flex-row gap-2 w-full">
      <div className={cn("w-1 rounded-full", legendColor)}></div>
      <div className="flex flex-col flex-1 gap-0">
        <div className="flex flex-row flex-1 gap-2">
          <TokenIconSymbol
            className="flex-grow"
            publicToken={pair.publicToken}
            confidentialToken={isConfidential ? pair.confidentialToken : undefined}
            isConfidential={isConfidential}
          />
          <div className="flex flex-row justify-end">
            {isConfidential ? (
              <EncryptedBalance
                ctHash={balance}
                decimals={pair.confidentialToken?.decimals}
                className="text-left min-w-[10px] text-lg"
                showIcon={false}
              />
            ) : (
              <div className="flex flex-row gap-1 items-center">
                {!pair.isWETH && pairClaims && (pairClaims?.totalDecryptedAmount ?? 0n) > 0n && (
                  <>
                    <CleartextBalance
                      balance={pairClaims.totalDecryptedAmount}
                      decimals={pair.publicToken.decimals}
                      className="text-left min-w-[10px] text-lg text-success-500"
                      showIcon={false}
                    />
                    <span>/</span>
                  </>
                )}
                <CleartextBalance
                  balance={balance}
                  decimals={pair.publicToken.decimals}
                  className="text-left min-w-[10px] text-lg"
                  showIcon={false}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-row flex-1 items-center gap-2">
          <div className="flex-grow">
            {!isEth && <HashLink extraShort type="token" hash={tokenAddress ?? ""} copyable />}
          </div>
          <div className="flex flex-row gap-2">
            {!isConfidential && !pair.isWETH && <TokenClaimButton pair={pair} />}
            <Button variant="outline" size="sm" className="w-min" disabled={actionDisabled} onClick={onAction}>
              {actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TokenBalancesSection = ({
  pair,
  fragmentedPair,
  balances,
}: {
  pair: ConfidentialTokenPair;
  fragmentedPair: ConfidentialTokenPair | undefined;
  balances: ConfidentialTokenPairBalances;
}) => {
  const setIsEncrypt = useEncryptDecryptSetIsEncrypt();
  const setToken = useSelectEncryptDecryptToken();
  const setDrawerOpen = useSetDrawerOpen();
  const decryptedBalance = useDecryptValue(FheTypes.Uint128, balances.confidentialBalance);
  const fragmentedBalances = useConfidentialTokenPairBalances(fragmentedPair?.publicToken.address);

  const handleEncryptDecrypt = (isEncrypt: boolean) => {
    setIsEncrypt(isEncrypt);
    setToken(pair.publicToken.address);
    setDrawerOpen(false);
  };

  return (
    <div className="flex flex-col w-full gap-4">
      <TokenBalanceRow
        pair={pair}
        balance={balances.publicBalance}
        isConfidential={false}
        onAction={() => handleEncryptDecrypt(true)}
        actionLabel="ENCRYPT"
        actionDisabled={balances.publicBalance == 0n}
        legendColor="bg-blue-200"
      />
      {fragmentedPair && (
        <TokenBalanceRow
          pair={fragmentedPair}
          balance={fragmentedBalances?.publicBalance ?? 0n}
          isConfidential={false}
          onAction={() => handleEncryptDecrypt(true)}
          actionLabel="ENCRYPT"
          actionDisabled={fragmentedBalances?.publicBalance == 0n}
          legendColor="bg-info-500"
        />
      )}

      <TokenBalanceRow
        pair={pair}
        balance={balances.confidentialBalance}
        isConfidential={true}
        onAction={() => handleEncryptDecrypt(false)}
        actionLabel="DECRYPT"
        actionDisabled={pair.confidentialToken == null || decryptedBalance.value == 0n}
        legendColor="bg-info-900"
      />
    </div>
  );
};

const TokenClaimButton = ({ pair }: { pair: ConfidentialTokenPair }) => {
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
      tokenDecimals: pair.publicToken.decimals,
    });
  };

  return (
    <Button
      variant="default"
      size="sm"
      className="w-min bg-success-500"
      disabled={!isClaimable || isClaiming}
      onClick={handleClaim}
    >
      {isPending ? "PENDING..." : isClaiming ? "CLAIMING..." : "CLAIM"}
    </Button>
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
        onClick={() => {
          pushPage({ page: DrawerPageName.Send, pairAddress: pair.publicToken.address });
        }}
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
        <ConfirmButton
          size="md"
          iconSize="lg"
          variant="destructive"
          className="flex-1"
          icon={X}
          onConfirm={handleRemove}
          confirmText="Remove"
          cancelText="Cancel"
        >
          Remove
        </ConfirmButton>
      )}
    </div>
  );
};
