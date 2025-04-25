import React, { useEffect, useRef, useState } from "react";
import { cn } from "~~/lib/utils";

interface FnxInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  bgColor?: string;
  fades?: boolean;
}

export const InputWithFades = React.forwardRef<HTMLInputElement, FnxInputProps>(
  ({ fades = true, bgColor, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(false);

    useEffect(() => {
      const checkScroll = () => {
        const input = inputRef.current;
        if (input) {
          setShowLeftFade(input.scrollLeft > 0);
          console.log("right fade?", {
            scrollWidth: input.scrollWidth,
            clientWidth: input.clientWidth,
            scrollLeft: input.scrollLeft,
            scrollWidthMinusClientWidth: input.scrollWidth - input.clientWidth,
          });
          setShowRightFade(
            input.scrollWidth > input.clientWidth && input.scrollLeft < input.scrollWidth - input.clientWidth - 1,
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
      <>
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
          {...props}
        />
        <div
          className={cn(
            `absolute left-3 top-0 bottom-0 w-12 pointer-events-none rounded-l-full`,
            `bg-gradient-to-r from-${bgColor} to-transparent`,
            "transition-opacity duration-150",
            fades && showLeftFade ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            `absolute right-3 top-0 bottom-0 w-12 pointer-events-none rounded-r-full`,
            `bg-gradient-to-r from-transparent to-${bgColor}`,
            "transition-opacity duration-150",
            fades && showRightFade ? "opacity-100" : "opacity-0",
          )}
        />
      </>
    );
  },
);

InputWithFades.displayName = "InputWithFades";
