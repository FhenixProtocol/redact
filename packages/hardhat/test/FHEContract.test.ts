import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { FHEContract } from "../typechain-types";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";

describe("YourContract", function () {
  // We define a fixture to reuse the same setup in every test.

  let fheContract: FHEContract;
  before(async () => {
    const [owner] = await ethers.getSigners();
    const fheContractFactory = await ethers.getContractFactory("FHEContract");
    fheContract = (await fheContractFactory.deploy()) as FHEContract;
    await fheContract.waitForDeployment();
  });

  const logState = (state: string) => {
    console.log("Encrypt State - ", state);
  };

  describe("Deployment", function () {
    it("Should have the right value on deploy", async function () {
      const val = await fheContract.val();
      await hre.cofhe.mocks.expectPlaintext(val, 0n);
    });

    it("Should allow setting and reading a value", async function () {
      const [owner] = await ethers.getSigners();
      await hre.cofhe.initializeWithHardhatSigner(owner);

      // Select target value
      const targetValue = 10n;

      // Encrypt target value, and pass it to the contract
      const encryptedInputResult = await cofhejs.encrypt(logState, [Encryptable.uint32(targetValue)] as const);
      const [inputValue] = await hre.cofhe.expectResultSuccess(encryptedInputResult);
      await fheContract.setVal(inputValue);

      // Fetch the encrypted value ctHash from the contract
      const valCtHash = await fheContract.val();

      // Unseal the value
      const unsealResult = await cofhejs.unseal(valCtHash, FheTypes.Uint32);
      const valUnsealed = await hre.cofhe.expectResultSuccess(unsealResult);

      // Compare the unsealed value to the target value
      expect(valUnsealed).to.equal(targetValue);
    });

    it("Should allow performing operations on the value", async function () {
      const [owner] = await ethers.getSigners();
      await hre.cofhe.initializeWithHardhatSigner(owner);

      const targetValue = 10n;
      const operandValue = 2n;

      // Encrypt target value, and pass it to the contract
      const encryptedInputResult = await cofhejs.encrypt(logState, [
        Encryptable.uint32(targetValue),
        Encryptable.uint32(operandValue),
      ] as const);
      const [inputValue, operandInputValue] = await hre.cofhe.expectResultSuccess(encryptedInputResult);
      await fheContract.setVal(inputValue);

      // Use the mocks to peek at the value
      let valCtHash = await fheContract.val();
      await hre.cofhe.mocks.expectPlaintext(valCtHash, targetValue);

      // Perform addition on the value
      await fheContract.valOp(0, operandInputValue);
      valCtHash = await fheContract.val();
      await hre.cofhe.mocks.expectPlaintext(valCtHash, targetValue + 2n);

      // Reset the value
      await fheContract.setVal(inputValue);

      // Perform subtraction on the value
      await fheContract.valOp(1, operandInputValue);
      valCtHash = await fheContract.val();
      await hre.cofhe.mocks.expectPlaintext(valCtHash, targetValue - 2n);

      // Reset the value
      await fheContract.setVal(inputValue);

      // Perform multiplication on the value
      await fheContract.valOp(2, operandInputValue);
      valCtHash = await fheContract.val();
      await hre.cofhe.mocks.expectPlaintext(valCtHash, targetValue * 2n);

      // Reset the value
      await fheContract.setVal(inputValue);

      // Perform division on the value
      await fheContract.valOp(3, operandInputValue);
      valCtHash = await fheContract.val();
      await hre.cofhe.mocks.expectPlaintext(valCtHash, targetValue / 2n);
    });
  });
});
