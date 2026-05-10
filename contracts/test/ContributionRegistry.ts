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

  it("rejects repo approval sets that cannot satisfy the threshold", async function () {
    const { registry, approver1 } = await deployFixture();

    await expect(
      registry.createRepo("bad-repo", [approver1.address, approver1.address], 2)
    ).to.be.revertedWithCustomError(registry, "InvalidThreshold");
  });

  it("rejects zero-address approvers", async function () {
    const { registry } = await deployFixture();

    await expect(
      registry.createRepo("bad-repo", [ethers.ZeroAddress], 1)
    ).to.be.revertedWithCustomError(registry, "InvalidApprover");
  });

  it("prevents removing approvers below the active threshold", async function () {
    const { registry, approver1 } = await deployFixture();

    await expect(
      registry.removeApprover(1, approver1.address)
    ).to.be.revertedWithCustomError(registry, "InvalidThreshold");

    await registry.setThreshold(1, 1);
    await registry.removeApprover(1, approver1.address);

    const repo = await registry.repos(1);
    expect(repo.threshold).to.equal(1n);
    expect(repo.approverCount).to.equal(1n);
  });

  it("blocks duplicate attestations from the same approver", async function () {
    const { registry, contributor, approver1 } = await deployFixture();
    const commitSha = ethers.id("commit");
    const reportHash = ethers.id("report");

    await registry
      .connect(contributor)
      .submitReport(1, commitSha, reportHash, "ipfs://cid", "score-v1");

    await registry.connect(approver1).attest(1);

    await expect(
      registry.connect(approver1).attest(1)
    ).to.be.revertedWithCustomError(registry, "AlreadyAttested");
  });

  it("mints a non-transferable contribution badge when a report is finalized", async function () {
    const { registry, approver1, approver2, contributor, outsider } = await deployFixture();
    const badgeFactory = await ethers.getContractFactory("ContributionBadge");
    const badge = await badgeFactory.deploy(
      await registry.getAddress(),
      "Proof of Contribution Badge",
      "POCB"
    );
    await badge.waitForDeployment();
    await registry.setBadgeContract(await badge.getAddress());

    const commitSha = ethers.id("commit");
    const reportHash = ethers.id("report");
    await registry
      .connect(contributor)
      .submitReport(1, commitSha, reportHash, "ipfs://cid", "score-v1");

    await registry.connect(approver1).attest(1);
    await registry.connect(approver2).attest(1);
    await registry.finalize(1);

    expect(await badge.balanceOf(contributor.address)).to.equal(1n);
    expect(await badge.ownerOf(1)).to.equal(contributor.address);
    expect(await badge.tokenURI(1)).to.equal("ipfs://cid");
    expect(await badge.locked(1)).to.equal(true);

    const badgeRecord = await badge.badges(1);
    expect(badgeRecord.reportId).to.equal(1n);
    expect(badgeRecord.repoId).to.equal(1n);
    expect(badgeRecord.reportHash).to.equal(reportHash);
    expect(badgeRecord.reportUri).to.equal("ipfs://cid");
    expect(badgeRecord.metadataUri).to.equal("ipfs://cid");

    await expect(
      badge.connect(contributor).transferFrom(contributor.address, outsider.address, 1)
    ).to.be.revertedWithCustomError(badge, "NonTransferable");
  });

  it("can finalize with a separate NFT metadata URI", async function () {
    const { registry, approver1, approver2, contributor } = await deployFixture();
    const badgeFactory = await ethers.getContractFactory("ContributionBadge");
    const badge = await badgeFactory.deploy(
      await registry.getAddress(),
      "Proof of Contribution Badge",
      "POCB"
    );
    await badge.waitForDeployment();
    await registry.setBadgeContract(await badge.getAddress());

    const commitSha = ethers.id("commit");
    const reportHash = ethers.id("report");
    await registry
      .connect(contributor)
      .submitReport(1, commitSha, reportHash, "ipfs://report-cid", "score-v1");

    await registry.connect(approver1).attest(1);
    await registry.connect(approver2).attest(1);
    await registry.finalizeWithBadgeUri(1, "ipfs://metadata-cid");

    expect(await badge.tokenURI(1)).to.equal("ipfs://metadata-cid");

    const badgeRecord = await badge.badges(1);
    expect(badgeRecord.reportUri).to.equal("ipfs://report-cid");
    expect(badgeRecord.metadataUri).to.equal("ipfs://metadata-cid");
  });
});
