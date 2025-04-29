"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useConnect } from "wagmi";
import { Button } from "~~/components/ui/Button";

const excludeConnectors = ["keplr"];

export const ConnectPage = () => {
  const { connect, connectors } = useConnect();

  // Use this to prevent hydration errors
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until client-side
  if (!mounted) {
    return <div className="p-4">Loading wallet options...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Connect your wallet</h2>
      <div className="flex flex-wrap gap-4">
        {connectors.map((connector, index) => {
          if (excludeConnectors.includes(connector.name.toLocaleLowerCase())) {
            return null;
          }

          const iconSize = 4;

          return (
            <Button
              key={`${connector.id}-${index}`}
              onClick={() => connect({ connector })}
              variant="outline"
              className="flex items-center gap-2 w-full mr-1 px-1 py-0.5"
            >
              {connector.id.toLowerCase().includes("metamask") && (
                <Image
                  src="/icons/wallets/metamask.svg"
                  alt="MetaMask"
                  width={24}
                  height={24}
                  className={`w-${iconSize} h-${iconSize}`}
                />
              )}
              {connector.id.toLowerCase().includes("walletconnect") && (
                <Image
                  src="/icons/wallets/walletconnect.svg"
                  alt="WalletConnect"
                  width={24}
                  height={24}
                  className={`w-${iconSize} h-${iconSize}`}
                />
              )}
              {connector.id.toLowerCase().includes("coinbase") && (
                <Image
                  src="/icons/wallets/coinbase.svg"
                  alt="Coinbase"
                  width={24}
                  height={24}
                  className={`w-${iconSize} h-${iconSize}`}
                />
              )}
              {connector.id.toLowerCase().includes("safe") && (
                <Image
                  src="/icons/wallets/safe.svg"
                  alt="Safe"
                  width={24}
                  height={24}
                  className={`w-${iconSize} h-${iconSize}`}
                />
              )}
              {!connector.id.toLowerCase().includes("metamask") &&
                !connector.id.toLowerCase().includes("walletconnect") &&
                !connector.id.toLowerCase().includes("coinbase") &&
                !connector.id.toLowerCase().includes("safe") && (
                  <Image
                    src="/default-wallet-icon.png"
                    alt={connector.name}
                    width={24}
                    height={24}
                    className={`w-${iconSize} h-${iconSize}`}
                  />
                )}
              {connector.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
