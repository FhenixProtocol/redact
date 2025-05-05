"use client";

import React, { useMemo, useState } from "react";
import { TransactionHistory } from "../TransactionHistory";
import { DisplayBalance } from "../ui/DisplayBalance";
import { DisplayValue } from "../ui/DisplayValue";
import { TokenIcon } from "../ui/TokenIcon";
import { ChevronRight, MoveDownLeft, MoveUpRight, PlusIcon } from "lucide-react";
import { Button } from "~~/components/ui/Button";
import { FheTypes } from "~~/hooks/useCofhe";
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
      <div className="flex flex-col flex-grow overflow-hidden">
        {selectedTab === "tokens" && <Tokens />}
        {selectedTab === "history" && <TransactionHistory />}
        {/* <ClaimsList /> */}
      </div>
      {selectedTab === "tokens" && <AddTokenRow />}
    </div>
  );
}

const EthBalanceRow = () => {
  return <div className="text-xxl font-bold text-primary self-center">TODO: ETH BAL</div>;
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
  return addresses.map((address, i) => {
    return <TokenRowItem key={address} pairAddress={address} index={i} />;
  });
};

const TokenRowItem = ({ pairAddress, index }: { pairAddress: string; index: number }) => {
  const pair = useConfidentialTokenPair(pairAddress);
  const balances = useConfidentialTokenPairBalances(pairAddress);
  const pushPage = useDrawerPushPage();
  const pairClaims = usePairClaims(pair?.publicToken.address);
  const isClaimable = (pairClaims?.totalDecryptedAmount ?? 0n) > 0n;

  const { value: decryptedBalance } = useDecryptValue(FheTypes.Uint128, balances?.confidentialBalance);
  const totalBalance = useMemo(() => {
    if (decryptedBalance == null) return -1n;
    return (balances?.publicBalance ?? 0n) + (decryptedBalance != null ? decryptedBalance : 0n);
  }, [decryptedBalance, balances?.publicBalance]);

  if (pair == null) return null;

  return (
    <Button
      variant="ghost"
      noOutline
      className={cn(
        "rounded-none flex flex-row items-center p-2 w-full text-primary font-normal py-4",
        index % 2 === 0 && "bg-surface",
      )}
      onClick={() => {
        pushPage({
          page: DrawerPageName.Token,
          pairAddress: pairAddress,
        });
      }}
    >
      <div className="flex flex-row flex-grow gap-2 items-center">
        <TokenIcon publicToken={pair.publicToken} />
        <div className="flex flex-col items-start">
          <DisplayValue value={pair.publicToken.symbol} left />
        </div>
        {isClaimable && (
          <div className="flex flex-col items-end text-xs text-primary-accent font-reddit-sans">(Claim available)</div>
        )}
      </div>
      <div className="flex flex-col items-end">
        <DisplayBalance balance={totalBalance} decimals={pair.publicToken.decimals} className="text-md" left />
      </div>
      <div className="text-xs text-primary">
        <ChevronRight className="w-4 h-4" />
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
