import React from "react";
import { cn } from "~~/lib/utils";

export type DisplayValueProps = {
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  className?: string;
  left?: boolean;
  onClick?: () => void;
};

export function DisplayValue({
  value,
  prefix = "",
  suffix = "",
  icon,
  className,
  left,
  children,
  onClick,
}: DisplayValueProps & { value: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-row items-center justify-between gap-1 px-1 py-0 font-semibold text-primary relative",
        className,
      )}
      onClick={onClick}
    >
      {children}
      <div className="flex flex-row gap-2 items-center justify-between w-full z-0">
        {icon}
        <span className={cn("text-right font-reddit-mono whitespace-pre self-end", left && "text-left self-start")}>
          {prefix}
          {value}
          {suffix}
        </span>
      </div>
    </div>
  );
}
