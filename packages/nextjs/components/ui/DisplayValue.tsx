import { useMemo } from "react";
import { cn } from "~~/lib/utils";

export function DisplayValue({
  value,
  prefix = "",
  icon,
  className,
  padding = 0,
  left,
}: {
  value: string;
  prefix?: string;
  icon?: React.ReactNode;
  className?: string;
  padding?: number;
  left?: boolean;
}) {
  const displayWithPrefix = useMemo(() => {
    // Pad left to 10 characters with spaces
    // Prefix with <>
    // const paddedValue = left ? value.padEnd(padding, " ") : value.padStart(padding, " ");
    return prefix.concat(value);
  }, [value, prefix, left, padding]);

  return (
    <div
      className={cn(
        "flex flex-row items-center justify-between gap-1 border-2 border-transparent px-1 py-0",
        className,
      )}
    >
      {icon}
      <span className={cn("min-w-24 text-right font-mono whitespace-pre", left && "text-left")}>
        {displayWithPrefix}
      </span>
    </div>
  );
}
