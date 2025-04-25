import { TokenIcon } from "./TokenIcon";
import { cn } from "~~/lib/utils";
import { TokenItemData } from "~~/services/store/tokenStore";

export function TokenIconSymbol({
  publicToken,
  confidentialToken,
  isConfidential,
  size,
  className,
}: {
  publicToken?: TokenItemData;
  confidentialToken?: TokenItemData;
  isConfidential?: boolean;
  size?: number;
  className?: string;
}) {
  const symbol = isConfidential ? (confidentialToken?.symbol ?? `e${publicToken?.symbol}`) : publicToken?.symbol;

  return (
    <div className={cn("flex items-center justify-start rounded-full gap-2 text-primary", className)}>
      <TokenIcon publicToken={publicToken} isConfidential={isConfidential} size={size} />
      <div className="font-semibold font-reddit-mono">{symbol}</div>
    </div>
  );
}
