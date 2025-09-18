import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { chainConfig } from "../config/customDeploymentConfig";

const deployWeth: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const chainId = await hre.getChainId();
  
  const wethAddress = chainConfig[chainId]?.weth;
  if (wethAddress) {
    console.log("Skipping wETH deployment, using provided address:", wethAddress);
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
