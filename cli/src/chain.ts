import { ethers } from "ethers";
import { ChainBadge, PocConfig } from "./types";

const ABI = [
  "function createRepo(string name, address[] approvers, uint8 threshold) returns (uint256 repoId)",
  "function submitReport(uint256 repoId, bytes32 commitSha, bytes32 reportHash, string uri, string policyId) returns (uint256 reportId)",
  "function reports(uint256 reportId) view returns (uint256 repoId, address contributor, bytes32 commitSha, bytes32 reportHash, string uri, string policyId, uint32 attestationCount, uint8 status, uint64 submittedAt)",
  "function attest(uint256 reportId)",
  "function finalize(uint256 reportId)",
  "function finalizeWithBadgeUri(uint256 reportId, string badgeUri)",
  "function addApprover(uint256 repoId, address approver)",
  "function removeApprover(uint256 repoId, address approver)",
  "function setThreshold(uint256 repoId, uint8 threshold)",
  "event RepoCreated(uint256 indexed repoId, address indexed owner, uint8 threshold, string name)",
];

const BADGE_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function locked(uint256 tokenId) view returns (bool)",
  "function badges(uint256 tokenId) view returns (uint256 reportId, uint256 repoId, bytes32 reportHash, string reportUri, string metadataUri, uint64 mintedAt)",
];

export type ChainReport = {
  repoId: string;
  contributor: string;
  commitSha: string;
  reportHash: string;
  uri: string;
  policyId: string;
  attestationCount: number;
  status: number;
  submittedAt: number;
};

function toBytes32FromCommitSha(commitSha: string): string {
  const clean = commitSha.startsWith("0x") ? commitSha.slice(2) : commitSha;
  if (!/^[0-9a-fA-F]{40}$/.test(clean)) {
    throw new Error("commit SHA must be a 40-char hex string");
  }
  return `0x${clean.padEnd(64, "0")}`;
}

function assertBytes32(value: string, label: string): void {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${label} must be a 32-byte hex string`);
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function assertAddress(value: string, label: string): void {
  if (!ethers.isAddress(value)) {
    throw new Error(`${label} must be a valid Ethereum address`);
  }
}

function getSignedContract(config: PocConfig): ethers.Contract {
  assertAddress(config.contractAddress, "contractAddress");
  const pk = process.env[config.privateKeyEnv];
  if (!pk) throw new Error(`Missing env var ${config.privateKeyEnv}`);

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  return new ethers.Contract(config.contractAddress, ABI, wallet);
}

export async function submitReportOnChain(
  config: PocConfig,
  commitSha: string,
  reportHash: string,
  uri: string
): Promise<string> {
  assertPositiveInteger(config.repoId, "repoId");
  assertBytes32(reportHash, "reportHash");
  if (!uri.trim()) throw new Error("uri is required");
  const contract = getSignedContract(config);

  const tx = await contract.submitReport(
    config.repoId,
    toBytes32FromCommitSha(commitSha),
    reportHash,
    uri,
    config.policyId
  );
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function createRepoOnChain(
  config: PocConfig,
  name: string,
  approvers: string[],
  threshold: number
): Promise<{ txHash: string; repoId?: number }> {
  if (!name.trim()) throw new Error("name is required");
  if (!Number.isSafeInteger(threshold) || threshold < 1 || threshold > 255) {
    throw new Error("threshold must be an integer from 1 to 255");
  }
  const uniqueApprovers = [...new Set(approvers.map((x) => ethers.getAddress(x)))];
  if (uniqueApprovers.length < threshold) {
    throw new Error("threshold cannot exceed unique approver count");
  }
  const contract = getSignedContract(config);

  const tx = await contract.createRepo(name, uniqueApprovers, threshold);
  const receipt = await tx.wait();

  let repoId: number | undefined;
  if (receipt?.logs) {
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === "RepoCreated") {
          repoId = Number(parsed.args.repoId);
          break;
        }
      } catch {
        // Ignore logs from other contracts.
      }
    }
  }

  return { txHash: receipt?.hash ?? tx.hash, repoId };
}

export async function attestOnChain(config: PocConfig, reportId: number): Promise<string> {
  assertPositiveInteger(reportId, "reportId");
  const contract = getSignedContract(config);

  const tx = await contract.attest(reportId);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function finalizeOnChain(config: PocConfig, reportId: number): Promise<string> {
  assertPositiveInteger(reportId, "reportId");
  const contract = getSignedContract(config);

  const tx = await contract.finalize(reportId);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function finalizeWithBadgeUriOnChain(
  config: PocConfig,
  reportId: number,
  badgeUri: string
): Promise<string> {
  assertPositiveInteger(reportId, "reportId");
  if (!badgeUri.trim()) throw new Error("badgeUri is required");
  const contract = getSignedContract(config);

  const tx = await contract.finalizeWithBadgeUri(reportId, badgeUri);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function getReportOnChain(config: PocConfig, reportId: number): Promise<ChainReport> {
  assertPositiveInteger(reportId, "reportId");
  assertAddress(config.contractAddress, "contractAddress");
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const contract = new ethers.Contract(config.contractAddress, ABI, provider);
  const report = await contract.reports(reportId);

  if (report.repoId === 0n) {
    throw new Error(`Report not found: ${reportId}`);
  }

  return {
    repoId: report.repoId.toString(),
    contributor: report.contributor,
    commitSha: report.commitSha,
    reportHash: report.reportHash,
    uri: report.uri,
    policyId: report.policyId,
    attestationCount: Number(report.attestationCount),
    status: Number(report.status),
    submittedAt: Number(report.submittedAt),
  };
}

export async function addApproverOnChain(
  config: PocConfig,
  repoId: number,
  approver: string
): Promise<string> {
  assertPositiveInteger(repoId, "repoId");
  assertAddress(approver, "approver");
  const contract = getSignedContract(config);

  const tx = await contract.addApprover(repoId, approver);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function removeApproverOnChain(
  config: PocConfig,
  repoId: number,
  approver: string
): Promise<string> {
  assertPositiveInteger(repoId, "repoId");
  assertAddress(approver, "approver");
  const contract = getSignedContract(config);

  const tx = await contract.removeApprover(repoId, approver);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function setThresholdOnChain(
  config: PocConfig,
  repoId: number,
  threshold: number
): Promise<string> {
  assertPositiveInteger(repoId, "repoId");
  if (!Number.isSafeInteger(threshold) || threshold < 1 || threshold > 255) {
    throw new Error("threshold must be an integer from 1 to 255");
  }
  const contract = getSignedContract(config);

  const tx = await contract.setThreshold(repoId, threshold);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function getBadgeOnChain(config: PocConfig, tokenId: number): Promise<ChainBadge> {
  assertPositiveInteger(tokenId, "tokenId");
  if (!config.badgeContractAddress) {
    throw new Error("Missing badgeContractAddress in config");
  }
  assertAddress(config.badgeContractAddress, "badgeContractAddress");
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const badge = new ethers.Contract(config.badgeContractAddress, BADGE_ABI, provider);
  const [owner, uri, locked, record] = await Promise.all([
    badge.ownerOf(tokenId),
    badge.tokenURI(tokenId),
    badge.locked(tokenId),
    badge.badges(tokenId),
  ]);

  return {
    tokenId,
    owner,
    reportId: record.reportId.toString(),
    repoId: record.repoId.toString(),
    reportHash: record.reportHash,
    uri,
    reportUri: record.reportUri,
    metadataUri: record.metadataUri,
    mintedAt: Number(record.mintedAt),
    locked,
  };
}
