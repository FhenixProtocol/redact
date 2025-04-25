import { useMemo } from "react";
import Image from "next/image";
import { TransactionGuide } from "./TransactionGuide";
import { TxGuideStepState } from "./TransactionGuide";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { TokenSelector } from "~~/components/TokenSelector";
import { Button } from "~~/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~~/components/ui/FnxCard";
import { RadioButtonGroup } from "~~/components/ui/FnxRadioGroup";
import { Slider } from "~~/components/ui/FnxSlider";
import { useCofhe } from "~~/hooks/useCofhe";
import { useClaimFherc20Action, useDecryptFherc20Action } from "~~/hooks/useDecryptActions";
import { useApproveFherc20Action, useDeployFherc20Action, useEncryptErc20Action } from "~~/hooks/useEncryptActions";
import { getConfidentialSymbol } from "~~/lib/common";
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

  return (
    <div className="text-center inline-block">
      <div className=" flex gap-8 items-center justify-center w-[450px] rounded-3xl drop-shadow-xl">
        <Card className="rounded-[inherit] w-[450px] bg-background/60 border-component-stroke backdrop-blur-xs">
          <ConnectOverlay />
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

              <AmountInputRow />
              <AmountSliderRow />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 justify-center items-start">
            {isEncrypt && <EncryptTransactionGuide />}
            {!isEncrypt && <DecryptTransactionGuide />}
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

const CofhejsInitializedOverlay = () => {
  const { isConnected } = useAccount();
  const { isInitialized } = useCofhe();
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

const AmountInputRow = () => {
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
          type="number"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          className="w-30 text-lg text-primary-accent font-bold outline-none no-spinner"
        />
        <div className="text-xs text-[#336699]">$ Fiat amount</div>
      </div>
      <div className="flex flex-col items-end flex-none justify-between">
        <TokenSelector
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
            onClick={() => setSliderValue(100)}
            uppercase={true}
            noOutline={true}
            className="py-[1px] ml-1"
            size="xs"
            // TODO: Re-enable
            // disabled={isEncrypt && isLoadingPrivateBalance}
          >
            Max
          </Button>
        </div>
      </div>
    </div>
  );
};

const AmountSliderRow = () => {
  const sliderValue = useEncryptDecryptPercentValue();
  const setSliderValue = useUpdateEncryptDecryptValueByPercent();

  return (
    <Slider
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
      // TODO: Re-enable
      // disabled={isProcessing || (selectedAction === "Decrypt" && isLoadingPrivateBalance)}
    />
  );
};

const EncryptTransactionGuide = () => {
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
    onApproveFherc20({
      publicTokenSymbol: pair.publicToken.symbol,
      publicTokenAddress: pair.publicToken.address,
      confidentialTokenAddress: pair.confidentialToken.address,
      amount: rawInputValue,
    });
  };

  const approveState = useMemo(() => {
    if (pair == null) return TxGuideStepState.Ready;
    if (!requiresApproval) return TxGuideStepState.Success;
    if (isApproving) return TxGuideStepState.Loading;
    return TxGuideStepState.Ready;
  }, [pair, isApproving, requiresApproval]);

  // Encrypt

  const { onEncryptErc20, isEncrypting } = useEncryptErc20Action();

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
    });
  };

  const encryptState = useMemo(() => {
    if (isEncrypting) return TxGuideStepState.Loading;
    return TxGuideStepState.Ready;
  }, [isEncrypting]);

  // ERRS

  const missingPairErrMessage = pair == null ? `Select a token to encrypt` : undefined;
  const stablecoinErrMessage = isStablecoin
    ? "Stablecoin encryption disabled until FHED (FHE Dollar) release"
    : undefined;
  const valueErrMessage = valueError != null ? `Invalid amount:\n${valueError}` : undefined;

  const sharedErrMessage = missingPairErrMessage ?? valueErrMessage;

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

const DecryptTransactionGuide = () => {
  const pair = useEncryptDecryptPair();
  const valueError = useEncryptDecryptValueError();
  const rawInputValue = useEncryptDecryptRawInputValue();

  // Decrypt

  const { onDecryptFherc20, isDecrypting } = useDecryptFherc20Action();
  const decryptState = useMemo(() => {
    // TODO: Add more states
    if (isDecrypting) return TxGuideStepState.Loading;
    return TxGuideStepState.Ready;
  }, [isDecrypting]);

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
    });
  };

  // Wait for decryption

  // TODO: state = loading if any claim pending, state = success if all claims ready
  // TODO: state = ready if no claims in list
  const waitForDecryptState = TxGuideStepState.Ready;

  // Claim

  const { onClaimFherc20, isClaiming } = useClaimFherc20Action();
  const claimState = useMemo(() => {
    // TODO: Add more states
    if (isClaiming) return TxGuideStepState.Loading;
    return TxGuideStepState.Ready;
  }, [isClaiming]);

  const handleClaim = () => {
    console.log("Claim");
  };

  // Steps

  const steps = [
    {
      title: "Decrypt",
      cta: pair == null ? "Select a token" : `DECRYPT ${getConfidentialSymbol(pair)}`,
      hint: "Decrypt the token",
      state: decryptState,
      action: handleDecrypt,
      disabled: pair == null || isDecrypting,
    },
    {
      title: "Wait for Decryption",
      cta: pair == null ? "Select a token" : `WAIT FOR DECRYPTION`,
      hint: "Wait for the token to be decrypted",
      state: waitForDecryptState,
    },
    {
      title: "Claim",
      cta: pair == null ? "Select a token" : `CLAIM ${getConfidentialSymbol(pair)}`,
      hint: "Claim the token",
      state: claimState,
      action: handleClaim,
      disabled: pair == null || valueError != null || isClaiming,
    },
  ];
  return <TransactionGuide title="Decryption steps:" steps={steps} />;
};
