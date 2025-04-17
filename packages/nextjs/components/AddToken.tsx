import React, { useMemo, useState } from "react";
import Image from "next/image";
import { ClearOutlined } from "@mui/icons-material";
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
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [isValidInput, setIsValidInput] = useState<boolean>(true);
  const [tokenDetails, setTokenDetails] = useState<ConfidentialTokenPairWithBalances | null>(null);
  const { isError, isLoading, fetchDetails } = useTokenDetails();
  const [isDeployNeeded, setIsDeployNeeded] = useState<boolean>(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const { addToken, deployToken } = useTokenStore();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setLoadingTokenDetails(true);
    setTokenDetails(null);

    if (value !== "" && isAddress(value)) {
      setIsValidInput(true);
      arbitraryTokenSearch(value);
    } else {
      resetData();
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

    //   const tokenExists = existingTokens.some(
    //     token => token.address.toLowerCase() === tokenDetails.address.toLowerCase(),
    //   );

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

    //     // const updatedTokens = [...existingTokens, newToken];
    //     // localStorage.setItem('tokenList', JSON.stringify(updatedTokens));

    //     // // Update the global token list
    //     // updateTokens();

    //     // Make sure we pass the token details to the parent
    //     if (onAddToken) {
    //       onAddToken(tokenDetails);
    //     }

        resetData();
      } else {
        toast.error("Token already exists in the list");
        console.log("Token already exists in the list");
      }
    }
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
            <div className="mb-2">⚠️ This token doesn't appear in the active token list(s). Make sure that you</div>
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
