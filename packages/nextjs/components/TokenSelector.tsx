"use client";

import React from "react";
import { TokenIcon } from "./ui/TokenIcon";
import { Button } from "~~/components/ui/Button";
import { cn } from "~~/lib/utils";
import { useGlobalState } from "~~/services/store/store";
import { ConfidentialTokenPair, useConfidentialTokenPair } from "~~/services/store/tokenStore";

interface TokenSelectorProps {
  value?: string; // Token address
  isEncrypt?: boolean;
  onChange?: (value: string) => void;
  className?: string;
}

export function TokenSelector({ value, isEncrypt, onChange, className }: TokenSelectorProps) {
  const { setSelectTokenModalOpen } = useGlobalState();
  const valuePair = useConfidentialTokenPair(value);

  const displayPair = valuePair;

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
      className={cn("rounded-[20px] border-none bg-gray-200 text-primary-accent pl-2 pr-4 py-2 h-auto", className)}
      onClick={handleOpenModal}
    >
      {displayPair ? (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
            <TokenIcon token={displayPair.publicToken} />
          </div>
          <span>
            {isEncrypt
              ? displayPair.publicToken?.symbol
              : (displayPair.confidentialToken?.symbol ?? `e${displayPair.publicToken?.symbol}`)}
          </span>
        </div>
      ) : (
        <>
          <div className="w-6 h-6 bg-primary-accent rounded-full" />
          <span>SELECT</span>
        </>
      )}
    </Button>
  );
}
