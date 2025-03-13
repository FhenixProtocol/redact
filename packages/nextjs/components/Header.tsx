"use client";

import React, { useCallback, useRef } from "react";
import { hardhat } from "viem/chains";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";
import { truncateAddress } from "~~/lib/common";
import { Button } from "~~/components/ui/Button";
import { Wallet } from "lucide-react";
import { useAccount } from 'wagmi';

export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const { address, isConnected } = useAccount();

  // Get the toggleDrawer function from global state
  const toggleDrawer = useGlobalState(state => state.toggleDrawer);
  
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    burgerMenuRef,
    useCallback(() => {
      useGlobalState.setState({ isDrawerOpen: false });
    }, []),
  );

  return (
    <header className="flex items-center justify-between p-4 bg-card-bg">
    <div className="flex items-center gap-4">
      <div  className="logo" aria-label="Logo" />
    </div>
    <div>
    <Button variant="surface" className="rounded-md button-shadow" noOutline={true} onClick={toggleDrawer}>
        <Wallet className="w-4 h-4" /> 
        {isConnected ? truncateAddress(address!) : "Connect Wallet"}
      </Button>
    </div>
  </header>
  );
};
