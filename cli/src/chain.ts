import { ethers } from "ethers";
import { PocConfig } from "./types";

const ABI = [
  "function createRepo(string name, address[] approvers, uint8 threshold) returns (uint256 repoId)",
  "function submitReport(uint256 repoId, bytes32 commitSha, bytes32 reportHash, string uri, string policyId) returns (uint256 reportId)",
  "function attest(uint256 reportId)",
  "function finalize(uint256 reportId)",
  "event RepoCreated(uint256 indexed repoId, address indexed owner, uint8 threshold, string name)",
];

function toBytes32FromCommitSha(commitSha: string): string {
  const clean = commitSha.startsWith("0x") ? commitSha.slice(2) : commitSha;
  if (!/^[0-9a-fA-F]{40}$/.test(clean)) {
    throw new Error("commit SHA must be a 40-char hex string");
  }
  return `0x${clean.padEnd(64, "0")}`;
}

export async function submitReportOnChain(
  config: PocConfig,
  commitSha: string,
  reportHash: string,
  uri: string
): Promise<string> {
  const pk = process.env[config.privateKeyEnv];
  if (!pk) throw new Error(`Missing env var ${config.privateKeyEnv}`);

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(config.contractAddress, ABI, wallet);

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
  const pk = process.env[config.privateKeyEnv];
  if (!pk) throw new Error(`Missing env var ${config.privateKeyEnv}`);

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(config.contractAddress, ABI, wallet);

  const tx = await contract.createRepo(name, approvers, threshold);
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
  const pk = process.env[config.privateKeyEnv];
  if (!pk) throw new Error(`Missing env var ${config.privateKeyEnv}`);

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(config.contractAddress, ABI, wallet);

  const tx = await contract.attest(reportId);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function finalizeOnChain(config: PocConfig, reportId: number): Promise<string> {
  const pk = process.env[config.privateKeyEnv];
  if (!pk) throw new Error(`Missing env var ${config.privateKeyEnv}`);

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(config.contractAddress, ABI, wallet);

  const tx = await contract.finalize(reportId);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}
