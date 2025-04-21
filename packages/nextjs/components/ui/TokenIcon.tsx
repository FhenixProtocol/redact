import { useMemo } from "react";
import Image from "next/image";
import { getTokenLogo } from "~~/lib/tokenUtils";
import { TokenItemData } from "~~/services/store/tokenStore";

export function TokenIcon({ token }: { token: TokenItemData }) {
  const icon = useMemo(() => {
    if (token.symbol) return getTokenLogo(token.symbol);
    return "/token-icons/default-token.webp";
  }, [token.symbol]);

  return (
    <Image
      src={icon}
      alt={token.symbol ?? "Token Icon"}
      width={24}
      height={24}
      className="w-[24px] h-[24px] object-cover"
    />
  );
}
