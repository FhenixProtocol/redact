import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { deployments } from "hardhat";
import { CustomNetworkConfig } from "../types/network";
const deployEeth: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const networkConfig = hre.network.config as CustomNetworkConfig;
  const eethAddress = networkConfig.eethAddress;
  if (eethAddress) {
    console.log("Skipping eETH deployment due to --eeth flag");
    return;
  }


 
  const wethAddress = networkConfig.wethAddress;
  const weth = wethAddress || (await deployments.get("wETH")).address;

  await deploy("eETH", {
    contract: "ConfidentialETH",
    from: deployer,
    args: [weth],
    log: true,
    autoMine: true,
  });

  const eeth = await hre.ethers.getContract<Contract>("eETH", deployer);
  console.log("eETH deployed at:", eeth.target);
};

export default deployEeth;
deployEeth.tags = ["eETH"];
