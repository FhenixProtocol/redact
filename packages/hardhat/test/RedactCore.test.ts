import { expect } from "chai";
import hre, { ethers } from "hardhat";
import {
  RedactCore,
  ConfidentialETH,
  ConfidentialERC20,
  ConfidentialERC20V2_Harness,
  WETH_Harness,
  ERC20_Harness,
  ConfidentialETHV2_Harness,
} from "../typechain-types";
import { ZeroAddress } from "ethers";

describe("RedactCore", function () {
  async function deployFixture() {
    const [owner, alice] = await ethers.getSigners();

    // ── WETH ──
    const wETHFactory = await ethers.getContractFactory("WETH_Harness");
    const wETH = (await wETHFactory.deploy()) as WETH_Harness;

    // ── ConfidentialETH (UUPS proxy) ──
    const eETHImplFactory = await ethers.getContractFactory("ConfidentialETH");
    const eETHImpl = await eETHImplFactory.deploy();
    await eETHImpl.waitForDeployment();

    const eETHInitData = eETHImpl.interface.encodeFunctionData("initialize", [await wETH.getAddress()]);
    const proxyFactory = await ethers.getContractFactory("ERC1967Proxy");
    const eETHProxy = await proxyFactory.deploy(await eETHImpl.getAddress(), eETHInitData);
    await eETHProxy.waitForDeployment();
    const eETH = eETHImplFactory.attach(await eETHProxy.getAddress()) as ConfidentialETH;

    // ── ConfidentialERC20 implementation (shared across all wrapper proxies) ──
    const erc20ImplFactory = await ethers.getContractFactory("ConfidentialERC20");
    const erc20Impl = await erc20ImplFactory.deploy();
    await erc20Impl.waitForDeployment();

    // ── RedactCore (plain contract, not a proxy) ──
    const coreFactory = await ethers.getContractFactory("RedactCore");
    const core = (await coreFactory.deploy(wETH.target, eETH.target, erc20Impl.target)) as RedactCore;

    // Transfer ConfidentialETH ownership to RedactCore so it can authorize upgrades
    await eETH.transferOwnership(await core.getAddress());

    // ── Test ERC-20 tokens ──
    const erc20Factory = await ethers.getContractFactory("ERC20_Harness");
    const usdc = (await erc20Factory.deploy("USD Coin", "USDC", 6)) as ERC20_Harness;
    const wbtc = (await erc20Factory.deploy("Wrapped BTC", "WBTC", 8)) as ERC20_Harness;

    return { owner, alice, wETH, eETH, eETHImpl, erc20Impl, core, usdc, wbtc };
  }

  describe("constructor", function () {
    it("should store wETH and eETH", async function () {
      const { core, wETH, eETH } = await deployFixture();

      expect(await core.wETH()).to.equal(wETH.target);
      expect(await core.eETH()).to.equal(eETH.target);
    });

    it("should register wETH → eETH in the map", async function () {
      const { core, wETH, eETH } = await deployFixture();

      expect(await core.getConfidentialERC20(wETH.target as string)).to.equal(eETH.target);
    });

    it("should set deployer as owner", async function () {
      const { core, owner } = await deployFixture();

      expect(await core.owner()).to.equal(owner.address);
    });

    it("should store the confidentialERC20Implementation", async function () {
      const { core, erc20Impl } = await deployFixture();

      expect(await core.confidentialERC20Implementation()).to.equal(erc20Impl.target);
    });

    it("should revert with zero-address wETH", async function () {
      const { eETH, erc20Impl } = await deployFixture();
      const factory = await ethers.getContractFactory("RedactCore");

      await expect(factory.deploy(ZeroAddress, eETH.target, erc20Impl.target)).to.be.revertedWithCustomError(
        factory,
        "InvalidWETH",
      );
    });

    it("should revert with zero-address eETH", async function () {
      const { wETH, erc20Impl } = await deployFixture();
      const factory = await ethers.getContractFactory("RedactCore");

      await expect(factory.deploy(wETH.target, ZeroAddress, erc20Impl.target)).to.be.revertedWithCustomError(
        factory,
        "InvalidEETH",
      );
    });

    it("should revert with zero-address implementation", async function () {
      const { wETH, eETH } = await deployFixture();
      const factory = await ethers.getContractFactory("RedactCore");

      await expect(factory.deploy(wETH.target, eETH.target, ZeroAddress)).to.be.revertedWithCustomError(
        factory,
        "InvalidImplementation",
      );
    });
  });

  describe("deployConfidentialERC20", function () {
    it("should deploy a ConfidentialERC20 wrapper proxy", async function () {
      const { core, usdc } = await deployFixture();

      const tx = await core.deployConfidentialERC20(usdc.target);
      const addr = await core.getConfidentialERC20(usdc.target as string);

      expect(addr).to.not.equal(ZeroAddress);
      await expect(tx).to.emit(core, "ConfidentialERC20Deployed").withArgs(usdc.target, addr);
    });

    it("should generate correct name and symbol", async function () {
      const { core, usdc } = await deployFixture();

      await core.deployConfidentialERC20(usdc.target);
      const addr = await core.getConfidentialERC20(usdc.target as string);
      const eUSDC = (await ethers.getContractAt("ConfidentialERC20", addr)) as ConfidentialERC20;

      expect(await eUSDC.name()).to.equal("FHERC20 Confidential USD Coin");
      expect(await eUSDC.symbol()).to.equal("eUSDC");
    });

    it("should set RedactCore as owner of the wrapper", async function () {
      const { core, usdc } = await deployFixture();

      await core.deployConfidentialERC20(usdc.target);
      const addr = await core.getConfidentialERC20(usdc.target as string);
      const eUSDC = (await ethers.getContractAt("ConfidentialERC20", addr)) as ConfidentialERC20;

      expect(await eUSDC.owner()).to.equal(core.target);
    });

    it("should revert if wrapper already deployed", async function () {
      const { core, usdc } = await deployFixture();

      await core.deployConfidentialERC20(usdc.target);
      await expect(core.deployConfidentialERC20(usdc.target)).to.be.revertedWithCustomError(core, "AlreadyDeployed");
    });

    it("should revert if token is WETH", async function () {
      const { core, wETH } = await deployFixture();

      await expect(core.deployConfidentialERC20(wETH.target)).to.be.revertedWithCustomError(core, "InvalidWETH");
    });

    it("should deploy multiple wrappers", async function () {
      const { core, usdc, wbtc } = await deployFixture();

      await core.deployConfidentialERC20(usdc.target);
      await core.deployConfidentialERC20(wbtc.target);

      const mapped = await core.getDeployedConfidentialERC20s();
      // wETH→eETH + USDC + WBTC = 3
      expect(mapped.length).to.equal(3);
    });

    it("should be callable by anyone (permissionless)", async function () {
      const { core, usdc, alice } = await deployFixture();

      await expect(core.connect(alice).deployConfidentialERC20(usdc.target)).to.not.be.reverted;
    });
  });

  describe("getConfidentialERC20", function () {
    it("should return address(0) for unregistered tokens", async function () {
      const { core, usdc } = await deployFixture();

      expect(await core.getConfidentialERC20(usdc.target as string)).to.equal(ZeroAddress);
    });
  });

  describe("getDeployedConfidentialERC20s", function () {
    it("should include wETH→eETH at initialization", async function () {
      const { core, wETH, eETH } = await deployFixture();

      const mapped = await core.getDeployedConfidentialERC20s();
      expect(mapped.length).to.equal(1);
      expect(mapped[0].erc20).to.equal(wETH.target);
      expect(mapped[0].confidentialERC20).to.equal(eETH.target);
    });
  });

  // =========================================================================
  //  Upgrade management
  // =========================================================================

  describe("upgrade management", function () {
    it("should update ConfidentialERC20 implementation for future deployments", async function () {
      const { core } = await deployFixture();

      const v2Factory = await ethers.getContractFactory("ConfidentialERC20V2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await expect(core.setConfidentialERC20Implementation(await v2Impl.getAddress())).to.emit(
        core,
        "ConfidentialERC20ImplementationUpdated",
      );

      expect(await core.confidentialERC20Implementation()).to.equal(await v2Impl.getAddress());
    });

    it("should reject implementation update from non-owner", async function () {
      const { core, alice } = await deployFixture();

      const v2Factory = await ethers.getContractFactory("ConfidentialERC20V2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await expect(
        core.connect(alice).setConfidentialERC20Implementation(await v2Impl.getAddress()),
      ).to.be.revertedWithCustomError(core, "OwnableUnauthorizedAccount");
    });

    it("should reject zero-address implementation", async function () {
      const { core } = await deployFixture();

      await expect(core.setConfidentialERC20Implementation(ZeroAddress)).to.be.revertedWithCustomError(
        core,
        "InvalidImplementation",
      );
    });

    it("should upgrade a deployed wrapper via upgradeWrapper", async function () {
      const { core, usdc } = await deployFixture();

      await core.deployConfidentialERC20(usdc.target);
      const proxyAddr = await core.getConfidentialERC20(usdc.target as string);

      const v2Factory = await ethers.getContractFactory("ConfidentialERC20V2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await core.upgradeWrapper(proxyAddr, await v2Impl.getAddress(), "0x");

      const upgraded = v2Factory.attach(proxyAddr) as ConfidentialERC20V2_Harness;
      expect(await upgraded.version()).to.equal(2);
      expect(await upgraded.name()).to.equal("FHERC20 Confidential USD Coin");
    });

    it("should upgrade ConfidentialETH via upgradeWrapper", async function () {
      const { core, eETH } = await deployFixture();

      const v2Factory = await ethers.getContractFactory("ConfidentialETHV2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await core.upgradeWrapper(await eETH.getAddress(), await v2Impl.getAddress(), "0x");

      const upgraded = v2Factory.attach(await eETH.getAddress()) as ConfidentialETHV2_Harness;
      expect(await upgraded.version()).to.equal(2);
    });

    it("should reject upgradeWrapper from non-owner", async function () {
      const { core, usdc, alice } = await deployFixture();

      await core.deployConfidentialERC20(usdc.target);
      const proxyAddr = await core.getConfidentialERC20(usdc.target as string);

      const v2Factory = await ethers.getContractFactory("ConfidentialERC20V2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await expect(
        core.connect(alice).upgradeWrapper(proxyAddr, await v2Impl.getAddress(), "0x"),
      ).to.be.revertedWithCustomError(core, "OwnableUnauthorizedAccount");
    });

    it("should preserve shielded state after upgradeWrapper", async function () {
      const { core, owner, usdc } = await deployFixture();

      await core.deployConfidentialERC20(usdc.target);
      const proxyAddr = await core.getConfidentialERC20(usdc.target as string);
      const eUSDC = (await ethers.getContractAt("ConfidentialERC20", proxyAddr)) as ConfidentialERC20;

      const shieldAmount = 1_000_000n;
      await usdc.mint(owner.address, shieldAmount);
      await usdc.connect(owner).approve(proxyAddr, shieldAmount);
      await eUSDC.connect(owner).shield(owner.address, shieldAmount);

      await hre.cofhe.mocks.expectPlaintext(await eUSDC.confidentialTotalSupply(), shieldAmount);

      const v2Factory = await ethers.getContractFactory("ConfidentialERC20V2_Harness");
      const v2Impl = await v2Factory.deploy();
      await v2Impl.waitForDeployment();

      await core.upgradeWrapper(proxyAddr, await v2Impl.getAddress(), "0x");

      const upgraded = v2Factory.attach(proxyAddr) as ConfidentialERC20V2_Harness;
      expect(await upgraded.version()).to.equal(2);
      expect(await upgraded.name()).to.equal("FHERC20 Confidential USD Coin");
      expect(await upgraded.underlying()).to.equal(usdc.target);
      await hre.cofhe.mocks.expectPlaintext(await upgraded.confidentialTotalSupply(), shieldAmount);
    });
  });
});
