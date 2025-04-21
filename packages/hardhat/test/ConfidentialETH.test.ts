import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { ConfidentialETH, WETH_Harness } from "../typechain-types";
import {
  expectERC20BalancesChange,
  expectFHERC20BalancesChange,
  prepExpectERC20BalancesChange,
  ticksToIndicated,
} from "./utils";
import { prepExpectFHERC20BalancesChange } from "./utils";

describe("ConfidentialETH", function () {
  // We define a fixture to reuse the same setup in every test.
  const deployContracts = async () => {
    // Deploy wETH
    const wETHFactory = await ethers.getContractFactory("WETH_Harness");
    const wETH = (await wETHFactory.deploy()) as WETH_Harness;
    await wETH.waitForDeployment();

    // Deploy eETH
    const eETHFactory = await ethers.getContractFactory("ConfidentialETH");
    const eETH = (await eETHFactory.deploy(wETH)) as ConfidentialETH;
    await eETH.waitForDeployment();

    return { wETH, eETH };
  };

  async function setupFixture() {
    const [owner, bob, alice, eve] = await ethers.getSigners();
    const { wETH, eETH } = await deployContracts();

    await hre.cofhe.initializeWithHardhatSigner(owner);

    return { owner, bob, alice, eve, wETH, eETH };
  }

  describe("initialization", function () {
    it("Should be constructed correctly", async function () {
      const { wETH, eETH } = await setupFixture();

      expect(await eETH.name()).to.equal("Confidential Wrapped ETHER", "ConfidentialETH name correct");
      expect(await eETH.symbol()).to.equal("eETH", "ConfidentialETH symbol correct");
      expect(await eETH.decimals()).to.equal(18, "ConfidentialETH decimals correct");
      expect(await eETH.wETH()).to.equal(wETH.target, "ConfidentialETH underlying wETH correct");
      expect(await eETH.isFherc20()).to.equal(true, "ConfidentialETH isFherc20 correct");
    });
  });

  describe("encrypt balance (ERC20 -> FHERC20)", function () {
    it("Should succeed with wETH", async function () {
      const { eETH, bob, wETH } = await setupFixture();

      expect(await eETH.totalSupply()).to.equal(0, "Total indicated supply init 0");
      expect(await eETH.encTotalSupply()).to.equal(0, "Total supply not initialized (hash is 0)");

      const mintValue = BigInt(10e18);

      // Mint wETH
      await wETH.connect(bob).deposit({ value: mintValue });

      // Approve eETH
      await wETH.connect(bob).approve(eETH.target, mintValue);

      const transferValue = BigInt(1e18);

      // 1st TX, indicated + 5001, true + 1e18

      await prepExpectERC20BalancesChange(wETH, bob.address);
      await prepExpectFHERC20BalancesChange(eETH, bob.address);

      await expect(eETH.connect(bob).encryptWETH(bob, transferValue)).to.emit(eETH, "Transfer");

      await expectERC20BalancesChange(wETH, bob.address, -1n * transferValue);
      await expectFHERC20BalancesChange(eETH, bob.address, await ticksToIndicated(eETH, 5001n), transferValue);

      expect(await eETH.totalSupply()).to.equal(
        await ticksToIndicated(eETH, 5001n),
        "Total indicated supply increases",
      );
      await hre.cofhe.mocks.expectPlaintext(await eETH.encTotalSupply(), transferValue);
    });
    it("Should succeed with ETH", async function () {
      const { eETH, bob, wETH } = await setupFixture();

      expect(await eETH.totalSupply()).to.equal(0, "Total indicated supply init 0");
      expect(await eETH.encTotalSupply()).to.equal(0, "Total supply not initialized (hash is 0)");

      const mintValue = BigInt(10e18);

      // Mint wETH
      await wETH.connect(bob).deposit({ value: mintValue });

      // Approve eETH
      await wETH.connect(bob).approve(eETH.target, mintValue);

      const transferValue = BigInt(1e18);

      // 1st TX, indicated + 5001, true + 1e18

      const bobEthInit = await ethers.provider.getBalance(bob.address);
      await prepExpectFHERC20BalancesChange(eETH, bob.address);

      const tx = await eETH.connect(bob).encryptETH(bob, { value: transferValue });
      const receipt = await tx.wait();
      const gasCost = receipt ? receipt.gasUsed * tx.gasPrice : 0n;

      const bobEthFinal = await ethers.provider.getBalance(bob.address);
      expect(bobEthFinal).to.equal(bobEthInit - transferValue - gasCost, "Bob's ETH balance decreased");

      await expectFHERC20BalancesChange(eETH, bob.address, await ticksToIndicated(eETH, 5001n), transferValue);

      expect(await eETH.totalSupply()).to.equal(
        await ticksToIndicated(eETH, 5001n),
        "Total indicated supply increases",
      );
      await hre.cofhe.mocks.expectPlaintext(await eETH.encTotalSupply(), transferValue);
    });
  });

  describe("decrypt & claim", function () {
    it("Should succeed", async function () {
      const { eETH, bob, wETH } = await setupFixture();

      expect(await eETH.totalSupply()).to.equal(0, "Total supply init 0");
      expect(await eETH.encTotalSupply()).to.equal(0, "Total supply not initialized (hash is 0)");

      const mintValue = BigInt(10e18);
      const transferValue = BigInt(1e18);

      // Mint and encrypt wETH
      await wETH.connect(bob).deposit({ value: mintValue });
      await wETH.connect(bob).approve(eETH.target, mintValue);
      await eETH.connect(bob).encryptWETH(bob, mintValue);

      // TX

      await prepExpectERC20BalancesChange(wETH, bob.address);
      await prepExpectFHERC20BalancesChange(eETH, bob.address);

      await expect(eETH.connect(bob).decrypt(bob, transferValue)).to.emit(eETH, "Transfer");

      // -- expect only **FHERC20** balance to change
      await expectERC20BalancesChange(wETH, bob.address, 0n);
      await expectFHERC20BalancesChange(
        eETH,
        bob.address,
        -1n * (await ticksToIndicated(eETH, 1n)),
        -1n * transferValue,
      );

      // Decrypt inserts a claimable amount into the user's claimable set

      let claims = await eETH.getUserClaims(bob.address);
      expect(claims.length).to.equal(1, "Bob has 1 claimable amount");

      const claimableCtHash = claims[0].ctHash;
      let claim = await eETH.getClaim(claimableCtHash);
      expect(claim.claimed).to.equal(false, "Claimable amount not claimed");
      await hre.cofhe.mocks.expectPlaintext(claimableCtHash, transferValue);

      // Hardhat time travel 11 seconds
      await hre.network.provider.send("evm_increaseTime", [11]);
      await hre.network.provider.send("evm_mine");

      // Claim Decrypted

      const bobEthInit = await ethers.provider.getBalance(bob.address);
      await prepExpectFHERC20BalancesChange(eETH, bob.address);

      const tx = await eETH.connect(bob).claimDecrypted(claimableCtHash);
      const receipt = await tx.wait();
      const gasCost = receipt ? receipt.gasUsed * tx.gasPrice : 0n;

      // -- expect only **ERC20** balance to change
      const bobEthFinal = await ethers.provider.getBalance(bob.address);
      expect(bobEthFinal).to.equal(bobEthInit + transferValue - gasCost, "Bob's ETH balance increased");
      await expectFHERC20BalancesChange(eETH, bob.address, 0n, 0n);

      // Claimable amount is now claimed
      claim = await eETH.getClaim(claimableCtHash);
      expect(claim.claimed).to.equal(true, "Claimable amount claimed");

      // User has no claimable amounts left
      claims = await eETH.getUserClaims(bob.address);
      expect(claims.length).to.equal(0, "Bob has no claimable amounts");

      // Total indicated supply decreases
      expect(await eETH.totalSupply()).to.equal(
        await ticksToIndicated(eETH, 5000n),
        "Total indicated supply decreases",
      );
      await hre.cofhe.mocks.expectPlaintext(await eETH.encTotalSupply(), mintValue - transferValue);
    });
    it("Should claim all decrypted amounts", async function () {
      const { eETH, bob, wETH } = await setupFixture();

      expect(await eETH.totalSupply()).to.equal(0, "Total supply init 0");
      expect(await eETH.encTotalSupply()).to.equal(0, "Total supply not initialized (hash is 0)");

      const mintValue = BigInt(10e8);
      const transferValue = BigInt(1e8);

      // Mint and encrypt wETH
      await wETH.connect(bob).deposit({ value: mintValue });
      await wETH.connect(bob).approve(eETH.target, mintValue);
      await eETH.connect(bob).encryptWETH(bob.address, mintValue);

      // Multiple decryptions

      await eETH.connect(bob).decrypt(bob.address, transferValue);
      await eETH.connect(bob).decrypt(bob.address, transferValue);

      // Hardhat time travel 11 seconds
      await hre.network.provider.send("evm_increaseTime", [11]);
      await hre.network.provider.send("evm_mine");

      const ethBalanceInit = await ethers.provider.getBalance(bob.address);

      // Claim all decrypted amounts
      const tx = await eETH.connect(bob).claimAllDecrypted();
      const receipt = await tx.wait();
      const gasCost = receipt ? receipt.gasUsed * tx.gasPrice : 0n;

      const ethBalanceFinal = await ethers.provider.getBalance(bob.address);
      expect(ethBalanceFinal).to.equal(
        ethBalanceInit + 2n * transferValue - gasCost,
        "Bob's ETH balance increased (with gas cost deducted)",
      );

      // Expect all decrypted amounts to be claimed
      const claims = await eETH.getUserClaims(bob.address);
      expect(claims.length).to.equal(0, "Bob has no claimable amounts");
    });
  });
});
