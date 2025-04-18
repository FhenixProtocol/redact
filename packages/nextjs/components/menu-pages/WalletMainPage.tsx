"use client";

import React, { useState } from "react";
import { ReceivePage } from "./ReceivePage";
import { SendPage } from "./SendPage";
import { Luggage, MoveDownLeft, MoveUpRight, PlusIcon } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { DrawerChildProps } from "~~/components/Drawer";
import { Button } from "~~/components/ui/Button";
import { TokenAccordion2, TokenAccordionItem } from "~~/components/ui/FnxAccordion";
import { useClaimFherc20Action } from "~~/hooks/useDecryptActions";
import { customFormatEther, truncateAddress } from "~~/lib/common";
import { ClaimWithAddresses, useAllClaims } from "~~/services/store/claim";
import { useGlobalState } from "~~/services/store/store";
import { useConfidentialTokenPair, useConfidentialTokenPairAddresses } from "~~/services/store/tokenStore2";

/**
 * Main panel that shows the user's balance and has buttons for "Send" or "Receive."
 * Clicking these buttons pushes a new page into the drawer.
 */
export function WalletMainPanel({ pushPage }: DrawerChildProps) {
  const { address } = useAccount();
  const { setAddTokenModalOpen, toggleDrawer } = useGlobalState();

  // const { tokenBalances } = useAllTokenBalances(address);
  const {
    data: balanceData,
    isError,
    isLoading: balanceLoading,
  } = useBalance({
    address,
  });
  const [isManageTokensOpen, setIsManageTokensOpen] = useState(false);

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

  // Balance display
  let balanceText = "Loading...";
  if (!balanceLoading) {
    if (isError || !balanceData) {
      balanceText = "Error fetching balance";
    } else {
      balanceText = `${customFormatEther(balanceData.value, 4)} ${balanceData.symbol}`;
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xxl font-bold text-primary self-center">{balanceText}</div>

      <div className="flex gap-2 justify-center">
        <Button
          variant="surface"
          className="min-w-36 justify-center font-bold"
          size="md"
          icon={MoveUpRight}
          onClick={handleSend}
        >
          SEND
        </Button>

        <Button
          variant="surface"
          className="min-w-36 justify-center font-bold"
          size="md"
          icon={MoveDownLeft}
          onClick={handleReceive}
        >
          RECEIVE
        </Button>
      </div>
      <div>
        <TokenAccordion2>
          <TokenAccordionTokens />
          <div className="flex flex-col gap-2 justify-center w-full">
            <Button
              variant="ghost2"
              noOutline={true}
              icon={PlusIcon}
              className="w-full"
              onClick={() => {
                setAddTokenModalOpen(true);
                toggleDrawer();
              }}
            >
              Add Token
            </Button>

            {/* <AnimatePresence>
              {isManageTokensOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <AddToken onClose={() => setIsManageTokensOpen(false)} />
                </motion.div>
              )}
            </AnimatePresence> */}
          </div>
        </TokenAccordion2>
      </div>

      <ClaimsList />
    </div>
  );
}

const TokenAccordionTokens = () => {
  const addresses = useConfidentialTokenPairAddresses();
  return addresses.map(address => {
    return <TokenAccordionItem key={address} pairAddress={address} />;
  });
};

const ClaimsList = () => {
  const claims = useAllClaims();
  return (
    <>
      <div className="flex flex-row justify-between">
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
