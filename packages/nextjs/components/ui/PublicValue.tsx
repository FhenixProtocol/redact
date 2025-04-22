import { useMemo } from "react";
import { DisplayValue } from "./DisplayValue";
import { Eye } from "lucide-react";
import { formatUnits } from "viem";

export function PublicBalance({
  balance,
  decimals = 18,
  className,
}: {
  balance: bigint | null | undefined;
  decimals?: number;
  className?: string;
}) {
  const display = useMemo(() => {
    if (balance == null) return "...";
    return formatUnits(balance, decimals);
  }, [balance, decimals]);
  return <DisplayValue value={display} className={className} icon={<Eye className="w-5 h-5" />} />;
}
