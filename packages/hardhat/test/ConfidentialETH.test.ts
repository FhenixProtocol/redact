import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { ConfidentialETH, WETH_Harness } from "../../typechain-types";
import { expectERC7984BalancesChange, prepExpectERC7984BalancesChange } from "../utils";
import { Encryptable } from "@cofhe/sdk";

describe("ConfidentialETH", function () {
  async function deployFixture() {
    const [owner, bob, alice] = await ethers.getSigners();

    const wETHFactory = await ethers.getContractFactory("WETH_Harness");
    const wETH = (await wETHFactory.deploy()) as WETH_Harness;

    const eETHFactory = await ethers.getContractFactory("ConfidentialETH");
    const eETH = (await eETHFactory.deploy(wETH.target)) as ConfidentialETH;

    const bobClient = await hre.cofhe.createClientWithBatteries(bob);
    const aliceClient = await hre.cofhe.createClientWithBatteries(alice);

    return { owner, bob, alice, bobClient, aliceClient, wETH, eETH };
  }

  // wETH has 18 decimals → rate = 1e12, confidential decimals = 6
  const conversionRate = 1_000_000_000_000n;

  describe("initialization", function () {
    it("should have correct name and symbol", async function () {
      const { eETH } = await deployFixture();

      expect(await eETH.name()).to.equal("ERC7984 Confidential Ether");
      expect(await eETH.symbol()).to.equal("eETH");
    });

    it("should set deployer as owner", async function () {
      const { eETH, owner } = await deployFixture();

      expect(await eETH.owner()).to.equal(owner.address);
    });

    it("should have correct decimals (6)", async function () {
      const { eETH } = await deployFixture();

      expect(await eETH.decimals()).to.equal(6);
    });

    it("should have correct rate (1e12)", async function () {
      const { eETH } = await deployFixture();

      expect(await eETH.rate()).to.equal(conversionRate);
    });

    it("should report correct weth address", async function () {
      const { eETH, wETH } = await deployFixture();

      expect(await eETH.weth()).to.equal(wETH.target);
    });

    it("should have empty contractURI", async function () {
      const { eETH } = await deployFixture();

      expect(await eETH.contractURI()).to.equal("");
    });
  });

  describe("shieldNative", function () {
    it("should shield native ETH", async function () {
      const { bob, eETH } = await deployFixture();

      const shieldValue = ethers.parseEther("1"); // 1 ETH = 1e18 wei
      const expectedConfidential = shieldValue / conversionRate; // 1e6

      await prepExpectERC7984BalancesChange(eETH, bob.address);

      await eETH.connect(bob).shieldNative(bob.address, { value: shieldValue });

      await expectERC7984BalancesChange(eETH, bob.address, expectedConfidential);
    });

    it("should refund dust below conversion rate", async function () {
      const { bob, eETH } = await deployFixture();

      const dust = 500n;
      const shieldValue = conversionRate + dust; // 1e12 + 500

      const balBefore = await ethers.provider.getBalance(bob.address);
      const tx = await eETH.connect(bob).shieldNative(bob.address, { value: shieldValue });
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const balAfter = await ethers.provider.getBalance(bob.address);

      // Should have spent exactly 1e12 (+ gas), dust refunded
      const spent = balBefore - balAfter - gasCost;
      expect(spent).to.equal(conversionRate);
    });

    it("should emit ShieldedNative event", async function () {
      const { bob, eETH } = await deployFixture();

      const shieldValue = ethers.parseEther("2");
      await expect(eETH.connect(bob).shieldNative(bob.address, { value: shieldValue }))
        .to.emit(eETH, "ShieldedNative")
        .withArgs(bob.address, bob.address, shieldValue);
    });
  });

  describe("shieldWrappedNative", function () {
    it("should shield via WETH", async function () {
      const { bob, wETH, eETH } = await deployFixture();

      const wrapAmount = ethers.parseEther("1");
      await wETH.connect(bob).deposit({ value: wrapAmount });
      await wETH.connect(bob).approve(eETH.target, wrapAmount);

      await prepExpectERC7984BalancesChange(eETH, bob.address);

      await eETH.connect(bob).shieldWrappedNative(bob.address, wrapAmount);

      const expected = wrapAmount / conversionRate;
      await expectERC7984BalancesChange(eETH, bob.address, expected);
    });
  });

  describe("unshield", function () {
    it("should burn confidential tokens and create claim", async function () {
      const { bob, alice, eETH } = await deployFixture();

      const shieldValue = ethers.parseEther("1");
      await eETH.connect(bob).shieldNative(bob.address, { value: shieldValue });

      const confidentialAmount = shieldValue / conversionRate;
      const unshieldAmount = confidentialAmount / 2n;

      await prepExpectERC7984BalancesChange(eETH, bob.address);

      const tx = await eETH.connect(bob).unshield(bob.address, alice.address, unshieldAmount);
      await expect(tx).to.emit(eETH, "Unshielded");

      await expectERC7984BalancesChange(eETH, bob.address, -unshieldAmount);
    });
  });

  describe("confidentialTransfer", function () {
    it("should transfer between accounts", async function () {
      const { bob, alice, eETH, bobClient } = await deployFixture();

      const shieldValue = ethers.parseEther("1");
      await eETH.connect(bob).shieldNative(bob.address, { value: shieldValue });

      const transferAmount = 300_000n;
      const [enc] = await bobClient.encryptInputs([Encryptable.uint64(transferAmount)]).execute();

      await prepExpectERC7984BalancesChange(eETH, bob.address);
      await prepExpectERC7984BalancesChange(eETH, alice.address);

      await eETH.connect(bob)["confidentialTransfer(address,(uint256,uint8,uint8,bytes))"](alice.address, enc);

      await expectERC7984BalancesChange(eETH, bob.address, -transferAmount);
      await expectERC7984BalancesChange(eETH, alice.address, transferAmount);
    });
  });
});
