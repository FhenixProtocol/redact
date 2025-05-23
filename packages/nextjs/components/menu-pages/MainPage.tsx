"use client";

import React, { useMemo, useState } from "react";
import { TransactionHistory } from "../TransactionHistory";
import { BalanceBar } from "../ui/BalanceBar";
import { TokenIcon } from "../ui/TokenIcon";
import { MoveDownLeft, MoveUpRight, PlusIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { useBalance } from "wagmi";
import { Button } from "~~/components/ui/Button";
import { FheTypes } from "~~/hooks/useCofhe";
import { formatTokenAmount } from "~~/lib/common";
import { cn } from "~~/lib/utils";
import { usePairClaims } from "~~/services/store/claim";
import { useDecryptValue } from "~~/services/store/decrypted";
import { DrawerPageName, useDrawerPushPage, useSetDrawerOpen } from "~~/services/store/drawerStore";
import { useGlobalState } from "~~/services/store/store";
import {
  useConfidentialTokenPair,
  useConfidentialTokenPairAddresses,
  useConfidentialTokenPairBalances,
} from "~~/services/store/tokenStore";

/**
 * Main panel that shows the user's balance and has buttons for "Send" or "Receive."
 * Clicking these buttons pushes a new page into the drawer.
 */
export function WalletMainPanel() {
  const [selectedTab, setSelectedTab] = useState<"tokens" | "history">("tokens");

  return (
    <div className="flex flex-col h-full gap-2">
      <EthBalanceRow />
      <SendReceiveButtonsRow />
      <TabRow selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <div className="flex flex-col gap-4 flex-grow overflow-hidden">
        {selectedTab === "tokens" && <Tokens />}
        {selectedTab === "history" && <TransactionHistory />}
        {/* <ClaimsList /> */}
      </div>
      {selectedTab === "tokens" && <AddTokenRow />}
    </div>
  );
}

const EthBalanceRow = () => {
  const { address: account } = useAccount();
  const { data: ethBalance } = useBalance({
    address: account,
  });
  return (
    <div className="pl-4 pt-0 text-3xl font-bold text-primary mb-3">
      {formatTokenAmount(ethBalance?.value ?? 0n, 18)} ETH
    </div>
  );
};

const SendReceiveButtonsRow = () => {
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
          pushPage({ page: DrawerPageName.Send, pairAddress: undefined });
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
        onClick={() => pushPage({ page: DrawerPageName.Receive, pairAddress: undefined })}
      >
        RECEIVE
      </Button>
    </div>
  );
};

const TabRow = ({
  selectedTab,
  setSelectedTab,
}: {
  selectedTab: "tokens" | "history";
  setSelectedTab: (tab: "tokens" | "history") => void;
}) => {
  return (
    <div className="flex flex-row w-full my-4">
      <Button
        variant="ghost"
        className={cn(
          "flex-1 justify-center rounded-none text-primary border-b-2 border-transparent font-normal",
          selectedTab === "tokens" && "border-primary-accent font-bold",
        )}
        size="md"
        noOutline
        onClick={() => setSelectedTab("tokens")}
      >
        Tokens
      </Button>
      <Button
        variant="ghost"
        className={cn(
          "flex-1 justify-center rounded-none text-primary border-b-2 border-transparent font-normal",
          selectedTab === "history" && "border-primary-accent font-bold",
        )}
        size="md"
        noOutline
        onClick={() => setSelectedTab("history")}
      >
        History
      </Button>
    </div>
  );
};

const Tokens = () => {
  const addresses = useConfidentialTokenPairAddresses();
  return (
    <div className="flex flex-col gap-4 overflow-x-hidden overflow-y-auto styled-scrollbar">
      <BalanceBarKey />
      {addresses.map(address => {
        return <TokenRowItem key={address} pairAddress={address} />;
      })}
    </div>
  );
};

const BalanceBarKey = () => {
  return (
    <div className="flex flex-row gap-4 text-xs items-center text-primary">
      {/* Optional: sticky top-0 bg-background */}
      <div className="text-sm font-semibold">Balance Legend:</div>
      <div className="flex flex-row gap-1 items-center text-sm font-semibold">
        <div className="w-3 h-3 rounded-[3px] bg-[linear-gradient(to_right,var(--color-blue-200)_50%,var(--color-info-500)_50%)]"></div>
        <span>Public</span>
      </div>
      <div className="flex flex-row gap-1 items-center text-sm font-semibold">
        <div className="w-3 h-3 bg-success-500 rounded-[3px]" />
        <span>Claimable</span>
      </div>
      <div className="flex flex-row gap-1 items-center text-sm font-semibold">
        <div className="w-3 h-3 bg-info-900 rounded-[3px]" />
        <span>Confidential</span>
      </div>
    </div>
  );
};

const TokenRowItem = ({ pairAddress }: { pairAddress: string }) => {
  const pair = useConfidentialTokenPair(pairAddress);
  const balances = useConfidentialTokenPairBalances(pairAddress);
  const fragmentedPair = useConfidentialTokenPair(pair?.fragmentedPair);
  const fragmentedBalances = useConfidentialTokenPairBalances(fragmentedPair?.publicToken.address);
  const pushPage = useDrawerPushPage();
  const pairClaims = usePairClaims(pair?.publicToken.address);
  const fragmentedBalance = fragmentedBalances?.publicBalance ?? 0n;

  const { value: decryptedBalance } = useDecryptValue(FheTypes.Uint128, balances?.confidentialBalance);
  const totalBalance = useMemo(() => {
    if (decryptedBalance == null) return -1n;
    return (
      (balances?.publicBalance ?? 0n) + decryptedBalance + (pairClaims?.totalDecryptedAmount ?? 0n) + fragmentedBalance
    );
  }, [decryptedBalance, balances?.publicBalance, pairClaims?.totalDecryptedAmount, fragmentedBalance]);

  if (pair == null) return null;
  if (pair.isWETH) return null;

  return (
    <Button
      variant="ghost"
      noOutline
      className={cn(
        "rounded-2xl flex flex-col items-start p-2 w-full text-primary font-normal group",
        "bg-surface-alt",
      )}
      onClick={() => {
        pushPage({
          page: DrawerPageName.Token,
          pairAddress: pairAddress,
        });
      }}
    >
      <div className="flex flex-row flex-grow gap-2 w-full items-center text-md font-bold p-2">
        <TokenIcon size={24} publicToken={pair.publicToken} />
        <div className="flex-grow text-start">
          {pair.publicToken.symbol} {fragmentedPair && ` / ${fragmentedPair.publicToken.symbol}`}
        </div>
        <div className="items-end">
          {totalBalance < 0 ? "N/A" : formatTokenAmount(totalBalance, pair.publicToken.decimals)}
        </div>
      </div>
      <div className="flex flex-col items-start relative w-full">
        <BalanceBar
          publicBalance={balances?.publicBalance ?? 0n}
          confidentialBalance={balances?.confidentialBalance ?? 0n}
          claimableAmount={pairClaims?.totalDecryptedAmount ?? 0n}
          decimals={pair.publicToken.decimals}
          showBalance={false}
          fragmentedBalance={fragmentedBalance}
        />
      </div>
    </Button>
  );
};

const AddTokenRow = () => {
  const { setAddTokenModalOpen } = useGlobalState();
  const setDrawerOpen = useSetDrawerOpen();

  const handleAddToken = () => {
    setAddTokenModalOpen(true);
    setDrawerOpen(false);
  };

  return (
    <div className="flex flex-row w-full -mb-4">
      <Button
        variant="ghost"
        noOutline
        icon={PlusIcon}
        size="md"
        onClick={handleAddToken}
        className="w-full text-left font-semibold text-md text-primary-accent mt-2"
      >
        Add Token
      </Button>
    </div>
  );
};
