import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { ConfidentialERC20, ConfidentialERC20V2_Harness, ERC20_Harness } from "../typechain-types";
import {
  expectERC20BalancesChange,
  expectFHERC20BalancesChange,
  prepExpectERC20BalancesChange,
  prepExpectFHERC20BalancesChange,
} from "./utils";
import { Encryptable } from "@cofhe/sdk";

describe("ConfidentialERC20", function () {
  async function deployERC20Proxy(
    erc20: ERC20_Harness,
  ): Promise<{ impl: ConfidentialERC20; proxy: ConfidentialERC20 }> {
    const implFactory = await ethers.getContractFactory("ConfidentialERC20");
    const impl = await implFactory.deploy();
    await impl.waitForDeployment();

    const initData = impl.interface.encodeFunctionData("initialize", [await erc20.getAddress()]);

    const proxyFactory = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await proxyFactory.deploy(await impl.getAddress(), initData);
    await proxy.waitForDeployment();

    return {
      impl,
      proxy: implFactory.attach(await proxy.getAddress()) as ConfidentialERC20,
    };
  }

  async function deployFixture() {
    const [owner, bob, alice] = await ethers.getSigners();

    const usdcFactory = await ethers.getContractFactory("ERC20_Harness");
    const usdc = (await usdcFactory.deploy("USD Coin", "USDC", 6)) as ERC20_Harness;

    const { impl, proxy: eUSDC } = await deployERC20Proxy(usdc);

    const bobClient = await hre.cofhe.createClientWithBatteries(bob);
    const aliceClient = await hre.cofhe.createClientWithBatteries(alice);

    return { owner, bob, alice, bobClient, aliceClient, usdc, eUSDC, impl };
  }

  describe("initialization", function () {
    it("should generate correct name and symbol", async function () {
      const { eUSDC } = await deployFixture();

      expect(await eUSDC.name()).to.equal("FHERC20 Confidential USD Coin");
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

      const { proxy: eDai } = await deployERC20Proxy(dai);

      expect(await eDai.decimals()).to.equal(6);
      expect(await eDai.rate()).to.equal(10n ** 12n);
      expect(await eDai.name()).to.equal("FHERC20 Confidential Dai");
      expect(await eDai.symbol()).to.equal("eDAI");
    });

    it("should use native decimals for ≤6-decimal token", async function () {
      const factory2 = await ethers.getContractFactory("ERC20_Harness");
      const token = (await factory2.deploy("Test", "TST", 2)) as ERC20_Harness;

      const { proxy: eToken } = await deployERC20Proxy(token);

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

    it("should reject wrapping another FHERC20 token", async function () {
      const { eUSDC } = await deployFixture();

      const implFactory = await ethers.getContractFactory("ConfidentialERC20");
      const impl = await implFactory.deploy();
      await impl.waitForDeployment();

      const initData = impl.interface.encodeFunctionData("initialize", [await eUSDC.getAddress()]);
      const proxyFactory = await ethers.getContractFactory("ERC1967Proxy");

      await expect(proxyFactory.deploy(await impl.getAddress(), initData)).to.be.reverted;
    });

    it("should not allow calling initialize twice", async function () {
      const { eUSDC, usdc } = await deployFixture();

      await expect(eUSDC.initialize(usdc.target)).to.be.revertedWithCustomError(eUSDC, "InvalidInitialization");
    });

    it("should not allow calling initialize on the implementation", async function () {
      const { impl, usdc } = await deployFixture();

      await expect(impl.initialize(usdc.target)).to.be.revertedWithCustomError(impl, "InvalidInitialization");
    });
  });

  describe("shield", function () {
    it("should shield tokens", async function () {
      const { bob, usdc, eUSDC } = await deployFixture();

      const shieldAmount = 1_000_000n; // 1 USDC (6 decimals, rate=1)
      await usdc.mint(bob.address, shieldAmount);
      await usdc.connect(bob).approve(eUSDC.target, shieldAmount);

      await prepExpectERC20BalancesChange(usdc, bob.address);
      await prepExpectFHERC20BalancesChange(eUSDC, bob.address);

      await eUSDC.connect(bob).shield(bob.address, shieldAmount);

      await expectERC20BalancesChange(usdc, bob.address, -shieldAmount);
      await expectFHERC20BalancesChange(eUSDC, bob.address, shieldAmount);
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

      await prepExpectFHERC20BalancesChange(eUSDC, bob.address);

      const tx = await eUSDC.connect(bob).unshield(bob.address, alice.address, unshieldAmount);
      await expect(tx).to.emit(eUSDC, "Unshielded");

      await expectFHERC20BalancesChange(eUSDC, bob.address, -unshieldAmount);
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

      await prepExpectFHERC20BalancesChange(eUSDC, bob.address);
      await prepExpectFHERC20BalancesChange(eUSDC, alice.address);

      await eUSDC.connect(bob)["confidentialTransfer(address,(uint256,uint8,uint8,bytes))"](alice.address, enc);

      await expectFHERC20BalancesChange(eUSDC, bob.address, -transferAmount);
      await expectFHERC20BalancesChange(eUSDC, alice.address, transferAmount);
    });
  });

  describe("UUPS upgrade", function () {
    it("should upgrade to V2 by owner", async function () {
      const { eUSDC } = await deployFixture();

      const v2Factory = await ethers.getContractFactory("ConfidentialERC20V2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await eUSDC.upgradeToAndCall(await v2Impl.getAddress(), "0x");

      const upgraded = v2Factory.attach(await eUSDC.getAddress()) as ConfidentialERC20V2_Harness;
      expect(await upgraded.version()).to.equal(2);
      expect(await upgraded.name()).to.equal("FHERC20 Confidential USD Coin");
    });

    it("should preserve state after upgrade", async function () {
      const { bob, usdc, eUSDC } = await deployFixture();

      const amount = 1_000_000n;
      await usdc.mint(bob.address, amount);
      await usdc.connect(bob).approve(eUSDC.target, amount);
      await eUSDC.connect(bob).shield(bob.address, amount);

      const v2Factory = await ethers.getContractFactory("ConfidentialERC20V2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await eUSDC.upgradeToAndCall(await v2Impl.getAddress(), "0x");

      const upgraded = v2Factory.attach(await eUSDC.getAddress()) as ConfidentialERC20V2_Harness;
      expect(await upgraded.underlying()).to.equal(usdc.target);
      await hre.cofhe.mocks.expectPlaintext(await upgraded.confidentialTotalSupply(), amount);
    });

    it("should reject upgrade from non-owner", async function () {
      const { bob, eUSDC } = await deployFixture();

      const v2Factory = await ethers.getContractFactory("ConfidentialERC20V2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await expect(eUSDC.connect(bob).upgradeToAndCall(await v2Impl.getAddress(), "0x")).to.be.revertedWithCustomError(
        eUSDC,
        "OwnableUnauthorizedAccount",
      );
    });
  });
});
