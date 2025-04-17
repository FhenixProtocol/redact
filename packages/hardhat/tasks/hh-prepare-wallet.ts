import { task } from "hardhat/config";

task("hh-prepare-wallet", "Send ETH to a test account")
  .addParam("to", "Recipient address")
  .setAction(async ({ to }, { ethers, deployments }) => {
    console.log("Sending 10 ETH to", to);

    const [sender] = await ethers.getSigners();
    const tx = await sender.sendTransaction({
      to,
      value: ethers.parseEther("10"),
    });
    await tx.wait();
    console.log(`Sent 10 ETH to ${to}`);

    console.log("");

    console.log("Sending 10 USDC to", to);
    const usdc = await deployments.get("USDC");
    const usdcContract = new ethers.Contract(usdc.address, usdc.abi, sender);
    const tx2 = await usdcContract.mint(to, ethers.parseUnits("10", 6));
    await tx2.wait();
    console.log(`Sent 10 USDC to ${to}`);
    console.log("USDC address", usdc.address);

    console.log("");

    console.log("Sending 10 wETH to", to);
    const weth = await deployments.get("wETH");
    const wethContract = new ethers.Contract(weth.address, weth.abi, sender);
    const tx3 = await wethContract.mint(to, ethers.parseUnits("10", 18));
    await tx3.wait();
    console.log(`Sent 10 wETH to ${to}`);
    console.log("wETH address", weth.address);
  });
