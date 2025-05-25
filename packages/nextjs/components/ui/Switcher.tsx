"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "~~/lib/utils";

type SwitcherOption = {
  description: string;
  icon: LucideIcon;
};
export interface SwitcherProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  options: SwitcherOption[];
  value?: number;
  width?: string;
  className?: string;
  onValueChange?: (value: number) => void;
  hideLabel?: boolean;
  disabled?: boolean;
}

export const Switcher = React.forwardRef<HTMLDivElement, SwitcherProps>(function Switcher(
  { label, options, value = 0, onValueChange, className, hideLabel, disabled },
  ref,
) {
  const Icon1 = options[0].icon;
  const Icon2 = options[1].icon;
  return (
    <div ref={ref} className="flex items-center justify-center">
      <div
        style={{ width: "100%" }}
        className={cn(
          "relative flex items-center gap-2 px-1 py-1 rounded-full bg-theme-white border border-primary-accent",
          className,
        )}
      >
        {!hideLabel && (
          <span className="ml-2 flex-1 text-sm font-medium text-theme-black">
            {label}: <span className="font-bold">{options[value].description}</span>
          </span>
        )}

        <div className="relative flex items-center gap-2 bg-gray-200/80 rounded-full p-1 shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)] cursor-pointer">
          <motion.div
            className="absolute w-7 h-7 bg-primary-accent rounded-full cursor-pointer"
            initial={false}
            animate={{
              x: value === 0 ? 0 : 35,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
          <button
            onClick={() => onValueChange?.(0)}
            disabled={disabled}
            className={`relative z-10 p-1.5 rounded-full cursor-pointer ${value === 0 ? "text-white" : "text-gray-600 hover:text-gray-900"} ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Icon1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onValueChange?.(1)}
            disabled={disabled}
            className={`relative z-10 p-1.5 rounded-full cursor-pointer ${value === 1 ? "text-white" : "text-gray-600 hover:text-gray-900"} ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Icon2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
