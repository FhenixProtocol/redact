import { expect } from "chai";
import { ERC20 } from "../typechain-types";
import hre from "hardhat";

// BALANCES

const encBalances = new Map<string, bigint>();

export const prepExpectFHERC20BalancesChange = async (
  token: { confidentialBalanceOf: (account: string) => Promise<string> },
  account: string,
) => {
  const encBalanceHash = await token.confidentialBalanceOf(account);
  const encBalance = await hre.cofhe.mocks.getPlaintext(encBalanceHash);
  encBalances.set(account, encBalance);
};

export const expectFHERC20BalancesChange = async (
  token: { confidentialBalanceOf: (account: string) => Promise<string>; symbol: () => Promise<string> },
  account: string,
  expectedEncChange: bigint,
) => {
  const symbol = await token.symbol();

  const currEncBalanceHash = await token.confidentialBalanceOf(account);
  const currEncBalance = await hre.cofhe.mocks.getPlaintext(currEncBalanceHash);
  const prevEncBalance = encBalances.get(account)!;
  const encChange = currEncBalance - prevEncBalance;
  expect(encChange).to.equal(
    expectedEncChange,
    `${symbol} (FHERC20) encrypted balance change for ${account} is incorrect. Expected: ${expectedEncChange}, received: ${encChange}`,
  );
};

// ERC20 BALANCES

const erc20Balances = new Map<string, bigint>();

export const prepExpectERC20BalancesChange = async (token: ERC20, account: string) => {
  erc20Balances.set(account, await token.balanceOf(account));
};

export const expectERC20BalancesChange = async (token: ERC20, account: string, expectedChange: bigint) => {
  const symbol = await token.symbol();

  const currBal = await token.balanceOf(account);
  const prevBal = erc20Balances.get(account)!;
  const delta = currBal - prevBal;
  expect(delta).to.equal(
    expectedChange,
    `${symbol} (ERC20) balance change for ${account} is incorrect. Expected: ${expectedChange}, received: ${delta}`,
  );
};
