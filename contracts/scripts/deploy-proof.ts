import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ProofOfContribution with:", deployer.address);

  const factory = await ethers.getContractFactory("ProofOfContribution");
  const proof = await factory.deploy();
  await proof.waitForDeployment();

  console.log("ProofOfContribution deployed to:", await proof.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
