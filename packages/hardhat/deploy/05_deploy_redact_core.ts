import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { deployments } from "hardhat";
import { chainConfig } from "../config/customDeploymentConfig";

const deployRedactCore: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const chainId = await hre.getChainId();
  const skipTokens = chainConfig[chainId]?.skipTokens;
  const wethAddress = chainConfig[chainId]?.weth;
  const eethAddress = chainConfig[chainId]?.eeth;

  const weth = wethAddress || (await deployments.get("wETH")).address;
  const eeth = eethAddress || (await deployments.get("eETH")).address;
  const erc20Impl = (await deployments.get("ConfidentialERC20Impl")).address;

  if (!weth || !eeth) {
    throw new Error(`${!weth ? "wETH" : "eETH"} address must be provided`);
  }

  await deploy("RedactCore", {
    from: deployer,
    args: [weth, eeth, erc20Impl],
    log: true,
    autoMine: true,
  });

  const redactCore = await hre.ethers.getContract<Contract>("RedactCore", deployer);
  console.log("RedactCore deployed at:", redactCore.target);

  // Transfer eETH proxy ownership to RedactCore so it can authorize future upgrades
  const eethContract = await hre.ethers.getContractAt(
    "ConfidentialETH",
    eeth,
    await hre.ethers.getSigner(deployer),
  );
  const currentOwner = await eethContract.owner();
  if (currentOwner !== redactCore.target) {
    const tx = await eethContract.transferOwnership(redactCore.target);
    await tx.wait();
    console.log("eETH ownership transferred to RedactCore");
  } else {
    console.log("eETH ownership already transferred to RedactCore, skipping");
  }

  if (!skipTokens) {
    const usdc = await deployments.get("USDC");
    await redactCore.updateStablecoin(usdc.address, true);
    console.log("USDC updated as stablecoin");
  }
};

export default deployRedactCore;
deployRedactCore.tags = ["RedactCore"];
