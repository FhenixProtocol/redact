import { useMemo } from "react";
import { DisplayValue } from "./DisplayValue";
import { FheTypes, UnsealedItem } from "cofhejs/web";
import { EyeOff, LoaderCircle } from "lucide-react";
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
  const { value, state } = useDecryptValue(fheType, ctHash);

  const display = useMemo(() => {
    if (ctHash == null) return "...";
    if (value == null) return "XXXXXX";
    return transform(value);
  }, [ctHash, transform, value]);

  return (
    <DisplayValue
      value={display}
      icon={state === "pending" ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <EyeOff className="w-5 h-5" />}
      className={cn(
        "text-primary min-w-32",
        (state === "pending" || state === "error") && "text-primary-foreground",
        className,
      )}
    >
      <div
        className={cn(
          "absolute right-0 h-full bg-primary transition-all",
          state === "pending" || state === "error" ? "w-full" : "w-0",
          state === "error" && "bg-destructive",
        )}
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
