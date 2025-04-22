import { useMemo } from "react";
import { cn } from "~~/lib/utils";

export function DisplayValue({
  value,
  prefix = "",
  className,
  padding = 0,
  left,
}: {
  value: string;
  prefix?: string;
  className?: string;
  padding?: number;
  left?: boolean;
}) {
  const displayWithPrefix = useMemo(() => {
    // Pad left to 10 characters with spaces
    // Prefix with <>
    const paddedValue = left ? value.padEnd(padding, " ") : value.padStart(padding, " ");
    return prefix.concat(paddedValue);
  }, [value, prefix, left, padding]);

  return (
    <span
      className={cn(
        "min-w-24 text-right px-1 py-0 font-mono whitespace-pre border-2 border-transparent",
        left && "text-left",
        className,
      )}
    >
      {displayWithPrefix}
    </span>
  );
}
