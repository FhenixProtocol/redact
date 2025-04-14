import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { deployments } from "hardhat";

const deployRedactCore: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const weth = await deployments.get("wETH");
  const eeth = await deployments.get("eETH");
  const usdc = await deployments.get("USDC");

  await deploy("RedactCore", {
    from: deployer,
    args: [weth.address, eeth.address],
    log: true,
    autoMine: true,
  });

  const redactCore = await hre.ethers.getContract<Contract>("RedactCore", deployer);
  console.log("RedactCore deployed at:", redactCore.target);

  await redactCore.updateStablecoin(usdc.address, true);
  console.log("USDC updated as stablecoin");
};

export default deployRedactCore;
deployRedactCore.tags = ["RedactCore"];
