import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployUsdc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

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
