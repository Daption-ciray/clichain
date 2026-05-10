#!/usr/bin/env node
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");

const PORT = Number(process.env.EXPLORER_PORT ?? 8787);
const CONFIG_PATH = path.resolve(process.cwd(), ".pocrc.json");

const ABI = [
  "function nextRepoId() view returns (uint256)",
  "function nextReportId() view returns (uint256)",
  "function repos(uint256) view returns (string name,address owner,uint8 threshold,uint32 approverCount,bool exists)",
  "function reports(uint256) view returns (uint256 repoId,address contributor,bytes32 commitSha,bytes32 reportHash,string uri,string policyId,uint32 attestationCount,uint8 status,uint64 submittedAt)",
  "event RepoCreated(uint256 indexed repoId, address indexed owner, uint8 threshold, string name)",
  "event ApproverAdded(uint256 indexed repoId, address indexed approver)",
  "event ReportSubmitted(uint256 indexed reportId, uint256 indexed repoId, address indexed contributor, bytes32 commitSha, bytes32 reportHash, string uri, string policyId)",
  "event ReportAttested(uint256 indexed reportId, uint256 indexed repoId, address indexed approver)",
  "event ReportFinalized(uint256 indexed reportId, uint256 indexed repoId, uint32 attestationCount)",
  "event ReportDisputed(uint256 indexed reportId, uint256 indexed repoId, bytes32 reasonHash)",
];

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Missing ${CONFIG_PATH}. Run local CLI config first.`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function replacer(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

function toJson(res, status, body) {
  const payload = JSON.stringify(body, replacer);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
}

function asObject(tx) {
  if (!tx) return null;
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: ethers.formatEther(tx.value ?? 0n),
    nonce: tx.nonce,
    gasLimit: tx.gasLimit?.toString(),
  };
}

async function getProvider() {
  const config = readConfig();
  return {
    config,
    provider: new ethers.JsonRpcProvider(config.rpcUrl),
  };
}

async function chainSnapshot() {
  const { config, provider } = await getProvider();
  const network = await provider.getNetwork();
  const latest = await provider.getBlockNumber();
  const balance = await provider.getBalance(config.contractAddress);

  return {
    rpcUrl: config.rpcUrl,
    contractAddress: config.contractAddress,
    repoId: config.repoId,
    policyId: config.policyId,
    chainId: network.chainId.toString(),
    latestBlock: latest,
    contractBalanceEth: ethers.formatEther(balance),
  };
}

async function blocksSnapshot(limit = 20) {
  const { provider } = await getProvider();
  const latest = await provider.getBlockNumber();
  const start = Math.max(0, latest - limit + 1);
  const blocks = [];

  for (let i = latest; i >= start; i--) {
    const block = await provider.getBlock(i, true);
    if (!block) continue;
    blocks.push({
      number: block.number,
      hash: block.hash,
      parentHash: block.parentHash,
      timestamp: block.timestamp,
      txCount: block.transactions.length,
      transactions: block.prefetchedTransactions.map(asObject),
    });
  }

  return blocks;
}

async function registrySnapshot() {
  const { config, provider } = await getProvider();
  const contract = new ethers.Contract(config.contractAddress, ABI, provider);
  const latest = await provider.getBlockNumber();
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
    "ReportSubmitted",
    "ReportAttested",
    "ReportFinalized",
    "ReportDisputed",
  ];
  const eventGroups = await Promise.all(
    eventNames.map(async (name) => contract.queryFilter(contract.filters[name](), 0, latest))
  );
  const events = eventGroups
    .flat()
    .sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
      return a.index - b.index;
    })
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

function page() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Local Chain Explorer</title>
  <style>
    :root { color-scheme: light; --bg: #f6f7f9; --fg: #18202a; --muted: #667085; --line: #d8dde5; --panel: #ffffff; --accent: #0b6bcb; --ok: #147d4f; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--fg); }
    header { padding: 18px 24px; border-bottom: 1px solid var(--line); background: var(--panel); position: sticky; top: 0; z-index: 2; }
    h1 { margin: 0; font-size: 20px; line-height: 1.2; }
    h2 { margin: 0 0 12px; font-size: 15px; }
    main { padding: 20px 24px 32px; display: grid; gap: 16px; max-width: 1280px; margin: 0 auto; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; overflow: hidden; }
    .stat { min-height: 78px; }
    .label { color: var(--muted); font-size: 12px; margin-bottom: 8px; }
    .value { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; overflow-wrap: anywhere; }
    .status { display: inline-flex; align-items: center; min-height: 26px; padding: 0 9px; border-radius: 999px; color: #fff; background: var(--ok); font-size: 12px; font-weight: 650; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { text-align: left; padding: 9px 8px; border-top: 1px solid var(--line); vertical-align: top; font-size: 13px; }
    th { color: var(--muted); font-weight: 650; font-size: 12px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; overflow-wrap: anywhere; }
    button { border: 1px solid var(--line); background: #fff; color: var(--fg); border-radius: 6px; min-height: 34px; padding: 0 12px; font: inherit; cursor: pointer; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .muted { color: var(--muted); }
    .span-2 { grid-column: span 2; }
    .span-4 { grid-column: span 4; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .span-2, .span-4 { grid-column: span 1; } header { position: static; } main { padding: 14px; } }
  </style>
</head>
<body>
  <header class="toolbar">
    <h1>Local Chain Explorer</h1>
    <button id="refresh">Refresh</button>
  </header>
  <main>
    <section class="grid" id="stats"></section>
    <section class="panel span-4">
      <div class="toolbar"><h2>Reports</h2><span class="muted" id="lastUpdated"></span></div>
      <div id="reports"></div>
    </section>
    <section class="panel span-4">
      <h2>Registry Events</h2>
      <div id="events"></div>
    </section>
    <section class="panel span-4">
      <h2>Latest Blocks</h2>
      <div id="blocks"></div>
    </section>
  </main>
  <script>
    const statusName = ["Pending", "Finalized", "Disputed"];
    const short = (value) => value ? String(value).slice(0, 10) + "..." + String(value).slice(-8) : "";
    const code = (value) => "<code>" + String(value ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])) + "</code>";

    async function load() {
      const [chain, registry, blocks] = await Promise.all([
        fetch("/api/chain").then(r => r.json()),
        fetch("/api/registry").then(r => r.json()),
        fetch("/api/blocks").then(r => r.json()),
      ]);

      document.getElementById("stats").innerHTML = [
        ["RPC", chain.rpcUrl],
        ["Chain ID", chain.chainId],
        ["Latest Block", chain.latestBlock],
        ["Contract", chain.contractAddress],
      ].map(([label, value]) => '<div class="panel stat"><div class="label">' + label + '</div><div class="value">' + value + '</div></div>').join("");

      document.getElementById("reports").innerHTML = table(
        ["ID", "Repo", "Status", "Attestations", "Hash", "URI"],
        registry.reports.map(r => [
          r.id,
          r.repoId,
          '<span class="status">' + (statusName[r.status] ?? r.status) + '</span>',
          r.attestationCount,
          code(r.reportHash),
          code(r.uri),
        ])
      );

      document.getElementById("events").innerHTML = table(
        ["Block", "Event", "Tx", "Args"],
        registry.events.map(e => [
          e.blockNumber,
          e.name,
          code(short(e.txHash)),
          code(JSON.stringify(e.args)),
        ])
      );

      document.getElementById("blocks").innerHTML = table(
        ["Block", "Hash", "Tx Count", "Transactions"],
        blocks.map(b => [
          b.number,
          code(short(b.hash)),
          b.txCount,
          b.transactions.map(tx => code(short(tx.hash)) + " " + short(tx.from) + " -> " + short(tx.to)).join("<br>"),
        ])
      );

      document.getElementById("lastUpdated").textContent = new Date().toLocaleTimeString();
    }

    function table(headers, rows) {
      if (!rows.length) return '<p class="muted">No data yet.</p>';
      return '<table><thead><tr>' + headers.map(h => '<th>' + h + '</th>').join("") + '</tr></thead><tbody>' +
        rows.map(row => '<tr>' + row.map(cell => '<td>' + cell + '</td>').join("") + '</tr>').join("") +
        '</tbody></table>';
    }

    document.getElementById("refresh").addEventListener("click", load);
    load().catch(err => {
      document.querySelector("main").innerHTML = '<section class="panel"><h2>Explorer Error</h2><pre>' + err.message + '</pre></section>';
    });
    setInterval(() => load().catch(() => {}), 5000);
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(page());
      return;
    }
    if (url.pathname === "/api/chain") return toJson(res, 200, await chainSnapshot());
    if (url.pathname === "/api/blocks") return toJson(res, 200, await blocksSnapshot());
    if (url.pathname === "/api/registry") return toJson(res, 200, await registrySnapshot());
    toJson(res, 404, { error: "Not found" });
  } catch (error) {
    toJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Local explorer: http://127.0.0.1:${PORT}`);
});
