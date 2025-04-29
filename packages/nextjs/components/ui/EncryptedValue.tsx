import { useMemo } from "react";
import { DisplayValue } from "./DisplayValue";
import { FheTypes, UnsealedItem } from "cofhejs/web";
import { EyeOff } from "lucide-react";
import { formatUnits } from "viem";
import { cn } from "~~/lib/utils";
import { useDecryptValue } from "~~/services/store/decrypted";

export function EncryptedValue<T extends FheTypes>({
  fheType,
  ctHash,
  className,
  transform,
}: {
  fheType: T;
  ctHash: bigint | null | undefined;
  className?: string;
  transform: (value: UnsealedItem<T>) => string;
}) {
  const { value: decryptedValue } = useDecryptValue(fheType, ctHash);

  const display = useMemo(() => {
    if (ctHash == null) return "...";
    if (decryptedValue == null) return "XXXXXX";
    return transform(decryptedValue);
  }, [ctHash, transform, decryptedValue]);

  //console.log({ decryptedValue });

  return (
    <DisplayValue
      value={display}
      icon={<EyeOff className="w-5 h-5" />}
      className={cn(
        "border-primary text-primary min-w-32",
        decryptedValue == null && "text-primary-foreground",
        className,
      )}
    >
      <div
        className={cn("absolute right-0 h-full bg-primary transition-all", decryptedValue == null ? "w-full" : "w-0")}
      />
    </DisplayValue>
  );
}

export function EncryptedBalance({
  ctHash,
  decimals = 18,
  className,
}: {
  ctHash: bigint | null | undefined;
  decimals?: number;
  className?: string;
}) {
  return (
    <EncryptedValue
      fheType={FheTypes.Uint128}
      ctHash={ctHash}
      transform={value => formatUnits(value, decimals)}
      className={className}
    />
  );
}
