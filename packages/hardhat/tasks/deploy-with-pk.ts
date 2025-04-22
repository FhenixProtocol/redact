import { task, types } from "hardhat/config";
import { Wallet } from "ethers";
import password from "@inquirer/password";
import { spawn } from "child_process";
import { CustomNetworkConfig } from "../types/network";

task("deploy-with-pk", "Deploy contracts with encrypted private key")
  .addOptionalParam("tags", "The tags to deploy", undefined, types.string)
  .addOptionalParam("skipTokens", "Skip token deployments", false, types.boolean)
  .addOptionalParam("weth", "WETH contract address", undefined, types.string)
  .addOptionalParam("eeth", "eETH contract address", undefined, types.string)
  .addOptionalParam("reset", "Force redeployment of all contracts", false, types.boolean)
  .setAction(async (taskArgs, hre) => {
    const { tags, skipTokens, weth, eeth, reset } = taskArgs;
    const networkName = hre.network.name;

    // Cast the network config to include our custom properties
    const networkConfig = hre.network.config as CustomNetworkConfig;
    
    // Set the parameters
    networkConfig.skipTokens = skipTokens;
    networkConfig.wethAddress = weth;
    networkConfig.eethAddress = eeth;

    if (networkName === "localhost" || networkName === "hardhat") {
      // Run the deployment with optional reset
      await hre.run("deploy", {
        tags,
        reset
      });
      return;
    }

    const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;

    if (!encryptedKey) {
      console.log("🚫️ You don't have a deployer account. Run `yarn generate` or `yarn account:import` first");
      return;
    }

    const pass = await password({ message: "Enter password to decrypt private key:" });

    try {
      const wallet = await Wallet.fromEncryptedJson(encryptedKey, pass);
      process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY = wallet.privateKey;

      // Set the deployer account in hre's configuration
      const pk = wallet.privateKey;
      hre.network.config.accounts = [pk];
      hre.config.networks[networkName].accounts = [pk]; // keep global config in sync



      // Run the deployment with optional reset
      await hre.run("deploy", {
        tags,
        reset
      });
    } catch (e) {
      console.error("Failed to decrypt private key. Wrong password?");
      process.exit(1);
    }
  }); 