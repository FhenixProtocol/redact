import SymbolImage from "./SymbolImage";
import { cn } from "~~/lib/utils";
import { TokenItemData } from "~~/services/store/tokenStore";

export function TokenIcon({
  publicToken,
  isConfidential,
  size = 28,
  className,
}: {
  publicToken?: TokenItemData;
  isConfidential?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)} style={{ width: `${size}px`, height: `${size}px` }}>
      <SymbolImage
        publicSymbol={publicToken?.symbol ?? ""}
        isConfidential={isConfidential ?? false}
        ext="webp"
        size={size}
      />
    </div>
  );
}
