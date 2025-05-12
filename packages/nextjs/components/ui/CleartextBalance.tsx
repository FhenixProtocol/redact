import { DisplayBalance } from "./DisplayBalance";
import { Eye } from "lucide-react";
import { cn } from "~~/lib/utils";

export function CleartextBalance({
  balance,
  decimals = 18,
  className,
  left = false,
  showIcon = true,
}: {
  balance: bigint | null | undefined;
  decimals?: number;
  className?: string;
  left?: boolean;
  showIcon?: boolean;
}) {
  return (
    <DisplayBalance
      balance={balance}
      decimals={decimals}
      className={cn("min-w-32", className)}
      icon={showIcon ? <Eye className="w-5 h-5" /> : undefined}
      left={left}
    />
  );
}
