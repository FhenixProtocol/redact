import React, { useCallback, useMemo } from "react";
import Image from "next/image";
import { TokenIcon } from "./TokenIcon";
import { Eye, EyeOff, X } from "lucide-react";
import { formatUnits } from "viem";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~~/components/ui/Accordion";
import { Button } from "~~/components/ui/Button";
import {
  useConfidentialTokenPair,
  useConfidentialTokenPairBalances,
  useIsArbitraryToken,
  useRemoveArbitraryToken,
} from "~~/services/store/tokenStore2";

export interface TokenData {
  symbol: string;
  icon?: string;
  publicBalance?: string;
  privateBalance?: string; // Array of encrypted balances to show in accordion content
  isCustom?: boolean;
  address: string;
  isLoadingPublic?: boolean;
  isLoadingPrivate?: boolean;
}

interface TokenAccordionProps {
  tokens: TokenData[];
  onEncrypt?: (token: TokenData) => void;
  onDecrypt?: (token: TokenData) => void;
  onRemove?: (token: string) => void;
  editMode?: boolean;
  children?: React.ReactNode;
}

export function TokenAccordion({
  tokens,
  onEncrypt,
  onDecrypt,
  onRemove,
  editMode = false,
  children,
}: TokenAccordionProps) {
  // Helper function to calculate total balance
  const calculateTotalBalance = (token: TokenData) => {
    const publicAmount = parseFloat(token.publicBalance || "0");
    const privateAmount = parseFloat(token.privateBalance || "0");
    return (publicAmount + privateAmount).toString();
  };

  return (
    <Accordion type="multiple" className="w-full flex flex-col">
      <div className="flex justify-center px-4 py-2 font-bold text-md">
        <div className="flex-1 text-center">Token</div>
        <div className="flex-1 text-center">Action</div>
      </div>
      {tokens.map((token, index) => (
        <AccordionItem key={index} value={`token-${index}`} className="border-0">
          <AccordionTrigger className="hover:no-underline px-4 py-2">
            <div className="flex w-full justify-between items-center">
              <div className="flex items-center gap-2">
                {editMode && token.isCustom && onRemove && (
                  <X
                    className="h-4 w-4 text-red-500 cursor-pointer"
                    onClick={e => {
                      e.stopPropagation(); // Prevent accordion from opening
                      console.log("Remove", token.address);
                      onRemove(token.address);
                    }}
                  />
                )}
                {token.icon && (
                  <Image
                    src={token.icon}
                    alt={token.symbol}
                    width={24}
                    height={24}
                    className="w-6 h-6"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                    }}
                  />
                )}
                <span>{token.symbol}</span>
                {token.isCustom && <span className="text-[8px] text-gray-500">Custom</span>}
              </div>
              <div className="flex items-center gap-2">
                {/* Display total balance (sum of public and private) */}
                <span>
                  {token.isLoadingPublic || token.isLoadingPrivate ? (
                    "Loading..."
                  ) : (
                    calculateTotalBalance(token)
                  )}
                </span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            <div className="flex flex-col gap-2 py-2 px-4 bg">
              <div className="flex justify-between items-center">
                <div className="flex-2">
                  <span className="text-sm text-gray-500">Public: {token.isLoadingPublic ? "Loading..." : token.publicBalance || "0"}</span>
                </div>
                <div className="flex-1 flex justify-end">
                  {onEncrypt && (
                    <Button
                      size="xs"
                      variant="default"
                      icon={EyeOff}
                      onClick={() => onEncrypt(token)}
                      className="font-bold uppercase flex-1"
                    >
                      Encrypt
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex-2">
                  <span className="text-sm text-gray-500">Private: {token.isLoadingPrivate ? "Loading..." : token.privateBalance || "0"}</span>
                </div>
                <div className="flex-1 flex justify-end">
                  {onDecrypt && (
                    <Button
                      size="xs"
                      variant="default"
                      icon={Eye}
                      onClick={() => onDecrypt(token)}
                      className="uppercase flex-1"
                    >
                      Decrypt
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
      <div className="mt-2 p-3 w-full flex self-center relative border-t border-b border-gray-200">{children}</div>
    </Accordion>
  );
}

export function TokenAccordion2({ children }: { children?: React.ReactNode }) {
  return (
    <Accordion type="multiple" className="w-full flex flex-col">
      <div className="flex justify-center px-4 py-2 font-bold text-md">
        <div className="flex-1 text-center">Token</div>
        <div className="flex-1 text-center">Action</div>
      </div>
      {children}
    </Accordion>
  );
}

export const useOpenForEncryption = (token: TokenData | undefined) => {
  return useCallback(() => {
    if (token == null) return;
    console.log("OPEN FOR ENCRYPTION", token);
  }, [token]);
};

export const useOpenForDecryption = (token: TokenData | undefined) => {
  return useCallback(() => {
    if (token == null) return;
    console.log("OPEN FOR DECRYPTION", token);
  }, [token]);
};

export function TokenAccordionItem({ pairAddress }: { pairAddress: string }) {
  const pair = useConfidentialTokenPair(pairAddress);
  const balances = useConfidentialTokenPairBalances(pairAddress);
  const isArbitrary = useIsArbitraryToken(pair.publicToken.address);

  const openForEncryption = useOpenForEncryption(pair.publicToken);
  const openForDecryption = useOpenForDecryption(pair.confidentialToken);
  const removeArbitraryToken = useRemoveArbitraryToken(pair.publicToken.address);

  const pairHash = useMemo(() => {
    return `${pair.publicToken.address}-${pair.confidentialToken?.address}`;
  }, [pair]);

  return (
    <AccordionItem value={pairHash} className="border-0">
      <AccordionTrigger className="hover:no-underline px-4 py-2">
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center gap-2">
            <TokenIcon token={pair.publicToken} />
            <span>{pair.publicToken.symbol}</span>
            {isArbitrary && <span className="text-xs text-gray-500">(User Added)</span>}
          </div>
          <div className="flex items-center gap-2">
            <span>{balances.publicBalance != null ? balances.publicBalance : "..."}</span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <div className="flex flex-col gap-2 py-2 px-4 bg">
          <div className="flex justify-between items-center">
            <div className="flex-2">
              <span className="text-sm text-gray-500">
                {pair.publicToken.symbol}{" "}
                {balances.publicBalance != null
                  ? formatUnits(balances.publicBalance, pair.publicToken.decimals)
                  : "..."}
              </span>
            </div>
            <div className="flex-1 flex justify-end">
              <Button
                size="xs"
                variant="default"
                icon={EyeOff}
                onClick={openForEncryption}
                className="font-bold uppercase flex-1"
              >
                Encrypt
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex-2">
              <span className="text-sm text-gray-500">
                {pair.confidentialToken?.symbol ?? `e${pair.publicToken.symbol}`}{" "}
                {balances.confidentialBalance != null ? balances.confidentialBalance : "..."}
              </span>
            </div>
            <div className="flex-1 flex justify-end">
              <Button size="xs" variant="default" icon={Eye} onClick={openForDecryption} className="uppercase flex-1">
                Decrypt
              </Button>
            </div>
          </div>

          {isArbitrary && (
            <div className="flex justify-end">
              <div className="flex-2" />
              <div className="flex flex-1 justify-end">
                <Button
                  size="xs"
                  variant="destructive"
                  icon={X}
                  onClick={removeArbitraryToken}
                  className="uppercase flex-1"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
