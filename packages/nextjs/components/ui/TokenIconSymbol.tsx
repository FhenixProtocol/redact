import { useMemo } from "react";
import { TokenIcon } from "./TokenIcon";
import { getTokenLogo } from "~~/lib/tokenUtils";
import { cn } from "~~/lib/utils";
import { TokenItemData } from "~~/services/store/tokenStore";

export function TokenIconSymbol({
  token,
  size,
  confidential,
  className,
}: {
  token?: TokenItemData;
  size?: number;
  confidential?: boolean;
  className?: string;
}) {
  const icon = useMemo(() => {
    if (token?.symbol) return getTokenLogo(token.symbol);
    return "/token-icons/default-token.webp";
  }, [token?.symbol]);

  return (
    <div className={cn("flex items-center justify-start rounded-full p-1.5 pr-3 gap-2 text-primary", className)}>
      <TokenIcon token={token} confidential={confidential} size={size} />
      <div className="font-semibold font-reddit-mono">{token?.symbol}</div>
    </div>
  );
}
