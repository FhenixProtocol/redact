import { useMemo } from "react";
import { cn } from "~~/lib/utils";

export function NumericValue({
  value,
  prefix = "",
  className,
}: {
  value: string;
  prefix?: string;
  className?: string;
}) {
  const displayWithPrefix = useMemo(() => {
    // Pad left to 10 characters with spaces
    // Prefix with <>
    return prefix.concat(value.padStart(10, " "));
  }, [value, prefix]);

  return (
    <span
      className={cn("min-w-24 text-center px-1 py-0 font-mono whitespace-pre border-2 border-transparent", className)}
    >
      {displayWithPrefix}
    </span>
  );
}
