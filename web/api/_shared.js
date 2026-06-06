const { ethers } = require("ethers");
const crypto = require("crypto");

const RPC_URL = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS || "0x985d88E8a3b632bCc45e56fDf7F3918f4DEd2ab2";
const BADGE_ADDRESS = process.env.BADGE_ADDRESS || "0xc9AdFbC3B3652e8d4252223EebAb3d78a8335F3c";
const REPO_ID = Number(process.env.REPO_ID || "1");
const POLICY_ID = process.env.POLICY_ID || "contribution-chain-v1";

const registryAbi = [
  "function nextRepoId() view returns (uint256)",
  "function nextReportId() view returns (uint256)",
  "function reports(uint256) view returns (uint256 repoId,address contributor,bytes32 commitSha,bytes32 reportHash,string uri,string policyId,uint32 attestationCount,uint8 status,uint64 submittedAt)",
  "function createRepo(string name,address[] approvers,uint8 threshold)",
  "function attest(uint256 reportId)",
  "function finalize(uint256 reportId)",
  "function finalizeWithBadgeUri(uint256 reportId,string badgeUri)",
  "function submitReport(uint256 repoId,bytes32 commitSha,bytes32 reportHash,string uri,string policyId)",
  "event RepoCreated(uint256 indexed repoId,address indexed owner,uint8 threshold,string name)",
  "event ReportSubmitted(uint256 indexed reportId,uint256 indexed repoId,address indexed contributor,bytes32 commitSha,bytes32 reportHash,string uri,string policyId)",
  "event ReportAttested(uint256 indexed reportId,uint256 indexed repoId,address indexed approver)",
  "event ReportFinalized(uint256 indexed reportId,uint256 indexed repoId,uint32 attestationCount)",
  "event ReportDisputed(uint256 indexed reportId,uint256 indexed repoId,bytes32 reasonHash)"
];

const badgeAbi = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function locked(uint256 tokenId) view returns (bool)",
  "function badges(uint256) view returns (uint256 reportId,uint256 repoId,bytes32 reportHash,string reportUri,string metadataUri,uint64 mintedAt)"
];

function provider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function registry() {
  return new ethers.Contract(REGISTRY_ADDRESS, registryAbi, provider());
}

function badge() {
  return new ethers.Contract(BADGE_ADDRESS, badgeAbi, provider());
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function handleError(res, error) {
  send(res, 500, { error: error.message || String(error) });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function reportHash(report) {
  const digest = crypto.createHash("sha256").update(stableJson(report)).digest("hex");
  return `0x${digest}`;
}

function asNumber(value) {
  return Number(value.toString());
}

module.exports = {
  BADGE_ADDRESS,
  POLICY_ID,
  REGISTRY_ADDRESS,
  REPO_ID,
  asNumber,
  badge,
  handleError,
  provider,
  readJson,
  registry,
  registryAbi,
  reportHash,
  send
};
