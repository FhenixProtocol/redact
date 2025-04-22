"use client";

import React, { useState } from "react";
import { Accordion } from "../ui/Accordion";
import { EncryptedBalance } from "../ui/EncryptedValue";
import { DisplayValue } from "../ui/NumericValue";
import { TokenIcon } from "../ui/TokenIcon";
import { ReceivePage } from "./ReceivePage";
import { SendPage } from "./SendPage";
import { Luggage, MoveDownLeft, MoveUpRight } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { DrawerChildProps } from "~~/components/Drawer";
import { Button } from "~~/components/ui/Button";
import { Separator } from "~~/components/ui/Separator";
import { useClaimFherc20Action } from "~~/hooks/useDecryptActions";
import { truncateAddress } from "~~/lib/common";
import { cn } from "~~/lib/utils";
import { ClaimWithAddresses, useAllClaims } from "~~/services/store/claim";
import {
  useConfidentialTokenPair,
  useConfidentialTokenPairAddresses,
  useConfidentialTokenPairBalances,
  useIsArbitraryToken,
} from "~~/services/store/tokenStore";

/**
 * Main panel that shows the user's balance and has buttons for "Send" or "Receive."
 * Clicking these buttons pushes a new page into the drawer.
 */
export function WalletMainPanel({ pushPage }: DrawerChildProps) {
  const [selectedTab, setSelectedTab] = useState<"tokens" | "history">("tokens");

  return (
    <div className="flex flex-col gap-2">
      <EthBalanceRow />
      <SendReceiveButtonsRow pushPage={pushPage} />
      <TabRow selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <Separator />
      <div>
        <Tokens />
        {/* <ClaimsList /> */}
      </div>
    </div>
  );
}

const EthBalanceRow = () => {
  return <div className="text-xxl font-bold text-primary self-center">TODO: ETH BAL</div>;
};

const SendReceiveButtonsRow = ({ pushPage }: DrawerChildProps) => {
  const { address } = useAccount();

  // Handler for "Send" -> push a new page
  const handleSend = () => {
    if (address == null) return;
    if (pushPage) {
      pushPage({
        id: "send-page",
        title: truncateAddress(address) + " Send",
        component: <SendPage />,
      });
    }
  };

  // Handler for "Receive" -> push a new page
  const handleReceive = () => {
    if (pushPage) {
      pushPage({
        id: "receive-page",
        title: "Receive",
        component: <ReceivePage />,
      });
    }
  };

  return (
    <div className="flex gap-4 w-full">
      <Button
        variant="surface"
        className="min-w-36 justify-center font-bold flex-1"
        size="lg"
        iconSize="lg"
        icon={MoveUpRight}
        onClick={handleSend}
      >
        SEND
      </Button>

      <Button
        variant="surface"
        className="min-w-36 justify-center font-bold flex-1"
        size="lg"
        iconSize="lg"
        icon={MoveDownLeft}
        onClick={handleReceive}
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
    <div className="flex justify-around">
      <Button
        variant="text"
        className={selectedTab === "tokens" ? "font-semibold underline" : ""}
        size="md"
        noOutline
        onClick={() => setSelectedTab("tokens")}
      >
        Tokens
      </Button>
      <Button
        variant="text"
        className={selectedTab === "history" ? "font-semibold underline" : ""}
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

  if (pair == null) return null;

  return (
    <Button
      variant="ghost"
      noOutline
      className={cn(
        "rounded-none flex flex-row items-center justify-between p-2 w-full text-primary font-normal",
        index % 2 === 0 && "bg-surface",
      )}
    >
      <div className="flex flex-row gap-2 items-center">
        <TokenIcon token={pair.publicToken} />
        <div className="flex flex-col items-start">
          <DisplayValue value={pair.publicToken.symbol} left />
          <DisplayValue value={pair.confidentialToken?.symbol ?? `e${pair.publicToken.symbol}`} left />
        </div>
      </div>
      <div className="flex flex-col items-end">
        <DisplayValue
          value={
            balances.publicBalance != null ? formatUnits(balances.publicBalance, pair.publicToken.decimals) : "..."
          }
        />
        {pair.confidentialTokenDeployed ? (
          <EncryptedBalance
            ctHash={balances.confidentialBalance}
            decimals={pair.confidentialToken?.decimals ?? pair.publicToken.decimals}
            className="text-right"
          />
        ) : (
          <DisplayValue value="(not deployed)" className="italic" />
        )}
      </div>
    </Button>
  );
};

const ClaimsList = () => {
  const claims = useAllClaims();
  return (
    <>
      <div className="flex flex-row justify-around">
        <div className="flex flex-row gap-2 font-semibold">Amount</div>
        <div className="flex flex-row gap-2 font-semibold">Action</div>
      </div>
      <div className="flex flex-col gap-4 w-full">
        {claims.map(claim => {
          return <ClaimItem key={claim.ctHash.toString()} claim={claim} />;
        })}
      </div>
    </>
  );
};

const ClaimItem = ({ claim }: { claim: ClaimWithAddresses }) => {
  const pair = useConfidentialTokenPair(claim.erc20Address);
  const { onClaimFherc20, isClaiming } = useClaimFherc20Action();

  if (pair == null) return null;
  if (pair.confidentialToken == null) return null;

  // TODO: Remove it from the store, not filter it out here
  if (claim.claimed) return null;

  const handleClaim = () => {
    onClaimFherc20({
      publicTokenSymbol: pair.publicToken.symbol,
      claim,
    });
  };

  return (
    <div className="flex flex-row w-full items-center justify-between">
      <div className="flex flex-row gap-2 items-center">
        <b>{formatUnits(claim.requestedAmount, pair.publicToken.decimals)}</b>
        <span className="text-sm">{pair.publicToken.symbol}</span>
      </div>
      <Button
        variant="default"
        size="xs"
        onClick={handleClaim}
        icon={claim.decrypted ? Luggage : undefined}
        disabled={isClaiming || !claim.decrypted}
      >
        {claim.decrypted ? "CLAIM" : "PENDING"}
      </Button>
    </div>
  );
};
