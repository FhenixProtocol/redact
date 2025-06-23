import React, { useMemo } from "react";
import { Button } from "./ui/Button";
import {
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleDotDashed,
  CircleX,
  LoaderCircle,
} from "lucide-react";
import { cn } from "~~/lib/utils";

export enum TxGuideStepState {
  Ready,
  Loading,
  Success,
  Error,
}

type TxGuideStep = {
  title: string;
  cta?: string; // Will use the title if not provided
  hint?: string;
  action?: () => void;
  state: TxGuideStepState;
  errorMessage?: string;
  disabled?: boolean;
  userInteraction?: boolean;
};

type TxGuideProps = {
  title: string;
  steps: TxGuideStep[];
};

export const TransactionGuide: React.FC<TxGuideProps> = ({ title, steps }) => {
  const activeStepIndex = useMemo(() => {
    return steps.findIndex(step => step.state !== TxGuideStepState.Success);
  }, [steps]);

  return (
    <div className="flex flex-col gap-2 bg-primary-foreground rounded-2xl p-4 w-full">
      <div className="flex flex-row justify-start items-center gap-2 redact-text-primary">
        <CircleAlert />
        <span className="font-semibold">{title}</span>
      </div>
      <div className="flex flex-row gap-2 p-4 pt-8 justify-around items-center">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <TxGuideStep step={step} stepIndex={index} activeStepIndex={activeStepIndex} />
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex flex-1 h-0.5 bg-primary rounded",
                  step.state === TxGuideStepState.Success ? "bg-success-500" : "bg-primary",
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="flex flex-row gap-2 justify-between items-center">
        <ActionButton step={steps[activeStepIndex]} />
        <ActiveStepHintOrError step={steps[activeStepIndex]} />
      </div>
    </div>
  );
};

const TxGuideStep = ({
  step,
  stepIndex,
  activeStepIndex,
}: {
  step: TxGuideStep;
  stepIndex: number;
  activeStepIndex: number;
}) => {
  const userInteraction = step?.userInteraction ?? true;
  return (
    <div className="flex flex-col gap-2 items-center justify-center relative">
      <TxGuideStepTitle title={step.title} state={step.state} stepIndex={stepIndex} activeStepIndex={activeStepIndex} />
      <TxGuideStepCircleIcon
        state={step.state}
        stepIndex={stepIndex}
        activeStepIndex={activeStepIndex}
        userInteraction={userInteraction}
      />
    </div>
  );
};

const getStepColor = (state: TxGuideStepState, isActive: boolean) => {
  switch (state) {
    case TxGuideStepState.Success:
      return "text-success-500";
    case TxGuideStepState.Error:
      return "text-destructive";
    case TxGuideStepState.Loading:
      return "text-warning-500";
    case TxGuideStepState.Ready:
      return isActive ? "text-primary-accent" : "text-primary";
  }
};

const getStepIcon = (state: TxGuideStepState, isActive: boolean, userInteraction: boolean) => {
  switch (state) {
    case TxGuideStepState.Success:
      return CircleCheck;
    case TxGuideStepState.Error:
      return CircleX;
    case TxGuideStepState.Loading:
      return LoaderCircle;
    case TxGuideStepState.Ready:
      return isActive ? (userInteraction ? CircleDot : CircleDotDashed) : userInteraction ? Circle : CircleDashed;
  }
};

const TxGuideStepTitle = ({
  title,
  state,
  stepIndex,
  activeStepIndex,
}: {
  title: string;
  state: TxGuideStepState;
  stepIndex: number;
  activeStepIndex: number;
}) => {
  const isActive = stepIndex === activeStepIndex;
  const color = getStepColor(state, isActive);

  return (
    <div className={cn("whitespace-nowrap text-sm absolute -top-6", color, isActive ? "font-bold" : "font-normal")}>
      {title}
    </div>
  );
};

const TxGuideStepCircleIcon = ({
  state,
  stepIndex,
  activeStepIndex,
  userInteraction,
}: {
  state: TxGuideStepState;
  stepIndex: number;
  activeStepIndex: number;
  userInteraction: boolean;
}) => {
  const isActive = stepIndex === activeStepIndex;

  const Icon = getStepIcon(state, isActive, userInteraction);
  const color = getStepColor(state, isActive);

  const loading = state === TxGuideStepState.Loading;

  return <Icon className={cn(color, loading && "animate-spin")} />;
};

const ActionButton = ({ step }: { step?: TxGuideStep }) => {
  const disabled = step == null || step.action == null || step.disabled;
  const text = step?.cta ?? step?.title ?? "";
  return (
    <Button
      className="text-nowrap"
      variant={disabled ? "ghost" : "default"}
      size="md"
      disabled={disabled}
      onClick={step?.action}
    >
      {text}
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

const ActiveStepHintOrError = ({ step }: { step?: TxGuideStep }) => {
  return (
    <div className="flex flex-col items-end justify-center min-h-10 text-right text-sm font-reddit-mono italic">
      {step?.errorMessage && <span className="text-destructive">{breakOnNewlines(step?.errorMessage)}</span>}
      {step?.errorMessage == null && step?.hint && (
        <span className="text-primary-accent">{breakOnNewlines(step?.hint)}</span>
      )}
    </div>
  );
};
