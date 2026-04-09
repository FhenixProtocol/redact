import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { ConfidentialETH, ConfidentialETHV2_Harness, WETH_Harness } from "../typechain-types";
import { expectFHERC20BalancesChange, prepExpectFHERC20BalancesChange } from "./utils";
import { Encryptable } from "@cofhe/sdk";

describe("ConfidentialETH", function () {
  async function deployProxy(): Promise<{
    impl: ConfidentialETH;
    eETH: ConfidentialETH;
    wETH: WETH_Harness;
  }> {
    const wETHFactory = await ethers.getContractFactory("WETH_Harness");
    const wETH = (await wETHFactory.deploy()) as WETH_Harness;

    const implFactory = await ethers.getContractFactory("ConfidentialETH");
    const impl = await implFactory.deploy();
    await impl.waitForDeployment();

    const initData = impl.interface.encodeFunctionData("initialize", [await wETH.getAddress()]);

    const proxyFactory = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await proxyFactory.deploy(await impl.getAddress(), initData);
    await proxy.waitForDeployment();

    const eETH = implFactory.attach(await proxy.getAddress()) as ConfidentialETH;
    return { impl, eETH, wETH };
  }

  async function deployFixture() {
    const [owner, bob, alice] = await ethers.getSigners();
    const { impl, eETH, wETH } = await deployProxy();

    const bobClient = await hre.cofhe.createClientWithBatteries(bob);
    const aliceClient = await hre.cofhe.createClientWithBatteries(alice);

    return { owner, bob, alice, bobClient, aliceClient, wETH, eETH, impl };
  }

  // wETH has 18 decimals → rate = 1e12, confidential decimals = 6
  const conversionRate = 1_000_000_000_000n;

  describe("initialization", function () {
    it("should have correct name and symbol", async function () {
      const { eETH } = await deployFixture();

      expect(await eETH.name()).to.equal("FHERC20 Confidential Ether");
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

    it("should not allow calling initialize twice", async function () {
      const { eETH, wETH } = await deployFixture();

      await expect(eETH.initialize(wETH.target)).to.be.revertedWithCustomError(eETH, "InvalidInitialization");
    });

    it("should not allow calling initialize on the implementation", async function () {
      const { impl, wETH } = await deployFixture();

      await expect(impl.initialize(wETH.target)).to.be.revertedWithCustomError(impl, "InvalidInitialization");
    });
  });

  describe("shieldNative", function () {
    it("should shield native ETH", async function () {
      const { bob, eETH } = await deployFixture();

      const shieldValue = ethers.parseEther("1"); // 1 ETH = 1e18 wei
      const expectedConfidential = shieldValue / conversionRate; // 1e6

      await prepExpectFHERC20BalancesChange(eETH, bob.address);

      await eETH.connect(bob).shieldNative(bob.address, { value: shieldValue });

      await expectFHERC20BalancesChange(eETH, bob.address, expectedConfidential);
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

      await prepExpectFHERC20BalancesChange(eETH, bob.address);

      await eETH.connect(bob).shieldWrappedNative(bob.address, wrapAmount);

      const expected = wrapAmount / conversionRate;
      await expectFHERC20BalancesChange(eETH, bob.address, expected);
    });
  });

  describe("unshield", function () {
    it("should burn confidential tokens and create claim", async function () {
      const { bob, alice, eETH } = await deployFixture();

      const shieldValue = ethers.parseEther("1");
      await eETH.connect(bob).shieldNative(bob.address, { value: shieldValue });

      const confidentialAmount = shieldValue / conversionRate;
      const unshieldAmount = confidentialAmount / 2n;

      await prepExpectFHERC20BalancesChange(eETH, bob.address);

      const tx = await eETH.connect(bob).unshield(bob.address, alice.address, unshieldAmount);
      await expect(tx).to.emit(eETH, "Unshielded");

      await expectFHERC20BalancesChange(eETH, bob.address, -unshieldAmount);
    });
  });

  describe("confidentialTransfer", function () {
    it("should transfer between accounts", async function () {
      const { bob, alice, eETH, bobClient } = await deployFixture();

      const shieldValue = ethers.parseEther("1");
      await eETH.connect(bob).shieldNative(bob.address, { value: shieldValue });

      const transferAmount = 300_000n;
      const [enc] = await bobClient.encryptInputs([Encryptable.uint64(transferAmount)]).execute();

      await prepExpectFHERC20BalancesChange(eETH, bob.address);
      await prepExpectFHERC20BalancesChange(eETH, alice.address);

      await eETH.connect(bob)["confidentialTransfer(address,(uint256,uint8,uint8,bytes))"](alice.address, enc);

      await expectFHERC20BalancesChange(eETH, bob.address, -transferAmount);
      await expectFHERC20BalancesChange(eETH, alice.address, transferAmount);
    });
  });

  describe("UUPS upgrade", function () {
    it("should upgrade to V2 by owner", async function () {
      const { eETH } = await deployFixture();

      const v2Factory = await ethers.getContractFactory("ConfidentialETHV2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await eETH.upgradeToAndCall(await v2Impl.getAddress(), "0x");

      const upgraded = v2Factory.attach(await eETH.getAddress()) as ConfidentialETHV2_Harness;
      expect(await upgraded.version()).to.equal(2);
      expect(await upgraded.name()).to.equal("FHERC20 Confidential Ether");
    });

    it("should preserve state after upgrade", async function () {
      const { bob, eETH } = await deployFixture();

      const shieldValue = ethers.parseEther("1");
      await eETH.connect(bob).shieldNative(bob.address, { value: shieldValue });

      const v2Factory = await ethers.getContractFactory("ConfidentialETHV2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await eETH.upgradeToAndCall(await v2Impl.getAddress(), "0x");

      const upgraded = v2Factory.attach(await eETH.getAddress()) as ConfidentialETHV2_Harness;
      await hre.cofhe.mocks.expectPlaintext(await upgraded.confidentialTotalSupply(), shieldValue / conversionRate);
    });

    it("should reject upgrade from non-owner", async function () {
      const { bob, eETH } = await deployFixture();

      const v2Factory = await ethers.getContractFactory("ConfidentialETHV2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await expect(eETH.connect(bob).upgradeToAndCall(await v2Impl.getAddress(), "0x")).to.be.revertedWithCustomError(
        eETH,
        "OwnableUnauthorizedAccount",
      );
    });
  });
});
