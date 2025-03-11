import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~~/components/ui/Accordion";
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "~~/components/ui/Button";
import Image from 'next/image';

export interface TokenData {
  symbol: string;
  icon?: string;
  publicBalance?: string;
  privateBalance?: string;  // Array of encrypted balances to show in accordion content
  isCustom?: boolean;
  address: string;
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
  children 
}: TokenAccordionProps) {
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
                  <X className="h-4 w-4 text-red-500 cursor-pointer" onClick={(e) => {
                         e.stopPropagation(); // Prevent accordion from opening
                         console.log("Remove", token.address);
                         onRemove(token.address);
                  }}/>
                  // <Button
                  //   variant="ghost"
                  //   size="sm"
                  //   className="p-1 h-6 w-6 hover:bg-red-100 hover:text-red-500"
                  //   onClick={(e) => {
                  //     e.stopPropagation(); // Prevent accordion from opening
                  //     onRemove(token);
                  //   }}
                  // >
                    
                  // </Button>
                )}
                {token.icon && (
                  <Image 
                    src={token.icon} 
                    alt={token.symbol} 
                    width={24} 
                    height={24} 
                    className="w-6 h-6"
                    style={{
                      maxWidth: '100%',
                      height: 'auto'
                    }}
                  />
                )}
                <span>{token.symbol}</span>
                {token.isCustom && (
                  <span className="text-[8px] text-gray-500">Custom</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>{token.publicBalance}</span>

              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            <div className="flex flex-col gap-2 py-2 px-4 bg">
              <div className="flex justify-between items-center">
                <div className="flex-2">
                  {token.publicBalance && (
                    <span className="text-sm text-gray-500">{token.publicBalance}</span>
                  )}
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
                  {token.privateBalance && (
                    <span className="text-sm text-gray-500">{token.privateBalance}</span>
                  )}
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
        <div className="mt-2 p-3 w-full flex self-center relative border-t border-b border-gray-200">
            {children}
        </div>
    </Accordion>
  );
}
