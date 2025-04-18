import React, { useState } from "react";
import { TokenIcon } from "./ui/TokenIcon";
import { ClearOutlined } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { PlusIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { isAddress } from "viem";
import { Button } from "~~/components/ui/Button";
import { FnxInput } from "~~/components/ui/FnxInput";
import { Spinner } from "~~/components/ui/Spinner";
import { cn } from "~~/lib/utils";
import {
  ConfidentialTokenPairWithBalances,
  TokenItemData,
  addArbitraryToken,
  searchArbitraryToken,
} from "~~/services/store/tokenStore2";

interface AddTokenProps {
  onClose?: () => void;
}

export function AddToken({ onClose }: AddTokenProps) {
  const [loadingTokenDetails, setLoadingTokenDetails] = useState(false);
  const [warningAccepted, setWarningAccepted] = useState(false);
  const [, setIsAddingToken] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [tokenDetails, setTokenDetails] = useState<ConfidentialTokenPairWithBalances | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const handleInputValidationAndSearch = async (value: string) => {
    if (value === "" || !isAddress(value)) {
      setInputError("Invalid address");
      setTokenDetails(null);
      setLoadingTokenDetails(false);
      return;
    }

    setInputError(null);
    setTokenDetails(null);
    setLoadingTokenDetails(true);
    arbitraryTokenSearch(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    handleInputValidationAndSearch(value);
  };

  const handleSearch = async () => {
    handleInputValidationAndSearch(inputValue);
  };

  const clearState = () => {
    setInputValue("");
    setInputError(null);
    setTokenDetails(null);
    setIsAddingToken(false);
  };

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

  const handleAdd = () => {
    if (!tokenDetails) return;
    if (!warningAccepted) return;
    addArbitraryToken(tokenDetails);
    toast.success("Token added successfully");
    clearState();
    if (onClose) onClose();
  };
  const SpinnerIcon = () => <Spinner size={16} />;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="text-[18px] text-primary font-semibold">Token contract address:</div>
      <FnxInput
        variant="md"
        noOutline={true}
        placeholder="0x..."
        value={inputValue}
        onChange={handleInputChange}
        className={cn("w-full", inputError != null && "border-red-500")}
        error={inputError ?? undefined}
        fadeEnd={true}
      />
      <AnimatePresence>
        {inputError != null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-red-500 italic ml-4">{inputError}</div>
          </motion.div>
        )}
        <PublicTokenDetails tokenDetails={tokenDetails?.pair.publicToken} />
        <ConfidentialTokenDetails
          publicTokenDetails={tokenDetails?.pair.publicToken}
          confidentialTokenDetails={tokenDetails?.pair.confidentialToken}
        />
        <ArbitraryTokenWarning
          show={tokenDetails?.pair.publicToken != null}
          accepted={warningAccepted}
          onAccept={accepted => setWarningAccepted(accepted)}
        />
      </AnimatePresence>

      <div className="flex gap-2">
        <Button
          variant="default"
          className="flex-1 text-white"
          uppercase={true}
          onClick={!tokenDetails ? handleSearch : handleAdd}
          disabled={!warningAccepted || inputError != null || !tokenDetails || loadingTokenDetails}
          icon={loadingTokenDetails ? SpinnerIcon : PlusIcon}
        >
          {loadingTokenDetails ? "Loading..." : "Add Token"}
        </Button>
        <Button
          variant="surface"
          className="flex-1"
          icon={ClearOutlined}
          uppercase={true}
          onClick={() => {
            clearState();
            if (onClose) onClose();
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export const PublicTokenDetails = ({ tokenDetails }: { tokenDetails: TokenItemData | undefined }) => {
  const { name, symbol, decimals } = tokenDetails || {};

  return (
    <>
      {tokenDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-primary font-semibold">ERC20 Token:</div>
          <div className="mt-2 mb-2 border-1 border-primary-accent rounded-lg p-2">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
                <TokenIcon token={tokenDetails} />
              </div>
              <div className="flex flex-col">
                <span className="text-primary font-semibold">{name}</span>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Symbol: {symbol}</span>
                  <span>Decimals: {decimals}</span>
                </div>
              </div>
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
}: {
  publicTokenDetails: TokenItemData | undefined;
  confidentialTokenDetails: TokenItemData | undefined;
}) => {
  const { symbol: publicSymbol } = publicTokenDetails || {};
  const { name, symbol, decimals } = confidentialTokenDetails || {};

  return (
    <>
      {publicTokenDetails != null && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-primary font-semibold">FHERC20 Token:</div>
          <div className="mt-2 mb-2 border-1 border-primary-accent rounded-lg p-2">
            {confidentialTokenDetails == null && (
              <div className="text-xs text-primary">
                <b>e{publicSymbol} does not exist.</b>
                <br />
                <br />
                You will need to deploy <b>e{publicSymbol}</b> before encrypting your <b>{publicSymbol}</b> balance.
              </div>
            )}
            {confidentialTokenDetails != null && (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
                  <TokenIcon token={confidentialTokenDetails} />
                </div>
                <div className="flex flex-col">
                  <span className="text-primary font-semibold">{name}</span>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Symbol: {symbol}</span>
                    <span>Decimals: {decimals}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
};

const ArbitraryTokenWarning = ({
  show,
  accepted,
  onAccept,
}: {
  show: boolean;
  accepted: boolean;
  onAccept: (accepted: boolean) => void;
}) => {
  return (
    <>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-sm text-yellow-500 mx-2">
            <div className="mb-2">
              ⚠️ This token doesn't appear in the active token list(s). Make sure that you trust the token you are
              adding.
            </div>
            <div className="mb-2">
              Anyone can create a token, including creating fake versions of existing tokens that claim to represent
              projects. DYOR!
            </div>
            <div className="my-4 w-full flex justify-center items-center gap-2">
              <input
                type="checkbox"
                id="token-warning-checkbox"
                checked={accepted}
                onChange={() => onAccept(!accepted)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="token-warning-checkbox" className="cursor-pointer font-semibold">
                I understand the risks
              </label>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};
