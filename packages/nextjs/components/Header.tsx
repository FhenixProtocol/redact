"use client";

import React, { useCallback, useRef } from "react";
import Image from "next/image";
// import { Button } from "~~/components/ui/button";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon, BugAntIcon } from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";
import { truncateAddress } from "~~/lib/common";
import { Button } from "~~/components/ui/Button";
import { Wallet } from "lucide-react";
import { useAccount } from 'wagmi';



/**
 * Site header
 */
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
      <Image src="/fhenix-small.svg" alt="Logo" width={32} height={32} />
      <span className="font-birdman text-[26px] font-bold text-primary-accent">Redact</span>
    </div>
    <div>
      <Button variant="surface" className="rounded-md button-shadow" onClick={toggleDrawer}>
        <Wallet className="w-4 h-4" /> 
        {isConnected ? truncateAddress(address!) : "Connect Wallet"}
      </Button>
    </div>
  </header>
  );
};
