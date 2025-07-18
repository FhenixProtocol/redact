import { useEffect, useMemo, useRef, useState } from "react";
import { TransactionGuide } from "./TransactionGuide";
import { TxGuideStepState } from "./TransactionGuide";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Eye, EyeOff } from "lucide-react";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";
import { Chain } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { TokenSelector } from "~~/components/TokenSelector";
import { Button } from "~~/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~~/components/ui/FnxCard";
import { RadioButtonGroup } from "~~/components/ui/FnxRadioGroup";
import { Slider } from "~~/components/ui/FnxSlider";
import { targetNetworksNoHardhat, useCofhe, useIsConnectedChainSupported } from "~~/hooks/useCofhe";
import { useClaimAllAction, useDecryptFherc20Action } from "~~/hooks/useDecryptActions";
import { useApproveFherc20Action, useDeployFherc20Action, useEncryptErc20Action } from "~~/hooks/useEncryptActions";
import { formatTokenAmount } from "~~/lib/common";
import { getConfidentialSymbol } from "~~/lib/common";
import { usePairClaims } from "~~/services/store/claim";
import {
  useEncryptDecryptBalances,
  useEncryptDecryptFormattedAllowance,
  useEncryptDecryptHasInteracted,
  useEncryptDecryptInputString,
  useEncryptDecryptIsEncrypt,
  useEncryptDecryptPair,
  useEncryptDecryptPercentValue,
  useEncryptDecryptRawInputValue,
  useEncryptDecryptRequiresApproval,
  useEncryptDecryptSetIsEncrypt,
  useEncryptDecryptValueError,
  useSelectEncryptDecryptToken,
  useSetEncryptDecryptHasInteracted,
  useUpdateEncryptDecryptValue,
  useUpdateEncryptDecryptValueByPercent,
} from "~~/services/store/encryptDecrypt";
import { useDefaultConfidentialTokenPair } from "~~/services/store/tokenStore";

export function MainTokenSwapping() {
  const isEncrypt = useEncryptDecryptIsEncrypt();
  const [isControlsDisabled, setIsControlsDisabled] = useState(false);
  const setInputValue = useUpdateEncryptDecryptValue();
  const currentRawInputValue = useEncryptDecryptInputString();
  const prevIsEncryptRef = useRef(isEncrypt);
  const preservedInputValueRef = useRef(currentRawInputValue);

  // Auto-select first pair if none is selected
  const pair = useEncryptDecryptPair();
  const defaultPair = useDefaultConfidentialTokenPair();
  const selectToken = useSelectEncryptDecryptToken();

  useEffect(() => {
    // If no pair is selected but we have a default pair available, select it
    if (!pair && defaultPair) {
      selectToken(defaultPair.publicToken.address, true); // Default to encrypt mode
    }
  }, [pair, defaultPair, selectToken]);

  useEffect(() => {
    if (prevIsEncryptRef.current !== isEncrypt) {
      preservedInputValueRef.current = currentRawInputValue;
    } else {
      preservedInputValueRef.current = currentRawInputValue;
    }
  }, [isEncrypt, currentRawInputValue]);

  useEffect(() => {
    if (prevIsEncryptRef.current !== isEncrypt) {
      setInputValue(preservedInputValueRef.current);
      prevIsEncryptRef.current = isEncrypt;
    }
  }, [isEncrypt, setInputValue]);

  return (
    <div className="text-center inline-block w-full">
      <div className="flex gap-8 items-center justify-center w-full max-w-[450px] md:w-[450px] mx-auto rounded-3xl drop-shadow-xl">
        <Card className="rounded-[inherit] w-full max-w-[450px] bg-background/60 border-component-stroke firefox-compatible-backdrop-blur-xs">
          <ConnectOverlay />
          <SupportedChainsOverlay />
          <CofhejsInitializedOverlay />

          <CardHeader>
            <CardTitle className="flex justify-between text-primary-accent text-xl">
              <div>{isEncrypt ? "Encrypt" : "Decrypt"}</div>
              {isEncrypt ? <EyeOff size={24} /> : <Eye size={24} />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <EncryptDecryptActionSelectionRow />

              <hr className="border-t border-gray-300 my-4" />

              <AmountInputRow disabled={isControlsDisabled} />
              <AmountSliderRow disabled={isControlsDisabled} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 justify-center items-start">
            {isEncrypt && <EncryptTransactionGuide setIsControlsDisabled={setIsControlsDisabled} />}
            {!isEncrypt && <DecryptTransactionGuide setIsControlsDisabled={setIsControlsDisabled} />}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

const ConnectOverlay = () => {
  const { isConnected } = useAccount();
  if (isConnected) return null;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 firefox-compatible-backdrop-blur-sm w-[99%] h-[99%] z-200 rounded-[inherit] flex items-center justify-center [background-image:repeating-linear-gradient(45deg,#FFFFFF15,#FFFFFF15_10px,transparent_10px,transparent_25px)]">
      <div className="text-lg font-semibold text-theme-black">Connect your wallet to start encrypting</div>
    </div>
  );
};

const SupportedChainsOverlay = () => {
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const isChainSupported = useIsConnectedChainSupported();

  if (!isConnected) return null;
  if (isChainSupported) return null;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 firefox-compatible-backdrop-blur-sm w-[99%] h-[99%] z-200 rounded-[inherit] flex items-center justify-center [background-image:repeating-linear-gradient(45deg,#FFFFFF15,#FFFFFF15_10px,transparent_10px,transparent_25px)]">
      <div className="flex flex-col gap-4 items-center">
        <div className="text-md text-theme-black px-8 text-center font-bold">
          Redact is in testnet, and is only available on the following chains
        </div>
        <div className="text-md text-theme-black px-8 text-center font-bold">Click to switch chain:</div>
        <div className="flex flex-row gap-2 items-center justify-center flex-wrap">
          {targetNetworksNoHardhat.map((network: Chain) => (
            <Button
              key={network.id}
              onClick={() => switchChain({ chainId: network.id })}
              className="bg-primary-accent text-white hover:bg-primary-accent/90"
              size="md"
            >
              {network.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

const CofhejsInitializedOverlay = () => {
  const { theme } = useTheme();
  const { isConnected } = useAccount();
  const isChainSupported = useIsConnectedChainSupported();
  const { isInitialized } = useCofhe({
    // coFheUrl: "https://testnet-cofhe.fhenix.zone",
    // verifierUrl: "https://testnet-cofhe-vrf.fhenix.zone",
    // thresholdNetworkUrl: "https://testnet-cofhe-tn.fhenix.zone",
  });
  if (!isConnected || !isChainSupported) return null;
  if (isInitialized) return null;

  return (
    <div className="absolute flex-col gap-4 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 firefox-compatible-backdrop-blur-sm w-[99%] h-[99%] z-200 rounded-[inherit] flex items-center justify-center [background-image:repeating-linear-gradient(45deg,#FFFFFF15,#FFFFFF15_10px,transparent_10px,transparent_25px)]">
      <div className="text-lg font-semibold text-theme-black">Waiting for Cofhe to initialize...</div>
      <div>
        <DotLottieReact
          src={`/lottie/CoFHE-${theme === "dark" ? "White" : "Black"}.lottie`}
          speed={0.7}
          style={{ width: "150px", height: "150px" }}
          loop
          autoplay
        />
      </div>
    </div>
  );
};

const EncryptDecryptActionSelectionRow = () => {
  const setIsEncrypt = useEncryptDecryptSetIsEncrypt();
  const isEncrypt = useEncryptDecryptIsEncrypt();

  return (
    <RadioButtonGroup
      labels={["Encrypt", "Decrypt"]}
      Icons={[EyeOff, Eye]}
      value={isEncrypt ? "Encrypt" : "Decrypt"}
      onChange={(val: string) => setIsEncrypt(val === "Encrypt")}
    />
  );
};

const AmountInputRow = ({ disabled }: { disabled: boolean }) => {
  const isEncrypt = useEncryptDecryptIsEncrypt();
  const inputValueRaw = useEncryptDecryptInputString();
  const setInputValue = useUpdateEncryptDecryptValue();
  const pair = useEncryptDecryptPair();
  const balances = useEncryptDecryptBalances();
  const setToken = useSelectEncryptDecryptToken();
  const setSliderValue = useUpdateEncryptDecryptValueByPercent();
  const setHasInteracted = useSetEncryptDecryptHasInteracted();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasInteracted(true);
    let value = e.target.value;

    const currentTokenDecimals = pair?.publicToken.decimals ?? 18;

    if (value.includes(".")) {
      const parts = value.split(".");
      // parts[0] is the integer part, parts[1] is the fractional part
      if (parts[1] && parts[1].length > currentTokenDecimals) {
        parts[1] = parts[1].substring(0, currentTokenDecimals);
        value = parts.join(".");
      }
    }
    setInputValue(value);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select();
    }
  };

  const handleTokenChange = (val: string, isEncrypt?: boolean) => {
    setHasInteracted(true);
    setToken(val, isEncrypt);
  };

  const handleMaxClick = () => {
    setHasInteracted(true);
    setSliderValue(100);
  };

  return (
    <div className="mb-5 w-full flex content-stretch rounded-2xl border border-[#3399FF] p-4">
      <div className="flex flex-col items-start flex-1">
        <div className="text-sm text-[#336699] font-semibold">{isEncrypt ? "You Deposit" : "You Withdraw"}</div>

        <input
          disabled={disabled}
          type="number"
          min="0"
          value={inputValueRaw === "" ? "0" : inputValueRaw}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="w-30 text-lg text-primary-accent font-bold outline-none no-spinner"
        />
        {/* TODO: add fiat amount */}
        <div className="text-xs text-[#336699]">&nbsp;</div>
      </div>
      <div className="flex flex-col items-end flex-none justify-between">
        <TokenSelector
          disabled={disabled}
          value={pair?.publicToken.address}
          isEncrypt={isEncrypt}
          onChange={handleTokenChange}
          className="z-100 text-sm w-[130px]"
        />
        <div className="flex justify-between items-center w-full">
          <div className="text-xs text-[#336699]">
            Balance: {isEncrypt && formatTokenAmount(balances?.publicBalance ?? 0n, pair?.publicToken.decimals ?? 18)}
            {!isEncrypt && formatTokenAmount(balances?.confidentialBalance ?? 0n, pair?.publicToken.decimals ?? 18)}
          </div>
          <Button
            disabled={disabled}
            onClick={handleMaxClick}
            uppercase={true}
            noOutline={true}
            className="py-[1px] ml-1"
            size="xs"
          >
            Max
          </Button>
        </div>
      </div>
    </div>
  );
};

const AmountSliderRow = ({ disabled }: { disabled: boolean }) => {
  const sliderValue = useEncryptDecryptPercentValue();
  const setSliderValue = useUpdateEncryptDecryptValueByPercent();
  const setHasInteracted = useSetEncryptDecryptHasInteracted();

  const handleSliderChange = (val: number[]) => {
    setHasInteracted(true);
    if (val[0] !== undefined) {
      setSliderValue(val[0]);
    }
  };

  return (
    <Slider
      disabled={disabled}
      value={[sliderValue]}
      onValueChange={handleSliderChange}
      max={100}
      step={1}
      showMarkers={true}
      showMaxButton={false}
    />
  );
};

const EncryptTransactionGuide = ({ setIsControlsDisabled }: { setIsControlsDisabled: (disabled: boolean) => void }) => {
  const pair = useEncryptDecryptPair();
  const valueError = useEncryptDecryptValueError();
  const setInputValue = useUpdateEncryptDecryptValue();
  const hasInteracted = useEncryptDecryptHasInteracted();
  const setHasInteracted = useSetEncryptDecryptHasInteracted();

  // Deploy

  const isStablecoin = pair?.isStablecoin;

  const { onDeployFherc20, isDeploying } = useDeployFherc20Action();

  const handleDeploy = () => {
    if (pair == null) return;
    onDeployFherc20({ tokenAddress: pair.publicToken.address, publicTokenSymbol: pair.publicToken.symbol });
  };

  const deployState = useMemo(() => {
    if (pair == null) return TxGuideStepState.Ready;
    if (pair.confidentialTokenDeployed) return TxGuideStepState.Success;
    if (isDeploying) return TxGuideStepState.Loading;
    return TxGuideStepState.Ready;
  }, [pair, isDeploying]);

  // Encrypt

  const { onEncryptErc20, isEncrypting, isEncryptError } = useEncryptErc20Action();

  const handleEncrypt = () => {
    if (pair == null) {
      toast.error("No token selected");
      return;
    }
    if (pair.confidentialToken == null) {
      toast.error("No confidential token deployed");
      return;
    }
    onEncryptErc20({
      publicTokenSymbol: pair.publicToken.symbol,
      publicTokenAddress: pair.publicToken.address,
      confidentialTokenAddress: pair.confidentialToken.address,
      amount: rawInputValue,
      tokenDecimals: pair.publicToken.decimals,
    });
  };

  const [encryptState, setEncryptState] = useState<TxGuideStepState>(TxGuideStepState.Ready);
  const prevEncrypting = useRef(isEncrypting);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isEncrypting) {
      // went to "true" → immediately show Loading
      setEncryptState(TxGuideStepState.Loading);
      setIsControlsDisabled(true);
    } else if (prevEncrypting.current) {
      // transition **true → false** → show Success, then Ready after 5 s
      isEncryptError ? setEncryptState(TxGuideStepState.Error) : setEncryptState(TxGuideStepState.Success);
      timer = setTimeout(() => {
        setEncryptState(TxGuideStepState.Ready);
        setIsControlsDisabled(false);
        setInputValue("0");
        setHasInteracted(false);
      }, 5_000);
    }
    // update ref for next run
    prevEncrypting.current = isEncrypting;

    // cleanup if the component unmounts or `isEncrypting` flips again
    return () => timer && clearTimeout(timer);
  }, [isEncrypting, isEncryptError, setIsControlsDisabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Approve

  const rawInputValue = useEncryptDecryptRawInputValue();
  const displayAmount = formatTokenAmount(rawInputValue, pair?.publicToken.decimals ?? 18);

  const requiresApproval = useEncryptDecryptRequiresApproval();
  const displayAllowance = useEncryptDecryptFormattedAllowance();
  const { onApproveFherc20, isApproving } = useApproveFherc20Action();

  const handleApprove = () => {
    if (pair == null) {
      toast.error("No token selected");
      return;
    }
    if (pair.confidentialToken == null) {
      toast.error("No confidential token deployed");
      return;
    }
    setIsControlsDisabled(true);
    onApproveFherc20({
      publicTokenSymbol: pair.publicToken.symbol,
      publicTokenAddress: pair.publicToken.address,
      confidentialTokenAddress: pair.confidentialToken.address,
      amount: rawInputValue,
      tokenDecimals: pair.publicToken.decimals,
    });
  };

  useEffect(() => {
    if (!isApproving) {
      setIsControlsDisabled(false);
    }
  }, [isApproving, setIsControlsDisabled]);

  const approveState = useMemo(() => {
    if (pair == null) return TxGuideStepState.Ready;
    if (encryptState === TxGuideStepState.Success || encryptState === TxGuideStepState.Loading)
      return TxGuideStepState.Success;

    if (isApproving) return TxGuideStepState.Loading;
    if (!requiresApproval) return TxGuideStepState.Success;

    return TxGuideStepState.Ready;
  }, [pair, isApproving, requiresApproval, encryptState]);

  // ERRS

  const missingPairErrMessage = pair == null ? `Select a token to encrypt` : undefined;
  const stablecoinErrMessage = isStablecoin
    ? "Stablecoin encryption disabled until FHED (FHE Dollar) release"
    : undefined;

  const valueErrMessage = hasInteracted && valueError != null ? `Invalid amount:\n${valueError}` : undefined;
  const encryptErrMessage = hasInteracted && isEncryptError ? `Encryption failed` : undefined;
  const sharedErrMessage = hasInteracted ? (missingPairErrMessage ?? valueErrMessage ?? encryptErrMessage) : undefined;

  // Steps

  const steps = [
    {
      title: "Deploy",
      cta: pair == null ? "ENCRYPT" : `DEPLOY`,
      hint: pair?.publicToken.symbol
        ? `e${pair.publicToken.symbol} has not been deployed yet (1 time tx)`
        : "Please select a token",
      state: deployState,
      action: handleDeploy,
      disabled: pair == null || isDeploying || isStablecoin,
      errorMessage: sharedErrMessage ?? stablecoinErrMessage,
    },
    {
      title: "Approve",
      cta: pair == null ? "ENCRYPT" : `APPROVE`,
      hint: `Approve ${displayAmount} ${pair?.publicToken.symbol}\nAllowance: ${displayAllowance}`,
      state: approveState,
      action: handleApprove,
      disabled: pair == null || valueError != null || isApproving,
      errorMessage: sharedErrMessage,
    },
    {
      title: "Encrypt",
      cta: `ENCRYPT`,
      hint: `Encrypt ${displayAmount}\n${pair?.publicToken.symbol} into ${getConfidentialSymbol(pair)}`,
      state: encryptState,
      action: handleEncrypt,
      disabled: pair == null || valueError != null || requiresApproval || isEncrypting,
      errorMessage: sharedErrMessage,
    },
  ];
  return <TransactionGuide title="Encryption steps:" steps={steps} />;
};

const DecryptTransactionGuide = ({ setIsControlsDisabled }: { setIsControlsDisabled: (disabled: boolean) => void }) => {
  const pair = useEncryptDecryptPair();
  const valueError = useEncryptDecryptValueError();
  const rawInputValue = useEncryptDecryptRawInputValue();
  const pairClaims = usePairClaims(pair?.publicToken.address);
  const setInputValue = useUpdateEncryptDecryptValue();
  const hasInteracted = useEncryptDecryptHasInteracted();
  const setHasInteracted = useSetEncryptDecryptHasInteracted();

  const { onDecryptFherc20, isDecrypting, isDecryptError } = useDecryptFherc20Action();
  const prevDecrypting = useRef(isDecrypting);
  const [decryptState, setDecryptState] = useState<TxGuideStepState>(TxGuideStepState.Ready);

  const valueErrMessage = hasInteracted && valueError != null ? `Invalid amount:\n${valueError}` : undefined;
  const decryptErrMessage = hasInteracted && isDecryptError ? `Decryption failed` : undefined;
  const sharedErrMessage = hasInteracted ? (valueErrMessage ?? decryptErrMessage) : undefined;

  useEffect(() => {
    if (isDecryptError) {
      setDecryptState(TxGuideStepState.Error);
      setIsControlsDisabled(false);
    } else if (isDecrypting) {
      // went to "true" → immediately show Loading
      setDecryptState(TxGuideStepState.Loading);
      setIsControlsDisabled(true);
    } else if (prevDecrypting.current) {
      // transition **true → false** → show Success
      setDecryptState(TxGuideStepState.Success);
      setIsControlsDisabled(false);
    }
    // update ref for next run
    prevDecrypting.current = isDecrypting;
  }, [isDecrypting, isDecryptError, setIsControlsDisabled]);

  const handleDecrypt = () => {
    if (pair == null) {
      toast.error("No token selected");
      return;
    }
    if (pair.confidentialToken == null) {
      toast.error("No confidential token deployed");
      return;
    }
    onDecryptFherc20({
      publicTokenSymbol: pair.publicToken.symbol,
      publicTokenAddress: pair.publicToken.address,
      confidentialTokenAddress: pair.confidentialToken.address,
      amount: rawInputValue,
      tokenDecimals: pair.confidentialToken.decimals,
    });
  };

  // Wait for decryption

  // TODO: state = loading if any claim pending, state = success if all claims ready
  // TODO: state = ready if no claims in list
  const [waitForDecryptState, setWaitForDecryptState] = useState<TxGuideStepState>(TxGuideStepState.Ready);

  useEffect(() => {
    const isPending = pairClaims ? pairClaims.totalPendingAmount > 0n : false;
    const isClaimable = pairClaims ? pairClaims.totalDecryptedAmount > 0n : false;

    if (isDecrypting) {
      setWaitForDecryptState(TxGuideStepState.Ready);
    } else if (decryptState === TxGuideStepState.Success) {
      if (isPending) {
        setWaitForDecryptState(TxGuideStepState.Loading);
      } else if (isClaimable) {
        setWaitForDecryptState(TxGuideStepState.Success);
        setInputValue("0");
        setHasInteracted(false);
      }
    } else {
      setWaitForDecryptState(TxGuideStepState.Ready);
    }
  }, [isDecrypting, decryptState, pairClaims]); // eslint-disable-line react-hooks/exhaustive-deps
  // Claim

  const { onClaimAll, isClaiming, isClaimError } = useClaimAllAction();
  const prevClaiming = useRef(isClaiming);
  const [claimState, setClaimState] = useState<TxGuideStepState>(TxGuideStepState.Ready);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isClaimError) {
      setClaimState(TxGuideStepState.Error);
      setIsControlsDisabled(false);
    } else if (isClaiming) {
      // went to "true" → immediately show Loading
      setClaimState(TxGuideStepState.Loading);
      setIsControlsDisabled(true);
    } else if (prevClaiming.current) {
      // transition **true → false** → show Success, then Ready after 5 s
      setClaimState(TxGuideStepState.Success);
      setIsControlsDisabled(false);
      timer = setTimeout(() => {
        setClaimState(TxGuideStepState.Ready);
        setDecryptState(TxGuideStepState.Ready);
      }, 10_00);
    }
    // update ref for next run
    prevClaiming.current = isClaiming;

    // cleanup if the component unmounts or `isEncrypting` flips again
    return () => timer && clearTimeout(timer);
  }, [isClaiming, isClaimError, setIsControlsDisabled]);

  const handleClaim = () => {
    if (pair == null || pairClaims == null) {
      toast.error("No token selected");
      return;
    }
    if (pair.confidentialToken == null) {
      toast.error("No confidential token deployed");
      return;
    }

    onClaimAll({
      publicTokenSymbol: pair.publicToken.symbol,
      publicTokenAddress: pair.publicToken.address,
      confidentialTokenAddress: pair.confidentialToken.address,
      claimAmount: pairClaims.totalDecryptedAmount,
      tokenDecimals: pair.confidentialToken.decimals,
    });
  };

  // Steps

  const claimAmountHint = pairClaims?.totalDecryptedAmount
    ? formatTokenAmount(pairClaims.totalDecryptedAmount, pair?.confidentialToken?.decimals ?? 18)
    : "";
  const steps = [
    {
      title: "Decrypt",
      cta: pair == null ? "Select a token" : `DECRYPT ${getConfidentialSymbol(pair)}`,
      hint: "Decrypt the token",
      state: decryptState,
      action: handleDecrypt,
      disabled: pair == null || valueError != null || isDecrypting,
      errorMessage: sharedErrMessage,
    },
    {
      title: "Processing Decryption",
      cta: pair == null ? "Select a token" : `WAIT FOR DECRYPTION`,
      hint: "Wait for the token to be decrypted",
      state: waitForDecryptState,
      // errorMessage: sharedErrMessage,
      userInteraction: false,
    },
    {
      title: "Claim",
      cta: pair == null ? "Select a token" : `CLAIM ${pair.publicToken.symbol}`,
      hint: claimAmountHint !== "" ? `Claim ${claimAmountHint} tokens` : "",
      state: claimState,
      action: handleClaim,
      disabled: pair == null || isClaiming,
      // errorMessage: sharedErrMessage,
    },
  ];
  return <TransactionGuide title="Decryption steps:" steps={steps} />;
};
