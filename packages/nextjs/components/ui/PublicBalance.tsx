import { BalanceDisplay } from "./BalanceDisplay";
import { Eye } from "lucide-react";

export function PublicBalance({
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
    <BalanceDisplay
      balance={balance}
      decimals={decimals}
      className={className}
      icon={<Eye className="w-5 h-5" />}
      left={left}
    />
  );
}
