import React, { useMemo, useState } from "react";
import { CleartextBalance } from "./ui/CleartextBalance";
import { EncryptedBalance } from "./ui/EncryptedValue";
import { Separator } from "./ui/Separator";
import { TokenIcon } from "./ui/TokenIcon";
import { PlusIcon } from "lucide-react";
import { useChainId } from "wagmi";
import { Button } from "~~/components/ui/Button";
import { FnxInput } from "~~/components/ui/FnxInput";
import { ETH_ADDRESS, getConfidentialSymbol } from "~~/lib/common";
import { useGlobalState } from "~~/services/store/store";
import { ConfidentialTokenPair, useConfidentialTokenPairBalances, useTokenStore } from "~~/services/store/tokenStore";

interface SelectTokenProps {
  onSelectTokenPair: (tokenPair: ConfidentialTokenPair, isEncrypt?: boolean) => void;
  onClose?: () => void;
}

export function SelectToken({ onSelectTokenPair, onClose }: SelectTokenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const chainId = useChainId();
  const store = useTokenStore();
  const { setAddTokenModalOpen } = useGlobalState();

  // Get all token pairs from the store
  const { wethPair, ethPair, tokenPairs } = useMemo(() => {
    const chainPairs = store.pairs[chainId] || {};
    const pairs = Object.values(chainPairs);

    return pairs.reduce(
      (acc, pair) => {
        if (pair.isWETH) acc.wethPair = pair;
        else if (pair.publicToken.address.toLowerCase() === ETH_ADDRESS) acc.ethPair = pair;
        else acc.tokenPairs.push(pair);
        return acc;
      },
      {
        wethPair: null as ConfidentialTokenPair | null,
        ethPair: null as ConfidentialTokenPair | null,
        tokenPairs: [] as ConfidentialTokenPair[],
      },
    );
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

  const handleSelectToken = (tokenPair: ConfidentialTokenPair, isEncrypt?: boolean) => {
    onSelectTokenPair(tokenPair, isEncrypt);
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
        fades={true}
      />

      {/* ETH/WETH Row */}
      <EthWethRow wethPair={wethPair} ethPair={ethPair} onSelect={handleSelectToken} />
      <Separator />

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

function EthWethRow({
  wethPair,
  ethPair,
  onSelect,
}: {
  wethPair: ConfidentialTokenPair | null;
  ethPair: ConfidentialTokenPair | null;
  onSelect: (tokenPair: ConfidentialTokenPair, isEncrypt: boolean) => void;
}) {
  const ethBalances = useConfidentialTokenPairBalances(ethPair?.publicToken.address);
  const wethBalances = useConfidentialTokenPairBalances(wethPair?.publicToken.address);

  return (
    <div className="flex flex-row gap-2 overflow-hidden rounded-lg">
      {ethPair && (
        <Button
          variant="surface"
          className="p-2 flex-1 rounded-none w-full justify-start bg-white/30 hover:bg-white/50"
          onClick={() => onSelect(ethPair, true)}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                <TokenIcon publicToken={ethPair.publicToken} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-primary font-semibold">{ethPair.publicToken.symbol}</span>
                <CleartextBalance
                  balance={ethBalances?.publicBalance}
                  decimals={ethPair.publicToken.decimals}
                  showIcon={false}
                  left
                  className="min-w-0 px-0"
                />
              </div>
            </div>
          </div>
        </Button>
      )}
      {wethPair && (
        <Button
          variant="surface"
          className="p-2 flex-1 rounded-none w-full justify-start bg-white/30 hover:bg-white/50"
          onClick={() => onSelect(wethPair, true)}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                <TokenIcon publicToken={wethPair.publicToken} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-primary font-semibold">{wethPair.publicToken.symbol}</span>
                <CleartextBalance
                  balance={wethBalances?.publicBalance}
                  decimals={wethPair.publicToken.decimals}
                  showIcon={false}
                  left
                  className="min-w-0 px-0"
                />
              </div>
            </div>
          </div>
        </Button>
      )}
      {ethPair && (
        <Button
          variant="surface"
          className="p-2 flex-1 rounded-none w-full justify-start bg-white/30 hover:bg-white/50"
          onClick={() => onSelect(ethPair, false)}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                <TokenIcon publicToken={ethPair.publicToken} isConfidential />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-primary font-semibold">{getConfidentialSymbol(ethPair)}</span>
                <EncryptedBalance
                  ctHash={ethBalances?.confidentialBalance}
                  decimals={ethPair.confidentialToken?.decimals}
                  showIcon={false}
                  className="min-w-0 px-0"
                />
              </div>
            </div>
          </div>
        </Button>
      )}
    </div>
  );
}

function TokenListItem({ tokenPair, onSelect }: { tokenPair: ConfidentialTokenPair; onSelect: () => void }) {
  const { publicToken, confidentialToken } = tokenPair;
  const balances = useConfidentialTokenPairBalances(publicToken.address);

  return (
    <Button
      variant="surface"
      className="p-3 rounded-none w-full justify-start bg-white/30 hover:bg-white/50"
      onClick={onSelect}
    >
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
