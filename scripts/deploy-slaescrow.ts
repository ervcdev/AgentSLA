import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer signer found");

  console.log("Deploying SLAEscrow with", deployer.address);

  const Factory = await ethers.getContractFactory("SLAEscrow");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  console.log("SLAEscrow deployed to:", await contract.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
