import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const registryFactory = await ethers.getContractFactory("ContributionRegistry");
  const registry = await registryFactory.deploy();
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log("ContributionRegistry deployed to:", registryAddress);

  const badgeFactory = await ethers.getContractFactory("ContributionBadge");
  const badge = await badgeFactory.deploy(
    registryAddress,
    "Proof of Contribution Badge",
    "POCB"
  );
  await badge.waitForDeployment();

  const badgeAddress = await badge.getAddress();
  console.log("ContributionBadge deployed to:", badgeAddress);

  const tx = await registry.setBadgeContract(badgeAddress);
  await tx.wait();
  console.log("Badge contract linked to registry");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
