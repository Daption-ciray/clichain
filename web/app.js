let account = "";
let config = null;
let demoMode = false;

const $ = (id) => document.getElementById(id);
const statusName = ["Pending", "Finalized", "Disputed"];
const short = (value) => value ? `${String(value).slice(0, 10)}...${String(value).slice(-8)}` : "";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const AMOY_CHAIN_ID = "0x13882";
const demo = {
  chain: {
    chainId: "80002",
    latestBlock: "Demo",
    contractAddress: "0x985d88E8a3b632bCc45e56fDf7F3918f4DEd2ab2",
    badgeContractAddress: "0xc9AdFbC3B3652e8d4252223EebAb3d78a8335F3c",
    repoId: 1,
    policyId: "contribution-chain-v1",
  },
  indexer: {
    reports: [
      {
        id: 1,
        repoId: 1,
        status: 1,
        attestationCount: 2,
        reportHash: "0x6f2a4f0e82c6a756f91df0a6b4a4fba3e1d3c8f81deaa57f607e2ff3c92d5a10",
        uri: "ipfs://contribution-report-demo",
      },
    ],
    events: [
      { blockNumber: "Amoy", name: "RepoCreated", txHash: "0x4b80b4d945f1b5f9d15c4a640111222333444555666777888999aaaabbbbcccc" },
      { blockNumber: "Amoy", name: "ReportSubmitted", txHash: "0x9d44e76ca0ef70123456789abcdef123456789abcdef123456789abcdef1234" },
      { blockNumber: "Amoy", name: "ReportFinalized", txHash: "0x31bc4de910987654321abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd" },
    ],
  },
};

async function api(path, options) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok || body.error) throw new Error(body.error || response.statusText);
  return body;
}

function table(headers, rows) {
  if (!rows.length) return '<p class="empty">No data yet.</p>';
  return `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

async function load() {
  let chain;
  let indexer;
  try {
    [chain, indexer] = await Promise.all([
      api("/api/chain"),
      api("/api/indexer"),
    ]);
    demoMode = false;
  } catch (err) {
    chain = demo.chain;
    indexer = demo.indexer;
    demoMode = true;
  }
  config = chain;
  $("network").textContent = demoMode
    ? `Static demo | Amoy ${chain.chainId}`
    : `Chain ${chain.chainId} | Block ${chain.latestBlock}`;
  $("summary").innerHTML = [
    ["Registry", chain.contractAddress],
    ["Badge", chain.badgeContractAddress || "not configured"],
    ["Repo ID", chain.repoId],
    ["Mode", demoMode ? "Vercel static demo" : chain.policyId],
  ].map(([label, value]) => `<div class="stat"><div class="label">${label}</div><div class="value">${escapeHtml(value)}</div></div>`).join("");

  $("reportCount").textContent = `${indexer.reports.length} reports`;
  $("reportsTable").innerHTML = table(
    ["ID", "Repo", "Status", "Attest", "Hash", "URI"],
    indexer.reports.map((report) => [
      report.id,
      report.repoId,
      `<span class="pill ${report.status === 1 ? "finalized" : report.status === 2 ? "disputed" : ""}">${statusName[report.status] || report.status}</span>`,
      report.attestationCount,
      `<code>${escapeHtml(short(report.reportHash))}</code>`,
      `<code>${escapeHtml(report.uri)}</code>`,
    ])
  );

  $("eventCount").textContent = `${indexer.events.length} events`;
  $("events").innerHTML = table(
    ["Block", "Event", "Tx"],
    indexer.events.slice(-12).reverse().map((event) => [
      event.blockNumber,
      event.name,
      `<code>${escapeHtml(short(event.txHash))}</code>`,
    ])
  );
}

async function connectWallet() {
  if (!window.ethereum) throw new Error("No wallet found. Install MetaMask.");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  account = accounts[0];
  $("wallet").textContent = short(account);
  $("connect").textContent = short(account);
}

async function ensureAmoyNetwork() {
  if (!window.ethereum) throw new Error("No wallet found. Install MetaMask.");
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId === AMOY_CHAIN_ID) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: AMOY_CHAIN_ID }],
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: AMOY_CHAIN_ID,
        chainName: "Polygon Amoy",
        nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
        rpcUrls: ["https://rpc-amoy.polygon.technology"],
        blockExplorerUrls: ["https://amoy.polygonscan.com"],
      }],
    });
  }
}

function commitToBytes32(value) {
  const clean = value.trim().replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{40}$/.test(clean) && !/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error("Commit SHA must be 40 or 64 hex characters.");
  }
  return `0x${clean.padStart(64, "0")}`;
}

async function sendRegistry(method, args) {
  if (demoMode) throw new Error("This Vercel build is a static demo. Run the local dashboard for live wallet transactions.");
  if (!account) await connectWallet();
  await ensureAmoyNetwork();
  const tx = await api("/api/calldata", {
    method: "POST",
    body: JSON.stringify({ method, args }),
  });
  return window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from: account, to: tx.to, data: tx.data }],
  });
}

async function handleAction(action) {
  if (action === "createRepo") {
    const approvers = $("approvers").value.split(",").map((x) => x.trim()).filter(Boolean);
    const threshold = Number($("threshold").value);
    await sendRegistry("createRepo", [$("repoName").value, approvers, threshold]);
  }
  if (action === "submitReport") {
    await sendRegistry("submitReport", [
      Number(config?.repoId || 1),
      commitToBytes32($("submitCommit").value),
      $("submitHash").value.trim(),
      $("submitUri").value.trim(),
      config?.policyId || "contribution-chain-v1",
    ]);
  }
  if (action === "attest") {
    await sendRegistry("attest", [Number($("reportId").value)]);
  }
  if (action === "finalize") {
    const badgeUri = $("badgeUri").value.trim();
    if (badgeUri) await sendRegistry("finalizeWithBadgeUri", [Number($("reportId").value), badgeUri]);
    else await sendRegistry("finalize", [Number($("reportId").value)]);
  }
  await load();
}

async function verifyReport() {
  if (demoMode) {
    $("verifyResult").textContent = "Static demo mode: paste report.json in the local dashboard to compute and compare the live hash.";
    return;
  }
  const report = JSON.parse($("reportJson").value);
  const result = await api("/api/verify-report", {
    method: "POST",
    body: JSON.stringify({ report, expectedHash: $("expectedHash").value.trim() || undefined }),
  });
  $("verifyResult").textContent = JSON.stringify(result, null, 2);
}

async function loadBadge() {
  if (demoMode) {
    $("badgeResult").textContent = JSON.stringify({
      tokenId: $("tokenId").value,
      registry: demo.chain.contractAddress,
      badge: demo.chain.badgeContractAddress,
      locked: true,
      note: "Demo data. Live token lookup is available in the local dashboard.",
    }, null, 2);
    return;
  }
  const badge = await api(`/api/badge?tokenId=${encodeURIComponent($("tokenId").value)}`);
  $("badgeResult").textContent = JSON.stringify(badge, null, 2);
}

async function loadRepos() {
  if (demoMode) {
    $("githubOutput").innerHTML = table(
      ["Repo", "Default branch"],
      [[`<button class="secondary" data-repo="clichain">Daption-ciray/clichain</button>`, "main"]]
    );
    document.querySelector("[data-repo]")?.addEventListener("click", () => {
      $("ghOwner").value = "Daption-ciray";
      $("ghRepo").value = "clichain";
    });
    return;
  }
  const owner = $("ghOwner").value.trim();
  const repos = await api(`/api/github/repos?owner=${encodeURIComponent(owner)}`);
  $("githubOutput").innerHTML = table(
    ["Repo", "Default branch"],
    repos.map((repo) => [
      `<button class="secondary" data-repo="${escapeHtml(repo.name)}">${escapeHtml(repo.fullName)}</button>`,
      escapeHtml(repo.defaultBranch),
    ])
  );
  document.querySelectorAll("[data-repo]").forEach((button) => {
    button.addEventListener("click", () => {
      $("ghRepo").value = button.dataset.repo;
    });
  });
}

async function loadCommits() {
  if (demoMode) {
    $("githubOutput").innerHTML = table(
      ["SHA", "Message", "Author"],
      [
        [`<button class="secondary" data-sha="b3ff562">b3ff562</button>`, "Add blockchain submission email draft", "Daption-ciray"],
        [`<button class="secondary" data-sha="909ed67">909ed67</button>`, "Add GitHub Pages deployment workflow", "Daption-ciray"],
      ]
    );
    document.querySelectorAll("[data-sha]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!$("ghFrom").value) $("ghFrom").value = button.dataset.sha;
        else $("ghTo").value = button.dataset.sha;
      });
    });
    return;
  }
  const owner = $("ghOwner").value.trim();
  const repo = $("ghRepo").value.trim();
  const commits = await api(`/api/github/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`);
  $("githubOutput").innerHTML = table(
    ["SHA", "Message", "Author"],
    commits.map((commit) => [
      `<button class="secondary" data-sha="${commit.sha}">${short(commit.sha)}</button>`,
      escapeHtml(commit.message.split("\n")[0]),
      escapeHtml(commit.author?.name || ""),
    ])
  );
  document.querySelectorAll("[data-sha]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!$("ghFrom").value) $("ghFrom").value = button.dataset.sha;
      else $("ghTo").value = button.dataset.sha;
    });
  });
}

async function generateGithubReport() {
  if (demoMode) {
    const report = {
      _type: "https://in-toto.io/Statement/v1",
      predicateType: "https://akadaltr.dev/attestation/contribution-report/v1",
      subject: [{ name: `${$("ghOwner").value || "Daption-ciray"}/${$("ghRepo").value || "clichain"}`, digest: { gitCommit: $("ghTo").value || "b3ff562" } }],
      predicate: { commits: 2, filesChanged: 3, verifiedBy: "Contribution Chain MVP" },
    };
    $("reportJson").value = JSON.stringify(report, null, 2);
    $("expectedHash").value = demo.indexer.reports[0].reportHash;
    $("githubOutput").innerHTML = `<pre>${escapeHtml(JSON.stringify({ hash: demo.indexer.reports[0].reportHash }, null, 2))}</pre>`;
    return;
  }
  const body = {
    owner: $("ghOwner").value.trim(),
    repo: $("ghRepo").value.trim(),
    from: $("ghFrom").value.trim(),
    to: $("ghTo").value.trim(),
  };
  const result = await api("/api/github/report", {
    method: "POST",
    body: JSON.stringify(body),
  });
  $("reportJson").value = JSON.stringify(result.report, null, 2);
  $("expectedHash").value = result.hash;
  $("submitHash").value = result.hash;
  $("submitCommit").value = body.to;
  $("githubOutput").innerHTML = `<pre>${escapeHtml(JSON.stringify({ hash: result.hash }, null, 2))}</pre>`;
}

function bind() {
  $("refresh").addEventListener("click", load);
  $("connect").addEventListener("click", () => connectWallet().catch(alert));
  $("verifyBtn").addEventListener("click", () => verifyReport().catch((err) => $("verifyResult").textContent = err.message));
  $("loadBadge").addEventListener("click", () => loadBadge().catch((err) => $("badgeResult").textContent = err.message));
  $("loadRepos").addEventListener("click", () => loadRepos().catch(alert));
  $("loadCommits").addEventListener("click", () => loadCommits().catch(alert));
  $("generateGithubReport").addEventListener("click", () => generateGithubReport().catch(alert));
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action).catch(alert));
  });
}

bind();
load().catch((err) => {
  $("network").textContent = err.message;
});
