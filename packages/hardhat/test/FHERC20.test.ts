import { expect } from "chai";
import hre, { ethers } from "hardhat";
import {
  ConfidentialETH,
  contracts,
  ERC20_Harness,
  FHEContract,
  FHERC20_Harness,
  WETH_Harness,
} from "../typechain-types";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";
import { RedactCore } from "../typechain-types";
import {
  expectFHERC20BalancesChange,
  prepExpectFHERC20BalancesChange,
  ticksToIndicated,
  tick,
  generateTransferFromPermit,
} from "./utils";
import { ZeroAddress } from "ethers";

describe.only("FHERC20", function () {
  // We define a fixture to reuse the same setup in every test.
  const deployContracts = async () => {
    // Deploy wBTC
    const XFHEFactory = await ethers.getContractFactory("FHERC20_Harness");
    const XFHE = (await XFHEFactory.deploy("Unknown FHERC20", "XFHE", 18)) as FHERC20_Harness;
    await XFHE.waitForDeployment();

    return { XFHE };
  };

  const logState = (state: string) => {
    console.log("Encrypt State - ", state);
  };

  async function setupFixture() {
    const [owner, bob, alice] = await ethers.getSigners();
    const { XFHE } = await deployContracts();

    return { owner, bob, alice, XFHE };
  }

  describe("initialization", function () {
    it("Should be constructed correctly", async function () {
      const { XFHE } = await setupFixture();

      expect(await XFHE.name()).to.equal("Unknown FHERC20");
      expect(await XFHE.symbol()).to.equal("XFHE");
      expect(await XFHE.decimals()).to.equal(18);
      expect(await XFHE.balanceOfIsIndicator()).to.equal(true);
      expect(await XFHE.indicatorTick()).to.equal(10 ** (18 - 4));
      expect(await XFHE.isFherc20()).to.equal(true);
    });
  });

  describe("indicated balances", function () {
    it("indicated balances should wrap around", async function () {
      const { bob, XFHE } = await setupFixture();

      const mintValue = ethers.parseEther("10");
      const burnValue = ethers.parseEther("1");

      // Balance 9999 -> wraparound -> 5001
      await XFHE.setUserIndicatedBalance(bob, 9999);
      await XFHE.mint(bob, mintValue);
      expect(await XFHE.balanceOf(bob)).to.equal(await ticksToIndicated(XFHE, 5001n));

      // Balance 1 -> wraparound -> 4999
      await XFHE.setUserIndicatedBalance(bob, 1);
      await XFHE.burn(bob, burnValue);
      expect(await XFHE.balanceOf(bob)).to.equal(await ticksToIndicated(XFHE, 4999n));

      // Total supply 9999 -> wraparound -> 5001
      await XFHE.setTotalIndicatedSupply(9999);
      await XFHE.mint(bob, mintValue);
      expect(await XFHE.totalSupply()).to.equal(await ticksToIndicated(XFHE, 5001n));

      // Total supply 1 -> wraparound -> 4999
      await XFHE.setTotalIndicatedSupply(1);
      await XFHE.burn(bob, burnValue);
      expect(await XFHE.totalSupply()).to.equal(await ticksToIndicated(XFHE, 4999n));
    });
  });

  describe("mint", function () {
    it("should mint", async function () {
      const { bob, XFHE } = await setupFixture();

      expect(await XFHE.totalSupply()).to.equal(0);
      expect(await ticksToIndicated(XFHE, 0n)).to.equal(0n);
      expect(await XFHE.encTotalSupply()).to.equal(0n, "Total supply not initialized (hash is 0)");

      // 1st TX, indicated + 5001, true + 1e18

      const value = ethers.parseEther("1");

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);

      await expect(XFHE.mint(bob.address, value))
        .to.emit(XFHE, "Transfer")
        .withArgs(ZeroAddress, bob.address, await tick(XFHE));

      await expectFHERC20BalancesChange(XFHE, bob.address, await ticksToIndicated(XFHE, 5001n), value);

      expect(await XFHE.totalSupply()).to.equal(
        await ticksToIndicated(XFHE, 5001n),
        "Total indicated supply increases",
      );
      await hre.cofhe.mocks.expectPlaintext(await XFHE.encTotalSupply(), value);

      // 2nd TX, indicated + 1, true + 1e18

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);

      await hre.cofhe.mocks.withLogs("XFHE.mint()", async () => {
        await expect(XFHE.mint(bob.address, value))
          .to.emit(XFHE, "Transfer")
          .withArgs(ZeroAddress, bob.address, await tick(XFHE));
      });

      await expectFHERC20BalancesChange(XFHE, bob.address, await tick(XFHE), value);
    });
    it("Should revert if minting to the zero address", async function () {
      const { XFHE } = await setupFixture();

      await expect(XFHE.mint(ZeroAddress, ethers.parseEther("1"))).to.be.revertedWithCustomError(
        XFHE,
        "ERC20InvalidReceiver",
      );
    });
  });

  describe("burn", function () {
    it("should burn", async function () {
      const { XFHE, bob } = await setupFixture();

      const mintValue = ethers.parseEther("10");
      const burnValue = ethers.parseEther("1");

      await XFHE.mint(bob, mintValue);

      // Burn TX

      expect(await XFHE.totalSupply()).to.equal(
        await ticksToIndicated(XFHE, 5001n),
        "Total indicated supply is 0.5001",
      );
      await hre.cofhe.mocks.expectPlaintext(await XFHE.encTotalSupply(), mintValue);

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);

      await expect(XFHE.burn(bob, burnValue))
        .to.emit(XFHE, "Transfer")
        .withArgs(bob.address, ZeroAddress, await tick(XFHE));

      await expectFHERC20BalancesChange(XFHE, bob.address, -1n * (await ticksToIndicated(XFHE, 1n)), -1n * burnValue);
      await hre.cofhe.mocks.expectPlaintext(await XFHE.encTotalSupply(), mintValue - burnValue);

      expect(await XFHE.totalSupply()).to.equal(
        await ticksToIndicated(XFHE, 5000n),
        "Total indicated supply reduced to .5000",
      );
    });
    it("Should revert if burning from the zero address", async function () {
      const { XFHE } = await setupFixture();
      const burnValue = ethers.parseEther("1");
      await expect(XFHE.burn(ZeroAddress, burnValue)).to.be.revertedWithCustomError(XFHE, "ERC20InvalidSender");
    });
  });

  describe("ERC20 legacy functions", function () {
    it("Should revert on legacy ERC20.transfer()", async function () {
      const { XFHE, bob, alice } = await setupFixture();

      const transferValue = ethers.parseEther("1");
      await XFHE.mint(bob, transferValue);
      await XFHE.mint(alice, transferValue);

      // Transfer

      await expect(XFHE.connect(bob).transfer(alice, transferValue)).to.be.revertedWithCustomError(
        XFHE,
        "FHERC20IncompatibleFunction",
      );
    });

    it("Should revert on legacy ERC20.transferFrom()", async function () {
      const { XFHE, bob, alice } = await setupFixture();

      const transferValue = ethers.parseEther("1");
      await XFHE.mint(bob, transferValue);
      await XFHE.mint(alice, transferValue);

      // TransferFrom

      await expect(XFHE.connect(bob).transferFrom(alice, bob, transferValue)).to.be.revertedWithCustomError(
        XFHE,
        "FHERC20IncompatibleFunction",
      );
    });

    it("Should revert on legacy ERC20.approve()", async function () {
      const { XFHE, bob, alice } = await setupFixture();

      const approveValue = ethers.parseEther("1");

      await XFHE.mint(bob, approveValue);

      // Approve

      await expect(XFHE.connect(bob).approve(alice, approveValue)).to.be.revertedWithCustomError(
        XFHE,
        "FHERC20IncompatibleFunction",
      );
    });

    it("Should revert on legacy ERC20.allowance()", async function () {
      const { XFHE, bob, alice } = await setupFixture();

      const allowanceValue = ethers.parseEther("1");
      await XFHE.mint(bob, allowanceValue);

      // Allowance

      await expect(XFHE.allowance(bob, alice)).to.be.revertedWithCustomError(XFHE, "FHERC20IncompatibleFunction");
    });
  });

  describe("encTransfer", function () {
    it("Should transfer from bob to alice", async function () {
      const { XFHE, bob, alice } = await setupFixture();

      const mintValue = ethers.parseEther("10");

      await XFHE.mint(bob, mintValue);
      await XFHE.mint(alice, mintValue);

      // Initialize bob in cofhejs
      await hre.cofhe.expectResultSuccess(await hre.cofhe.initializeWithHardhatSigner(bob));

      // Encrypt transfer value
      const transferValueRaw = ethers.parseEther("1");
      const encTransferResult = await cofhejs.encrypt(logState, [Encryptable.uint128(transferValueRaw)] as const);
      const [encTransferInput] = await hre.cofhe.expectResultSuccess(encTransferResult);

      console.log("encTransferInput", encTransferInput);

      // encTransfer

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, alice.address);

      await expect(XFHE.connect(bob).encTransfer(alice.address, encTransferInput))
        .to.emit(XFHE, "Transfer")
        .withArgs(bob.address, alice.address, await tick(XFHE));

      await expectFHERC20BalancesChange(
        XFHE,
        bob.address,
        -1n * (await ticksToIndicated(XFHE, 1n)),
        -1n * transferValueRaw,
      );
      await expectFHERC20BalancesChange(
        XFHE,
        alice.address,
        1n * (await ticksToIndicated(XFHE, 1n)),
        1n * transferValueRaw,
      );
    });

    it("Should revert on transfer to 0 address", async function () {
      const { XFHE, bob } = await setupFixture();

      // Encrypt transfer value
      const transferValueRaw = ethers.parseEther("1");
      const encTransferResult = await cofhejs.encrypt(logState, [Encryptable.uint128(transferValueRaw)] as const);
      const [encTransferInput] = await hre.cofhe.expectResultSuccess(encTransferResult);

      // encTransfer (reverts)
      await expect(XFHE.connect(bob).encTransfer(ZeroAddress, encTransferInput)).to.be.revertedWithCustomError(
        XFHE,
        "ERC20InvalidReceiver",
      );
    });
  });

  describe("encTransferFrom", function () {
    it("Should transfer from bob to alice", async function () {
      const { XFHE, bob, alice } = await setupFixture();

      const mintValue = ethers.parseEther("10");
      await XFHE.mint(bob, mintValue);
      await XFHE.mint(alice, mintValue);

      // Encrypt transfer value
      const transferValueRaw = ethers.parseEther("1");
      const encTransferResult = await cofhejs.encrypt(logState, [Encryptable.uint128(transferValueRaw)] as const);
      const [encTransferInput] = await hre.cofhe.expectResultSuccess(encTransferResult);

      // Generate encTransferFrom permit
      const permit = await generateTransferFromPermit({
        token: XFHE,
        signer: bob,
        owner: bob.address,
        spender: alice.address,
        valueHash: encTransferInput.ctHash,
      });

      // Success - Bob -> Alice

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, alice.address);

      await expect(XFHE.connect(alice).encTransferFrom(bob.address, alice.address, encTransferInput, permit))
        .to.emit(XFHE, "Transfer")
        .withArgs(bob.address, alice.address, await tick(XFHE));

      await expectFHERC20BalancesChange(
        XFHE,
        bob.address,
        -1n * (await ticksToIndicated(XFHE, 1n)),
        -1n * transferValueRaw,
      );
      await expectFHERC20BalancesChange(
        XFHE,
        alice.address,
        1n * (await ticksToIndicated(XFHE, 1n)),
        1n * transferValueRaw,
      );
    });
  });
});
