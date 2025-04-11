import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { deployments } from "hardhat";

const deployEeth: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const weth = await deployments.get("wETH");

  await deploy("eETH", {
    contract: "ConfidentialETH",
    from: deployer,
    args: [weth.address],
    log: true,
    autoMine: true,
  });

  const eeth = await hre.ethers.getContract<Contract>("eETH", deployer);
  console.log("eETH deployed at:", eeth.target);
};

export default deployEeth;
deployEeth.tags = ["eETH"];
