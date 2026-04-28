import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployConfidentialERC20Impl: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy ConfidentialERC20 implementation (constructor calls _disableInitializers)
  // This is the shared implementation used by RedactCore to deploy UUPS proxies
  const implDeployment = await deploy("ConfidentialERC20Impl", {
    contract: "ConfidentialERC20",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log("ConfidentialERC20 implementation deployed at:", implDeployment.address);
};

export default deployConfidentialERC20Impl;
deployConfidentialERC20Impl.tags = ["ConfidentialERC20Impl"];
