#!/usr/bin/env node
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");

const PORT = Number(process.env.POC_WEB_PORT ?? 8788);
const REPO_ROOT = path.resolve(__dirname, "../..");
const WEB_ROOT = path.resolve(REPO_ROOT, "web");
const CONFIG_PATH = path.resolve(REPO_ROOT, "cli/.pocrc.json");

const REGISTRY_ABI = [
  "function createRepo(string name, address[] approvers, uint8 threshold) returns (uint256 repoId)",
  "function submitReport(uint256 repoId, bytes32 commitSha, bytes32 reportHash, string uri, string policyId) returns (uint256 reportId)",
  "function attest(uint256 reportId)",
  "function finalize(uint256 reportId)",
  "function finalizeWithBadgeUri(uint256 reportId, string badgeUri)",
  "function addApprover(uint256 repoId, address approver)",
  "function removeApprover(uint256 repoId, address approver)",
  "function setThreshold(uint256 repoId, uint8 threshold)",
  "function nextRepoId() view returns (uint256)",
  "function nextReportId() view returns (uint256)",
  "function repos(uint256) view returns (string name,address owner,uint8 threshold,uint32 approverCount,bool exists)",
  "function reports(uint256) view returns (uint256 repoId,address contributor,bytes32 commitSha,bytes32 reportHash,string uri,string policyId,uint32 attestationCount,uint8 status,uint64 submittedAt)",
  "event RepoCreated(uint256 indexed repoId, address indexed owner, uint8 threshold, string name)",
  "event ApproverAdded(uint256 indexed repoId, address indexed approver)",
  "event ApproverRemoved(uint256 indexed repoId, address indexed approver)",
  "event ThresholdUpdated(uint256 indexed repoId, uint8 threshold)",
  "event ReportSubmitted(uint256 indexed reportId, uint256 indexed repoId, address indexed contributor, bytes32 commitSha, bytes32 reportHash, string uri, string policyId)",
  "event ReportAttested(uint256 indexed reportId, uint256 indexed repoId, address indexed approver)",
  "event ReportFinalized(uint256 indexed reportId, uint256 indexed repoId, uint32 attestationCount)",
  "event ReportBadgeIssued(uint256 indexed reportId, uint256 indexed tokenId, address indexed recipient)",
  "event ReportDisputed(uint256 indexed reportId, uint256 indexed repoId, bytes32 reasonHash)",
];

const BADGE_ABI = [
  "function nextTokenId() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function locked(uint256 tokenId) view returns (bool)",
  "function badges(uint256 tokenId) view returns (uint256 reportId, uint256 repoId, bytes32 reportHash, string reportUri, string metadataUri, uint64 mintedAt)",
];

const registryInterface = new ethers.Interface(REGISTRY_ABI);

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) throw new Error(`Missing config: ${CONFIG_PATH}`);
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function provider() {
  return new ethers.JsonRpcProvider(readConfig().rpcUrl);
}

function registry() {
  const config = readConfig();
  return new ethers.Contract(config.contractAddress, REGISTRY_ABI, provider());
}

function badge() {
  const config = readConfig();
  if (!config.badgeContractAddress) return null;
  if (config.badgeContractAddress === ethers.ZeroAddress) return null;
  return new ethers.Contract(config.badgeContractAddress, BADGE_ABI, provider());
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function reportHash(report) {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(canonicalize(report))));
}

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body, (_key, value) => (typeof value === "bigint" ? value.toString() : value)));
}

function text(res, status, body, contentType) {
  res.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function chainSnapshot() {
  const config = readConfig();
  const p = provider();
  const network = await p.getNetwork();
  const latestBlock = await p.getBlockNumber();
  return {
    rpcUrl: config.rpcUrl,
    contractAddress: config.contractAddress,
    badgeContractAddress: config.badgeContractAddress,
    repoId: config.repoId,
    policyId: config.policyId,
    chainId: network.chainId.toString(),
    latestBlock,
  };
}

async function registrySnapshot() {
  const contract = registry();
  const latest = await provider().getBlockNumber();
  const [nextRepoId, nextReportId] = await Promise.all([
    contract.nextRepoId(),
    contract.nextReportId(),
  ]);

  const repos = [];
  for (let id = 1n; id < nextRepoId; id++) {
    const repo = await contract.repos(id);
    repos.push({
      id: id.toString(),
      name: repo.name,
      owner: repo.owner,
      threshold: Number(repo.threshold),
      approverCount: Number(repo.approverCount),
      exists: repo.exists,
    });
  }

  const reports = [];
  for (let id = 1n; id < nextReportId; id++) {
    const report = await contract.reports(id);
    reports.push({
      id: id.toString(),
      repoId: report.repoId.toString(),
      contributor: report.contributor,
      commitSha: report.commitSha,
      reportHash: report.reportHash,
      uri: report.uri,
      policyId: report.policyId,
      attestationCount: Number(report.attestationCount),
      status: Number(report.status),
      submittedAt: Number(report.submittedAt),
    });
  }

  const eventNames = [
    "RepoCreated",
    "ApproverAdded",
    "ApproverRemoved",
    "ThresholdUpdated",
    "ReportSubmitted",
    "ReportAttested",
    "ReportFinalized",
    "ReportBadgeIssued",
    "ReportDisputed",
  ];
  const eventGroups = await Promise.all(
    eventNames.map((name) => contract.queryFilter(contract.filters[name](), 0, latest))
  );
  const events = eventGroups
    .flat()
    .sort((a, b) => (a.blockNumber === b.blockNumber ? a.index - b.index : a.blockNumber - b.blockNumber))
    .map((event) => ({
      name: event.fragment.name,
      blockNumber: event.blockNumber,
      txHash: event.transactionHash,
      args: Object.fromEntries(
        event.fragment.inputs.map((input, index) => [input.name || `arg${index}`, event.args[index]])
      ),
    }));

  return { repos, reports, events };
}

async function badgeSnapshot(tokenId) {
  const contract = badge();
  if (!contract) throw new Error("Badge contract is not configured");
  const [owner, uri, locked, record] = await Promise.all([
    contract.ownerOf(tokenId),
    contract.tokenURI(tokenId),
    contract.locked(tokenId),
    contract.badges(tokenId),
  ]);
  return {
    tokenId,
    owner,
    uri,
    locked,
    reportId: record.reportId.toString(),
    repoId: record.repoId.toString(),
    reportHash: record.reportHash,
    reportUri: record.reportUri,
    metadataUri: record.metadataUri,
    mintedAt: Number(record.mintedAt),
  };
}

function encodeCalldata(method, args) {
  const config = readConfig();
  const allowed = new Set([
    "createRepo",
    "submitReport",
    "attest",
    "finalize",
    "finalizeWithBadgeUri",
    "addApprover",
    "removeApprover",
    "setThreshold",
  ]);
  if (!allowed.has(method)) throw new Error(`Unsupported method: ${method}`);
  return {
    to: config.contractAddress,
    data: registryInterface.encodeFunctionData(method, args),
  };
}

async function githubFetch(url) {
  const headers = {
    "user-agent": "proof-of-contribution-dashboard",
    accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `GitHub request failed: ${response.status}`);
  return body;
}

async function githubReport(owner, repo, from, to, repoId, policyId) {
  const compare = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/compare/${from}...${to}`);
  const commits = compare.commits.slice(0, 30);
  const statByAuthor = new Map();

  for (const commit of commits) {
    const detail = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`);
    const email = detail.commit?.author?.email || detail.author?.login || "unknown";
    const entry = statByAuthor.get(email) || {
      commits: 0,
      filesChanged: 0,
      additions: 0,
      deletions: 0,
    };
    entry.commits += 1;
    entry.filesChanged += detail.files?.length || 0;
    entry.additions += detail.stats?.additions || 0;
    entry.deletions += detail.stats?.deletions || 0;
    statByAuthor.set(email, entry);
  }

  const contributors = [...statByAuthor.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([email, s]) => ({
    identity: { gitAuthorEmail: email },
    metrics: {
      commits: s.commits,
      filesChanged: s.filesChanged,
      additions: s.additions,
      deletions: s.deletions,
      netLines: s.additions - s.deletions,
    },
  }));

  const repoUrl = `https://github.com/${owner}/${repo}`;
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: [
      {
        name: `${repoUrl}#${compare.base_commit.sha}..${compare.merge_base_commit.sha === compare.base_commit.sha ? compare.ahead_by : to}`,
        uri: repoUrl,
        digest: {
          gitCommitFrom: compare.base_commit.sha,
          gitCommitTo: compare.commits.at(-1)?.sha || to,
        },
      },
    ],
    predicateType: "https://akadaltr.dev/attestation/contribution-report/v1",
    predicate: {
      schemaVersion: "1.0",
      project: { repoUrl, repoId, defaultBranch: compare.base_commit.commit?.tree?.sha || "github" },
      range: {
        from: compare.base_commit.sha,
        to: compare.commits.at(-1)?.sha || to,
        generatedAt: new Date().toISOString(),
      },
      policy: {
        id: policyId,
        notes: "GitHub API based contribution attestation. On-chain stores hash only.",
      },
      contributors,
    },
  };
}

async function pinJson(name, content) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("Missing PINATA_JWT on the server");
  const form = new FormData();
  form.append("file", new Blob([content], { type: "application/json" }), name || "metadata.json");
  form.append("pinataMetadata", JSON.stringify({ name: name || "metadata.json" }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { authorization: `Bearer ${jwt}` },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.IpfsHash) throw new Error(body.error || body.message || response.statusText);
  return {
    cid: body.IpfsHash,
    uri: `ipfs://${body.IpfsHash}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${body.IpfsHash}`,
  };
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === "/api/config") return json(res, 200, readConfig());
    if (url.pathname === "/api/chain") return json(res, 200, await chainSnapshot());
    if (url.pathname === "/api/indexer") return json(res, 200, await registrySnapshot());
    if (url.pathname === "/api/badge") return json(res, 200, await badgeSnapshot(Number(url.searchParams.get("tokenId") || "1")));
    if (url.pathname === "/api/verify-report" && req.method === "POST") {
      const body = await readBody(req);
      const actual = reportHash(body.report);
      return json(res, 200, {
        hash: actual,
        expected: body.expectedHash || null,
        ok: body.expectedHash ? actual.toLowerCase() === String(body.expectedHash).toLowerCase() : null,
      });
    }
    if (url.pathname === "/api/calldata" && req.method === "POST") {
      const body = await readBody(req);
      return json(res, 200, encodeCalldata(body.method, body.args || []));
    }
    if (url.pathname === "/api/ipfs-upload" && req.method === "POST") {
      const body = await readBody(req);
      return json(res, 200, await pinJson(body.name, body.content));
    }
    if (url.pathname === "/api/github/repos") {
      const owner = url.searchParams.get("owner");
      if (!owner) throw new Error("owner is required");
      const repos = await githubFetch(`https://api.github.com/users/${owner}/repos?per_page=50&sort=updated`);
      return json(res, 200, repos.map((repo) => ({ name: repo.name, fullName: repo.full_name, defaultBranch: repo.default_branch, private: repo.private })));
    }
    if (url.pathname === "/api/github/commits") {
      const owner = url.searchParams.get("owner");
      const repo = url.searchParams.get("repo");
      const sha = url.searchParams.get("sha") || undefined;
      if (!owner || !repo) throw new Error("owner and repo are required");
      const commits = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=30${sha ? `&sha=${sha}` : ""}`);
      return json(res, 200, commits.map((commit) => ({ sha: commit.sha, message: commit.commit.message, author: commit.commit.author, htmlUrl: commit.html_url })));
    }
    if (url.pathname === "/api/github/report" && req.method === "POST") {
      const body = await readBody(req);
      const config = readConfig();
      const report = await githubReport(body.owner, body.repo, body.from, body.to, config.repoId, config.policyId);
      return json(res, 200, { report, hash: reportHash(report) });
    }

    const filePath = url.pathname === "/" ? path.join(WEB_ROOT, "index.html") : path.join(WEB_ROOT, url.pathname);
    if (!filePath.startsWith(WEB_ROOT) || !fs.existsSync(filePath)) return text(res, 404, "Not found", "text/plain");
    const ext = path.extname(filePath);
    const type = ext === ".js" ? "text/javascript; charset=utf-8" : ext === ".css" ? "text/css; charset=utf-8" : "text/html; charset=utf-8";
    return text(res, 200, fs.readFileSync(filePath), type);
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}

http.createServer(route).listen(PORT, "127.0.0.1", () => {
  console.log(`Proof-of-Contribution web dashboard: http://127.0.0.1:${PORT}`);
});
