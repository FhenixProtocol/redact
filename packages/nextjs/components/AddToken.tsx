import React, { useState } from "react";
import Image from "next/image";
import { ClearOutlined, ReportProblemOutlined } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { PlusIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { type Address, isAddress } from "viem";
import { Button } from "~~/components/ui/Button";
import { FnxInput } from "~~/components/ui/FnxInput";
import { Spinner } from "~~/components/ui/Spinner";
import { type TokenDetails, confidentialTokenExists, useTokenDetails } from "~~/hooks/useTokenBalance";
import { getTokenLogo } from "~~/lib/tokenUtils";
import { useTokenStore } from "~~/services/store/tokenStore";
import { _fetchTokenData, searchArbitraryToken } from "~~/services/store/tokenStore2";

interface AddTokenProps {
  onAddToken?: (token: TokenDetails) => void;
  onClose?: () => void;
}

interface TokenListItem {
  name: string;
  symbol: string;
  decimals: number;
  image: string;
  address: string;
  confidentialAddress: string;
}

export function AddToken({ onAddToken, onClose }: AddTokenProps) {
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [isValidInput, setIsValidInput] = useState<boolean>(true);
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const { isError, isLoading, fetchDetails } = useTokenDetails();
  const [isDeployNeeded, setIsDeployNeeded] = useState<boolean>(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const { addToken, deployToken } = useTokenStore();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value !== "" && isAddress(value)) {
      setIsValidInput(true);
      arbitraryTokenSearch(value);
      search(value);
    } else {
      resetData();
    }
  };

  const arbitraryTokenSearch = async (address: string) => {
    // Check if address is a deployed token
    const result = await searchArbitraryToken(address);
    console.log("result", result);
  };

  const search = async (address: string) => {
    setTokenDetails(null);
    const details = await fetchDetails(address as Address);
    if (details) {
      setTokenDetails(details);
      const result = await confidentialTokenExists(address as Address);
      console.log("confidentialTokenExists!!!!", result);
      setIsDeployNeeded(!result);
    } else {
      toast.error("Token not found");
      console.log("Token not found");
    }
  };

  const handleSearch = async () => {
    setTokenDetails(null);
    const details = await fetchDetails(tokenAddress as Address);
    if (details) {
      setTokenDetails(details);
    } else {
      toast.error("Token not found");
      console.log("Token not found");
    }
  };

  const resetData = (resetDeployError: boolean = true) => {
    setTokenAddress("");
    setIsAddingToken(false);
    setTokenDetails(null);
    if (resetDeployError) {
      setDeployError(null);
    }
    setInputValue("");
  };

  const handleAdd = async () => {
    if (tokenDetails) {
      setIsAddingToken(true);
      const existingTokens: TokenListItem[] = JSON.parse(localStorage.getItem("tokenList") || "[]");

      const tokenExists = existingTokens.some(
        token => token.address.toLowerCase() === tokenDetails.address.toLowerCase(),
      );

      if (!tokenExists) {
        const newToken: TokenListItem = {
          name: tokenDetails.name,
          symbol: tokenDetails.symbol,
          decimals: tokenDetails.decimals,
          address: tokenDetails.address,
          image: "",
          confidentialAddress: "0x0000000000000000000000000000000000000000",
        };
        if (isDeployNeeded) {
          const result = await deployToken(newToken);
          if (result.error) {
            //toast.error(result.error);
            console.log("Error deploying token", result.error);
            setDeployError(result.error);
            setIsAddingToken(false);
            return;
          }
        } else {
          addToken(newToken);
        }

        // const updatedTokens = [...existingTokens, newToken];
        // localStorage.setItem('tokenList', JSON.stringify(updatedTokens));

        // // Update the global token list
        // updateTokens();

        // Make sure we pass the token details to the parent
        if (onAddToken) {
          onAddToken(tokenDetails);
        }

        resetData();
      } else {
        toast.error("Token already exists in the list");
        console.log("Token already exists in the list");
      }
    }
  };
  const SpinnerIcon = () => <Spinner size={16} />;

  const tokenLogo = tokenDetails ? getTokenLogo(tokenDetails.symbol) : "/token-icons/default-token.webp";

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
        {tokenDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mt-2 mb-2 border-1 border-primary-accent rounded-lg p-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
                  <Image
                    src={tokenLogo}
                    alt={tokenDetails.symbol || "Token"}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-primary font-semibold">{tokenDetails.name}</span>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Symbol: {tokenDetails.symbol}</span>
                    <span>Decimals: {tokenDetails.decimals}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              {isDeployNeeded && (
                <>
                  <ReportProblemOutlined className="text-warning-500" />
                  <div className="text-xs text-primary font-semibold">
                    {deployError ? (
                      <div className="text-red-500 mt-2">{deployError}</div>
                    ) : (
                      <>
                        Confidential token does not exist.
                        <br />
                        You can deploy it by clicking the {'"'}Deploy Token{'"'} button.
                        <br />
                        This can cost you some gas fees.
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <Button
          variant="default"
          className="flex-1 text-white"
          uppercase={true}
          onClick={!tokenDetails ? handleSearch : handleAdd}
          disabled={isLoading || isError || !tokenDetails || isAddingToken}
          icon={isLoading ? SpinnerIcon : PlusIcon}
        >
          {isLoading ? "Loading..." : isAddingToken ? "Adding Token..." : isDeployNeeded ? "Deploy Token" : "Add Token"}
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
