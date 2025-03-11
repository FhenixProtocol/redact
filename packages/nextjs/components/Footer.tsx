import React, { useState } from "react";
import Link from "next/link";
import { hardhat } from "viem/chains";
import { CurrencyDollarIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { BuidlGuidlLogo } from "~~/components/assets/BuidlGuidlLogo";
import { Faucet } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useGlobalState } from "~~/services/store/store";

/**
 * Site footer
 */
export const Footer = () => {
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const toggleDrawer = useGlobalState(state => state.toggleDrawer);
  const isDrawerOpen = useGlobalState(state => state.isDrawerOpen);

  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  return (
    <footer className="p-4 flex items-center justify-end space-x-4 text-xs text-blue-900">
    <div className="w-px h-4 bg-blue-900"></div> {/* Vertical divider */}
    <span className="ml-2">Powered by Fhenix</span>

    <div
      className={`
absolute inset-0 z-10 bg-white/0
${isDrawerOpen ? 'pointer-events-auto backdrop-blur-xs' : 'pointer-events-none backdrop-blur-none'}
transition-[backdrop-filter] duration-500
`}
      // Optionally click the overlay to close the drawer:
      onClick={toggleDrawer}
    />

  </footer>  );
};
