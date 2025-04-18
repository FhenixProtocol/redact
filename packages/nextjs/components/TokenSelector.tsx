"use client";

import React, { useMemo } from "react";
import { TokenIcon } from "./ui/TokenIcon";
import { PlusIcon } from "lucide-react";
import { useChainId } from "wagmi";
import { Button } from "~~/components/ui/Button";
import { cn } from "~~/lib/utils";
import { useGlobalState } from "~~/services/store/store";
import { ConfidentialTokenPair, useTokenStore } from "~~/services/store/tokenStore2";

interface TokenSelectorProps {
  value?: string; // Token address
  onChange?: (value: string) => void;
  className?: string;
}

export function TokenSelector({ value, onChange, className }: TokenSelectorProps) {
  const { setSelectTokenModalOpen, setAddTokenModalOpen } = useGlobalState();
  const chainId = useChainId();
  const store = useTokenStore();

  // If a token address is provided, get the token pair
  const selectedTokenPair = useMemo(() => {
    if (!value) return null;

    const chainPairs = store.pairs[chainId] || {};
    // First check if this is a public token address
    if (chainPairs[value]) {
      return chainPairs[value];
    }

    // If not found as a public token, check if it's a confidential token
    const confidentialMap = store.confidentialToPublicMap[chainId] || {};
    const publicAddress = confidentialMap[value];
    if (publicAddress && chainPairs[publicAddress]) {
      return chainPairs[publicAddress];
    }

    return null;
  }, [value, chainId, store.pairs, store.confidentialToPublicMap]);

  // Get the first token pair as default if no selection
  const firstTokenPair = useMemo(() => {
    const chainPairs = store.pairs[chainId] || {};
    const pairs = Object.values(chainPairs);
    return pairs.length > 0 ? pairs[0] : null;
  }, [chainId, store.pairs]);

  const displayTokenPair = selectedTokenPair || firstTokenPair;

  const handleOpenModal = () => {
    setSelectTokenModalOpen(true, (tokenPair: ConfidentialTokenPair) => {
      if (onChange) {
        onChange(tokenPair.publicToken.address);
      }
    });
  };

  return (
    <Button
      variant="surface"
      className={cn("rounded-[20px] border-none bg-gray-200 text-primary-accent px-4 py-2 h-auto", className)}
      onClick={handleOpenModal}
    >
      {displayTokenPair ? (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
            <TokenIcon token={displayTokenPair.publicToken} />
          </div>
          <span className="font-medium">{displayTokenPair.publicToken.symbol}</span>
        </div>
      ) : (
        <span>Select Token</span>
      )}
    </Button>
  );
}
