import { cn } from "~~/lib/utils";

export type DisplayValueProps = {
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  className?: string;
  left?: boolean;
};

export function DisplayValue({
  value,
  prefix = "",
  suffix = "",
  icon,
  className,
  left,
}: DisplayValueProps & { value: string }) {
  return (
    <div
      className={cn(
        "flex flex-row items-center justify-between gap-1 border-2 border-transparent px-1 py-0 font-semibold text-primary",
        className,
      )}
    >
      {icon}
      <span className={cn("text-right font-reddit-mono whitespace-pre self-end", left && "text-left self-start")}>
        {prefix}
        {value}
        {suffix}
      </span>
    </div>
  );
}
