const { ethers } = require("ethers");
const crypto = require("crypto");

const CHAIN_ID = Number(process.env.CHAIN_ID || "137");
const RPC_URL = process.env.POLYGON_MAINNET_RPC_URL || process.env.POLYGON_RPC_URL || "https://polygon-bor-rpc.publicnode.com";
const EXPLORER_URL = process.env.EXPLORER_URL || "https://polygonscan.com";
const PROOF_CONTRACT_ADDRESS = process.env.PROOF_CONTRACT_ADDRESS || process.env.REGISTRY_ADDRESS || "0x0e0e36378e7B8fE8F7743A10e9e942Bd6A2b04A7";

const proofAbi = [
  "function nextProjectId() view returns (uint256)",
  "function nextTaskId() view returns (uint256)",
  "function nextContributionId() view returns (uint256)",
  "function nextTokenId() view returns (uint256)",
  "function projects(uint256) view returns (string name,address owner,address supervisor,uint32 memberCount,uint32 taskCount,bool exists)",
  "function tasks(uint256) view returns (uint256 projectId,string title,string category,uint32 weight,bool exists)",
  "function contributions(uint256) view returns (uint256 projectId,uint256 taskId,address contributor,string evidenceUri,bytes32 evidenceHash,address approver,uint8 status,uint64 submittedAt,uint64 approvedAt,uint256 badgeTokenId)",
  "function badges(uint256) view returns (uint256 contributionId,uint256 projectId,uint256 taskId,bytes32 evidenceHash,string metadataUri,uint64 mintedAt)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function locked(uint256 tokenId) view returns (bool)",
  "function viewContributionProfile(uint256 projectId,address user) view returns (uint256 totalWeight,uint256 approvedContributions,uint256 badgeCount)",
  "function categoryWeightOf(uint256 projectId,address user,string category) view returns (uint256)",
  "function createProject(string projectName,address supervisor)",
  "function addMember(uint256 projectId,address member)",
  "function createTask(uint256 projectId,string title,string category,uint32 weight)",
  "function submitContribution(uint256 projectId,uint256 taskId,string evidenceUri)",
  "function approveContribution(uint256 contributionId,string badgeUri)",
  "event ProjectCreated(uint256 indexed projectId,address indexed owner,address indexed supervisor,string name)",
  "event MemberAdded(uint256 indexed projectId,address indexed member)",
  "event TaskCreated(uint256 indexed projectId,uint256 indexed taskId,string title,string category,uint32 weight)",
  "event ContributionSubmitted(uint256 indexed contributionId,uint256 indexed projectId,uint256 indexed taskId,address contributor,bytes32 evidenceHash,string evidenceUri)",
  "event ContributionApproved(uint256 indexed contributionId,uint256 indexed projectId,address indexed approver,uint256 badgeTokenId)",
  "event BadgeMinted(uint256 indexed tokenId,address indexed recipient,uint256 indexed contributionId,uint256 projectId,uint256 taskId,bytes32 evidenceHash,string metadataUri)"
];

function provider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function proof() {
  if (!PROOF_CONTRACT_ADDRESS) throw new Error("PROOF_CONTRACT_ADDRESS is not configured");
  return new ethers.Contract(PROOF_CONTRACT_ADDRESS, proofAbi, provider());
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
  CHAIN_ID,
  EXPLORER_URL,
  PROOF_CONTRACT_ADDRESS,
  asNumber,
  handleError,
  proof,
  proofAbi,
  provider,
  readJson,
  reportHash,
  send
};
