"use client";

import React from "react";
import { TokenIconSymbol } from "./ui/TokenIconSymbol";
import { Button } from "~~/components/ui/Button";
import { cn } from "~~/lib/utils";
import { useGlobalState } from "~~/services/store/store";
import { ConfidentialTokenPair, useConfidentialTokenPair } from "~~/services/store/tokenStore";

interface TokenSelectorProps {
  value?: string; // Token address
  isEncrypt?: boolean;
  onChange?: (value: string, isEncrypt?: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function TokenSelector({ value, isEncrypt, onChange, className, disabled }: TokenSelectorProps) {
  const { setSelectTokenModalOpen } = useGlobalState();
  const valuePair = useConfidentialTokenPair(value);

  const displayPair = valuePair;

  const handleOpenModal = () => {
    setSelectTokenModalOpen(true, (tokenPair: ConfidentialTokenPair, isEncrypt?: boolean) => {
      if (onChange) {
        onChange(tokenPair.publicToken.address, isEncrypt);
      }
    });
  };

  return (
    <Button
      variant="surface"
      className={cn("rounded-[20px] border-none bg-gray-200 text-primary-accent p-1.5 pr-3 h-auto", className)}
      onClick={handleOpenModal}
      disabled={disabled}
    >
      {displayPair ? (
        <div className="flex items-center gap-2">
          <TokenIconSymbol
            publicToken={displayPair.publicToken}
            confidentialToken={displayPair.confidentialToken}
            isConfidential={!isEncrypt}
            className="text-primary-accent"
          />
        </div>
      ) : (
        <>
          <div className="w-7 h-7 bg-primary-accent rounded-full" />
          <span>SELECT</span>
        </>
      )}
    </Button>
  );
}
