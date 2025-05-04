import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { TransactionGuide } from "./TransactionGuide";
import { TxGuideStepState } from "./TransactionGuide";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { formatUnits } from "viem";
import { arbitrum, arbitrumSepolia, mainnet, sepolia } from "viem/chains";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { TokenSelector } from "~~/components/TokenSelector";
import { Button } from "~~/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~~/components/ui/FnxCard";
import { RadioButtonGroup } from "~~/components/ui/FnxRadioGroup";
import { Slider } from "~~/components/ui/FnxSlider";
import { useCofhe } from "~~/hooks/useCofhe";
import { useClaimAllAction, useDecryptFherc20Action } from "~~/hooks/useDecryptActions";
import { useApproveFherc20Action, useDeployFherc20Action, useEncryptErc20Action } from "~~/hooks/useEncryptActions";
import { getConfidentialSymbol } from "~~/lib/common";
import { usePairClaims } from "~~/services/store/claim";
import {
  useEncryptDecryptBalances,
  useEncryptDecryptFormattedAllowance,
  useEncryptDecryptInputValue,
  useEncryptDecryptIsEncrypt,
  useEncryptDecryptPair,
  useEncryptDecryptPercentValue,
  useEncryptDecryptRawInputValue,
  useEncryptDecryptRequiresApproval,
  useEncryptDecryptSetIsEncrypt,
  useEncryptDecryptValueError,
  useSelectEncryptDecryptToken,
  useUpdateEncryptDecryptValue,
  useUpdateEncryptDecryptValueByPercent,
} from "~~/services/store/encryptDecrypt";

export function MainTokenSwapping() {
  const isEncrypt = useEncryptDecryptIsEncrypt();
  const [isControlsDisabled, setIsControlsDisabled] = useState(false);

  return (
    <div className="text-center inline-block">
      <div className=" flex gap-8 items-center justify-center w-[450px] rounded-3xl drop-shadow-xl">
        <Card className="rounded-[inherit] w-[450px] bg-background/60 border-component-stroke backdrop-blur-xs">
          <ConnectOverlay />
          <NetworkOverlay />
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
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm w-[99%] h-[99%] z-200 rounded-[inherit] flex items-center justify-center [background-image:repeating-linear-gradient(45deg,#FFFFFF15,#FFFFFF15_10px,transparent_10px,transparent_25px)]">
      <div className="text-lg font-semibold text-theme-black">Connect your wallet to start swapping</div>
    </div>
  );
};

const NetworkOverlay = () => {
  const { switchChain } = useSwitchChain();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [showOverlay, setShowOverlay] = useState(false);
  const [targetChain, setTargetChain] = useState<typeof sepolia | typeof arbitrumSepolia | null>(null);

  useEffect(() => {
    if (isConnected) {
      if (chainId === mainnet.id) {
        setShowOverlay(true);
        setTargetChain(sepolia);
      } else if (chainId === arbitrum.id) {
        setShowOverlay(true);
        setTargetChain(arbitrumSepolia);
      } else {
        setShowOverlay(false);
        setTargetChain(null);
      }
    } else {
      setShowOverlay(false);
      setTargetChain(null);
    }
  }, [chainId, isConnected]);

  if (!showOverlay || !targetChain) return null;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm w-[99%] h-[99%] z-200 rounded-[inherit] flex items-center justify-center [background-image:repeating-linear-gradient(45deg,#FFFFFF15,#FFFFFF15_10px,transparent_10px,transparent_25px)]">
      <div className="flex flex-col gap-4 items-center">
        <div className="text-lg font-semibold text-theme-black">Please switch to {targetChain.name} network</div>
        <Button
          onClick={() => switchChain({ chainId: targetChain.id })}
          className="bg-primary-accent text-white hover:bg-primary-accent/90"
        >
          Switch to {targetChain.name}
        </Button>
      </div>
    </div>
  );
};

const CofhejsInitializedOverlay = () => {
  const { isConnected } = useAccount();
  const { isInitialized } = useCofhe({
    // coFheUrl: "https://testnet-cofhe.fhenix.zone",
    // verifierUrl: "https://testnet-cofhe-vrf.fhenix.zone",
    // thresholdNetworkUrl: "https://testnet-cofhe-tn.fhenix.zone",
  });
  if (!isConnected) return null;
  if (isInitialized) return null;

  return (
    <div className="absolute flex-col gap-4 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm w-[99%] h-[99%] z-200 rounded-[inherit] flex items-center justify-center [background-image:repeating-linear-gradient(45deg,#FFFFFF15,#FFFFFF15_10px,transparent_10px,transparent_25px)]">
      <div className="text-lg font-semibold text-theme-black">Waiting for Cofhe to initialize...</div>
      <div>
        <Image src="/loading-cofhe.gif" alt="Loading Cofhe" width={300} height={100} className="mix-blend-multiply" />
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
  const inputValue = useEncryptDecryptInputValue();
  const setInputValue = useUpdateEncryptDecryptValue();
  const pair = useEncryptDecryptPair();
  const balances = useEncryptDecryptBalances();
  const setToken = useSelectEncryptDecryptToken();
  const setSliderValue = useUpdateEncryptDecryptValueByPercent();

  return (
    <div className="mb-5 w-full flex content-stretch rounded-2xl border border-[#3399FF] p-4">
      <div className="flex flex-col items-start flex-1">
        <div className="text-sm text-[#336699] font-semibold">{isEncrypt ? "You Deposit" : "You Withdraw"}</div>
        <input
          disabled={disabled}
          type="number"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
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
          onChange={(val: string) => setToken(val)}
          className="z-100 text-sm w-[130px]"
        />
        <div className="flex justify-between items-center w-full">
          <div className="text-xs text-[#336699]">
            Balance: {isEncrypt && formatUnits(balances?.publicBalance ?? 0n, pair?.publicToken.decimals ?? 18)}
            {!isEncrypt && formatUnits(balances?.confidentialBalance ?? 0n, pair?.publicToken.decimals ?? 18)}
          </div>
          <Button
            disabled={disabled}
            onClick={() => setSliderValue(100)}
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

  return (
    <Slider
      disabled={disabled}
      value={[sliderValue]}
      onValueChange={val => {
        if (val[0] !== undefined) {
          setSliderValue(val[0]);
        }
      }}
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
      }, 5_000);
    }
    // update ref for next run
    prevEncrypting.current = isEncrypting;

    // cleanup if the component unmounts or `isEncrypting` flips again
    return () => timer && clearTimeout(timer);
  }, [isEncrypting, isEncryptError, setIsControlsDisabled]);

  // Approve

  const rawInputValue = useEncryptDecryptRawInputValue();
  const displayAmount = formatUnits(rawInputValue, pair?.publicToken.decimals ?? 18);

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
  const valueErrMessage = valueError != null ? `Invalid amount:\n${valueError}` : undefined;
  const encryptErrMessage = isEncryptError ? `Encryption failed` : undefined;
  const sharedErrMessage = missingPairErrMessage ?? valueErrMessage ?? encryptErrMessage;

  // Steps

  const steps = [
    {
      title: "Deploy",
      cta: pair == null ? "ENCRYPT" : `DEPLOY`,
      hint: `e${pair?.publicToken.symbol} has not been deployed yet (1 time tx)`,
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

  const { onDecryptFherc20, isDecrypting, isDecryptError } = useDecryptFherc20Action();
  const prevDecrypting = useRef(isDecrypting);
  const [decryptState, setDecryptState] = useState<TxGuideStepState>(TxGuideStepState.Ready);

  const valueErrMessage = valueError != null ? `Invalid amount:\n${valueError}` : undefined;
  const decryptErrMessage = isDecryptError ? `Decryption failed` : undefined;
  const sharedErrMessage = valueErrMessage ?? decryptErrMessage;

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
      }
    } else {
      setWaitForDecryptState(TxGuideStepState.Ready);
    }
  }, [isDecrypting, decryptState, pairClaims]);
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
    ? formatUnits(pairClaims.totalDecryptedAmount, pair?.confidentialToken?.decimals ?? 18)
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
      errorMessage: sharedErrMessage,
      userInteraction: false,
    },
    {
      title: "Claim",
      cta: pair == null ? "Select a token" : `CLAIM ${getConfidentialSymbol(pair)}`,
      hint: claimAmountHint !== "" ? `Claim ${claimAmountHint} tokens` : "",
      state: claimState,
      action: handleClaim,
      disabled: pair == null || isClaiming,
      errorMessage: sharedErrMessage,
    },
  ];
  return <TransactionGuide title="Decryption steps:" steps={steps} />;
};
