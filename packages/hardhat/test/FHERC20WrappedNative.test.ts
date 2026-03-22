import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { FHERC20WrappedNative, WETH_Harness } from "../typechain-types";
import {
  expectERC20BalancesChange,
  expectFHERC20BalancesChange,
  prepExpectERC20BalancesChange,
  prepExpectFHERC20BalancesChange,
  ticksToIndicated,
} from "./utils";

describe("FHERC20WrappedNative", function () {
  const deployContracts = async () => {
    const wETHFactory = await ethers.getContractFactory("WETH_Harness");
    const wETH = (await wETHFactory.deploy()) as WETH_Harness;
    await wETH.waitForDeployment();

    const eETHFactory = await ethers.getContractFactory("FHERC20WrappedNative");
    const eETH = (await eETHFactory.deploy(wETH, "FHERC20 Wrapped ETH", "eETH")) as FHERC20WrappedNative;
    await eETH.waitForDeployment();

    return { wETH, eETH };
  };

  async function setupFixture() {
    const [owner, bob, alice, eve] = await ethers.getSigners();
    const { wETH, eETH } = await deployContracts();

    const ownerClient = await hre.cofhe.createClientWithBatteries(owner);
    const bobClient = await hre.cofhe.createClientWithBatteries(bob);
    const aliceClient = await hre.cofhe.createClientWithBatteries(alice);
    const eveClient = await hre.cofhe.createClientWithBatteries(eve);

    return { ownerClient, bobClient, aliceClient, eveClient, owner, bob, alice, eve, wETH, eETH };
  }

  // wETH has 18 decimals → conversionRate = 1e12, confidential decimals = 6
  const conversionRate = 1_000_000_000_000n; // 1e12

  describe("initialization", function () {
    it("Should be constructed correctly", async function () {
      const { wETH, eETH } = await setupFixture();

      expect(await eETH.name()).to.equal("FHERC20 Wrapped ETH", "name correct");
      expect(await eETH.symbol()).to.equal("eETH", "symbol override applied");
      expect(await eETH.decimals()).to.equal(6, "decimals capped at confidential precision");
      expect(await eETH.weth()).to.equal(wETH.target, "weth address correct");
      expect(await eETH.conversionRate()).to.equal(conversionRate, "conversionRate is 1e12 for 18-decimal token");
      expect(await eETH.isFherc20()).to.equal(true, "isFherc20 correct");
    });
  });

  describe("shieldWrappedNative (WETH → FHERC20)", function () {
    it("Should succeed", async function () {
      const { eETH, bob, wETH } = await setupFixture();

      const mintValue = ethers.parseEther("10");
      const transferValue = ethers.parseEther("1");
      const confidentialTransferValue = transferValue / conversionRate; // 1e6

      // Bob deposits ETH into WETH harness to receive WETH (ETH-backed)
      await wETH.connect(bob).deposit({ value: mintValue });
      await wETH.connect(bob).approve(eETH.target, mintValue);

      await prepExpectERC20BalancesChange(wETH, bob.address);
      await prepExpectFHERC20BalancesChange(eETH, bob.address);

      await expect(eETH.connect(bob).shieldWrappedNative(bob, transferValue)).to.emit(eETH, "ShieldedNative");

      await expectERC20BalancesChange(wETH, bob.address, -1n * transferValue);
      await expectFHERC20BalancesChange(
        eETH,
        bob.address,
        await ticksToIndicated(eETH, 5001n),
        confidentialTransferValue,
      );

      await hre.cofhe.mocks.expectPlaintext(await eETH.confidentialTotalSupply(), confidentialTransferValue);
    });

    it("Should revert when amount is too small for confidential precision", async function () {
      const { eETH, bob, wETH } = await setupFixture();

      const dust = conversionRate - 1n; // just below the minimum representable amount
      await wETH.connect(bob).deposit({ value: dust });
      await wETH.connect(bob).approve(eETH.target, dust);

      await expect(eETH.connect(bob).shieldWrappedNative(bob, dust)).to.be.revertedWithCustomError(
        eETH,
        "AmountTooSmallForConfidentialPrecision",
      );
    });
  });

  describe("shieldNative (ETH → FHERC20)", function () {
    it("Should succeed", async function () {
      const { eETH, bob } = await setupFixture();

      const transferValue = ethers.parseEther("1");
      const confidentialTransferValue = transferValue / conversionRate; // 1e6

      await prepExpectFHERC20BalancesChange(eETH, bob.address);

      await expect(eETH.connect(bob).shieldNative(bob, { value: transferValue })).to.emit(eETH, "ShieldedNative");

      await expectFHERC20BalancesChange(
        eETH,
        bob.address,
        await ticksToIndicated(eETH, 5001n),
        confidentialTransferValue,
      );

      await hre.cofhe.mocks.expectPlaintext(await eETH.confidentialTotalSupply(), confidentialTransferValue);
    });

    it("Should refund dust below conversionRate to caller", async function () {
      const { eETH, bob } = await setupFixture();

      const alignedValue = ethers.parseEther("1");
      const dust = conversionRate - 1n; // 999999999999 wei — below conversionRate
      const totalSent = alignedValue + dust;
      const confidentialTransferValue = alignedValue / conversionRate; // 1e6

      await prepExpectFHERC20BalancesChange(eETH, bob.address);

      await eETH.connect(bob).shieldNative(bob, { value: totalSent });

      // Confidential balance reflects only the aligned amount (dust was refunded)
      await expectFHERC20BalancesChange(
        eETH,
        bob.address,
        await ticksToIndicated(eETH, 5001n),
        confidentialTransferValue,
      );
    });

    it("Should revert when amount is too small for confidential precision", async function () {
      const { eETH, bob } = await setupFixture();

      const dust = conversionRate - 1n;

      await expect(eETH.connect(bob).shieldNative(bob, { value: dust })).to.be.revertedWithCustomError(
        eETH,
        "AmountTooSmallForConfidentialPrecision",
      );
    });
  });

  describe("unshield & claim native (FHERC20 → ETH)", function () {
    it("Should succeed", async function () {
      const { eETH, bob, alice, bobClient } = await setupFixture();

      const mintValue = ethers.parseEther("10");
      const transferValue = ethers.parseEther("1");
      const confidentialMintValue = mintValue / conversionRate; // 1e7
      const confidentialTransferValue = transferValue / conversionRate; // 1e6

      // Bob shields native ETH
      await eETH.connect(bob).shieldNative(bob, { value: mintValue });

      // Bob unshields to alice so that alice's balance check avoids gas accounting
      await prepExpectFHERC20BalancesChange(eETH, bob.address);

      await expect(eETH.connect(bob).unshield(alice, confidentialTransferValue)).to.emit(eETH, "UnshieldedNative");

      await expectFHERC20BalancesChange(
        eETH,
        bob.address,
        -1n * (await ticksToIndicated(eETH, 1n)),
        -1n * confidentialTransferValue,
      );

      const aliceClaims = await eETH.getUserClaims(alice.address);
      expect(aliceClaims.length).to.equal(1, "Alice has 1 pending claim");
      const claimableCtHash = aliceClaims[0].ctHash;
      await hre.cofhe.mocks.expectPlaintext(claimableCtHash, confidentialTransferValue);

      // Time travel past decryption delay
      await hre.network.provider.send("evm_increaseTime", [11]);
      await hre.network.provider.send("evm_mine");

      const decryption = await bobClient.decryptForTx(claimableCtHash).withoutPermit().execute();

      const aliceBalanceBefore = await ethers.provider.getBalance(alice.address);
      await eETH.connect(bob).claimUnshielded(claimableCtHash, decryption.decryptedValue, decryption.signature);
      const aliceBalanceAfter = await ethers.provider.getBalance(alice.address);

      // Alice receives the native amount (alice paid no gas so balance delta is exact)
      expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(transferValue, "Alice received correct ETH amount");

      // Claim is marked done
      const claim = await eETH.getClaim(claimableCtHash);
      expect(claim.decrypted).to.equal(true, "Claim marked decrypted");
      expect(claim.claimed).to.equal(true, "Claim marked claimed");

      // Total supply reflects the burned amount
      await hre.cofhe.mocks.expectPlaintext(
        await eETH.confidentialTotalSupply(),
        confidentialMintValue - confidentialTransferValue,
      );
    });
  });

  describe("unshield & claimBatch native (FHERC20 → ETH)", function () {
    it("Should claim multiple unshielded amounts in a single batch", async function () {
      const { eETH, bob, alice, bobClient } = await setupFixture();

      const mintValue = ethers.parseEther("10");
      const transferValue1 = ethers.parseEther("1");
      const transferValue2 = ethers.parseEther("2");
      const confidentialValue1 = transferValue1 / conversionRate; // 1e6
      const confidentialValue2 = transferValue2 / conversionRate; // 2e6

      // Bob shields native ETH then unshields twice to alice
      await eETH.connect(bob).shieldNative(bob, { value: mintValue });
      await eETH.connect(bob).unshield(alice, confidentialValue1);
      await eETH.connect(bob).unshield(alice, confidentialValue2);

      const aliceClaims = await eETH.getUserClaims(alice.address);
      expect(aliceClaims.length).to.equal(2, "Alice has 2 pending claims");

      await hre.network.provider.send("evm_increaseTime", [11]);
      await hre.network.provider.send("evm_mine");

      const ctHashes = [aliceClaims[0].ctHash, aliceClaims[1].ctHash];
      const [dec0, dec1] = await Promise.all([
        bobClient.decryptForTx(ctHashes[0]).withoutPermit().execute(),
        bobClient.decryptForTx(ctHashes[1]).withoutPermit().execute(),
      ]);

      const aliceBalanceBefore = await ethers.provider.getBalance(alice.address);

      await expect(
        eETH
          .connect(bob)
          .claimUnshieldedBatch(ctHashes, [dec0.decryptedValue, dec1.decryptedValue], [dec0.signature, dec1.signature]),
      )
        .to.emit(eETH, "ClaimedUnshieldedNative")
        .to.emit(eETH, "ClaimedUnshieldedNative");

      const aliceBalanceAfter = await ethers.provider.getBalance(alice.address);
      expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(
        transferValue1 + transferValue2,
        "Alice received correct total ETH",
      );

      expect((await eETH.getUserClaims(alice.address)).length).to.equal(0, "Alice has no pending claims");
    });

    it("Should revert when array lengths mismatch", async function () {
      const { eETH } = await setupFixture();

      const dummyHash = ethers.ZeroHash;

      await expect(
        eETH.claimUnshieldedBatch([dummyHash, dummyHash], [1n], [new Uint8Array(0), new Uint8Array(0)]),
      ).to.be.revertedWithCustomError(eETH, "LengthMismatch");

      await expect(
        eETH.claimUnshieldedBatch([dummyHash, dummyHash], [1n, 2n], [new Uint8Array(0)]),
      ).to.be.revertedWithCustomError(eETH, "LengthMismatch");
    });
  });
});
