import { useMemo } from "react";
import Image from "next/image";
import { TransactionGuide } from "./TransactionGuide";
import { TxGuideStepState } from "./TransactionGuide";
import { Spinner } from "./ui/Spinner";
import { Check } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
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
import { useDecryptFherc20Action } from "~~/hooks/useDecryptActions";
import { useApproveFherc20Action, useDeployFherc20Action, useEncryptErc20Action } from "~~/hooks/useEncryptActions";
import {
  useEncryptDecryptBalances,
  useEncryptDecryptFormattedAllowance,
  useEncryptDecryptInputValue,
  useEncryptDecryptIsEncrypt,
  useEncryptDecryptPair,
  useEncryptDecryptPercentValue,
  useEncryptDecryptRawInputValue,
  useEncryptDecryptRequiresApproval,
  useEncryptDecryptRequiresDeployment,
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
              <AmountErrorRow />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 justify-center items-start">
            <EncryptTransactionGuide />
            {/* <DecryptTransactionGuide /> */}
            {/* <DeployFherc20Button />
            <AllowanceRow />
            <ApproveButton />
            <EncryptButton />

            <DecryptButton /> */}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// TEMP

const EncryptTransactionGuide = () => {
  const pair = useEncryptDecryptPair();
  const { onDeployFherc20, isDeploying } = useDeployFherc20Action();

  // TODO: Allow disabling of steps
  const valueError = useEncryptDecryptValueError();

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

  const rawInputValue = useEncryptDecryptRawInputValue();
  const requiresApproval = useEncryptDecryptRequiresApproval();
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

  const steps = [
    {
      title: "Deploy",
      cta: pair == null ? "Select a token" : `DEPLOY e${pair?.publicToken.symbol}`,
      hint: "Deploy the confidential token",
      state: deployState,
      action: handleDeploy,
      disabled: pair == null || isDeploying,
    },
    {
      title: "Approve",
      cta: pair == null ? "Select a token" : `APPROVE ${pair?.publicToken.symbol}`,
      hint: "Approve the confidential token",
      state: approveState,
      action: handleApprove,
      disabled: pair == null || valueError != null || isApproving,
    },
    {
      title: "Encrypt",
      cta: pair == null ? "Select a token" : `ENCRYPT ${pair?.publicToken.symbol}`,
      hint: "Encrypt the token",
      state: encryptState,
      action: handleEncrypt,
      disabled: pair == null || valueError != null || requiresApproval || isEncrypting,
    },
  ];
  return <TransactionGuide title="Encryption steps:" steps={steps} />;
};

// END TEMP

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

const AmountErrorRow = () => {
  const valueError = useEncryptDecryptValueError();

  return (
    <div className="w-full flex flex-row gap-2 items-start justify-end mt-6 min-h-6">
      <div className="text-sm text-destructive italic ml-4">{valueError}</div>
    </div>
  );
};

const DeployFherc20Button = () => {
  const isEncrypt = useEncryptDecryptIsEncrypt();
  const pair = useEncryptDecryptPair();
  const { onDeployFherc20, isDeploying } = useDeployFherc20Action();

  const handleDeploy = () => {
    if (pair == null) return;
    onDeployFherc20({ tokenAddress: pair.publicToken.address, publicTokenSymbol: pair.publicToken.symbol });
  };

  return (
    <AnimatePresence>
      {isEncrypt && pair != null && pair.confidentialTokenDeployed === false && (
        <motion.div
          key="deploy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full flex flex-col gap-2"
        >
          <div className="text-sm text-theme-black italic text-left ml-4">
            The confidential token <b>e{pair.publicToken.symbol}</b> has not been deployed yet and requires deployment
            before you can encrypt your <b>{pair.publicToken.symbol}</b> balance.
          </div>
          <div className="flex flex-row gap-2 items-center">
            <div className="text-sm text-theme-black">0.</div>
            <Button
              className="w-full"
              icon={isDeploying ? Spinner : Check}
              onClick={handleDeploy}
              disabled={isDeploying}
            >
              {isDeploying ? "Deploying..." : `Deploy e${pair?.publicToken.symbol}`}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AllowanceRow = () => {
  const isEncrypt = useEncryptDecryptIsEncrypt();
  const allowance = useEncryptDecryptFormattedAllowance();

  return (
    <AnimatePresence>
      {isEncrypt && (
        <motion.div
          key="allowance"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full flex flex-col gap-2 justify-center"
        >
          <div className="flex flex-row gap-2 justify-between items-center mx-4">
            <div className="text-sm text-theme-black">Allowance:</div>
            <div className="text-sm text-theme-black">{allowance}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ApproveButton = () => {
  const pair = useEncryptDecryptPair();
  const rawInputValue = useEncryptDecryptRawInputValue();
  const valueError = useEncryptDecryptValueError();
  const requiresApproval = useEncryptDecryptRequiresApproval();
  const requiresDeployment = useEncryptDecryptRequiresDeployment();
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

  return (
    <AnimatePresence>
      {requiresApproval && (
        <motion.div
          key="approve-button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full flex flex-row gap-2 items-center"
        >
          <div className="text-sm text-theme-black">1.</div>
          <Button
            className="w-full"
            icon={Check}
            onClick={handleApprove}
            disabled={valueError != null || isApproving || requiresDeployment}
          >
            {isApproving
              ? "Approving..."
              : `Approve ${pair?.publicToken.symbol != null ? pair?.publicToken.symbol : ""}`}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const EncryptButton = () => {
  const isEncrypt = useEncryptDecryptIsEncrypt();
  const pair = useEncryptDecryptPair();
  const rawInputValue = useEncryptDecryptRawInputValue();
  const valueError = useEncryptDecryptValueError();
  const requiresDeployment = useEncryptDecryptRequiresDeployment();
  const requiresApproval = useEncryptDecryptRequiresApproval();
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

  return (
    <AnimatePresence>
      {isEncrypt && (
        <motion.div
          key="encrypt-button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full flex flex-row gap-2 items-center"
        >
          {requiresApproval && <div className="text-sm text-theme-black">2.</div>}
          <Button
            className="w-full"
            icon={EyeOff}
            onClick={handleEncrypt}
            disabled={valueError != null || isEncrypting || requiresDeployment || requiresApproval}
          >
            {isEncrypting ? "Encrypting..." : "Encrypt"}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DecryptButton = () => {
  const isEncrypt = useEncryptDecryptIsEncrypt();
  const { onDecryptFherc20, isDecrypting } = useDecryptFherc20Action();
  const pair = useEncryptDecryptPair();
  const rawInputValue = useEncryptDecryptRawInputValue();
  const valueError = useEncryptDecryptValueError();

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

  return (
    <AnimatePresence>
      {!isEncrypt && (
        <motion.div
          key="decrypt-button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full flex flex-row gap-2 items-center"
        >
          <Button className="w-full" icon={Eye} onClick={handleDecrypt} disabled={valueError != null || isDecrypting}>
            {isDecrypting ? "Decrypting..." : "Decrypt"}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
