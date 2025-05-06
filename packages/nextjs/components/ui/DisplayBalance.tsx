import { useMemo } from "react";
import { DisplayValue, DisplayValueProps } from "./DisplayValue";
import { formatTokenAmount } from "~~/lib/common";

export function DisplayBalance({
  balance,
  decimals = 18,
  precision,
  ...props
}: DisplayValueProps & {
  balance: bigint | null | undefined;
  decimals?: number;
  precision?: number;
}) {
  const display = useMemo(() => {
    if (balance == null) return "...";
    if (balance < 0n) return "N/A";
    return formatTokenAmount(balance, decimals, precision);
  }, [balance, decimals, precision]);
  return <DisplayValue value={display} {...props} />;
}
