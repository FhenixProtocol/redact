import { expect } from "chai";
import { FHERC20 } from "../typechain-types";
import hre from "hardhat";

export const ticksToIndicated = async (token: FHERC20, ticks: bigint): Promise<bigint> => {
  const tick = await token.indicatorTick();
  return ticks * BigInt(tick);
};

export const tick = async (token: FHERC20): Promise<bigint> => {
  return token.indicatorTick();
};

const indicatedBalances = new Map<string, bigint>();
const encBalances = new Map<string, bigint>();

export const prepExpectFHERC20BalancesChange = async (token: FHERC20, account: string) => {
  indicatedBalances.set(account, await token.balanceOf(account));
  const encBalanceHash = await token.encBalanceOf(account);
  const encBalance = await hre.cofhe.mocks.getPlaintext(encBalanceHash);
  encBalances.set(account, encBalance);
};

export const expectFHERC20BalancesChange = async (
  token: FHERC20,
  account: string,
  expectedIndicatedChange: bigint,
  expectedEncChange: bigint,
) => {
  const symbol = await token.symbol();

  const currIndicated = await token.balanceOf(account);
  const prevIndicated = indicatedBalances.get(account)!;
  const indicatedChange = currIndicated - prevIndicated;
  expect(indicatedChange).to.equal(
    expectedIndicatedChange,
    `${symbol} (FHERC20) indicated balance change for ${account} is incorrect. Expected: ${expectedIndicatedChange}, received: ${indicatedChange}`,
  );

  const currEncBalanceHash = await token.encBalanceOf(account);
  const currEncBalance = await hre.cofhe.mocks.getPlaintext(currEncBalanceHash);
  const prevEncBalance = encBalances.get(account)!;
  const encChange = currEncBalance - prevEncBalance;
  expect(encChange).to.equal(
    expectedEncChange,
    `${symbol} (FHERC20) encrypted balance change for ${account} is incorrect. Expected: ${expectedEncChange}, received: ${encChange}`,
  );
};

const erc20Balances = new Map<string, bigint>();

export const prepExpectERC20BalancesChange = async (token: FHERC20, account: string) => {
  erc20Balances.set(account, await token.balanceOf(account));
};

export const expectERC20BalancesChange = async (token: FHERC20, account: string, expectedChange: bigint) => {
  const symbol = await token.symbol();

  const currBal = await token.balanceOf(account);
  const prevBal = erc20Balances.get(account)!;
  const delta = currBal - prevBal;
  expect(delta).to.equal(
    expectedChange,
    `${symbol} (ERC20) balance change for ${account} is incorrect. Expected: ${expectedChange}, received: ${delta}`,
  );
};
