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
  confidentialBalance: bigint;
  claimableAmount?: bigint;
  showBalance?: boolean;
  decimals?: number;
  height?: number;
  borderClassName?: string;
}

const BalanceBar = React.forwardRef<HTMLDivElement, BalanceBarProps>((props, ref) => {
  const {
    publicBalance = 0n,
    confidentialBalance = 0n,
    claimableAmount = 0n,
    showBalance = false,
    decimals = 18,
    height = 10,
    borderClassName = "border-2 border-blue-700",
  } = props;

  const { value } = useDecryptValue(FheTypes.Uint128, confidentialBalance);

  const unsealedConfidentialBalance = value ?? 0n;

  const totalBalance = BigInt(publicBalance) + BigInt(unsealedConfidentialBalance) + BigInt(claimableAmount);
  const publicPercentage = totalBalance > 0n ? Number((BigInt(publicBalance) * 10000n) / totalBalance) / 100 : 0;
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

  const readings = [
    {
      name: "Public",
      percentage: publicPercentage,
      balance: displayPublic,
      color: "bg-blue-200", // "bg-[#b290f5]"
    },
    ...(claimableAmount > 0n
      ? [
          {
            name: "Claimable",
            percentage: claimablePercentage,
            balance: displayClaimable,
            color: "bg-primary-accent",
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
      <div className="flex flex-row justify-between text-xs mb-1">
        <div className="flex flex-row items-center gap-2">
          <Eye className="w-4 h-4" /> {publicPercentage}% {showBalance && <div>({displayPublic})</div>}
        </div>
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
    </div>
  );
});

BalanceBar.displayName = "BalanceBar";

export { BalanceBar };
