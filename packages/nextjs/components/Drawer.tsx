"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { CopyButton } from "./HashLink";
import { ConnectPage } from "./menu-pages/ConnectPage";
import { WalletMainPanel } from "./menu-pages/MainPage";
import { PermitsPage } from "./menu-pages/PermitsPage";
import { ReceivePage } from "./menu-pages/ReceivePage";
import { SendPage } from "./menu-pages/SendPage";
import { TokenPage, TokenPageButtonFooter } from "./menu-pages/TokenPage";
import { Button } from "./ui/Button";
import { Separator } from "./ui/Separator";
import { ArrowBack, Logout } from "@mui/icons-material";
import { AnimatePresence, motion, usePresenceData } from "framer-motion";
import { ChevronDown, ChevronLeft, Settings, WalletIcon, X } from "lucide-react";
import { Chain, zeroAddress } from "viem";
import { useAccount, useChainId, useDisconnect, useSwitchChain } from "wagmi";
import { SettingsPage } from "~~/components/menu-pages/SettingsPage";
import { IconButton } from "~~/components/ui/IconButton";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import { targetNetworksNoHardhat } from "~~/hooks/useCofhe";
import { truncateAddress } from "~~/lib/common";
import { cn } from "~~/lib/utils";
import {
  DrawerPageName,
  useDrawerAnimationDirection,
  useDrawerBackButtonAction,
  useDrawerOpen,
  useDrawerPage,
  useDrawerPagesCount,
  useDrawerPushPage,
  useSetDrawerOpen,
} from "~~/services/store/drawerStore";
import { useGlobalState } from "~~/services/store/store";

export interface DrawerChildProps {
  pushPage?: (page: DrawerPage) => void;
  popPage?: () => void;
}

/** A single 'page' in the drawer's navigation stack */
export interface DrawerPage {
  id: string;
  title?: string;
  header?: React.ReactElement;
  component: React.ReactElement<DrawerChildProps>;
}

const NETWORK_ICONS: Record<number, string> = {
  1: "/icons/networks/ethereum.svg",
  42161: "/icons/networks/arbitrum.svg",
  421614: "/icons/networks/arbitrum.svg",
  84532: "/icons/networks/base.svg",
  11155111: "/icons/networks/ethereum.svg",
  // Add more networks as needed
};

const NetworkDropdown = () => {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const iconPath = NETWORK_ICONS[chainId] || "/icons/networks/default.svg";

  const closeDropdown = () => setIsOpen(false);
  useOutsideClick(dropdownRef, closeDropdown);

  const handleChainSwitch = (newChainId: number) => {
    switchChain({ chainId: newChainId });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-1 rounded hover:bg-primary-accent/10 transition-colors"
        aria-label="Switch network"
      >
        <Image src={iconPath} alt={`Network ${chainId}`} width={16} height={16} className="w-5 h-5" />
        <ChevronDown className={cn("w-3 h-3 text-primary transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-component-stroke rounded-lg shadow-lg z-50 min-w-[200px]">
          <div className="py-1">
            {targetNetworksNoHardhat.map((chain: Chain) => {
              const chainIconPath = NETWORK_ICONS[chain.id] || "/icons/networks/default.svg";
              const isCurrentChain = chain.id === chainId;

              return (
                <button
                  key={chain.id}
                  onClick={() => handleChainSwitch(chain.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-primary-accent/10 transition-colors text-primary",
                    isCurrentChain && "bg-primary-accent/20 text-primary-accent",
                  )}
                  disabled={isCurrentChain}
                >
                  <Image src={chainIconPath} alt={`${chain.name} icon`} width={16} height={16} className="w-4 h-4" />
                  <span className="text-sm font-medium">{chain.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    const { body } = document;
    if (!locked) return;

    // remember scroll position so the page doesn’t jump when we unlock
    const scrollY = window.scrollY;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

const Drawer: React.FC = () => {
  const open = useDrawerOpen();
  useBodyScrollLock(open);
  return (
    <div
      className={cn(
        "overscroll-contain fixed top-0 right-0 h-full w-[400px] max-w-[95vw] bg-background shadow-lg z-20 border-l border-blue-400",
        open ? "translate-x-0" : "translate-x-full",
        "transform transition-transform duration-300",
        "flex flex-col",
      )}
      style={{ touchAction: "pan-y" }}
    >
      {/* --------------------------
          Header
         -------------------------- */}
      <div className="p-4 w-full flex items-center justify-between relative">
        <DrawerContentHeader />
        <DrawerHeaderBackButton />
      </div>

      {/* --------------------------
          Body - Animate each page
         -------------------------- */}
      <div className="relative flex-1 overflow-hidden flex flex-col">
        <DrawerContentBody />
      </div>

      <DrawerContentFooter />

      <div className="p-4 flex flex-row justify-between">
        <div className="flex flex-row">
          <SettingsButton />
          <Separator className="bg-gray-200 ml-2" orientation="vertical" />
          <FAQButton />
        </div>
        <LogoutButton />
      </div>
    </div>
  );
};

const DrawerContentHeader = () => {
  const { page } = useDrawerPage();

  switch (page) {
    case DrawerPageName.Main:
    case DrawerPageName.Settings:
    case DrawerPageName.Token:
    case DrawerPageName.Send:
    case DrawerPageName.Receive:
      return <DrawerConnectedHeader />;
    case DrawerPageName.Connect:
      return <h2 className="text-3xl text-primary">Connect Wallet</h2>;
  }
};

const DrawerHeaderBackButton = () => {
  const backAction = useDrawerBackButtonAction();
  const pagesCount = useDrawerPagesCount();

  return (
    <IconButton
      icon={pagesCount === 1 ? X : ChevronLeft}
      className="text-primary"
      size="lg"
      aria-label="Go back"
      onClick={backAction}
    />
  );
};

const DrawerContentBody = () => {
  const { page, pairAddress } = useDrawerPage();
  const animationDirection = useDrawerAnimationDirection();

  return (
    <AnimatePresence custom={animationDirection} initial={false}>
      <DrawerContentSlide key={page} page={page} pairAddress={pairAddress} />
    </AnimatePresence>
  );
};

const slideVariants = {
  "enter-from-right": { opacity: -1, x: "50px" },
  "enter-from-left": { opacity: -1, x: "-50px" },
  center: { opacity: 1, x: 0 },
  "exit-to-right": { opacity: -1, x: "-50px" },
  "exit-to-left": { opacity: -1, x: "50px" },
};

const DrawerContentSlide = ({ page, pairAddress }: { page: DrawerPageName; pairAddress: string | undefined }) => {
  const animationDirection = usePresenceData();

  return (
    <motion.div
      variants={slideVariants}
      initial={animationDirection === "right" ? "enter-from-right" : "enter-from-left"}
      animate="center"
      exit={animationDirection === "right" ? "exit-to-right" : "exit-to-left"}
      className="flex-1 overflow-y-auto overflow-x-hidden p-4 absolute top-0 left-0 w-full h-full"
      style={{ touchAction: "pan-y" }}
    >
      {page === DrawerPageName.Main && <WalletMainPanel />}
      {page === DrawerPageName.Settings && <SettingsPage />}
      {page === DrawerPageName.Token && <TokenPage pairAddress={pairAddress} />}
      {page === DrawerPageName.Send && <SendPage />}
      {page === DrawerPageName.Receive && <ReceivePage />}
      {page === DrawerPageName.Connect && <ConnectPage />}
      {page === DrawerPageName.Permits && <PermitsPage />}
    </motion.div>
  );
};

const DrawerContentFooter = () => {
  const { page, pairAddress } = useDrawerPage();
  const backAction = useDrawerBackButtonAction();
  const pagesCount = useDrawerPagesCount();

  return (
    <AnimatePresence mode="wait">
      {page === DrawerPageName.Token && pairAddress != null ? (
        <motion.div
          key="token-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="p-4 pb-0 w-full"
        >
          <TokenPageButtonFooter pairAddress={pairAddress} />
        </motion.div>
      ) : pagesCount > 1 ? (
        <motion.div
          key="back-button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="p-4 pb-0 w-full"
        >
          <Button size="md" iconSize="lg" variant="surface" className="w-full" icon={ArrowBack} onClick={backAction}>
            Back
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

const DrawerConnectedHeader = () => {
  const { address } = useAccount();
  return (
    <div className="flex flex-1 items-center justify-between h-full">
      <div className="flex h-full items-center justify-center">
        <div className="flex w-12 items-center justify-center">
          <NetworkDropdown />
        </div>
        <Separator orientation="vertical" />
      </div>
      <div className="flex gap-4 flex-grow items-center justify-center">
        <WalletIcon className="w-4 h-4 text-primary" />
        <div className="text-sm text-primary">{truncateAddress(address ?? zeroAddress, 10, 10)}</div>
        <CopyButton address={address ?? zeroAddress} className="w-4 h-4" />
      </div>
    </div>
  );
};

const SettingsButton = () => {
  const pushPage = useDrawerPushPage();
  const { page } = useDrawerPage();
  const disabled = page === DrawerPageName.Settings;

  return (
    <Settings
      className={cn("cursor-pointer text-primary", disabled && "cursor-not-allowed opacity-30")}
      onClick={() => {
        pushPage({
          page: DrawerPageName.Settings,
          pairAddress: undefined,
        });
      }}
    />
  );
};

const FAQButton = () => {
  const setDrawerOpen = useSetDrawerOpen();
  const setFAQOpen = useGlobalState(state => state.setFAQOpen);
  return (
    <Button
      variant="ghost2"
      size="sm"
      className="font-reddit-sans text-xs font-normal text-primary"
      onClick={() => {
        setDrawerOpen(false);
        setFAQOpen(true);
      }}
    >
      F.A.Q
    </Button>
  );
};

const LogoutButton = () => {
  const { disconnectAsync } = useDisconnect();
  return <Logout className="cursor-pointer text-primary" onClick={() => disconnectAsync()} />;
};

export default Drawer;
