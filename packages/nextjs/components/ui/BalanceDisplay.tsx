import { useMemo } from "react";
import { DisplayValue } from "./DisplayValue";
import { formatUnits } from "viem";

export function BalanceDisplay({
  balance,
  decimals = 18,
  className,
  icon,
  left = false,
}: {
  balance: bigint | null | undefined;
  decimals?: number;
  className?: string;
  icon?: React.ReactNode;
  left?: boolean;
}) {
  const display = useMemo(() => {
    if (balance == null) return "...";
    return formatUnits(balance, decimals);
  }, [balance, decimals]);
  return <DisplayValue value={display} className={className} icon={icon} left={left} />;
}
