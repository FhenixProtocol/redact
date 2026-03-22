import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { FHERC20WrappedERC20, ERC20_Harness } from "../typechain-types";
import {
  expectERC20BalancesChange,
  expectFHERC20BalancesChange,
  prepExpectERC20BalancesChange,
  ticksToIndicated,
} from "./utils";
import { prepExpectFHERC20BalancesChange } from "./utils";

describe("FHERC20WrappedERC20", function () {
  // We define a fixture to reuse the same setup in every test.
  const deployContracts = async () => {
    // Deploy wBTC
    const wBTCFactory = await ethers.getContractFactory("ERC20_Harness");
    const wBTC = (await wBTCFactory.deploy("Wrapped BTC", "wBTC", 8)) as ERC20_Harness;
    await wBTC.waitForDeployment();

    // Deploy eBTC
    const eBTCFactory = await ethers.getContractFactory("FHERC20WrappedERC20");
    const eBTC = (await eBTCFactory.deploy(wBTC, "eBTC")) as FHERC20WrappedERC20;
    await eBTC.waitForDeployment();

    return { wBTC, eBTC };
  };

  async function setupFixture() {
    const [owner, bob, alice, eve] = await ethers.getSigners();
    const { wBTC, eBTC } = await deployContracts();

    const ownerClient = await hre.cofhe.createClientWithBatteries(owner);
    const bobClient = await hre.cofhe.createClientWithBatteries(bob);
    const aliceClient = await hre.cofhe.createClientWithBatteries(alice);
    const eveClient = await hre.cofhe.createClientWithBatteries(eve);

    return { ownerClient, bobClient, aliceClient, eveClient, owner, bob, alice, eve, wBTC, eBTC };
  }

  describe("initialization", function () {
    it("Should be constructed correctly", async function () {
      const { wBTC, eBTC } = await setupFixture();

      expect(await eBTC.name()).to.equal("FHERC20 Wrapped Wrapped BTC", "FHERC20WrappedERC20 name correct");
      expect(await eBTC.symbol()).to.equal("eBTC", "FHERC20WrappedERC20 symbol correct");
      expect(await eBTC.decimals()).to.equal(6, "FHERC20WrappedERC20 decimals capped at confidential precision");
      expect(await eBTC.erc20()).to.equal(wBTC.target, "FHERC20WrappedERC20 underlying ERC20 correct");
      expect(await eBTC.isFherc20()).to.equal(true, "FHERC20WrappedERC20 isFherc20 correct");
    });

    it("Should handle symbol correctly", async function () {
      // Deploy TEST
      const TESTFactory = await ethers.getContractFactory("ERC20_Harness");
      const TEST = (await TESTFactory.deploy("Test Token", "TEST", 18)) as ERC20_Harness;
      await TEST.waitForDeployment();

      // Deploy eTEST
      const eTESTFactory = await ethers.getContractFactory("FHERC20WrappedERC20");
      const eTEST = (await eTESTFactory.deploy(TEST, "eTEST")) as FHERC20WrappedERC20;
      await eTEST.waitForDeployment();

      expect(await eTEST.name()).to.equal("FHERC20 Wrapped Test Token", "eTEST name correct");
      expect(await eTEST.symbol()).to.equal("eTEST", "eTEST symbol correct");
      expect(await eTEST.decimals()).to.equal(6, "eTEST decimals capped at confidential precision");
      expect(await eTEST.erc20()).to.equal(TEST.target, "eTEST underlying ERC20 correct");

      await eTEST.updateSymbol("encTEST");
      expect(await eTEST.symbol()).to.equal("encTEST", "eTEST symbol updated correct");
    });

    it("Should revert if underlying token is not ERC20", async function () {
      const { eBTC } = await setupFixture();

      // Deploy eeBTC
      const eeBTCFactory = await ethers.getContractFactory("FHERC20WrappedERC20");
      await expect(eeBTCFactory.deploy(eBTC, "eeBTC")).to.be.revertedWithCustomError(eBTC, "FHERC20InvalidErc20");
    });
  });

  describe("shield balance (ERC20 -> FHERC20)", function () {
    it("Should succeed", async function () {
      const { eBTC, bob, wBTC } = await setupFixture();

      expect(await eBTC.totalSupply()).to.equal(ethers.ZeroHash, "Total indicated supply init 0");
      expect(await eBTC.confidentialTotalSupply()).to.equal(
        ethers.ZeroHash,
        "Total supply not initialized (hash is 0)",
      );

      // wBTC has 8 decimals; confidential precision is 6 decimals → conversionRate = 100.
      const mintValue = BigInt(10e8);
      const transferValue = BigInt(1e8); // ERC20 units transferred in
      const conversionRate = 100n;
      const confidentialTransferValue = transferValue / conversionRate; // 1e6 confidential units

      // Mint wBTC
      await wBTC.mint(bob, mintValue);
      await wBTC.connect(bob).approve(eBTC.target, mintValue);

      // 1st TX: indicated + 5001, confidential + confidentialTransferValue

      await prepExpectERC20BalancesChange(wBTC, bob.address);
      await prepExpectFHERC20BalancesChange(eBTC, bob.address);

      await expect(eBTC.connect(bob).shield(bob, transferValue)).to.emit(eBTC, "Transfer");

      await expectERC20BalancesChange(wBTC, bob.address, -1n * transferValue);
      await expectFHERC20BalancesChange(
        eBTC,
        bob.address,
        await ticksToIndicated(eBTC, 5001n),
        confidentialTransferValue,
      );

      expect(await eBTC.totalSupply()).to.equal(
        await ticksToIndicated(eBTC, 5001n),
        "Total indicated supply increases",
      );
      await hre.cofhe.mocks.expectPlaintext(await eBTC.confidentialTotalSupply(), confidentialTransferValue);

      // 2nd TX: indicated + 1, confidential + confidentialTransferValue

      await prepExpectERC20BalancesChange(wBTC, bob.address);
      await prepExpectFHERC20BalancesChange(eBTC, bob.address);

      await expect(eBTC.connect(bob).shield(bob, transferValue)).to.emit(eBTC, "Transfer");

      await expectERC20BalancesChange(wBTC, bob.address, -1n * transferValue);
      await expectFHERC20BalancesChange(
        eBTC,
        bob.address,
        await ticksToIndicated(eBTC, 1n),
        confidentialTransferValue,
      );
    });

    it("Should revert when amount is too small for confidential precision", async function () {
      const { eBTC, bob, wBTC } = await setupFixture();

      // conversionRate = 100 for wBTC (8 decimals → 6 confidential)
      // Any amount < 100 rounds down to 0 and should revert.
      await wBTC.mint(bob, 99n);
      await wBTC.connect(bob).approve(eBTC.target, 99n);

      await expect(eBTC.connect(bob).shield(bob, 99n)).to.be.revertedWithCustomError(
        eBTC,
        "AmountTooSmallForConfidentialPrecision",
      );
    });
  });

  describe("unshield & claimBatch balance (FHERC20 -> ERC20)", function () {
    it("Should claim multiple unshielded amounts in a single batch", async function () {
      const { eBTC, bob, wBTC, bobClient } = await setupFixture();

      const mintValue = BigInt(10e8);
      const transferValue1 = BigInt(1e8); // ERC20 units
      const transferValue2 = BigInt(2e8); // ERC20 units
      const conversionRate = 100n;
      const confidentialValue1 = transferValue1 / conversionRate; // 1e6 confidential units
      const confidentialValue2 = transferValue2 / conversionRate; // 2e6 confidential units

      // Mint and shield wBTC for bob
      await wBTC.mint(bob, mintValue);
      await wBTC.connect(bob).approve(eBTC.target, mintValue);
      await eBTC.connect(bob).shield(bob, mintValue);

      // Bob unshields twice (amounts in confidential units), creating two pending claims
      await eBTC.connect(bob).unshield(bob, confidentialValue1);
      await eBTC.connect(bob).unshield(bob, confidentialValue2);

      const bobClaims = await eBTC.getUserClaims(bob.address);
      expect(bobClaims.length).to.equal(2, "Bob has 2 pending claims");

      // Time-travel past the decryption delay
      await hre.network.provider.send("evm_increaseTime", [11]);
      await hre.network.provider.send("evm_mine");

      const ctHashes: string[] = [bobClaims[0].ctHash, bobClaims[1].ctHash];

      const [dec0, dec1] = await Promise.all([
        bobClient.decryptForTx(ctHashes[0]).withoutPermit().execute(),
        bobClient.decryptForTx(ctHashes[1]).withoutPermit().execute(),
      ]);

      const decryptedAmounts = [dec0.decryptedValue, dec1.decryptedValue];
      const signatures = [dec0.signature, dec1.signature];

      await prepExpectERC20BalancesChange(wBTC, bob.address);

      await expect(eBTC.connect(bob).claimUnshieldedBatch(ctHashes, decryptedAmounts, signatures))
        .to.emit(eBTC, "ClaimedUnshieldedERC20")
        .to.emit(eBTC, "ClaimedUnshieldedERC20");

      await expectERC20BalancesChange(wBTC, bob.address, transferValue1 + transferValue2);

      expect((await eBTC.getUserClaims(bob.address)).length).to.equal(0, "Bob has no pending claims");

      for (const ctHash of ctHashes) {
        const claim = await eBTC.getClaim(ctHash);
        expect(claim.claimed).to.equal(true, "Claim is marked as claimed");
        expect(claim.decrypted).to.equal(true, "Claim is marked as decrypted");
      }
    });

    it("Should revert when array lengths mismatch", async function () {
      const { eBTC } = await setupFixture();

      const dummyHash = ethers.ZeroHash;

      await expect(
        eBTC.claimUnshieldedBatch([dummyHash, dummyHash], [1n], [new Uint8Array(0), new Uint8Array(0)]),
      ).to.be.revertedWithCustomError(eBTC, "LengthMismatch");

      await expect(
        eBTC.claimUnshieldedBatch([dummyHash, dummyHash], [1n, 2n], [new Uint8Array(0)]),
      ).to.be.revertedWithCustomError(eBTC, "LengthMismatch");
    });
  });

  describe("unshield & claim balance (FHERC20 -> ERC20)", function () {
    it("Should succeed", async function () {
      const { eBTC, bob, wBTC, bobClient } = await setupFixture();

      expect(await eBTC.totalSupply()).to.equal(0, "Total supply init 0");
      expect(await eBTC.confidentialTotalSupply()).to.equal(
        ethers.ZeroHash,
        "Total supply not initialized (hash is 0)",
      );

      // wBTC: 8 decimals → conversionRate = 100, confidentialDecimals = 6
      const mintValue = BigInt(10e8); // ERC20 units
      const transferValue = BigInt(1e8); // ERC20 units
      const conversionRate = 100n;
      const confidentialMintValue = mintValue / conversionRate; // 1e7 confidential units
      const confidentialTransferValue = transferValue / conversionRate; // 1e6 confidential units

      // Mint and shield wBTC
      await wBTC.mint(bob, mintValue);
      await wBTC.connect(bob).approve(eBTC.target, mintValue);
      await eBTC.connect(bob).shield(bob, mintValue);

      // TX — unshield in confidential units

      await prepExpectERC20BalancesChange(wBTC, bob.address);
      await prepExpectFHERC20BalancesChange(eBTC, bob.address);

      await expect(eBTC.connect(bob).unshield(bob, confidentialTransferValue)).to.emit(eBTC, "Transfer");

      // -- expect only **FHERC20** balance to change
      await expectERC20BalancesChange(wBTC, bob.address, 0n);
      await expectFHERC20BalancesChange(
        eBTC,
        bob.address,
        -1n * (await ticksToIndicated(eBTC, 1n)),
        -1n * confidentialTransferValue,
      );

      // Unshield inserts a claimable amount into the user's claimable set

      let claims = await eBTC.getUserClaims(bob.address);
      expect(claims.length).to.equal(1, "Bob has 1 claimable amount");

      const claimableCtHash = claims[0].ctHash;
      let claim = await eBTC.getClaim(claimableCtHash);
      expect(claim.claimed).to.equal(false, "Claimable amount not claimed");
      // The claim stores the confidential amount (not the ERC20 amount).
      await hre.cofhe.mocks.expectPlaintext(claimableCtHash, confidentialTransferValue);

      // Hardhat time travel 11 seconds
      await hre.network.provider.send("evm_increaseTime", [11]);
      await hre.network.provider.send("evm_mine");

      // Claim unshielded tokens

      await prepExpectERC20BalancesChange(wBTC, bob.address);
      await prepExpectFHERC20BalancesChange(eBTC, bob.address);

      // Decrypt with signature
      const decryption = await bobClient.decryptForTx(claimableCtHash).withoutPermit().execute();

      await eBTC.connect(bob).claimUnshielded(claimableCtHash, decryption.decryptedValue, decryption.signature);

      // -- expect only **ERC20** balance to change; contract scales confidential → ERC20 units.
      await expectERC20BalancesChange(wBTC, bob.address, 1n * transferValue);
      await expectFHERC20BalancesChange(eBTC, bob.address, 0n, 0n);

      // Claimable amount is now claimed (stored in confidential units)
      claim = await eBTC.getClaim(claimableCtHash);
      expect(claim.decryptedAmount).to.equal(confidentialTransferValue, "Claimable amount decrypted");
      expect(claim.decrypted).to.equal(true, "Claimable amount decrypted");
      expect(claim.claimed).to.equal(true, "Claimable amount claimed");

      // User has no claimable amounts left
      claims = await eBTC.getUserClaims(bob.address);
      expect(claims.length).to.equal(0, "Bob has no claimable amounts");

      // Total indicated supply decreases
      expect(await eBTC.totalSupply()).to.equal(
        await ticksToIndicated(eBTC, 5000n),
        "Total indicated supply decreases",
      );
      await hre.cofhe.mocks.expectPlaintext(
        await eBTC.confidentialTotalSupply(),
        confidentialMintValue - confidentialTransferValue,
      );
    });
  });
});
