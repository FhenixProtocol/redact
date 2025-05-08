"use client";

import React, { useCallback, useRef } from "react";
import { Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "~~/components/ui/Button";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import { truncateAddress } from "~~/lib/common";
import { useSetDrawerOpen } from "~~/services/store/drawerStore";

export const Header = () => {
  const { address, isConnected } = useAccount();
  const setDrawerOpen = useSetDrawerOpen();

  const burgerMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    burgerMenuRef,
    useCallback(() => {
      setDrawerOpen(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return (
    <header className="flex items-center justify-between p-4 bg-card-bg backdrop-blur-[2px]">
      <div className="flex items-center gap-4">
        <div className="logo h-[28px] md:h-[50px]" aria-label="Logo" />
      </div>
      <div>
        <Button
          variant="surface"
          className="rounded-md button-shadow px-2 md:px-4 py-1 md:py-2 h-[28px] md:h-[50px]"
          noOutline={true}
          onClick={() => setDrawerOpen(true)}
        >
          <Wallet className="w-4 h-4" />
          <span className="text-sm md:text-lg">
            {isConnected && address != null ? truncateAddress(address) : "Connect Wallet"}
          </span>
        </Button>
      </div>
    </header>
  );
};
