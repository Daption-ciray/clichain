let account = "";
let config = null;

const $ = (id) => document.getElementById(id);
const statusName = ["Pending", "Finalized", "Disputed"];
const short = (value) => value ? `${String(value).slice(0, 10)}...${String(value).slice(-8)}` : "";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

async function api(path, options) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error || response.statusText);
  return body;
}

function table(headers, rows) {
  if (!rows.length) return "<p>No data yet.</p>";
  return `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

async function load() {
  const [chain, indexer] = await Promise.all([
    api("/api/chain"),
    api("/api/indexer"),
  ]);
  config = chain;
  $("network").textContent = `Chain ${chain.chainId} | Block ${chain.latestBlock}`;
  $("summary").innerHTML = [
    ["Registry", chain.contractAddress],
    ["Badge", chain.badgeContractAddress || "not configured"],
    ["Repo ID", chain.repoId],
    ["Policy", chain.policyId],
  ].map(([label, value]) => `<div class="stat"><div class="label">${label}</div><div class="value">${escapeHtml(value)}</div></div>`).join("");

  $("reportCount").textContent = `${indexer.reports.length} reports`;
  $("reports").innerHTML = table(
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

async function sendRegistry(method, args) {
  if (!account) await connectWallet();
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
  const report = JSON.parse($("reportJson").value);
  const result = await api("/api/verify-report", {
    method: "POST",
    body: JSON.stringify({ report, expectedHash: $("expectedHash").value.trim() || undefined }),
  });
  $("verifyResult").textContent = JSON.stringify(result, null, 2);
}

async function loadBadge() {
  const badge = await api(`/api/badge?tokenId=${encodeURIComponent($("tokenId").value)}`);
  $("badgeResult").textContent = JSON.stringify(badge, null, 2);
}

async function loadRepos() {
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
