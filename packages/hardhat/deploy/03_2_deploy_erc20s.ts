import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { chainConfig } from "../config/customDeploymentConfig";

const deployUsdc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const chainId = await hre.getChainId();

  const skipTokens = chainConfig[chainId]?.skipTokens;
  if (skipTokens === true) {
    console.log("Skipping token deployment due to skipTokens config");
    return;
  }

  await deploy("USDC", {
    contract: "ERC20_Harness",
    from: deployer,
    args: ["USDC", "USDC", 6],
    log: true,
    autoMine: true,
  });

  const usdc = await hre.ethers.getContract<Contract>("USDC", deployer);
  console.log("USDC deployed at:", usdc.target);
};

export default deployUsdc;
deployUsdc.tags = ["USDC"];
