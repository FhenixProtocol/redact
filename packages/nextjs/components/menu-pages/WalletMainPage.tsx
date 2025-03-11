"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "~~/components/ui/Button";
import { customFormatEther, truncateAddress } from "~~/lib/common";
import { MoveUpRight, MoveDownLeft, PlusIcon, MinusIcon } from "lucide-react"; // Example icons

import { useAccount, useBalance } from "wagmi";
import { SendPage } from "./SendPage";
import { ReceivePage } from "./ReceivePage";

import { TokenAccordion, TokenData } from "~~/components/ui/FnxAccordion";
import { TokenBalanceInfo, useAllTokenBalances } from "~~/hooks/useTokenBalance";
import { AddToken } from "../AddToken";
import { useTokenStore } from '~~/services/store/tokenStore';
import { DrawerChildProps } from "~~/components/Drawer";



/**
 * Main panel that shows the user's balance and has buttons for "Send" or "Receive."
 * Clicking these buttons pushes a new page into the drawer.
 */
export function WalletMainPanel({ pushPage }: DrawerChildProps) {
  const { address } = useAccount();
  const { tokenBalances,  } = useAllTokenBalances(address)
  const { data: balanceData, isError, isLoading: balanceLoading } = useBalance({
    address,
  });
  const [isManageTokensOpen, setIsManageTokensOpen] = useState(false);
  const { removeToken } = useTokenStore();

  // const handleEncrypt = (token: TokenData) => {
  //   console.log("Encrypt", token);
  // };

  // const handleDecrypt = (token: TokenData) => {
  //   console.log("Decrypt", token);
  // };


  // Handler for "Send" -> push a new page
  const handleSend = () => {
    console.log(pushPage);
    if (pushPage) {
      pushPage({
        id: "send-page",
        title: truncateAddress(address!) + " Send",
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
      <div className="text-xxl font-bold text-primary self-center">
        {balanceText}
      </div>

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
        <TokenAccordion
          tokens={tokenBalances.map((token: TokenBalanceInfo) => ({
            symbol: token.symbol,
            publicBalance: token.publicBalance,
            privateBalance: token.privateBalance,
            icon: token.logo,
            isCustom: token.isCustom,
            address: token.address
          }))}
          editMode={isManageTokensOpen}
          onRemove={(token: string) => {
            removeToken(token);
            console.log("Remove", token);
          }}
          onEncrypt={(token: TokenData) => {
            console.log("Encrypt", token);
            // Handle encryption
          }}
          onDecrypt={(token: TokenData) => {  
            console.log("Decrypt", token);
            // Handle decryption
          }}
        >
          <div className="flex flex-col gap-2 justify-center w-full">
            <Button 
              variant="ghost2" 
              noOutline={true} 
              icon={isManageTokensOpen ? MinusIcon : PlusIcon}  
              className="w-full" 
              onClick={() => setIsManageTokensOpen(!isManageTokensOpen)}
            >
              Manage Tokens
            </Button>

            <AnimatePresence>
              {isManageTokensOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <AddToken
                    onClose={() => setIsManageTokensOpen(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TokenAccordion>

      </div>
    </div>
  );
}
