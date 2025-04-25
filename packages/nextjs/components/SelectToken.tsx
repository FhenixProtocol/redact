import React, { useMemo, useState } from "react";
import { CleartextBalance } from "./ui/CleartextBalance";
import { EncryptedBalance } from "./ui/EncryptedValue";
import { TokenIcon } from "./ui/TokenIcon";
import { PlusIcon } from "lucide-react";
import { useChainId } from "wagmi";
import { Button } from "~~/components/ui/Button";
import { FnxInput } from "~~/components/ui/FnxInput";
import { getConfidentialSymbol } from "~~/lib/common";
import { useGlobalState } from "~~/services/store/store";
import { ConfidentialTokenPair, useConfidentialTokenPairBalances, useTokenStore } from "~~/services/store/tokenStore";

interface SelectTokenProps {
  onSelectTokenPair: (tokenPair: ConfidentialTokenPair) => void;
  onClose?: () => void;
}

export function SelectToken({ onSelectTokenPair, onClose }: SelectTokenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const chainId = useChainId();
  const store = useTokenStore();
  const { setAddTokenModalOpen } = useGlobalState();

  // Get all token pairs from the store
  const tokenPairs = useMemo(() => {
    const chainPairs = store.pairs[chainId] || {};
    return Object.values(chainPairs);
  }, [store.pairs, chainId]);

  // Filter token pairs based on search query
  const filteredTokens = useMemo(() => {
    if (!searchQuery) return tokenPairs;

    const query = searchQuery.toLowerCase();
    return tokenPairs.filter(pair => {
      const { publicToken, confidentialToken } = pair;

      // Check if any of the fields match the search query
      return (
        publicToken.address.toLowerCase().includes(query) ||
        publicToken.name.toLowerCase().includes(query) ||
        publicToken.symbol.toLowerCase().includes(query) ||
        confidentialToken?.address.toLowerCase().includes(query) ||
        false ||
        confidentialToken?.name.toLowerCase().includes(query) ||
        false ||
        confidentialToken?.symbol.toLowerCase().includes(query) ||
        false
      );
    });
  }, [tokenPairs, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectToken = (tokenPair: ConfidentialTokenPair) => {
    onSelectTokenPair(tokenPair);
    if (onClose) onClose();
  };

  const handleAddToken = () => {
    setAddTokenModalOpen(true);
    if (onClose) onClose();
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="text-[18px] text-primary font-semibold mb-1">Search tokens:</div>
      <FnxInput
        variant="md"
        noOutline={true}
        placeholder="Search by name, symbol, or address..."
        value={searchQuery}
        onChange={handleSearchChange}
        className="w-full"
        fadeEnd={true}
      />

      {/* Token list */}
      <div className="h-[50vh] overflow-y-auto mt-2 rounded-lg">
        {filteredTokens.length === 0 ? (
          <div className="flex justify-center items-center h-24 text-primary-accent">No tokens found</div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredTokens.map(tokenPair => (
              <TokenListItem
                key={tokenPair.publicToken.address}
                tokenPair={tokenPair}
                onSelect={() => handleSelectToken(tokenPair)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Token button */}
      <Button
        variant="ghost2"
        icon={PlusIcon}
        noOutline={true}
        onClick={handleAddToken}
        className="w-full text-left font-semibold text-md text-primary-accent mt-2"
      >
        Add Token
      </Button>
    </div>
  );
}

function TokenListItem({ tokenPair, onSelect }: { tokenPair: ConfidentialTokenPair; onSelect: () => void }) {
  const { publicToken, confidentialToken } = tokenPair;
  const balances = useConfidentialTokenPairBalances(publicToken.address);

  return (
    <Button variant="surface" className="p-3 rounded-none w-full justify-start hover:bg-white/10" onClick={onSelect}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
            <TokenIcon publicToken={publicToken} />
          </div>
          <div className="flex flex-col">
            <span className="text-primary font-semibold">{publicToken.symbol}</span>
            <span className="text-sm text-gray-500">{getConfidentialSymbol(tokenPair)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <CleartextBalance balance={balances?.publicBalance} decimals={publicToken.decimals} />
          {confidentialToken && (
            <EncryptedBalance ctHash={balances?.confidentialBalance} decimals={confidentialToken.decimals} />
          )}
        </div>
      </div>
    </Button>
  );
}
