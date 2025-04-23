"use client";

import React, { useCallback, useRef } from "react";
import { Wallet } from "lucide-react";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { Button } from "~~/components/ui/Button";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { truncateAddress } from "~~/lib/common";
import { useSetDrawerOpen } from "~~/services/store/drawerStore";

export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const { address, isConnected } = useAccount();
  const setDrawerOpen = useSetDrawerOpen();

  const burgerMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    burgerMenuRef,
    useCallback(() => {
      setDrawerOpen(false);
    }, []),
  );

  return (
    <header className="flex items-center justify-between p-4 bg-card-bg">
      <div className="flex items-center gap-4">
        <div className="logo" aria-label="Logo" />
      </div>
      <div>
        <Button
          variant="surface"
          className="rounded-md button-shadow"
          noOutline={true}
          onClick={() => setDrawerOpen(true)}
        >
          <Wallet className="w-4 h-4" />
          {isConnected ? truncateAddress(address!) : "Connect Wallet"}
        </Button>
      </div>
    </header>
  );
};
