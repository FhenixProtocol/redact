import { useMemo } from "react";
import { DisplayValue } from "./DisplayValue";
import { FheTypes, UnsealedItem } from "cofhejs/web";
import { EyeOff, LoaderCircle } from "lucide-react";
import { formatTokenAmount } from "~~/lib/common";
import { cn } from "~~/lib/utils";
import { useDecryptValue } from "~~/services/store/decrypted";

export function EncryptedValue<T extends FheTypes>({
  fheType,
  ctHash,
  className,
  transform,
  showIcon = true,
}: {
  fheType: T;
  ctHash: bigint | null | undefined;
  className?: string;
  transform: (value: UnsealedItem<T>) => string;
  showIcon?: boolean;
}) {
  const decryptedValue = useDecryptValue(fheType, ctHash);
  const { value, state } = decryptedValue;

  const display = useMemo(() => {
    if (ctHash == null) return "...";
    if (value == null) return "XXXXXX";
    return transform(value);
  }, [ctHash, transform, value]);

  return (
    <DisplayValue
      value={display}
      icon={
        showIcon ? (
          state === "pending" ? (
            <LoaderCircle className="w-5 h-5 animate-spin" />
          ) : (
            <EyeOff className="w-5 h-5" />
          )
        ) : undefined
      }
      className={cn(
        "text-primary min-w-32",
        (state === "pending" || state === "error") && "text-primary-foreground",
        className,
      )}
      onClick={() => {
        console.log("Encrypted Value:", decryptedValue);
      }}
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
  precision,
  className,
  showIcon = true,
}: {
  ctHash: bigint | null | undefined;
  decimals?: number;
  precision?: number;
  className?: string;
  showIcon?: boolean;
}) {
  return (
    <EncryptedValue
      fheType={FheTypes.Uint128}
      ctHash={ctHash}
      transform={value => formatTokenAmount(value, decimals, precision)}
      className={className}
      showIcon={showIcon}
    />
  );
}
