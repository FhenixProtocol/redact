import { Address } from "hardhat-deploy/types";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const transferErc20 = async (hre: HardhatRuntimeEnvironment, contractName: string, to: Address, amount: bigint) => {
  console.log(`Sending ${amount} ${contractName} to ${to}`);

  const { ethers, deployments } = hre;
  const [sender] = await ethers.getSigners();
  const contract = await deployments.get(contractName);
  const contractInstance = new ethers.Contract(contract.address, contract.abi, sender);
  const decimals = await contractInstance.decimals();
  const tx = await contractInstance.mint(to, ethers.parseUnits(amount.toString(), decimals));
  await tx.wait();

  console.log(`Sent ${amount} ${contractName} to ${to}`);
  console.log(`${contractName} address`, contract.address);
};

task("hh-prepare-wallet", "Send ETH to a test account")
  .addParam("to", "Recipient address")
  .setAction(async ({ to }, hre) => {
    const { ethers } = hre;

    console.log("Sending 10 ETH to", to);

    const [sender] = await ethers.getSigners();
    const tx = await sender.sendTransaction({
      to,
      value: ethers.parseEther("10"),
    });
    await tx.wait();
    console.log(`Sent 10 ETH to ${to}`);

    console.log("");

    const erc20s = ["wETH", "USDC", "wBTC", "MATIC", "FTM"];

    for (const contractName of erc20s) {
      await transferErc20(hre, contractName, to, 10n);
      console.log("");
    }
  });
