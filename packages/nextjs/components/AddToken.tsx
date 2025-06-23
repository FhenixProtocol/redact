import React, { useState } from "react";
import { EncryptedBalance } from "./ui/EncryptedValue";
import { TokenIconSymbol } from "./ui/TokenIconSymbol";
import { ClearOutlined } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { PlusIcon, TriangleAlert } from "lucide-react";
import { toast } from "react-hot-toast";
import { isAddress } from "viem";
import { Button } from "~~/components/ui/Button";
import { FnxInput } from "~~/components/ui/FnxInput";
import { Spinner } from "~~/components/ui/Spinner";
import { formatTokenAmount } from "~~/lib/common";
import {
  ConfidentialTokenPairWithBalances,
  TokenItemData,
  addArbitraryToken,
  searchArbitraryToken,
} from "~~/services/store/tokenStore";

interface AddTokenProps {
  onClose?: () => void;
}

export function AddToken({ onClose }: AddTokenProps) {
  const [loadingTokenDetails, setLoadingTokenDetails] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [isValidInput, setIsValidInput] = useState(false);
  const [tokenDetails, setTokenDetails] = useState<ConfidentialTokenPairWithBalances | null>(null);

  const arbitraryTokenSearch = async (address: string) => {
    const result = await searchArbitraryToken(address);
    if (result) {
      setTokenDetails(result);
    } else {
      toast.error("Token not found");
      console.log("Token not found");
    }
    setLoadingTokenDetails(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTokenAddress(value);
    setTokenDetails(null);

    const isValid = value !== "" && isAddress(value);
    if (!isValid) {
      setIsValidInput(false);
      return;
    }
    setIsValidInput(true);

    setLoadingTokenDetails(true);
    arbitraryTokenSearch(value);
  };

  const handleSearch = async () => {
    setTokenDetails(null);
    setLoadingTokenDetails(true);
    arbitraryTokenSearch(tokenAddress);
  };

  const resetData = () => {
    setTokenAddress("");
    setTokenDetails(null);
    setLoadingTokenDetails(false);
  };

  const handleAdd = () => {
    if (tokenDetails == null) return;
    addArbitraryToken(tokenDetails);
    if (onClose) onClose();
  };

  const SpinnerIcon = () => <Spinner size={16} />;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="text-[18px] text-primary font-semibold">Token contract address:</div>
      <FnxInput
        variant="md"
        noOutline={true}
        placeholder="0x..."
        value={tokenAddress}
        onChange={handleInputChange}
        className={`w-full  ${!isValidInput ? "border-red-500" : ""}`}
        error={!isValidInput ? "Invalid address format" : undefined}
        fades={true}
      />
      <AnimatePresence>
        <PublicTokenDetails
          tokenDetails={tokenDetails?.pair.publicToken}
          balance={tokenDetails?.balances.publicBalance}
        />
        <ConfidentialTokenDetails
          publicTokenDetails={tokenDetails?.pair.publicToken}
          confidentialTokenDetails={tokenDetails?.pair.confidentialToken}
          requiresDeployment={!tokenDetails?.pair.confidentialTokenDeployed}
          confidentialBalance={tokenDetails?.balances.confidentialBalance}
        />
        <WarningRow />
      </AnimatePresence>

      <div className="flex gap-2">
        <Button
          variant="default"
          className="flex-1 text-white"
          uppercase={true}
          onClick={!tokenDetails ? handleSearch : handleAdd}
          disabled={!tokenDetails || loadingTokenDetails}
          icon={loadingTokenDetails ? SpinnerIcon : PlusIcon}
        >
          {loadingTokenDetails ? "Loading..." : "Add"}
        </Button>
        <Button
          variant="surface"
          className="flex-1"
          icon={ClearOutlined}
          uppercase={true}
          onClick={() => {
            resetData();
            if (onClose) onClose();
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export const PublicTokenDetails = ({
  tokenDetails,
  balance,
}: {
  tokenDetails: TokenItemData | undefined;
  balance: bigint | undefined;
}) => {
  const { name, decimals } = tokenDetails || {};

  return (
    <>
      {tokenDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-row border-1 border-primary-accent rounded-lg p-2 items-center gap-4 min-h-20"
        >
          <TokenIconSymbol publicToken={tokenDetails} className="text-primary-accent bg-button-hover p-1.5 pr-3" />
          <div className="flex flex-col flex-1 gap-2">
            <span className="text-primary font-semibold font-reddit-mono">{name}</span>
            <div className="flex flex-row justify-between gap-4 text-sm text-base-content/60 dark:text-white/70">
              <span>
                Decimals: <span className="font-semibold font-reddit-mono">{decimals}</span>
              </span>
              <span>
                Balance:{" "}
                <span className="font-semibold font-reddit-mono">
                  {balance ? formatTokenAmount(balance, decimals ?? 18) : "0"}
                </span>
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

export const ConfidentialTokenDetails = ({
  publicTokenDetails,
  confidentialTokenDetails,
  requiresDeployment,
  confidentialBalance,
}: {
  publicTokenDetails: TokenItemData | undefined;
  confidentialTokenDetails: TokenItemData | undefined;
  requiresDeployment: boolean;
  confidentialBalance: bigint | undefined;
}) => {
  const { symbol: publicSymbol } = publicTokenDetails || {};
  const { name, decimals } = confidentialTokenDetails || {};

  return (
    <>
      {publicTokenDetails != null && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-row border-1 border-primary-accent rounded-lg p-2 items-center gap-4 min-h-20"
        >
          <TokenIconSymbol
            publicToken={publicTokenDetails}
            confidentialToken={confidentialTokenDetails}
            isConfidential={true}
            className="text-primary-accent bg-button-hover p-1.5 pr-3"
          />
          {requiresDeployment && (
            <div className="flex flex-col flex-1 gap-2 text-sm text-primary">
              <b>Does not exist.</b>
              <span>
                You will need to deploy <b>e{publicSymbol}</b> before encrypting your <b>{publicSymbol}</b> balance.
              </span>
            </div>
          )}
          {!requiresDeployment && (
            <div className="flex flex-col flex-1 gap-2">
              <span className="text-primary font-semibold font-reddit-mono">{name}</span>
              <div className="flex flex-row justify-between gap-4 text-sm text-base-content/60 dark:text-white/70">
                <span>
                  Decimals: <span className="font-semibold font-reddit-mono">{decimals}</span>
                </span>
                <EncryptedBalance ctHash={confidentialBalance} decimals={decimals} />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </>
  );
};

export const WarningRow = () => {
  return (
    <div className="flex flex-row gap-4 items-center">
      <TriangleAlert className="w-6 h-6 text-warning-500" />
      <div className="flex flex-col gap-1">
        <div className="text-primary text-xs font-bold">Always do your research.</div>
        <div className="text-primary text-xs font-bold">
          This token isn{"'"}t traded on leading U.S. centralized exchanges.
        </div>
      </div>
    </div>
  );
};
