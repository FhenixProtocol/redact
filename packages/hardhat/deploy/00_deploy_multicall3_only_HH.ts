import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployMulticall3: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const chainId = await hre.getChainId();

  if (chainId !== "31337") {
    console.log("Skipping Multicall3 deployment on non-Hardhat chain", chainId);
    return;
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("Multicall3", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const multicall3 = await hre.ethers.getContract<Contract>("Multicall3", deployer);
  console.log("Multicall3 deployed at:", multicall3.target);
};

export default deployMulticall3;
deployMulticall3.tags = ["Multicall3"];
