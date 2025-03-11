"use client";

import { useEffect, useState, useCallback } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider, useAccount } from "wagmi";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useInitializeNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import Drawer, { DrawerPage } from "~~/components/Drawer";
import { WalletMainPanel } from "~~/components/menu-pages/WalletMainPage";
import { WalletLister } from "~~/components/WalletConnectorsList";
import { truncateAddress } from "~~/lib/common";
import { useRouter } from "next/navigation";
import { useGlobalState } from "~~/services/store/store";


const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();
  const { address, isConnected } = useAccount();
  const [drawerTitle, setDrawerTitle] = useState("Menu");
  const router = useRouter();
  
  // Get drawer state from global state
  const isDrawerOpen = useGlobalState(state => state.isDrawerOpen);
  const setIsDrawerOpen = useCallback((open: boolean) => {
    useGlobalState.setState({ isDrawerOpen: open });
  }, []);

  useEffect(() => {
    if (isConnected) {
      setDrawerTitle(truncateAddress(address!, 10, 10));
    } else {
      setDrawerTitle("Connect Wallet");
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (!address) {
      router.push('/');
    }
  }, [address, router]);

  const initialPages: DrawerPage[] = isConnected
    ? [
        {
          id: "wallet-main",
          title: truncateAddress(address!, 10, 10),
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
