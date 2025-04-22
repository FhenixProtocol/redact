import { useMemo } from "react";
import Image from "next/image";
import { getTokenLogo } from "~~/lib/tokenUtils";
import { cn } from "~~/lib/utils";
import { TokenItemData } from "~~/services/store/tokenStore";

export function TokenIcon({
  token,
  size = 24,
  className,
  confidential,
}: {
  token: TokenItemData;
  size?: number;
  className?: string;
  confidential?: boolean;
}) {
  const icon = useMemo(() => {
    if (token.symbol) return getTokenLogo(token.symbol);
    return "/token-icons/default-token.webp";
  }, [token.symbol]);

  return (
    <div className={cn("relative", className)} style={{ width: `${size}px`, height: `${size}px` }}>
      <Image
        src={icon}
        alt={token.symbol ?? "Token Icon"}
        width={size}
        height={size}
        className={cn("object-cover")}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      {confidential && (
        <div
          className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-white"
          style={{ width: `${size / 2}px`, height: `${size / 2}px` }}
        >
          <div className="text-black text-sm">C</div>
        </div>
      )}
    </div>
  );
}
