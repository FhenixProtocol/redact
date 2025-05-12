"use client";

import * as React from "react";
import { useMemo } from "react";
import { FheTypes } from "cofhejs/web";
import { Eye, EyeOff, Ticket } from "lucide-react";
import { formatTokenAmount } from "~~/lib/common";
import { cn } from "~~/lib/utils";
import { useDecryptValue } from "~~/services/store/decrypted";

interface BalanceBarProps {
  publicBalance: bigint;
  fragmentedBalance?: bigint;
  confidentialBalance: bigint;
  claimableAmount?: bigint;
  showBalance?: boolean;
  decimals?: number;
  height?: number;
  borderClassName?: string;
  infoRowPosition?: "top" | "bottom";
}

const InfoRow = ({
  publicPercentage,
  claimablePercentage,
  confidentialPercentage,
  fragmentedPercentage,
  displayPublic,
  displayConfidential,
  showBalance,
  claimableAmount,
  className,
}: {
  publicPercentage: number;
  claimablePercentage: number;
  confidentialPercentage: number;
  fragmentedPercentage: number;
  displayPublic: string;
  displayConfidential: string;
  showBalance: boolean;
  claimableAmount: bigint;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-row justify-between text-xs mb-1", className)}>
      <div className="flex flex-row items-center gap-2">
        <Eye className="w-4 h-4" /> {publicPercentage}% {showBalance && <div>({displayPublic})</div>}
      </div>
      {fragmentedPercentage > 0 && (
        <div className="flex flex-row flex-grow justify-center items-center gap-2">
          <div className="group relative">
            <div className="flex flex-row items-center gap-1">
              <Ticket className="w-4 h-4" /> {fragmentedPercentage}%
            </div>
          </div>
        </div>
      )}
      {claimableAmount > 0n && (
        <div className="flex flex-row flex-grow justify-center items-center gap-2">
          <div className="group relative">
            <div className="flex flex-row items-center gap-1">
              <Ticket className="w-4 h-4" /> {claimablePercentage}%
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-row items-center gap-2">
        {showBalance && <div>({displayConfidential})</div>} {confidentialPercentage}% <EyeOff className="w-4 h-4" />
      </div>
    </div>
  );
};

const BalanceBar = React.forwardRef<HTMLDivElement, BalanceBarProps>((props, ref) => {
  const {
    publicBalance = 0n,
    fragmentedBalance = 0n,
    confidentialBalance = 0n,
    claimableAmount = 0n,
    showBalance = false,
    decimals = 18,
    height = 10,
    borderClassName = "border-2 border-blue-700",
    infoRowPosition = "top",
  } = props;

  const { value } = useDecryptValue(FheTypes.Uint128, confidentialBalance);

  const unsealedConfidentialBalance = value ?? 0n;

  const totalBalance =
    BigInt(publicBalance) + BigInt(unsealedConfidentialBalance) + BigInt(claimableAmount) + BigInt(fragmentedBalance);

  const publicPercentage = totalBalance > 0n ? Number((BigInt(publicBalance) * 10000n) / totalBalance) / 100 : 0;

  const fragmentedPercentage =
    totalBalance > 0n ? Number((BigInt(fragmentedBalance) * 10000n) / totalBalance) / 100 : 0;

  const confidentialPercentage =
    totalBalance > 0n ? Number((BigInt(unsealedConfidentialBalance) * 10000n) / totalBalance) / 100 : 0;
  const claimablePercentage = totalBalance > 0n ? Number((BigInt(claimableAmount) * 10000n) / totalBalance) / 100 : 0;

  const displayPublic = useMemo(() => {
    if (totalBalance === 0n) return "0";
    return formatTokenAmount(publicBalance, decimals);
  }, [totalBalance, publicBalance, decimals]);

  const displayConfidential = useMemo(() => {
    if (totalBalance === 0n) return "0";
    return formatTokenAmount(unsealedConfidentialBalance, decimals);
  }, [unsealedConfidentialBalance, decimals, totalBalance]);

  const displayClaimable = useMemo(() => {
    if (totalBalance === 0n) return "0";
    return formatTokenAmount(claimableAmount, decimals);
  }, [claimableAmount, decimals, totalBalance]);

  const displayFragmented = useMemo(() => {
    if (totalBalance === 0n) return "0";
    return formatTokenAmount(fragmentedBalance, decimals);
  }, [fragmentedBalance, decimals, totalBalance]);

  const readings = [
    {
      name: "Public",
      percentage: publicPercentage,
      balance: displayPublic,
      color: "bg-blue-200", // "bg-[#b290f5]"
    },
    ...(fragmentedBalance > 0n
      ? [
          {
            name: "Fragmented",
            percentage: fragmentedPercentage,
            balance: displayFragmented,
            color: "bg-info-900", //"bg-[#eb90f5]"
          },
        ]
      : []),
    ...(claimableAmount > 0n
      ? [
          {
            name: "Claimable",
            percentage: claimablePercentage,
            balance: displayClaimable,
            color: "bg-success-500",
          },
        ]
      : []),
    {
      name: "Confidential",
      percentage: confidentialPercentage,
      balance: displayConfidential,
      color: "bg-info-900", //"bg-[#eb90f5]"
    },
  ];

  const visibleBars = readings.map((r, i) => ({ ...r, i })).filter(r => r.percentage > 0);

  // Calculate separator position: sum of all but last
  const separatorOffset = readings
    .slice(0, readings.length - 1)
    .reduce((sum, r) => sum + (r.percentage > 0 ? r.percentage : 0), 0);

  const showSeparator = readings.length > 1 && separatorOffset > 2 && separatorOffset < 98;

  return (
    <div className="m-0.5 w-full flex flex-col gap-1" ref={ref}>
      {infoRowPosition === "top" && (
        <InfoRow
          publicPercentage={publicPercentage}
          claimablePercentage={claimablePercentage}
          confidentialPercentage={confidentialPercentage}
          fragmentedPercentage={fragmentedPercentage}
          displayPublic={displayPublic}
          displayConfidential={displayConfidential}
          showBalance={showBalance}
          claimableAmount={claimableAmount}
        />
      )}
      <div
        className={cn(`relative flex items-center w-full rounded-full`, borderClassName)}
        style={{ height: `${height}px` }}
      >
        {visibleBars.map(r => (
          <div
            key={r.i}
            className={cn("first:rounded-l-full last:rounded-r-full h-full relative", r.color)}
            style={{ width: `${r.percentage}%` }}
          />
        ))}
        {/* Single separator before the last bar */}
        {showSeparator && (
          <div
            className={`bg-blue-700 absolute h-[300%] w-1 z-10 rounded-xs`}
            style={{ left: `${separatorOffset}%` }}
          />
        )}
      </div>
      {infoRowPosition === "bottom" && (
        <InfoRow
          publicPercentage={publicPercentage}
          claimablePercentage={claimablePercentage}
          confidentialPercentage={confidentialPercentage}
          fragmentedPercentage={fragmentedPercentage}
          displayPublic={displayPublic}
          displayConfidential={displayConfidential}
          showBalance={showBalance}
          claimableAmount={claimableAmount}
          className="mt-1"
        />
      )}
    </div>
  );
});

BalanceBar.displayName = "BalanceBar";

export { BalanceBar };
