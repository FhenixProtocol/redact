import React, { useMemo, useState } from "react";
import Image from "next/image";
import { ClearOutlined, ReportProblemOutlined } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { PlusIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { isAddress } from "viem";
import { Button } from "~~/components/ui/Button";
import { FnxInput } from "~~/components/ui/FnxInput";
import { Spinner } from "~~/components/ui/Spinner";
import { type TokenDetails, useTokenDetails } from "~~/hooks/useTokenBalance";
import { getTokenLogo } from "~~/lib/tokenUtils";
import { ConfidentialTokenPairWithBalances, TokenItemData, searchArbitraryToken } from "~~/services/store/tokenStore2";

interface AddTokenProps {
  onAddToken?: (token: TokenDetails) => void;
  onClose?: () => void;
}

export function AddToken({ onAddToken, onClose }: AddTokenProps) {
  const [loadingTokenDetails, setLoadingTokenDetails] = useState(false);
  const [, setIsAddingToken] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [isValidInput, setIsValidInput] = useState<boolean>(true);
  const [tokenDetails, setTokenDetails] = useState<ConfidentialTokenPairWithBalances | null>(null);
  const { isError, isLoading, fetchDetails } = useTokenDetails();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setLoadingTokenDetails(true);
    setTokenDetails(null);

    if (value !== "" && isAddress(value)) {
      setIsValidInput(true);
      arbitraryTokenSearch(value);
    } else {
      setIsValidInput(false);
      setTokenDetails(null);
    }
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

  const handleSearch = async () => {
    setTokenDetails(null);
    setLoadingTokenDetails(true);
    arbitraryTokenSearch(tokenAddress);
  };

  const handleAdd = () => {
    console.log("tokenDetails", tokenDetails);
    console.log("Handle Add");
    // if (tokenDetails) {
    //   if (isDeployNeeded) {
    //     //TODO: Deploy token here and continue if success
    //   }

    //   const existingTokens: TokenListItem[] = JSON.parse(localStorage.getItem("tokenList") || "[]");

    //   const tokenExists = existingTokens.some(
    //     token => token.address.toLowerCase() === tokenDetails.address.toLowerCase(),
    //   );

    //   if (!tokenExists) {
    //     const newToken: TokenListItem = {
    //       name: tokenDetails.name,
    //       symbol: tokenDetails.symbol,
    //       decimals: tokenDetails.decimals,
    //       address: tokenDetails.address,
    //       image: "",
    //       confidentialAddress: "0x0000000000000000000000000000000000000000",
    //     };
    //     addToken(newToken);

    //     // const updatedTokens = [...existingTokens, newToken];
    //     // localStorage.setItem('tokenList', JSON.stringify(updatedTokens));

    //     // // Update the global token list
    //     // updateTokens();

    //     // Make sure we pass the token details to the parent
    //     if (onAddToken) {
    //       onAddToken(tokenDetails);
    //     }

    //     setTokenAddress("");
    //     setIsAddingToken(false);
    //     setTokenDetails(null);
    //     setInputValue("");
    //   } else {
    //     toast.error("Token already exists in the list");
    //     console.log("Token already exists in the list");
    //   }
    // }
  };
  const SpinnerIcon = () => <Spinner size={16} />;

  const isDeployNeeded = useMemo(() => {
    if (tokenDetails?.pair.confidentialTokenDeployed) return false;
    return true;
  }, [tokenDetails?.pair.confidentialTokenDeployed]);

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="text-[18px] text-primary font-semibold">Token contract address:</div>
      <FnxInput
        variant="md"
        noOutline={true}
        placeholder="0x..."
        value={inputValue}
        onChange={handleInputChange}
        className={`w-full  ${!isValidInput ? "border-red-500" : ""}`}
        error={!isValidInput ? "Invalid address format" : undefined}
        fadeEnd={true}
      />
      <AnimatePresence>
        <PublicTokenDetails tokenDetails={tokenDetails?.pair.publicToken} />
        <ConfidentialTokenDetails
          publicTokenDetails={tokenDetails?.pair.publicToken}
          confidentialTokenDetails={tokenDetails?.pair.confidentialToken}
          requiresDeployment={isDeployNeeded}
        />
      </AnimatePresence>

      <div className="flex gap-2">
        <Button
          variant="default"
          className="flex-1 text-white"
          uppercase={true}
          onClick={!tokenDetails ? handleSearch : handleAdd}
          disabled={isLoading || isError || !tokenDetails || loadingTokenDetails}
          icon={loadingTokenDetails ? SpinnerIcon : PlusIcon}
        >
          {loadingTokenDetails ? "Loading..." : isDeployNeeded ? "Deploy" : "Add"}
        </Button>
        <Button
          variant="surface"
          className="flex-1"
          icon={ClearOutlined}
          uppercase={true}
          onClick={() => {
            setTokenAddress("");
            setTokenDetails(null);
            setIsAddingToken(false);
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

  const icon = useMemo(() => {
    if (symbol) return getTokenLogo(symbol);
    return "/token-icons/default-token.webp";
  }, [symbol]);

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
                <Image
                  src={icon}
                  alt={symbol ?? "Token Icon"}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
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
  requiresDeployment,
}: {
  publicTokenDetails: TokenItemData | undefined;
  confidentialTokenDetails: TokenItemData | undefined;
  requiresDeployment: boolean;
}) => {
  const { symbol: publicSymbol } = publicTokenDetails || {};
  const { name, symbol, decimals } = confidentialTokenDetails || {};

  const icon = useMemo(() => {
    if (symbol) return getTokenLogo(symbol);
    return "/token-icons/default-token.webp";
  }, [symbol]);

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
            {requiresDeployment && (
              <div className="text-xs text-primary">
                <b>e{publicSymbol} does not exist.</b>
                <br />
                <br />
                You will need to deploy <b>e{publicSymbol}</b> before encrypting your <b>{publicSymbol}</b> balance.
              </div>
            )}
            {!requiresDeployment && (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
                  <Image
                    src={icon}
                    alt={symbol ?? "Token Icon"}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
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
