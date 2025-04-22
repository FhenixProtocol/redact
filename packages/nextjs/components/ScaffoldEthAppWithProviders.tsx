"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletIcon } from "lucide-react";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider, useAccount } from "wagmi";
import Drawer, { DrawerPage } from "~~/components/Drawer";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { WalletLister } from "~~/components/WalletConnectorsList";
import { WalletMainPanel } from "~~/components/menu-pages/WalletMainPage";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { Separator } from "~~/components/ui/Separator";
import { useInitializeNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { truncateAddress } from "~~/lib/common";
import { useGlobalState } from "~~/services/store/store";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();
  const { address, isConnected } = useAccount();
  const router = useRouter();

  // Get drawer state from global state
  const isDrawerOpen = useGlobalState(state => state.isDrawerOpen);
  const setIsDrawerOpen = useCallback((open: boolean) => {
    useGlobalState.setState({ isDrawerOpen: open });
  }, []);

  useEffect(() => {
    if (!address) {
      router.push("/");
    }
  }, [address, router]);

  const initialPages: DrawerPage[] =
    isConnected && address != null
      ? [
          {
            id: "wallet-main",
            header: <DrawerConnectedHeader />,
            component: <WalletMainPanel />,
          },
        ]
      : [
          {
            id: "wallet-lister",
            title: "Connect Wallet",
            component: <WalletLister />,
          },
        ];

  return (
    <>
      <div className="relative min-h-screen">
        <div className="grid grid-rows-[auto_1fr_auto] min-h-screen relative">
          <Header />
          <main className="relative p-4 flex justify-center items-center">{children}</main>
          <Footer />
          <Drawer
            className="bg-background"
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            initialPages={initialPages}
          />
        </div>
      </div>
      <Toaster />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ProgressBar height="3px" color="#2299dd" />
        <RainbowKitProvider
          avatar={BlockieAvatar}
          theme={mounted ? (isDarkMode ? darkTheme() : lightTheme()) : lightTheme()}
        >
          <ScaffoldEthApp>{children}</ScaffoldEthApp> {/* INFO: This is the main page */}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

const DrawerConnectedHeader = () => {
  const { address, isConnected } = useAccount();
  if (!isConnected || address == null) return null;

  return (
    <div className="flex flex-1 items-center justify-between h-full">
      <div className="flex h-full items-center justify-center">
        <div className="flex w-12 items-center justify-center">
          <WalletIcon className="w-4 h-4 text-primary" />
        </div>
        <Separator orientation="vertical" />
      </div>
      <div className="flex gap-4 items-center justify-center">
        <WalletIcon className="w-4 h-4 text-primary" />
        <div className="text-sm text-primary">{truncateAddress(address, 10, 10)}</div>
      </div>
    </div>
  );
};
