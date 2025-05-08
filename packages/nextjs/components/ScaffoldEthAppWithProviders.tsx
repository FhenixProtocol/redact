"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DrawerBlurOverlay } from "./DrawerBlurOverlay";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider, useAccount } from "wagmi";
import Drawer from "~~/components/Drawer";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useInitializeNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();
  const { address } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!address) {
      router.push("/");
    }
  }, [address, router]);

  return (
    <>
      <div className="relative min-h-screen">
        <div className="grid grid-rows-[auto_1fr_auto] min-h-screen relative">
          <Header />
          <main className="relative p-2 md:p-4 flex justify-center items-center">{children}</main>
          <Footer />
          <DrawerBlurOverlay />
          <Drawer />
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
