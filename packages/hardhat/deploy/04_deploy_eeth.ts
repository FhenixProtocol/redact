import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { deployments } from "hardhat";
import { chainConfig } from "../config/customDeploymentConfig";

const deployEeth: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const chainId = await hre.getChainId();

  const eethAddress = chainConfig[chainId]?.eeth;
  if (eethAddress !== "") {
    console.log("Skipping eETH deployment due to --eeth flag");
    return;
  }
 
  const wethAddress = chainConfig[chainId]?.weth;
  const weth = wethAddress || (await deployments.get("wETH")).address;

  if (!weth) {
    throw new Error(`wETH address must be provided`);
  }

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
