import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { FHERC20_Harness } from "../typechain-types";
import { Encryptable } from "@cofhe/sdk";
import { expectFHERC20BalancesChange, prepExpectFHERC20BalancesChange, ticksToIndicated, tick } from "./utils";
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

    const ownerClient = await hre.cofhe.createClientWithBatteries(owner);
    const bobClient = await hre.cofhe.createClientWithBatteries(bob);
    const aliceClient = await hre.cofhe.createClientWithBatteries(alice);
    const eveClient = await hre.cofhe.createClientWithBatteries(eve);

    return { ownerClient, bobClient, aliceClient, eveClient, owner, bob, alice, eve, XFHE };
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
      await XFHE.setUserIndicatedBalance(bob.address, 9999);
      await XFHE.mint(bob.address, mintValue);
      expect(await XFHE.balanceOf(bob.address)).to.equal(await ticksToIndicated(XFHE, 5001n));

      // Balance 1 -> wraparound -> 4999
      await XFHE.setUserIndicatedBalance(bob.address, 1);
      await XFHE.burn(bob.address, burnValue);
      expect(await XFHE.balanceOf(bob.address)).to.equal(await ticksToIndicated(XFHE, 4999n));

      // Total supply 9999 -> wraparound -> 5001
      await XFHE.setTotalIndicatedSupply(9999);
      await XFHE.mint(bob.address, mintValue);
      expect(await XFHE.totalSupply()).to.equal(await ticksToIndicated(XFHE, 5001n));

      // Total supply 1 -> wraparound -> 4999
      await XFHE.setTotalIndicatedSupply(1);
      await XFHE.burn(bob.address, burnValue);
      expect(await XFHE.totalSupply()).to.equal(await ticksToIndicated(XFHE, 4999n));
    });
  });

  describe("mint", function () {
    it("should mint", async function () {
      const { bob, XFHE } = await setupFixture();

      expect(await XFHE.totalSupply()).to.equal(0);
      expect(await ticksToIndicated(XFHE, 0n)).to.equal(0n);
      expect(await XFHE.confidentialTotalSupply()).to.equal(0n, "Total supply not initialized (hash is 0)");

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
      await hre.cofhe.mocks.expectPlaintext(await XFHE.confidentialTotalSupply(), value);

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
      await hre.cofhe.mocks.expectPlaintext(await XFHE.confidentialTotalSupply(), mintValue);

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);

      await expect(XFHE.burn(bob, burnValue))
        .to.emit(XFHE, "Transfer")
        .withArgs(bob.address, ZeroAddress, await tick(XFHE));

      await expectFHERC20BalancesChange(XFHE, bob.address, -1n * (await ticksToIndicated(XFHE, 1n)), -1n * burnValue);
      await hre.cofhe.mocks.expectPlaintext(await XFHE.confidentialTotalSupply(), mintValue - burnValue);

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
      const { XFHE, bob, alice, bobClient } = await setupFixture();

      const mintValue = ethers.parseEther("10");

      await XFHE.mint(bob.address, mintValue);
      await XFHE.mint(alice.address, mintValue);

      // Encrypt transfer value
      const transferValueRaw = ethers.parseEther("1");
      const [encTransferInput] = await bobClient.encryptInputs([Encryptable.uint64(transferValueRaw)]).execute();

      // encTransfer

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, alice.address);

      await expect(
        XFHE.connect(bob)["confidentialTransfer(address,(uint256,uint8,uint8,bytes))"](alice.address, encTransferInput),
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
      const { XFHE, bob, bobClient } = await setupFixture();

      // Encrypt transfer value
      const transferValueRaw = ethers.parseEther("1");
      const [encTransferInput] = await bobClient.encryptInputs([Encryptable.uint64(transferValueRaw)]).execute();

      // encTransfer (reverts)
      await expect(
        XFHE.connect(bob)["confidentialTransfer(address,(uint256,uint8,uint8,bytes))"](ZeroAddress, encTransferInput),
      ).to.be.revertedWithCustomError(XFHE, "ERC20InvalidReceiver");
    });
  });

  describe("operator management", function () {
    it("Should return true when operator is set", async function () {
      const { XFHE, bob, alice } = await setupFixture();

      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(alice.address, timestamp);

      expect(await XFHE.isOperator(bob.address, alice.address)).to.equal(true);
    });

    it("Should return false when operator is not set", async function () {
      const { XFHE, bob, alice } = await setupFixture();

      expect(await XFHE.isOperator(bob.address, alice.address)).to.equal(false);
    });

    it("Should return false when operator has expired", async function () {
      const { XFHE, bob, alice } = await setupFixture();

      // Set operator with past timestamp
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp - 100;
      await XFHE.connect(bob).setOperator(alice.address, timestamp);

      expect(await XFHE.isOperator(bob.address, alice.address)).to.equal(false);
    });

    it("Should remove operator when setting timestamp to 0", async function () {
      const { XFHE, bob, alice } = await setupFixture();

      // Set operator
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(alice.address, timestamp);

      expect(await XFHE.isOperator(bob.address, alice.address)).to.equal(true);

      // Remove operator
      await XFHE.connect(bob).setOperator(alice.address, 0);

      expect(await XFHE.isOperator(bob.address, alice.address)).to.equal(false);
    });
  });

  describe("confidentialTransferFrom", function () {
    const setupEncTransferFromFixture = async () => {
      const { XFHE, bob, alice, eve, aliceClient, eveClient, bobClient } = await setupFixture();

      const mintValue = ethers.parseEther("10");
      await XFHE.mint(bob, mintValue);
      await XFHE.mint(alice, mintValue);

      return { XFHE, bob, alice, eve, aliceClient, eveClient, bobClient };
    };

    it("Should transfer from bob to alice", async function () {
      const { XFHE, bob, alice, aliceClient } = await setupEncTransferFromFixture();

      // Success - Bob -> Alice

      // Set alice as operator for bob
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(alice.address, timestamp);

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, alice.address);

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await aliceClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      await expect(
        XFHE.connect(alice)["confidentialTransferFrom(address,address,(uint256,uint8,uint8,bytes))"](
          bob.address,
          alice.address,
          encTransferInput,
        ),
      )
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
      const { XFHE, bob, alice, eve, eveClient } = await setupEncTransferFromFixture();

      // Success - Bob -> Alice

      // Set eve as operator for bob
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(eve.address, timestamp);

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, alice.address);

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await eveClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      await expect(
        XFHE.connect(eve)["confidentialTransferFrom(address,address,(uint256,uint8,uint8,bytes))"](
          bob.address,
          alice.address,
          encTransferInput,
        ),
      )
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
      const { XFHE, bob, bobClient } = await setupEncTransferFromFixture();

      const vaultFactory = await ethers.getContractFactory("MockFherc20Vault");
      const Vault = await vaultFactory.deploy(XFHE.target);
      await Vault.waitForDeployment();
      const vaultAddress = await Vault.getAddress();

      // Mint to vault (initialize indicator)
      await XFHE.mint(vaultAddress, await ethers.parseEther("1"));

      // Success - Bob -> Vault

      // Set vault as operator for bob
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(vaultAddress, timestamp);

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await bobClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, vaultAddress);

      await expect(Vault.connect(bob).deposit(encTransferInput))
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
      const { XFHE, bob, alice, aliceClient } = await setupEncTransferFromFixture();

      // Set alice as operator for bob
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(alice.address, timestamp);

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await aliceClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      await expect(
        XFHE.connect(alice)["confidentialTransferFrom(address,address,(uint256,uint8,uint8,bytes))"](
          bob.address,
          ZeroAddress,
          encTransferInput,
        ),
      ).to.be.revertedWithCustomError(XFHE, "ERC20InvalidReceiver");
    });

    it("Should revert on spender mismatch", async function () {
      const { XFHE, bob, alice, eve, aliceClient } = await setupEncTransferFromFixture();

      // FHERC20ConfidentialTransferFromSpenderMismatch

      // Set eve as operator for bob (not alice)
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(eve.address, timestamp);

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await aliceClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      // Expect revert

      await expect(
        XFHE.connect(alice)["confidentialTransferFrom(address,address,(uint256,uint8,uint8,bytes))"](
          bob.address,
          alice.address,
          encTransferInput,
        ),
      ).to.be.revertedWithCustomError(XFHE, "FHERC20UnauthorizedSpender");
    });
  });

  describe("confidentialTransferAndCall", function () {
    const setupTransferAndCallFixture = async () => {
      const { XFHE, bob, alice, eve, bobClient } = await setupFixture();

      const mintValue = ethers.parseEther("10");
      await XFHE.mint(bob.address, mintValue);

      // Deploy receiver contract
      const receiverFactory = await ethers.getContractFactory("MockFHERC20Receiver");
      const receiver = await receiverFactory.deploy();
      await receiver.waitForDeployment();

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await bobClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      return { XFHE, bob, alice, eve, receiver, encTransferInput, transferValue };
    };

    it("Should transfer with callback to receiver (success)", async function () {
      const { XFHE, bob, receiver, encTransferInput, transferValue } = await setupTransferAndCallFixture();

      const receiverAddress = await receiver.getAddress();

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, receiverAddress);

      const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]);

      const tx = await XFHE.connect(bob)["confidentialTransferAndCall(address,(uint256,uint8,uint8,bytes),bytes)"](
        receiverAddress,
        encTransferInput,
        callData,
      );

      await expect(tx)
        .to.emit(XFHE, "Transfer")
        .withArgs(bob.address, receiverAddress, await tick(XFHE))
        .to.emit(XFHE, "Transfer")
        .withArgs(receiverAddress, bob.address, await tick(XFHE))
        .to.emit(receiver, "ConfidentialTransferCallback")
        .withArgs(true);

      // 2 Transfer events for confidentiality (initial + refund of 0)
      // Bob: -1 tick (send) +1 tick (refund of 0) = 0 indicated change
      // Receiver: +1 tick (receive) -1 tick (refund of 0) = 0 indicated change (but started at 0, so now at 5000)
      await expectFHERC20BalancesChange(XFHE, bob.address, 0n, -1n * transferValue);
      await expectFHERC20BalancesChange(XFHE, receiverAddress, await ticksToIndicated(XFHE, 5000n), 1n * transferValue);
    });

    it("Should transfer with callback to receiver (failure)", async function () {
      const { XFHE, bob, receiver, encTransferInput } = await setupTransferAndCallFixture();

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, await receiver.getAddress());

      const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [0]);

      await expect(
        XFHE.connect(bob)["confidentialTransferAndCall(address,(uint256,uint8,uint8,bytes),bytes)"](
          await receiver.getAddress(),
          encTransferInput,
          callData,
        ),
      ).to.emit(receiver, "ConfidentialTransferCallback");

      // Transfer should be reverted, encrypted balances unchanged
      // But indicated balances change due to transfer + refund (for confidentiality)
      await expectFHERC20BalancesChange(XFHE, bob.address, 0n, 0n);
      await expectFHERC20BalancesChange(XFHE, await receiver.getAddress(), await ticksToIndicated(XFHE, 5000n), 0n);
    });

    it("Should transfer with callback to EOA", async function () {
      const { XFHE, bob, alice, encTransferInput, transferValue } = await setupTransferAndCallFixture();

      await XFHE.mint(alice.address, ethers.parseEther("1")); // Initialize alice's balance

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, alice.address);

      const callData = "0x";

      const tx = await XFHE.connect(bob)["confidentialTransferAndCall(address,(uint256,uint8,uint8,bytes),bytes)"](
        alice.address,
        encTransferInput,
        callData,
      );

      await expect(tx)
        .to.emit(XFHE, "Transfer")
        .withArgs(bob.address, alice.address, await tick(XFHE))
        .to.emit(XFHE, "Transfer")
        .withArgs(alice.address, bob.address, await tick(XFHE));

      // 2 Transfer events for confidentiality (initial + refund of 0)
      await expectFHERC20BalancesChange(XFHE, bob.address, 0n, -1n * transferValue);
      await expectFHERC20BalancesChange(XFHE, alice.address, 0n, 1n * transferValue);
    });

    it("Should revert with custom error from callback", async function () {
      const { XFHE, bob, receiver, encTransferInput } = await setupTransferAndCallFixture();

      const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [2]);

      await expect(
        XFHE.connect(bob)["confidentialTransferAndCall(address,(uint256,uint8,uint8,bytes),bytes)"](
          await receiver.getAddress(),
          encTransferInput,
          callData,
        ),
      )
        .to.be.revertedWithCustomError(receiver, "InvalidInput")
        .withArgs(2);
    });

    it("Should revert on transfer to zero address", async function () {
      const { XFHE, bob, encTransferInput } = await setupTransferAndCallFixture();

      await expect(
        XFHE.connect(bob)["confidentialTransferAndCall(address,(uint256,uint8,uint8,bytes),bytes)"](
          ZeroAddress,
          encTransferInput,
          "0x",
        ),
      ).to.be.revertedWithCustomError(XFHE, "ERC20InvalidReceiver");
    });
  });

  describe("confidentialTransferFromAndCall", function () {
    const setupTransferFromAndCallFixture = async () => {
      const { XFHE, bob, alice, eve, bobClient, aliceClient, eveClient } = await setupFixture();

      const mintValue = ethers.parseEther("10");
      await XFHE.mint(bob.address, mintValue);
      await XFHE.mint(alice.address, mintValue);

      // Deploy receiver contract
      const receiverFactory = await ethers.getContractFactory("MockFHERC20Receiver");
      const receiver = await receiverFactory.deploy();
      await receiver.waitForDeployment();

      return { XFHE, bob, alice, eve, receiver, bobClient, aliceClient, eveClient };
    };

    it("Should transfer from bob to receiver with callback (as operator)", async function () {
      const { XFHE, bob, alice, receiver, aliceClient } = await setupTransferFromAndCallFixture();

      const receiverAddress = await receiver.getAddress();

      // Set alice as operator for bob
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(alice.address, timestamp);

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, receiverAddress);

      const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]);

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await aliceClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      const tx = await XFHE.connect(alice)[
        "confidentialTransferFromAndCall(address,address,(uint256,uint8,uint8,bytes),bytes)"
      ](bob.address, receiverAddress, encTransferInput, callData);

      await expect(tx)
        .to.emit(XFHE, "Transfer")
        .withArgs(bob.address, receiverAddress, await tick(XFHE))
        .to.emit(XFHE, "Transfer")
        .withArgs(receiverAddress, bob.address, await tick(XFHE))
        .to.emit(receiver, "ConfidentialTransferCallback")
        .withArgs(true);

      // 2 Transfer events for confidentiality (initial + refund of 0)
      await expectFHERC20BalancesChange(XFHE, bob.address, 0n, -1n * transferValue);
      await expectFHERC20BalancesChange(XFHE, receiverAddress, await ticksToIndicated(XFHE, 5000n), 1n * transferValue);
    });

    it("Should transfer from bob to receiver with callback (failure)", async function () {
      const { XFHE, bob, alice, receiver, aliceClient } = await setupTransferFromAndCallFixture();

      // Set alice as operator for bob
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(alice.address, timestamp);

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, await receiver.getAddress());

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await aliceClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [0]);

      await expect(
        XFHE.connect(alice)["confidentialTransferFromAndCall(address,address,(uint256,uint8,uint8,bytes),bytes)"](
          bob.address,
          await receiver.getAddress(),
          encTransferInput,
          callData,
        ),
      ).to.emit(receiver, "ConfidentialTransferCallback");

      // Transfer should be reverted, encrypted balances unchanged
      // But indicated balances change due to transfer + refund (for confidentiality)
      await expectFHERC20BalancesChange(XFHE, bob.address, 0n, 0n);
      await expectFHERC20BalancesChange(XFHE, await receiver.getAddress(), await ticksToIndicated(XFHE, 5000n), 0n);
    });

    it("Should transfer from bob to alice (EOA) with callback", async function () {
      const { XFHE, bob, alice, eve, eveClient } = await setupTransferFromAndCallFixture();

      // Set eve as operator for bob
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(eve.address, timestamp);

      await prepExpectFHERC20BalancesChange(XFHE, bob.address);
      await prepExpectFHERC20BalancesChange(XFHE, alice.address);

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await eveClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      const callData = "0x";

      const tx = await XFHE.connect(eve)[
        "confidentialTransferFromAndCall(address,address,(uint256,uint8,uint8,bytes),bytes)"
      ](bob.address, alice.address, encTransferInput, callData);

      await expect(tx)
        .to.emit(XFHE, "Transfer")
        .withArgs(bob.address, alice.address, await tick(XFHE))
        .to.emit(XFHE, "Transfer")
        .withArgs(alice.address, bob.address, await tick(XFHE));

      // 2 Transfer events for confidentiality (initial + refund of 0)
      await expectFHERC20BalancesChange(XFHE, bob.address, 0n, -1n * transferValue);
      await expectFHERC20BalancesChange(XFHE, alice.address, 0n, 1n * transferValue);
    });

    it("Should revert without operator approval", async function () {
      const { XFHE, bob, alice, receiver, aliceClient } = await setupTransferFromAndCallFixture();

      const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]);

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await aliceClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      await expect(
        XFHE.connect(alice)["confidentialTransferFromAndCall(address,address,(uint256,uint8,uint8,bytes),bytes)"](
          bob.address,
          await receiver.getAddress(),
          encTransferInput,
          callData,
        ),
      ).to.be.revertedWithCustomError(XFHE, "FHERC20UnauthorizedSpender");
    });

    it("Should revert with custom error from callback", async function () {
      const { XFHE, bob, alice, receiver, aliceClient } = await setupTransferFromAndCallFixture();

      // Set alice as operator for bob
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(alice.address, timestamp);

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await aliceClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [2]);

      await expect(
        XFHE.connect(alice)["confidentialTransferFromAndCall(address,address,(uint256,uint8,uint8,bytes),bytes)"](
          bob.address,
          await receiver.getAddress(),
          encTransferInput,
          callData,
        ),
      )
        .to.be.revertedWithCustomError(receiver, "InvalidInput")
        .withArgs(2);
    });

    it("Should revert on transfer to zero address", async function () {
      const { XFHE, bob, alice, aliceClient } = await setupTransferFromAndCallFixture();

      // Set alice as operator for bob
      const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
      await XFHE.connect(bob).setOperator(alice.address, timestamp);

      // Encrypt transfer value
      const transferValue = ethers.parseEther("1");
      const [encTransferInput] = await aliceClient.encryptInputs([Encryptable.uint64(transferValue)]).execute();

      await expect(
        XFHE.connect(alice)["confidentialTransferFromAndCall(address,address,(uint256,uint8,uint8,bytes),bytes)"](
          bob.address,
          ZeroAddress,
          encTransferInput,
          "0x",
        ),
      ).to.be.revertedWithCustomError(XFHE, "ERC20InvalidReceiver");
    });
  });
});
