import React, { useEffect, useRef, useState } from "react";
import { cn } from "~~/lib/utils";

interface FnxInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  error?: string;
  noSpinner?: boolean;
  noBorder?: boolean;
  noOutline?: boolean;
  height?: string;
  rightElement?: React.ReactNode;
  variant?: "xs" | "sm" | "md" | "lg";
  fadeEnd?: boolean;
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
      rightElement,
      variant = "md",
      fadeEnd,
      ...props
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(false);

    useEffect(() => {
      const checkScroll = () => {
        const input = inputRef.current;
        if (input) {
          setShowLeftFade(input.scrollLeft > 0);
          setShowRightFade(
            input.scrollWidth > input.clientWidth && input.scrollLeft < input.scrollWidth - input.clientWidth,
          );
        }
      };

      const input = inputRef.current;
      if (input) {
        input.addEventListener("scroll", checkScroll);
        // Also check on content changes
        const observer = new ResizeObserver(checkScroll);
        observer.observe(input);
        checkScroll(); // Initial check
      }

      return () => {
        if (input) {
          input.removeEventListener("scroll", checkScroll);
        }
      };
    }, []);

    return (
      <div className="relative w-full overflow-hidden drop-shadow-sm">
        <div
          className={cn(
            "flex justify-between rounded-full border-1 border-primary-accent p-0 m-0 bg-theme-white relative",
            error && "border-red-500",
          )}
        >
          <input
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
              "flex-1 rounded-l-full",
              sizeVariants[variant],
              rightElement ? "pr-0" : "",
              noBorder && "border-none",
              noOutline && "no-outline",
              noSpinner && "no-spinner",
              height,
              className,
            )}
            {...props}
          />
          {fadeEnd && showLeftFade && (
            <div className="absolute left-3 top-0 bottom-0 w-20 pointer-events-none rounded-l-full bg-gradient-to-r to-transparent from-theme-white" />
          )}
          {fadeEnd && showRightFade && (
            <div className="absolute right-3 top-0 bottom-0 w-20 pointer-events-none rounded-r-full bg-gradient-to-r from-transparent to-theme-white" />
          )}
          {rightElement}
        </div>
        {error && <span className="absolute -bottom-5 left-4 text-xs text-red-500">{error}</span>}
      </div>
    );
  },
);

FnxInput.displayName = "FnxInput";
