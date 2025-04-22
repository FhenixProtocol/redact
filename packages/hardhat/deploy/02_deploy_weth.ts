import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { CustomNetworkConfig } from "../types/network";

const deployWeth: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Get the network config with our custom properties
  const networkConfig = hre.network.config as CustomNetworkConfig;


  // If weth address is provided in config, skip deployment
  if (networkConfig.wethAddress) {
    console.log("Skipping wETH deployment, using provided address:", networkConfig.wethAddress);
    return;
  }

  await deploy("wETH", {
    contract: "WETH_Harness",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const weth = await hre.ethers.getContract<Contract>("wETH", deployer);
  console.log("wETH deployed at:", weth.target);
};

export default deployWeth;
deployWeth.tags = ["WETH"];
