import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { FHERC20_Harness } from "../typechain-types";
import { cofhejs, Encryptable } from "cofhejs/node";
import {
  expectFHERC20BalancesChange,
  prepExpectFHERC20BalancesChange,
  ticksToIndicated,
  tick,
  generateTransferFromPermit,
  nullLogState,
} from "./utils";
import { ZeroAddress } from "ethers";

describe("FHERC20", function () {
  // We define a fixture to reuse the same setup in every test.
  const deployContracts = async () => {
    // Deploy wBTC
    const XFHEFactory = await ethers.getContractFactory("FHERC20_Harness");
    const XFHE = (await XFHEFactory.deploy("Unknown FHERC20", "XFHE", 18)) as FHERC20_Harness;
    await XFHE.waitForDeployment();

    return { XFHE };
  };

  async function setupFixture() {
    const [owner, bob, alice, eve] = await ethers.getSigners();
    const { XFHE } = await deployContracts();

    await hre.cofhe.initializeWithHardhatSigner(owner);

    return { owner, bob, alice, eve, XFHE };
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
      const encTransferResult = await cofhejs.encrypt([Encryptable.uint128(transferValueRaw)] as const);
      const [encTransferInput] = await hre.cofhe.expectResultSuccess(encTransferResult);

      // encTransfer

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, alice.address);

      await expect(
        XFHE.connect(bob)["encTransfer(address,(uint256,uint8,uint8,bytes))"](alice.address, encTransferInput),
      )
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
      const encTransferResult = await cofhejs.encrypt([Encryptable.uint128(transferValueRaw)] as const);
      const [encTransferInput] = await hre.cofhe.expectResultSuccess(encTransferResult);

      // encTransfer (reverts)
      await expect(
        XFHE.connect(bob)["encTransfer(address,(uint256,uint8,uint8,bytes))"](ZeroAddress, encTransferInput),
      ).to.be.revertedWithCustomError(XFHE, "ERC20InvalidReceiver");
    });
  });

  describe("encTransferFrom", function () {
    const setupEncTransferFromFixture = async () => {
      const { XFHE, bob, alice, eve } = await setupFixture();

      const mintValue = ethers.parseEther("10");
      await XFHE.mint(bob, mintValue);
      await XFHE.mint(alice, mintValue);

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const encTransferResult = await cofhejs.encrypt([Encryptable.uint128(transferValue)] as const);
      const [encTransferInput] = await hre.cofhe.expectResultSuccess(encTransferResult);

      return { XFHE, bob, alice, eve, encTransferInput, transferValue };
    };

    it("Should transfer from bob to alice", async function () {
      const { XFHE, bob, alice, encTransferInput, transferValue } = await setupEncTransferFromFixture();

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
        -1n * transferValue,
      );
      await expectFHERC20BalancesChange(
        XFHE,
        alice.address,
        1n * (await ticksToIndicated(XFHE, 1n)),
        1n * transferValue,
      );
    });

    it("Should transfer from bob to alice (eve spender)", async function () {
      const { XFHE, bob, alice, eve, encTransferInput, transferValue } = await setupEncTransferFromFixture();

      // Generate encTransferFrom permit
      const permit = await generateTransferFromPermit({
        token: XFHE,
        signer: bob,
        owner: bob.address,
        spender: eve.address,
        valueHash: encTransferInput.ctHash,
      });

      // Success - Bob -> Alice

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, alice.address);

      await expect(XFHE.connect(eve).encTransferFrom(bob.address, alice.address, encTransferInput, permit))
        .to.emit(XFHE, "Transfer")
        .withArgs(bob.address, alice.address, await tick(XFHE));

      await expectFHERC20BalancesChange(
        XFHE,
        bob.address,
        -1n * (await ticksToIndicated(XFHE, 1n)),
        -1n * transferValue,
      );
      await expectFHERC20BalancesChange(
        XFHE,
        alice.address,
        1n * (await ticksToIndicated(XFHE, 1n)),
        1n * transferValue,
      );
    });

    it("Should transfer from bob to MockFherc20Vault", async function () {
      const { XFHE, bob, alice, eve, encTransferInput, transferValue } = await setupEncTransferFromFixture();

      const vaultFactory = await ethers.getContractFactory("MockFherc20Vault");
      const Vault = await vaultFactory.deploy(XFHE.target);
      await Vault.waitForDeployment();
      const vaultAddress = await Vault.getAddress();

      // Mint to vault (initialize indicator)
      await XFHE.mint(vaultAddress, await ethers.parseEther("1"));

      // Generate encTransferFrom permit
      const permit = await generateTransferFromPermit({
        token: XFHE,
        signer: bob,
        owner: bob.address,
        spender: vaultAddress,
        valueHash: encTransferInput.ctHash,
      });

      // Success - Bob -> Alice

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, vaultAddress);

      await expect(Vault.connect(bob).deposit(encTransferInput, permit))
        .to.emit(XFHE, "Transfer")
        .withArgs(bob.address, vaultAddress, await tick(XFHE));

      await expectFHERC20BalancesChange(
        XFHE,
        bob.address,
        -1n * (await ticksToIndicated(XFHE, 1n)),
        -1n * transferValue,
      );
      await expectFHERC20BalancesChange(
        XFHE,
        vaultAddress,
        1n * (await ticksToIndicated(XFHE, 1n)),
        1n * transferValue,
      );
    });

    it("Should revert if invalid receiver", async function () {
      const { XFHE, bob, alice, encTransferInput } = await setupEncTransferFromFixture();

      // Generate encTransferFrom permit
      const permit = await generateTransferFromPermit({
        token: XFHE,
        signer: bob,
        owner: bob.address,
        spender: alice.address,
        valueHash: encTransferInput.ctHash,
      });

      await expect(
        XFHE.connect(alice).encTransferFrom(bob.address, ZeroAddress, encTransferInput, permit),
      ).to.be.revertedWithCustomError(XFHE, "ERC20InvalidReceiver");
    });

    it("Should revert if permit expired", async function () {
      const { XFHE, bob, alice, encTransferInput } = await setupEncTransferFromFixture();

      // Deadline passed - ERC2612ExpiredSignature

      const permit = await generateTransferFromPermit({
        token: XFHE,
        signer: bob,
        owner: bob.address,
        spender: alice.address,
        valueHash: encTransferInput.ctHash,
        nonce: await XFHE.nonces(bob),
        deadline: 0n,
      });

      // Hardhat time travel 1 second
      await hre.network.provider.send("evm_increaseTime", [1]);
      await hre.network.provider.send("evm_mine");

      // Get hardhat timestamp
      const latestBlock = await ethers.provider.getBlock("latest");
      const timestamp = latestBlock?.timestamp;
      expect(timestamp).to.be.greaterThan(permit.deadline);

      // Expect revert
      await expect(
        XFHE.connect(alice).encTransferFrom(bob.address, alice.address, encTransferInput, permit),
      ).to.be.revertedWithCustomError(XFHE, "ERC2612ExpiredSignature");
    });

    it("Should revert on owner mismatch", async function () {
      const { XFHE, bob, alice, encTransferInput } = await setupEncTransferFromFixture();

      // FHERC20EncTransferFromOwnerMismatch bob -> alice

      const permit = await generateTransferFromPermit({
        token: XFHE,
        signer: bob,
        owner: alice.address,
        spender: alice.address,
        valueHash: encTransferInput.ctHash,
      });

      // Expect revert

      await expect(
        XFHE.connect(bob).encTransferFrom(bob.address, alice.address, encTransferInput, permit),
      ).to.be.revertedWithCustomError(XFHE, "FHERC20EncTransferFromOwnerMismatch");
    });

    it("Should revert on spender mismatch", async function () {
      const { XFHE, bob, alice, eve, encTransferInput } = await setupEncTransferFromFixture();

      // FHERC20EncTransferFromSpenderMismatch

      const permit = await generateTransferFromPermit({
        token: XFHE,
        signer: bob,
        owner: bob.address,
        spender: eve.address,
        valueHash: encTransferInput.ctHash,
      });

      // Expect revert

      await expect(
        XFHE.connect(alice).encTransferFrom(bob.address, alice.address, encTransferInput, permit),
      ).to.be.revertedWithCustomError(XFHE, "FHERC20EncTransferFromSpenderMismatch");
    });

    it("Should revert on value_hash mismatch", async function () {
      const { XFHE, bob, alice, encTransferInput } = await setupEncTransferFromFixture();

      // FHERC20EncTransferFromValueHashMismatch

      const permit = await generateTransferFromPermit({
        token: XFHE,
        signer: bob,
        owner: bob.address,
        spender: alice.address,
        valueHash: encTransferInput.ctHash + 1n,
      });

      // Expect revert

      await expect(
        XFHE.connect(alice).encTransferFrom(bob.address, alice.address, encTransferInput, permit),
      ).to.be.revertedWithCustomError(XFHE, "FHERC20EncTransferFromValueHashMismatch");
    });

    it("Should revert on signer not owner", async function () {
      const { XFHE, bob, alice, encTransferInput } = await setupEncTransferFromFixture();

      // Signer != owner - ERC2612InvalidSigner

      const permit = await generateTransferFromPermit({
        token: XFHE,
        signer: alice,
        owner: bob.address,
        spender: alice.address,
        valueHash: encTransferInput.ctHash,
      });

      // Expect revert

      await expect(
        XFHE.connect(alice).encTransferFrom(bob.address, alice.address, encTransferInput, permit),
      ).to.be.revertedWithCustomError(XFHE, "ERC2612InvalidSigner");
    });

    it("Should revert on invalid nonce", async function () {
      const { XFHE, bob, alice, encTransferInput } = await setupEncTransferFromFixture();

      // Invalid nonce - ERC2612InvalidSigner

      const permit = await generateTransferFromPermit({
        token: XFHE,
        signer: bob,
        owner: bob.address,
        spender: alice.address,
        valueHash: encTransferInput.ctHash,
        nonce: (await XFHE.nonces(bob)) + 1n,
      });

      // Expect revert

      await expect(
        XFHE.connect(alice).encTransferFrom(bob.address, alice.address, encTransferInput, permit),
      ).to.be.revertedWithCustomError(XFHE, "ERC2612InvalidSigner");
    });
  });
});
