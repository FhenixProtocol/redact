"use client"

import { formatEther, parseEther } from 'viem'
import { getPublicClient, estimateGas, } from '@wagmi/core'
import { wagmiConfig } from '~~/services/web3/wagmiConfig';

export const truncateAddress = (address: string, start: number = 6, end: number = 4) => {
  return address.slice(0, start) + "..." + address.slice(-end);
};

export function customFormatEther(
  wei: bigint,
  maxDecimals: number = 18,
  rounding: "floor" | "ceil" | "round" = "round"
): string {
  // This `scale` represents the factor to truncate/round to `maxDecimals`.
  // For example, if maxDecimals=4, scale = 10^(18 - 4) = 10^14.
  const scale = 10n ** BigInt(18 - maxDecimals);

  // Integer portion when dividing by `scale`
  let integerPart = wei / scale;

  // The remainder is what's left after removing the integer portion.
  const remainder = wei % scale;

  // To check if we should round up, look at the "first decimal" digit
  // by multiplying remainder * 10 / scale.
  // e.g. if this >= 5, we round up in "round" mode.
  const firstDecimal = (remainder * 10n) / scale; // an integer in [0..9]

  if (
    rounding === "ceil" ||
    (rounding === "round" && firstDecimal >= 5n)
  ) {
    integerPart += 1n;
  }

  // Multiply back by scale to get the final (rounded) wei amount.
  const finalWei = integerPart * scale;

  // Use ethers' formatEther to produce the final string. This will have
  // exactly `maxDecimals` decimals or fewer (for very small numbers, "0.0").
  return formatEther(finalWei);
}

export async function getGasPrice() {
  const publicClient = getPublicClient(wagmiConfig)
  const gasPrice = await publicClient.getGasPrice()

  const gasUnits  = await estimateGas(wagmiConfig, {
    to: '0xd2135CfB216b74109775236E36d4b433F1DF507B' as `0x${string}`,
    value: parseEther('0.01'),
  })

  return gasPrice * gasUnits;
}

export const tokenItems = [
  { value: "BTC", name: "BTC", logo: "" },
  { value: "ETH", name: "ETH", logo: "" },
  { value: "USDC", name: "USDC", logo: "" },
];

interface Token {
  name: string;
  symbol: string;
  decimals: number;
  image: string;
  address: string;
}

import tokenListData from "~~/public/token-list.json";

export function transformTokensToItems(tokens: Token[]) {
  return tokens.map(token => ({
    value: token.symbol,
    name: token.symbol,
    logo: token.image
  }));
}

export const tokenList: Token[] = tokenListData;