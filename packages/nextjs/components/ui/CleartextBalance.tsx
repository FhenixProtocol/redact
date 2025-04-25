import { DisplayBalance } from "./DisplayBalance";
import { Eye } from "lucide-react";

export function CleartextBalance({
  balance,
  decimals = 18,
  className,
  left = false,
}: {
  balance: bigint | null | undefined;
  decimals?: number;
  className?: string;
  left?: boolean;
}) {
  return (
    <DisplayBalance
      balance={balance}
      decimals={decimals}
      className={className}
      icon={<Eye className="w-5 h-5" />}
      left={left}
    />
  );
}
