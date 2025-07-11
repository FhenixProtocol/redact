import React from "react";
import { TokenSelector } from "../TokenSelector";
import { Button } from "../ui/Button";
import { FnxInput } from "../ui/FnxInput";
import { Slider } from "../ui/FnxSlider";
import { Switcher } from "../ui/Switcher";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { Address } from "viem";
import { useSendConfidentialTokenAction, useSendPublicTokenAction } from "~~/hooks/useSendActions";
import { formatTokenAmount } from "~~/lib/common";
import { getConfidentialSymbol, truncateAddress } from "~~/lib/common";
import {
  useSelectSendToken,
  useSendAddressHistory,
  useSendBalances,
  useSendHasInteracted,
  useSendPair,
  useSendPercentValue,
  useSendRawInputValue,
  useSendRecipient,
  useSendRecipientError,
  useSendSetIsPublic,
  useSendValueError,
  useSetSendHasInteracted,
  useUpdateSendRecipient,
  useUpdateSendValue,
  useUpdateSendValueByPercent,
} from "~~/services/store/sendStore";
import { useSendInputString } from "~~/services/store/sendStore";
import { useSendIsPublic } from "~~/services/store/sendStore";

export function SendPage() {
  const pair = useSendPair();
  const isPublic = useSendIsPublic();

  return (
    <div className="p-4 pt-0 pb-0 flex flex-col gap-1 h-full items-center">
      <div className="flex flex-col items-start justify-start w-full">
        <div className="text-3xl text-primary font-semibold mb-3">
          Send {pair != null ? (isPublic ? pair.publicToken.symbol : getConfidentialSymbol(pair)) : ""}
        </div>
      </div>

      <PublicConfidentialSelectRow />

      <br />

      <AmountInputRow />
      <AmountSliderRow />

      <br />

      <RecipientInputRow />

      <br />

      <SendButtonRow />
    </div>
  );
}

const PublicConfidentialSelectRow = () => {
  const isPublic = useSendIsPublic();
  const setIsPublic = useSendSetIsPublic();

  return (
    <div className="w-full">
      <Switcher
        label="Mode"
        options={[
          { description: "Public", icon: Eye },
          { description: "Confidential", icon: EyeOff },
        ]}
        value={isPublic ? 0 : 1}
        onValueChange={val => setIsPublic(val === 0)}
        className="flex flex-row w-full justify-between items-center rounded-full border border-[#3399FF]"
      />
    </div>
  );
};

const AmountInputRow = () => {
  const isPublic = useSendIsPublic();
  const inputValue = useSendInputString();
  const setInputValue = useUpdateSendValue();
  const pair = useSendPair();
  const balances = useSendBalances();
  const setToken = useSelectSendToken();
  const setSliderValue = useUpdateSendValueByPercent();

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // If the input shows "0", select all text so typing replaces it entirely
    if (e.target.value === "0") {
      e.target.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // If user is typing and the current value is "0", replace it entirely
    if ((inputValue === "0" || inputValue === "") && value.length > 1 && value.startsWith("0") && value[1] !== ".") {
      // Remove the leading zero unless it's a decimal (like "0.5")
      setInputValue(value.substring(1));
    } else {
      setInputValue(value);
    }
  };

  return (
    <div className="mb-5 w-full flex content-stretch rounded-2xl border border-[#3399FF] p-4">
      <div className="flex flex-col items-start flex-1">
        <div className="text-sm text-[#336699] font-semibold">You Send:</div>
        <input
          type="number"
          min="0"
          value={inputValue === "" ? "0" : inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-30 text-lg text-primary-accent font-bold outline-none no-spinner"
        />
        {/* TODO: add fiat amount */}
        <div className="text-xs text-[#336699]">&nbsp;</div>
      </div>
      <div className="flex flex-col items-end flex-none justify-between">
        <TokenSelector
          value={pair?.publicToken.address}
          isEncrypt={isPublic}
          onChange={(val: string) => setToken(val)}
          className="z-100 text-sm w-[130px]"
        />
        <div className="flex justify-between items-center w-full">
          <div className="text-xs text-[#336699]">
            Balance: {isPublic && formatTokenAmount(balances?.publicBalance ?? 0n, pair?.publicToken.decimals ?? 18)}
            {!isPublic && formatTokenAmount(balances?.confidentialBalance ?? 0n, pair?.publicToken.decimals ?? 18)}
          </div>
          <Button
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

const AmountSliderRow = () => {
  const sliderValue = useSendPercentValue();
  const setSliderValue = useUpdateSendValueByPercent();

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
    />
  );
};

const RecipientInputRow = () => {
  const recipient = useSendRecipient();
  const setRecipient = useUpdateSendRecipient();
  const recipientError = useSendRecipientError();
  const hasInteracted = useSendHasInteracted();
  const setHasInteracted = useSetSendHasInteracted();
  const addressHistory = useSendAddressHistory();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isValidInput = !hasInteracted || recipientError == null;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasInteracted(true);
    setRecipient(e.target.value as Address);
  };

  const handleSelectHistory = (address: Address) => {
    setHasInteracted(true);
    setRecipient(address);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  const handleInputClick = () => {
    if (recipient === "" && addressHistory.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <FnxInput
        bgColor="theme-white"
        variant="md"
        noOutline={true}
        placeholder="0x..."
        value={recipient ?? ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleInputClick}
        className={`w-full ${!isValidInput ? "border-red-500" : ""}`}
        error={!isValidInput ? "Invalid address format" : undefined}
        fades={true}
        leftElement={<span className="px-4 text-primary text-sm font-normal">To:</span>}
      />
      {isDropdownOpen && recipient === "" && addressHistory.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-surface border border-primary-accent rounded-lg shadow-lg">
          {addressHistory.map((address, index) => (
            <div
              key={address}
              className="px-4 py-2 hover:bg-primary-accent/10 cursor-pointer rounded-lg text-sm"
              onClick={() => handleSelectHistory(address)}
            >
              {truncateAddress(address, 10, 10)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SendButtonRow = () => {
  const isPublic = useSendIsPublic();
  const pair = useSendPair();
  const valueError = useSendValueError();
  const amount = useSendInputString();
  const recipient = useSendRecipient();
  const recipientError = useSendRecipientError();

  const pairError = pair == null ? "No token selected" : null;
  const notDeployedErrorStr = !isPublic && pair?.confidentialToken == null ? "Confidential token\nnot deployed" : null;
  const amountErrorStr = valueError != null ? `Amount error:\n${valueError}` : null;
  const recipientErrorStr = recipientError != null ? `Recipient error:\n${recipientError}` : null;

  const errorMessage = pairError ?? notDeployedErrorStr ?? amountErrorStr ?? recipientErrorStr;

  const hint = `Send ${amount} ${isPublic ? pair?.publicToken.symbol : getConfidentialSymbol(pair)}\nto ${truncateAddress(recipient ?? "")}`;

  return (
    <div className="flex flex-row gap-2 justify-between items-center w-full">
      {isPublic && <PublicSendButton />}
      {!isPublic && <ConfidentialSendButton />}
      <HintOrError hint={errorMessage != null ? undefined : hint} errorMessage={errorMessage} />
    </div>
  );
};

const PublicSendButton = () => {
  const { onSend, isSending } = useSendPublicTokenAction();
  const pair = useSendPair();
  const rawAmount = useSendRawInputValue();
  const recipient = useSendRecipient();
  const valueError = useSendValueError();
  const recipientError = useSendRecipientError();
  const disabled = valueError != null || recipientError != null;

  const handleSend = () => {
    if (pair == null) {
      toast.error("No token selected");
      return;
    }
    if (recipient == null) {
      toast.error("No recipient selected");
      return;
    }
    onSend({
      publicTokenSymbol: pair.publicToken.symbol,
      publicTokenAddress: pair.publicToken.address,
      amount: rawAmount,
      recipient: recipient,
      tokenDecimals: pair.publicToken.decimals,
    });
  };

  return (
    <Button
      className="text-nowrap"
      variant={disabled ? "ghost" : "default"}
      size="md"
      disabled={disabled || isSending}
      onClick={handleSend}
    >
      {isSending ? "Sending..." : "Send"}
    </Button>
  );
};

const ConfidentialSendButton = () => {
  const { onSend, isSending, isEncrypting } = useSendConfidentialTokenAction();
  const pair = useSendPair();
  const rawAmount = useSendRawInputValue();
  const recipient = useSendRecipient();
  const valueError = useSendValueError();
  const recipientError = useSendRecipientError();
  const disabled = valueError != null || recipientError != null;

  const handleSend = () => {
    if (pair == null) {
      toast.error("No token selected");
      return;
    }
    if (recipient == null) {
      toast.error("No recipient selected");
      return;
    }

    onSend({
      publicTokenSymbol: pair.publicToken.symbol,
      confidentialTokenSymbol: getConfidentialSymbol(pair),
      publicTokenAddress: pair.publicToken.address,
      confidentialTokenAddress: pair.confidentialToken?.address ?? "",
      amount: rawAmount,
      recipient: recipient,
      tokenDecimals: pair.confidentialToken?.decimals ?? 18,
    });
  };

  return (
    <Button
      className="text-nowrap"
      variant={disabled ? "ghost" : "default"}
      size="md"
      disabled={disabled || isSending}
      onClick={handleSend}
    >
      {isSending ? (isEncrypting ? "Encrypting..." : "Sending...") : "Send"}
    </Button>
  );
};

const breakOnNewlines = (text?: string) => {
  if (text == null) return null;
  return text.split("\n").map((line, index) => (
    <React.Fragment key={index}>
      {line}
      <br />
    </React.Fragment>
  ));
};

const HintOrError = ({ hint, errorMessage }: { hint?: string; errorMessage: string | null }) => {
  return (
    <div className="flex flex-col items-end justify-center min-h-10 text-right text-sm font-reddit-mono italic">
      {errorMessage && <span className="text-destructive">{breakOnNewlines(errorMessage)}</span>}
      {hint && <span className="text-primary-accent">{breakOnNewlines(hint)}</span>}
    </div>
  );
};
