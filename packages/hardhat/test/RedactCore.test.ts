import { expect } from "chai";
import { ethers } from "hardhat";
import { ConfidentialETH, ERC20_Harness, WETH_Harness } from "../typechain-types";
import { RedactCore } from "../typechain-types";

describe("RedactCore", function () {
  // We define a fixture to reuse the same setup in every test.
  const deployContracts = async () => {
    // Deploy WETH
    const wETHFactory = await ethers.getContractFactory("WETH_Harness");
    const wETH = (await wETHFactory.deploy()) as WETH_Harness;
    await wETH.waitForDeployment();

    // Deploy eETH
    const eETHFactory = await ethers.getContractFactory("ConfidentialETH");
    const eETH = (await eETHFactory.deploy(wETH.target)) as ConfidentialETH;
    await eETH.waitForDeployment();

    // Deploy USDC
    const usdcFactory = await ethers.getContractFactory("ERC20_Harness");
    const usdc = (await usdcFactory.deploy("USD Coin", "USDC", 18)) as ERC20_Harness;
    await usdc.waitForDeployment();

    // Deploy wBTC
    const wbtcFactory = await ethers.getContractFactory("ERC20_Harness");
    const wBTC = (await wbtcFactory.deploy("Wrapped Bitcoin", "wBTC", 18)) as ERC20_Harness;
    await wBTC.waitForDeployment();

    // Deploy RedactCore
    const redactCoreFactory = await ethers.getContractFactory("RedactCore");
    const redactCore = (await redactCoreFactory.deploy(wETH.target, eETH.target)) as RedactCore;
    await redactCore.waitForDeployment();

    return { wETH, eETH, usdc, wBTC, redactCore };
  };

  async function setupFixture() {
    const [owner, bob, alice] = await ethers.getSigners();
    const contracts = await deployContracts();

    await contracts.redactCore.updateStablecoin(contracts.usdc.target, true);

    return { owner, bob, alice, ...contracts };
  }

  describe("initialization", function () {
    it("Should be constructed correctly", async function () {
      const { redactCore, wETH, eETH } = await setupFixture();

      expect(await redactCore.wETH()).to.equal(wETH.target);
      expect(await redactCore.eETH()).to.equal(eETH.target);
      expect(await redactCore.getIsWETH(wETH.target)).to.equal(true);
    });

    it("Should be initialized with stablecoins", async function () {
      const { redactCore, usdc } = await setupFixture();

      expect(await redactCore.getIsStablecoin(usdc.target)).to.equal(true);
    });

    it("Should be able to update stablecoins", async function () {
      const { redactCore, usdc } = await setupFixture();
      await redactCore.updateStablecoin(usdc.target, false);
      expect(await redactCore.getIsStablecoin(usdc.target)).to.equal(false);
    });
  });

  describe("deploy FHERC20", function () {
    it("Should be able to deploy FHERC20", async function () {
      const { redactCore, wBTC } = await setupFixture();

      await expect(redactCore.deployFherc20(wBTC.target)).to.emit(redactCore, "Fherc20Deployed");

      const ewBTCAddress = await redactCore.getFherc20(wBTC.target);
      expect(ewBTCAddress).to.not.equal(ethers.ZeroAddress);

      const deployedFherc20s = await redactCore.getDeployedFherc20s();

      // eETH is already deployed, so we expect 2 after ewBTC deployment
      expect(deployedFherc20s.length).to.equal(2);
      expect(deployedFherc20s[1].erc20).to.equal(wBTC.target);
      expect(deployedFherc20s[1].fherc20).to.equal(ewBTCAddress);
    });

    it("Should revert on already deployed FHERC20", async function () {
      const { redactCore, wBTC } = await setupFixture();

      await redactCore.deployFherc20(wBTC.target);

      await expect(redactCore.deployFherc20(wBTC.target)).to.be.revertedWithCustomError(
        redactCore,
        "Invalid_AlreadyDeployed",
      );
    });

    it("Should revert on stablecoin", async function () {
      const { redactCore, usdc } = await setupFixture();
      await expect(redactCore.deployFherc20(usdc.target)).to.be.revertedWithCustomError(
        redactCore,
        "Invalid_Stablecoin",
      );
    });

    it("Should revert on wETH (wETH is already deployed)", async function () {
      const { redactCore, wETH } = await setupFixture();

      await expect(redactCore.deployFherc20(wETH.target)).to.be.revertedWithCustomError(
        redactCore,
        "Invalid_AlreadyDeployed",
      );
    });
  });

  describe("update FHERC20 symbol", function () {
    it("Should be able to update FHERC20 symbol", async function () {
      const { owner, redactCore, wBTC } = await setupFixture();

      await redactCore.deployFherc20(wBTC.target);
      const eBTCAddress = await redactCore.getFherc20(wBTC.target);
      const eBTC = await ethers.getContractAt("ConfidentialERC20", eBTCAddress);

      expect(await eBTC.symbol()).to.equal("ewBTC");

      // Change symbol
      await redactCore.connect(owner).updateFherc20Symbol(eBTC, "eBTC");
      expect(await eBTC.symbol()).to.equal("eBTC");
    });

    it("Should revert on non-owner", async function () {
      const { bob, redactCore, wBTC } = await setupFixture();

      await redactCore.deployFherc20(wBTC.target);
      const eBTCAddress = await redactCore.getFherc20(wBTC.target);
      const eBTC = await ethers.getContractAt("ConfidentialERC20", eBTCAddress);

      await expect(redactCore.connect(bob).updateFherc20Symbol(eBTC, "eBTC")).to.be.revertedWithCustomError(
        redactCore,
        "OwnableUnauthorizedAccount",
      );
    });
  });
});
