import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { chainConfig } from "../config/customDeploymentConfig";
const deployErc20s: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const chainId = await hre.getChainId();

  const skipTokens = chainConfig[chainId]?.skipTokens;
  if (skipTokens === true) {
    console.log("Skipping token deployment due to skipTokens config");
    return;
  }

  await deploy("wBTC", {
    contract: "ERC20_Harness",
    from: deployer,
    args: ["wBTC", "wBTC", 8],
    log: true,
    autoMine: true,
  });

  const wbtc = await hre.ethers.getContract<Contract>("wBTC", deployer);
  console.log("wBTC deployed at:", wbtc.target);

  await deploy("MATIC", {
    contract: "ERC20_Harness",
    from: deployer,
    args: ["MATIC", "MATIC", 18],
    log: true,
    autoMine: true,
  });

  const matic = await hre.ethers.getContract<Contract>("MATIC", deployer);
  console.log("MATIC deployed at:", matic.target);

  await deploy("FTM", {
    contract: "ERC20_Harness",
    from: deployer,
    args: ["FTM", "FTM", 18],
    log: true,
    autoMine: true,
  });

  const ftm = await hre.ethers.getContract<Contract>("FTM", deployer);
  console.log("FTM deployed at:", ftm.target);
};

export default deployErc20s;
deployErc20s.tags = ["erc20s"];
