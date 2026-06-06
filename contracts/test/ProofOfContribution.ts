import { expect } from "chai";
import { ethers } from "hardhat";

describe("ProofOfContribution", function () {
  async function deployFixture() {
    const [owner, supervisor, member, outsider] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("ProofOfContribution");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, supervisor, member, outsider };
  }

  async function projectFixture() {
    const ctx = await deployFixture();
    await ctx.contract.createProject("Course project", ctx.supervisor.address);
    await ctx.contract.addMember(1, ctx.member.address);
    await ctx.contract.createTask(1, "Smart contract", "code", 40);
    return ctx;
  }

  it("creates projects, members, tasks, and approved contribution profiles", async function () {
    const { contract, owner, supervisor, member } = await projectFixture();

    await expect(contract.connect(member).submitContribution(1, 1, "ipfs://evidence-code"))
      .to.emit(contract, "ContributionSubmitted")
      .withArgs(1, 1, 1, member.address, ethers.keccak256(ethers.toUtf8Bytes("ipfs://evidence-code")), "ipfs://evidence-code");

    await expect(contract.connect(supervisor).approveContribution(1, "ipfs://badge-code"))
      .to.emit(contract, "ContributionApproved")
      .withArgs(1, 1, supervisor.address, 1);

    expect(await contract.ownerOf(1)).to.equal(member.address);
    expect(await contract.tokenURI(1)).to.equal("ipfs://badge-code");
    expect(await contract.locked(1)).to.equal(true);

    const [totalWeight, approvedContributions, badgeCount] = await contract.viewContributionProfile(1, member.address);
    expect(totalWeight).to.equal(40);
    expect(approvedContributions).to.equal(1);
    expect(badgeCount).to.equal(1);
    expect(await contract.categoryWeightOf(1, member.address, "code")).to.equal(40);

    const project = await contract.projects(1);
    expect(project.owner).to.equal(owner.address);
    expect(project.supervisor).to.equal(supervisor.address);
    expect(project.memberCount).to.equal(2);
    expect(project.taskCount).to.equal(1);
  });

  it("blocks unauthorized project operations", async function () {
    const { contract, outsider, member } = await projectFixture();

    await expect(contract.connect(outsider).addMember(1, outsider.address))
      .to.be.revertedWithCustomError(contract, "Unauthorized");

    await expect(contract.connect(member).createTask(1, "Testing", "testing", 20))
      .to.be.revertedWithCustomError(contract, "Unauthorized");
  });

  it("blocks non-member contribution submissions", async function () {
    const { contract, outsider } = await projectFixture();

    await expect(contract.connect(outsider).submitContribution(1, 1, "ipfs://outsider"))
      .to.be.revertedWithCustomError(contract, "NotMember");
  });

  it("prevents duplicate evidence submissions", async function () {
    const { contract, member } = await projectFixture();

    await contract.connect(member).submitContribution(1, 1, "ipfs://same-evidence");
    await expect(contract.connect(member).submitContribution(1, 1, "ipfs://same-evidence"))
      .to.be.revertedWithCustomError(contract, "DuplicateEvidence");
  });

  it("allows only owner or supervisor to approve contributions", async function () {
    const { contract, member, outsider } = await projectFixture();

    await contract.connect(member).submitContribution(1, 1, "ipfs://needs-approval");
    await expect(contract.connect(outsider).approveContribution(1, "ipfs://badge"))
      .to.be.revertedWithCustomError(contract, "Unauthorized");
  });

  it("keeps approved contributions immutable", async function () {
    const { contract, supervisor, member } = await projectFixture();

    await contract.connect(member).submitContribution(1, 1, "ipfs://approved-once");
    await contract.connect(supervisor).approveContribution(1, "ipfs://badge");

    await expect(contract.connect(supervisor).approveContribution(1, "ipfs://badge-again"))
      .to.be.revertedWithCustomError(contract, "AlreadyApproved");

    const contribution = await contract.contributions(1);
    expect(contribution.status).to.equal(1);
    expect(contribution.evidenceUri).to.equal("ipfs://approved-once");
  });

  it("prevents soulbound badge transfers and approvals", async function () {
    const { contract, supervisor, member, outsider } = await projectFixture();

    await contract.connect(member).submitContribution(1, 1, "ipfs://badge-transfer-test");
    await contract.connect(supervisor).approveContribution(1, "ipfs://badge");

    await expect(contract.connect(member).transferFrom(member.address, outsider.address, 1))
      .to.be.revertedWithCustomError(contract, "Soulbound");
    await expect(contract.connect(member).approve(outsider.address, 1))
      .to.be.revertedWithCustomError(contract, "Soulbound");
    await expect(contract.connect(member).setApprovalForAll(outsider.address, true))
      .to.be.revertedWithCustomError(contract, "Soulbound");
  });
});
