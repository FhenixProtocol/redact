import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { ConfidentialERC20, ERC20_Harness } from "../typechain-types";
import {
  expectERC20BalancesChange,
  expectERC7984BalancesChange,
  prepExpectERC20BalancesChange,
  prepExpectERC7984BalancesChange,
} from "./utils";
import { Encryptable } from "@cofhe/sdk";

describe("ConfidentialERC20", function () {
  async function deployFixture() {
    const [owner, bob, alice] = await ethers.getSigners();

    const usdcFactory = await ethers.getContractFactory("ERC20_Harness");
    const usdc = (await usdcFactory.deploy("USD Coin", "USDC", 6)) as ERC20_Harness;

    const eUSDCFactory = await ethers.getContractFactory("ConfidentialERC20");
    const eUSDC = (await eUSDCFactory.deploy(usdc.target)) as ConfidentialERC20;

    const bobClient = await hre.cofhe.createClientWithBatteries(bob);
    const aliceClient = await hre.cofhe.createClientWithBatteries(alice);

    return { owner, bob, alice, bobClient, aliceClient, usdc, eUSDC };
  }

  describe("initialization", function () {
    it("should generate correct name and symbol", async function () {
      const { eUSDC } = await deployFixture();

      expect(await eUSDC.name()).to.equal("ERC7984 Confidential USD Coin");
      expect(await eUSDC.symbol()).to.equal("eUSDC");
    });

    it("should set deployer as owner", async function () {
      const { eUSDC, owner } = await deployFixture();

      expect(await eUSDC.owner()).to.equal(owner.address);
    });

    it("should have correct decimals (capped at 6)", async function () {
      const { eUSDC } = await deployFixture();

      expect(await eUSDC.decimals()).to.equal(6);
    });

    it("should cap decimals for 18-decimal token", async function () {
      const factory18 = await ethers.getContractFactory("ERC20_Harness");
      const dai = (await factory18.deploy("Dai", "DAI", 18)) as ERC20_Harness;

      const eDaiFactory = await ethers.getContractFactory("ConfidentialERC20");
      const eDai = (await eDaiFactory.deploy(dai.target)) as ConfidentialERC20;

      expect(await eDai.decimals()).to.equal(6);
      expect(await eDai.rate()).to.equal(10n ** 12n);
      expect(await eDai.name()).to.equal("ERC7984 Confidential Dai");
      expect(await eDai.symbol()).to.equal("eDAI");
    });

    it("should use native decimals for ≤6-decimal token", async function () {
      const factory2 = await ethers.getContractFactory("ERC20_Harness");
      const token = (await factory2.deploy("Test", "TST", 2)) as ERC20_Harness;

      const eFactory = await ethers.getContractFactory("ConfidentialERC20");
      const eToken = (await eFactory.deploy(token.target)) as ConfidentialERC20;

      expect(await eToken.decimals()).to.equal(2);
      expect(await eToken.rate()).to.equal(1n);
    });

    it("should have empty contractURI", async function () {
      const { eUSDC } = await deployFixture();

      expect(await eUSDC.contractURI()).to.equal("");
    });

    it("should report correct underlying", async function () {
      const { eUSDC, usdc } = await deployFixture();

      expect(await eUSDC.underlying()).to.equal(usdc.target);
    });

    it("should reject wrapping another ERC7984 token", async function () {
      const { eUSDC } = await deployFixture();

      const factory = await ethers.getContractFactory("ConfidentialERC20");
      await expect(factory.deploy(eUSDC.target)).to.be.revertedWithCustomError(factory, "InvalidUnderlying");
    });
  });

  describe("shield", function () {
    it("should shield tokens", async function () {
      const { bob, usdc, eUSDC } = await deployFixture();

      const shieldAmount = 1_000_000n; // 1 USDC (6 decimals, rate=1)
      await usdc.mint(bob.address, shieldAmount);
      await usdc.connect(bob).approve(eUSDC.target, shieldAmount);

      await prepExpectERC20BalancesChange(usdc, bob.address);
      await prepExpectERC7984BalancesChange(eUSDC, bob.address);

      await eUSDC.connect(bob).shield(bob.address, shieldAmount);

      await expectERC20BalancesChange(usdc, bob.address, -shieldAmount);
      await expectERC7984BalancesChange(eUSDC, bob.address, shieldAmount);
    });
  });

  describe("unshield", function () {
    it("should unshield tokens and create claim", async function () {
      const { bob, alice, usdc, eUSDC } = await deployFixture();

      const amount = 1_000_000n;
      await usdc.mint(bob.address, amount);
      await usdc.connect(bob).approve(eUSDC.target, amount);
      await eUSDC.connect(bob).shield(bob.address, amount);

      const unshieldAmount = 500_000n;

      await prepExpectERC7984BalancesChange(eUSDC, bob.address);

      const tx = await eUSDC.connect(bob).unshield(bob.address, alice.address, unshieldAmount);
      await expect(tx).to.emit(eUSDC, "Unshielded");

      await expectERC7984BalancesChange(eUSDC, bob.address, -unshieldAmount);
    });
  });

  describe("confidentialTransfer", function () {
    it("should transfer between accounts", async function () {
      const { bob, alice, usdc, eUSDC, bobClient } = await deployFixture();

      const amount = 1_000_000n;
      await usdc.mint(bob.address, amount);
      await usdc.connect(bob).approve(eUSDC.target, amount);
      await eUSDC.connect(bob).shield(bob.address, amount);

      const transferAmount = 300_000n;
      const [enc] = await bobClient.encryptInputs([Encryptable.uint64(transferAmount)]).execute();

      await prepExpectERC7984BalancesChange(eUSDC, bob.address);
      await prepExpectERC7984BalancesChange(eUSDC, alice.address);

      await eUSDC.connect(bob)["confidentialTransfer(address,(uint256,uint8,uint8,bytes))"](alice.address, enc);

      await expectERC7984BalancesChange(eUSDC, bob.address, -transferAmount);
      await expectERC7984BalancesChange(eUSDC, alice.address, transferAmount);
    });
  });
});
