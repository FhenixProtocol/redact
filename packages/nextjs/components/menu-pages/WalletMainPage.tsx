"use client";

import React, { useState } from "react";
import { ReceivePage } from "./ReceivePage";
import { SendPage } from "./SendPage";
import { MoveDownLeft, MoveUpRight, PlusIcon } from "lucide-react";
import { useAccount, useBalance } from "wagmi";
import { DrawerChildProps } from "~~/components/Drawer";
import { Button } from "~~/components/ui/Button";
import { TokenAccordion2, TokenAccordionItem } from "~~/components/ui/FnxAccordion";
import { customFormatEther, truncateAddress } from "~~/lib/common";
import { useGlobalState } from "~~/services/store/store";
import { useConfidentialTokenPairAddresses } from "~~/services/store/tokenStore2";

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
    </div>
  );
}

const TokenAccordionTokens = () => {
  const addresses = useConfidentialTokenPairAddresses();
  return addresses.map(address => {
    return <TokenAccordionItem key={address} pairAddress={address} />;
  });
};
