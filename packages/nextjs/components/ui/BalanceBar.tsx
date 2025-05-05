"use client";

import * as React from "react";
import { useMemo } from "react";
import { FheTypes } from "cofhejs/web";
import { Eye, EyeOff, Ticket } from "lucide-react";
import { formatUnits } from "viem";
import { useDecryptValue } from "~~/services/store/decrypted";

// interface Reading {
//   percentage: number;
//   balance: number;
//   color: string;
//   name: string;
// }

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
    height = 15,
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
    return formatUnits(publicBalance, decimals);
  }, [totalBalance, publicBalance, decimals]);

  const displayConfidential = useMemo(() => {
    if (totalBalance === 0n) return "0";
    return formatUnits(unsealedConfidentialBalance, decimals);
  }, [unsealedConfidentialBalance, decimals, totalBalance]);

  const displayClaimable = useMemo(() => {
    if (totalBalance === 0n) return "0";
    return formatUnits(claimableAmount, decimals);
  }, [claimableAmount, decimals, totalBalance]);

  const readings = [
    {
      name: "Public",
      percentage: publicPercentage,
      balance: displayPublic,
      color: "bg-blue-200",
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
      color: "bg-blue-900",
    },
  ];

  const bars =
    readings &&
    readings.length &&
    readings.map(function (item, i: number) {
      if (item.percentage > 0) {
        return <div className={`bar ${item.color}`} style={{ width: item.percentage + "%" }} key={i}></div>;
      }
    });

  const safeBars = Array.isArray(bars) ? bars : [];

  return (
    <div className="balance-bar" ref={ref}>
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
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                <div className="bg-gray-900 text-white text-sm rounded py-1 px-2 whitespace-nowrap">
                  {displayClaimable} tokens available to claim
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-row items-center gap-2">
          {showBalance && <div>({displayConfidential})</div>} {confidentialPercentage}% <EyeOff className="w-4 h-4" />
        </div>
      </div>
      <div className={`bars ${borderClassName}`} style={{ height: `${height}px` }}>
        {safeBars[0]}
        {readings[0]?.percentage > 2 && readings[0]?.percentage < 98 && readings.length > 1 && (
          <div className="bar-separator" style={{ left: `${readings[0]?.percentage}%` }}></div>
        )}
        {safeBars[1]}
        {readings.length > 2 &&
          readings[1]?.percentage > 0 &&
          readings[0]?.percentage + readings[1]?.percentage > 2 &&
          readings[0]?.percentage + readings[1]?.percentage < 98 && (
            <div
              className="bar-separator"
              style={{ left: `${(readings[0]?.percentage ?? 0) + (readings[1]?.percentage ?? 0)}%` }}
            ></div>
          )}
        {safeBars[2]}
      </div>
    </div>
  );
});

BalanceBar.displayName = "BalanceBar";

export { BalanceBar };
