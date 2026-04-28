import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { deployments } from "hardhat";
import { chainConfig } from "../config/customDeploymentConfig";

const deployEeth: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const chainId = await hre.getChainId();

  const eethAddress = chainConfig[chainId]?.eeth;
  if (eethAddress !== "") {
    console.log("Skipping eETH deployment due to --eeth flag");
    return;
  }

  const wethAddress = chainConfig[chainId]?.weth;
  const weth = wethAddress || (await deployments.get("wETH")).address;

  if (!weth) {
    throw new Error(`wETH address must be provided`);
  }

  // 1. Deploy ConfidentialETH implementation (constructor calls _disableInitializers)
  const implDeployment = await deploy("eETH_Impl", {
    contract: "ConfidentialETH",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log("eETH implementation deployed at:", implDeployment.address);

  // 2. Deploy ERC1967Proxy with initialize(weth) calldata
  const implArtifact = await hre.artifacts.readArtifact("ConfidentialETH");
  const iface = new hre.ethers.Interface(implArtifact.abi);
  const initData = iface.encodeFunctionData("initialize", [weth]);

  const proxyDeployment = await deploy("eETH_Proxy", {
    contract: "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy",
    from: deployer,
    args: [implDeployment.address, initData],
    log: true,
    autoMine: true,
  });
  console.log("eETH proxy deployed at:", proxyDeployment.address);

  // 3. Save the "eETH" artifact with proxy address + implementation ABI
  //    This ensures generateTsAbis picks up the correct ABI for the proxy
  const implDeploymentData = await hre.deployments.get("eETH_Impl");
  await hre.deployments.save("eETH", {
    address: proxyDeployment.address,
    abi: implArtifact.abi,
    metadata: implDeploymentData.metadata,
  });

  const eeth = await hre.ethers.getContractAt("ConfidentialETH", proxyDeployment.address, await hre.ethers.getSigner(deployer));
  console.log("eETH (proxy) ready at:", await eeth.getAddress());
};

export default deployEeth;
deployEeth.tags = ["eETH"];
