import React, { useState } from "react";
import { SelectToken } from "../SelectToken";
import { TokenSelector } from "../TokenSelector";
import { Button } from "../ui/Button";
import { FnxInput } from "../ui/FnxInput";
import { Slider } from "../ui/FnxSlider";
import { Modal } from "../ui/Modal";
import { TokenIconSymbol } from "../ui/TokenIconSymbol";
import { Eye, EyeClosed, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { formatUnits } from "viem";
import { useSendConfidentialTokenAction, useSendPublicTokenAction } from "~~/hooks/useSendActions";
import { getConfidentialSymbol, truncateAddress } from "~~/lib/common";
import { cn } from "~~/lib/utils";
import {
  useSelectSendToken,
  useSendBalances,
  useSendPair,
  useSendPercentValue,
  useSendRawInputValue,
  useSendRecipient,
  useSendRecipientError,
  useSendSetIsPublic,
  useSendValueError,
  useUpdateSendRecipient,
  useUpdateSendValue,
  useUpdateSendValueByPercent,
} from "~~/services/store/sendStore";
import { useSendInputValue } from "~~/services/store/sendStore";
import { useSendIsPublic } from "~~/services/store/sendStore";

export function SendPage() {
  const pair = useSendPair();
  const isPublic = useSendIsPublic();

  return (
    <div className="p-4 pb-0 flex flex-col gap-1 h-full items-center">
      <div className="flex flex-col items-start justify-start w-full">
        <div className="text-3xl text-primary font-semibold mb-12">
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
    <Button
      variant="ghost"
      noOutline={true}
      className="px-4 py-1 flex flex-row w-full justify-between items-center rounded-2xl border border-[#3399FF]"
      onClick={() => setIsPublic(!isPublic)}
    >
      <span className="text-primary text-sm">
        <span className="font-normal">Mode:</span> {isPublic ? "Public" : "Confidential"}
      </span>
      <div className="flex flex-row items-center justify-center rounded-2xl p-1 bg-gray-200">
        <Button
          variant={isPublic ? "default" : "ghost"}
          size="md"
          noOutline={true}
          className="p-1 pointer-events-none"
          icon={Eye}
        />
        <Button
          variant={isPublic ? "ghost" : "default"}
          size="md"
          noOutline={true}
          className="p-1 pointer-events-none"
          icon={EyeOff}
        />
      </div>
    </Button>
  );
};

const AmountInputRow = () => {
  const isPublic = useSendIsPublic();
  const inputValue = useSendInputValue();
  const setInputValue = useUpdateSendValue();
  const pair = useSendPair();
  const balances = useSendBalances();
  const setToken = useSelectSendToken();
  const setSliderValue = useUpdateSendValueByPercent();

  return (
    <div className="mb-5 w-full flex content-stretch rounded-2xl border border-[#3399FF] p-4">
      <div className="flex flex-col items-start flex-1">
        <div className="text-sm text-[#336699] font-semibold">You Send:</div>
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
          isEncrypt={isPublic}
          onChange={(val: string) => setToken(val)}
          className="z-100 text-sm w-[130px]"
        />
        <div className="flex justify-between items-center w-full">
          <div className="text-xs text-[#336699]">
            Balance: {isPublic && formatUnits(balances?.publicBalance ?? 0n, pair?.publicToken.decimals ?? 18)}
            {!isPublic && formatUnits(balances?.confidentialBalance ?? 0n, pair?.publicToken.decimals ?? 18)}
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

  const isValidInput = recipientError == null;

  return (
    <FnxInput
      bgColor="background"
      variant="md"
      noOutline={true}
      placeholder="0x..."
      value={recipient ?? ""}
      onChange={e => setRecipient(e.target.value)}
      className={`w-full  ${!isValidInput ? "border-red-500" : ""}`}
      error={!isValidInput ? "Invalid address format" : undefined}
      fades={true}
      leftElement={<span className="px-4 text-primary text-sm font-normal">To:</span>}
    />
  );
};

const SendButtonRow = () => {
  const isPublic = useSendIsPublic();
  const pair = useSendPair();
  const valueError = useSendValueError();
  const amount = useSendInputValue();
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
  const { onSend, isSending } = useSendConfidentialTokenAction();
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
