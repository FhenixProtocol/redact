import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployWeth: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  
  if (process.env.weth) {
    console.log("Skipping wETH deployment, using provided address:", process.env.weth);
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
