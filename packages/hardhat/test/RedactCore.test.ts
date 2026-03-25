import { expect } from "chai";
import { ethers } from "hardhat";
import {
  RedactCore,
  ConfidentialETH,
  ConfidentialERC20,
  WETH_Harness,
  ERC20_Harness,
} from "../../typechain-types";
import { ZeroAddress } from "ethers";

describe("RedactCore", function () {
  async function deployFixture() {
    const [owner, alice] = await ethers.getSigners();

    const wETHFactory = await ethers.getContractFactory("WETH_Harness");
    const wETH = (await wETHFactory.deploy()) as WETH_Harness;

    const eETHFactory = await ethers.getContractFactory("ConfidentialETH");
    const eETH = (await eETHFactory.deploy(wETH.target)) as ConfidentialETH;

    const coreFactory = await ethers.getContractFactory("RedactCore");
    const core = (await coreFactory.deploy(wETH.target, eETH.target)) as RedactCore;

    const usdcFactory = await ethers.getContractFactory("ERC20_Harness");
    const usdc = (await usdcFactory.deploy("USD Coin", "USDC", 6)) as ERC20_Harness;
    const wbtc = (await usdcFactory.deploy("Wrapped BTC", "WBTC", 8)) as ERC20_Harness;

    return { owner, alice, wETH, eETH, core, usdc, wbtc };
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

    it("should revert with zero-address wETH", async function () {
      const { eETH } = await deployFixture();
      const factory = await ethers.getContractFactory("RedactCore");

      await expect(factory.deploy(ZeroAddress, eETH.target)).to.be.revertedWithCustomError(
        factory,
        "InvalidWETH",
      );
    });

    it("should revert with zero-address eETH", async function () {
      const { wETH } = await deployFixture();
      const factory = await ethers.getContractFactory("RedactCore");

      await expect(factory.deploy(wETH.target, ZeroAddress)).to.be.revertedWithCustomError(
        factory,
        "InvalideETH",
      );
    });
  });

  describe("deployConfidentialERC20", function () {
    it("should deploy a ConfidentialERC20 wrapper", async function () {
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

      expect(await eUSDC.name()).to.equal("ERC7984 Confidential USD Coin");
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
      await expect(core.deployConfidentialERC20(usdc.target)).to.be.revertedWithCustomError(
        core,
        "AlreadyDeployed",
      );
    });

    it("should revert if token is WETH", async function () {
      const { core, wETH } = await deployFixture();

      await expect(core.deployConfidentialERC20(wETH.target)).to.be.revertedWithCustomError(
        core,
        "InvalidWETH",
      );
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
});
