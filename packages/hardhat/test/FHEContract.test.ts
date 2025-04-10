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
    fheContract = (await fheContractFactory.deploy(owner.address)) as FHEContract;
    await fheContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should have the right message on deploy", async function () {
      expect(await fheContract.greeting()).to.equal("Building Private Apps!!!");
    });

    it("Should allow setting and reading a value", async function () {
      const [owner] = await ethers.getSigners();
      await hre.cofhe.initializeWithHardhatSigner(owner);

      // Select target value
      const targetValue = 10n;

      // Encrypt target value, and pass it to the contract
      const encryptedInputResult = await cofhejs.encrypt(
        (state: string) => {
          console.log("Encrypt State - ", state);
        },
        [Encryptable.uint32(targetValue)] as const,
      );
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
  });
});
