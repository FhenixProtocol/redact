"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useConnect } from "wagmi";
import { Button } from "~~/components/ui/Button";

const excludeConnectors = ["keplr"];

const walletIconMap = {
  metamask: { src: "/icons/wallets/metamask.svg", alt: "MetaMask" },
  walletconnect: { src: "/icons/wallets/walletconnect.svg", alt: "WalletConnect" },
  coinbase: { src: "/icons/wallets/coinbase.svg", alt: "Coinbase" },
  safe: { src: "/icons/wallets/safe.svg", alt: "Safe" },
  rabby: { src: "/icons/wallets/rabby.svg", alt: "Rabby" }, // Assuming Rabby is the intended alt for ledger icon
};

const defaultWalletIcon = {
  src: "/icons/wallets/default.svg",
  alt: "Default Wallet",
};

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

  const getConnectorType = (id: string) => {
    const lower = id.toLowerCase();
    for (const key in walletIconMap) {
      if (lower.includes(key)) return key;
    }
    return id; 
  };

  const uniqueConnectors = connectors.filter((connector, index, self) => {
    const type = getConnectorType(connector.id);
    return index === self.findIndex(c => getConnectorType(c.id) === type);
  });

  return (
    <div className="p-4">
      <div className="flex flex-wrap gap-4">
        {uniqueConnectors.map((connector, index) => {
          if (excludeConnectors.includes(connector.name.toLocaleLowerCase())) {
            return null;
          }

          const iconSize = 4;
          let iconInfo = defaultWalletIcon;
          let altText = connector.name; // Default alt text to connector name

          const connectorIdLower = connector.id.toLowerCase();
          for (const key in walletIconMap) {
            if (connectorIdLower.includes(key)) {
              iconInfo = walletIconMap[key as keyof typeof walletIconMap];
              altText = walletIconMap[key as keyof typeof walletIconMap].alt;
              break;
            }
          }

          return (
            <Button
              key={`${connector.id}-${index}`}
              onClick={() => connect({ connector })}
              variant="outline"
              className="flex items-center gap-2 w-full mr-1 px-4 py-2"
            >
              <Image
                src={iconInfo.src}
                alt={altText}
                width={24}
                height={24}
                className={`w-${iconSize} h-${iconSize}`}
              />
              {connector.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
