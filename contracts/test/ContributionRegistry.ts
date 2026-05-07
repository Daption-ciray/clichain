import { expect } from "chai";
import { ethers } from "hardhat";

describe("ContributionRegistry", function () {
  async function deployFixture() {
    const [owner, approver1, approver2, outsider, contributor] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("ContributionRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    await registry.createRepo(
      "demo-repo",
      [approver1.address, approver2.address],
      2
    );

    return { registry, owner, approver1, approver2, outsider, contributor };
  }

  it("submits report and requires threshold attestations", async function () {
    const { registry, approver1, approver2, contributor } = await deployFixture();
    const commitSha = ethers.id("commit");
    const reportHash = ethers.id("report");

    await registry
      .connect(contributor)
      .submitReport(1, commitSha, reportHash, "ipfs://cid", "score-v1");

    await expect(registry.finalize(1)).to.be.revertedWithCustomError(
      registry,
      "ThresholdNotMet"
    );

    await registry.connect(approver1).attest(1);
    await registry.connect(approver2).attest(1);
    await registry.finalize(1);

    const report = await registry.reports(1);
    expect(report.status).to.equal(1n); // Finalized
  });

  it("rejects duplicate report hashes per repo", async function () {
    const { registry, contributor } = await deployFixture();
    const commitSha = ethers.id("commit");
    const reportHash = ethers.id("report");

    await registry
      .connect(contributor)
      .submitReport(1, commitSha, reportHash, "ipfs://cid-a", "score-v1");

    await expect(
      registry
        .connect(contributor)
        .submitReport(1, commitSha, reportHash, "ipfs://cid-b", "score-v1")
    ).to.be.revertedWithCustomError(registry, "DuplicateHash");
  });

  it("blocks non-approver attestation", async function () {
    const { registry, contributor, outsider } = await deployFixture();
    const commitSha = ethers.id("commit");
    const reportHash = ethers.id("report");
    await registry
      .connect(contributor)
      .submitReport(1, commitSha, reportHash, "ipfs://cid", "score-v1");

    await expect(registry.connect(outsider).attest(1)).to.be.revertedWithCustomError(
      registry,
      "NotApprover"
    );
  });
});
