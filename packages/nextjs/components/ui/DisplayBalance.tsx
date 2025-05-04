import { useMemo } from "react";
import { DisplayValue, DisplayValueProps } from "./DisplayValue";
import { formatUnits } from "viem";

export function DisplayBalance({
  balance,
  decimals = 18,
  ...props
}: DisplayValueProps & {
  balance: bigint | null | undefined;
  decimals?: number;
}) {
  const display = useMemo(() => {
    if (balance == null) return "...";
    if (balance < 0n) return "N/A";
    return formatUnits(balance, decimals);
  }, [balance, decimals]);
  return <DisplayValue value={display} {...props} />;
}
