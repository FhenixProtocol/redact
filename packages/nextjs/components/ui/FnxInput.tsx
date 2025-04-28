import React, { useEffect, useRef, useState } from "react";
import { InputWithFades } from "./InputWithFades";
import { cn } from "~~/lib/utils";

interface FnxInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  error?: string;
  noSpinner?: boolean;
  noBorder?: boolean;
  noOutline?: boolean;
  height?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  variant?: "xs" | "sm" | "md" | "lg";
  fades?: boolean;
  bgColor?: string;
}

const sizeVariants = {
  xs: "px-2 py-1 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-md",
  lg: "px-5 py-3 text-lg",
};

export const FnxInput = React.forwardRef<HTMLInputElement, FnxInputProps>(
  (
    {
      className,
      error,
      noSpinner,
      noBorder,
      noOutline = true,
      height,
      leftElement,
      rightElement,
      variant = "md",
      fades,
      bgColor = "theme-white",
      ...props
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
      <div className="relative w-full overflow-hidden">
        <div
          className={cn(
            "flex items-center justify-between rounded-full border-1 border-primary-accent p-0 m-0 relative",
            `bg-${bgColor}`,
            error && "border-red-500",
          )}
        >
          {leftElement}
          <InputWithFades
            fades={fades}
            bgColor={bgColor}
            ref={node => {
              // Handle both refs
              inputRef.current = node;
              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            className={cn(
              "flex-1 rounded-l-full font-reddit-mono text-primary",
              sizeVariants[variant],
              leftElement ? "pl-0" : "",
              rightElement ? "pr-0" : "",
              noBorder && "border-none",
              noOutline && "no-outline",
              noSpinner && "no-spinner",
              height,
              className,
            )}
            {...props}
          />
          {rightElement}
        </div>
        {error && <span className="absolute -bottom-5 left-4 text-xs text-red-500">{error}</span>}
      </div>
    );
  },
);

FnxInput.displayName = "FnxInput";
