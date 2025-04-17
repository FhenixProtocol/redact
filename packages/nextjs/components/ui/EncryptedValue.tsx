import { FheTypes, UnsealedItem } from "cofhejs/web";
import { formatUnits } from "viem";
import { cn } from "~~/lib/utils";
import { useDecryptValue } from "~~/services/store/decrypted";

export function EncryptedValue<T extends FheTypes>({
  fheType,
  value,
  className,
  transform,
}: {
  fheType: T;
  value: bigint | null | undefined;
  className?: string;
  transform: (value: UnsealedItem<T> | null | undefined) => string;
}) {
  const { value: decryptedValue } = useDecryptValue(fheType, value);
  return <span className={cn(className)}>{transform(decryptedValue)}</span>;
}

export function EncryptedBalance({
  value,
  decimals = 18,
  className,
}: {
  value: bigint | null | undefined;
  decimals?: number;
  className?: string;
}) {
  return (
    <EncryptedValue
      fheType={FheTypes.Uint128}
      value={value}
      transform={value => (value == null ? "..." : formatUnits(value, decimals))}
      className={className}
    />
  );
}
