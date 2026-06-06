let account = "";
let config = null;
let githubSession = { authenticated: false, oauthConfigured: false };

const $ = (id) => document.getElementById(id);
const POLYGON_CHAIN_ID = "0x89";
const contributionStatus = ["Pending", "Approved"];
const short = (value) => value ? `${String(value).slice(0, 10)}...${String(value).slice(-8)}` : "";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

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
  const [chain, state] = await Promise.all([
    api("/api/chain"),
    api("/api/indexer"),
  ]);
  config = chain;

  $("network").textContent = `Chain ${chain.chainId} | Block ${chain.latestBlock}`;
  $("contractAddress").textContent = chain.contractAddress || "Not deployed";
  $("contractLink").href = chain.contractAddress ? `${chain.explorerUrl}/address/${chain.contractAddress}` : chain.explorerUrl;
  $("summary").innerHTML = [
    ["Network", chain.chainId === 137 ? "Polygon mainnet" : `Chain ${chain.chainId}`],
    ["Contract", chain.contractAddress || "not configured"],
    ["Projects", state.projects.length],
    ["Contributions", state.contributions.length],
  ].map(([label, value]) => `<div class="stat"><div class="label">${label}</div><div class="value">${escapeHtml(value)}</div></div>`).join("");

  $("projectCount").textContent = `${state.projects.length} projects`;
  $("projectsTable").innerHTML = table(
    ["ID", "Name", "Owner", "Supervisor", "Members", "Tasks"],
    state.projects.map((project) => [
      project.id,
      escapeHtml(project.name),
      `<code>${escapeHtml(short(project.owner))}</code>`,
      `<code>${escapeHtml(short(project.supervisor))}</code>`,
      project.memberCount,
      project.taskCount,
    ])
  );

  $("taskCount").textContent = `${state.tasks.length} tasks`;
  $("tasksTable").innerHTML = table(
    ["ID", "Project", "Title", "Category", "Weight"],
    state.tasks.map((task) => [
      task.id,
      task.projectId,
      escapeHtml(task.title),
      escapeHtml(task.category),
      task.weight,
    ])
  );

  $("contributionCount").textContent = `${state.contributions.length} contributions`;
  $("contributionsTable").innerHTML = table(
    ["ID", "Project", "Task", "Contributor", "Status", "Evidence", "Badge"],
    state.contributions.map((contribution) => [
      contribution.id,
      contribution.projectId,
      contribution.taskId,
      `<code>${escapeHtml(short(contribution.contributor))}</code>`,
      `<span class="pill ${contribution.status === 1 ? "finalized" : ""}">${contributionStatus[contribution.status] || contribution.status}</span>`,
      `<code>${escapeHtml(short(contribution.evidenceUri || contribution.evidenceHash))}</code>`,
      contribution.badgeTokenId || "-",
    ])
  );

  $("eventCount").textContent = `${state.events.length} events`;
  $("events").innerHTML = table(
    ["Block", "Event", "Tx"],
    state.events.slice(-12).reverse().map((event) => [
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
  if (!$("supervisor").value) $("supervisor").value = account;
  if (!$("memberAddress").value) $("memberAddress").value = account;
  if (!$("profileUser").value) $("profileUser").value = account;
}

async function ensurePolygonNetwork() {
  if (!window.ethereum) throw new Error("No wallet found. Install MetaMask.");
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId === POLYGON_CHAIN_ID) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: POLYGON_CHAIN_ID }],
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: POLYGON_CHAIN_ID,
        chainName: "Polygon Mainnet",
        nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
        rpcUrls: ["https://polygon-bor-rpc.publicnode.com"],
        blockExplorerUrls: ["https://polygonscan.com"],
      }],
    });
  }
}

async function sendProof(method, args) {
  if (!account) await connectWallet();
  await ensurePolygonNetwork();
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
  if (action === "createProject") {
    await sendProof("createProject", [$("projectName").value.trim(), $("supervisor").value.trim()]);
  }
  if (action === "addMember") {
    await sendProof("addMember", [Number($("projectId").value), $("memberAddress").value.trim()]);
  }
  if (action === "createTask") {
    await sendProof("createTask", [
      Number($("projectId").value),
      $("taskTitle").value.trim(),
      $("taskCategory").value.trim(),
      Number($("taskWeight").value),
    ]);
  }
  if (action === "submitContribution") {
    await sendProof("submitContribution", [
      Number($("projectId").value),
      Number($("taskId").value),
      $("evidenceUri").value.trim(),
    ]);
  }
  if (action === "approveContribution") {
    await sendProof("approveContribution", [
      Number($("contributionId").value),
      $("badgeUri").value.trim(),
    ]);
  }
  await load();
}

async function loadProfile() {
  const user = $("profileUser").value.trim();
  const projectId = Number($("projectId").value);
  const category = $("profileCategory").value.trim();
  const [profile, categoryWeight] = await Promise.all([
    api(`/api/profile?projectId=${encodeURIComponent(projectId)}&user=${encodeURIComponent(user)}`),
    api(`/api/profile?projectId=${encodeURIComponent(projectId)}&user=${encodeURIComponent(user)}&category=${encodeURIComponent(category)}`),
  ]);
  $("profileResult").textContent = JSON.stringify({ ...profile, category, categoryWeight: categoryWeight.categoryWeight }, null, 2);
}

async function loadBadge() {
  const badge = await api(`/api/badge?tokenId=${encodeURIComponent($("tokenId").value)}`);
  $("badgeResult").textContent = JSON.stringify(badge, null, 2);
}

async function loadRepos() {
  const owner = $("ghOwner").value.trim();
  const path = githubSession.authenticated ? "/api/github/repos" : `/api/github/repos?owner=${encodeURIComponent(owner)}`;
  const repos = await api(path);
  $("repoList").innerHTML = repos.map((repo) => `
    <button class="choice" data-repo="${escapeHtml(repo.name)}" data-owner="${escapeHtml(repo.owner || owner)}" data-full-name="${escapeHtml(repo.fullName)}">
      <strong>${escapeHtml(repo.name)}</strong>
      <span>${escapeHtml(repo.owner || owner)} / ${escapeHtml(repo.defaultBranch)}${repo.private ? " / private" : ""}</span>
    </button>
  `).join("");
  $("githubOutput").innerHTML = `<pre>${escapeHtml(JSON.stringify({
    connected: githubSession.authenticated ? githubSession.login : owner,
    mode: githubSession.authenticated ? "GitHub OAuth" : "public user lookup",
    repositories: repos.length
  }, null, 2))}</pre>`;
  document.querySelectorAll("[data-repo]").forEach((button) => {
    button.addEventListener("click", async () => {
      $("ghOwner").value = button.dataset.owner;
      $("ghRepo").value = button.dataset.repo;
      $("ghFrom").value = "";
      $("ghTo").value = "";
      document.querySelectorAll("[data-repo]").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      await loadCommits();
    });
  });
}

async function loadGithubSession() {
  githubSession = await api("/api/github/me");
  if (githubSession.authenticated) {
    $("ghOwner").value = githubSession.login;
    $("connectGithub").textContent = `GitHub: ${githubSession.login}`;
    await loadRepos();
    return;
  }
  $("connectGithub").textContent = "Connect GitHub";
}

async function connectGithub() {
  githubSession = await api("/api/github/me");
  if (!githubSession.oauthConfigured) {
    alert("GitHub OAuth app is not configured yet. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Vercel.");
    return;
  }
  if (githubSession.authenticated) {
    await loadRepos();
    return;
  }
  window.location.href = "/api/github/login";
}

async function loadCommits() {
  const owner = $("ghOwner").value.trim();
  const repo = $("ghRepo").value.trim();
  const commits = await api(`/api/github/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`);
  $("commitList").innerHTML = commits.map((commit, index) => `
    <div class="commit-choice">
      <div>
        <code>${escapeHtml(short(commit.sha))}</code>
        <strong>${escapeHtml(commit.message.split("\n")[0])}</strong>
        <span>${escapeHtml(commit.author?.name || "")}</span>
      </div>
      <div class="commit-actions">
        <button class="secondary compact" data-from-sha="${commit.sha}">From</button>
        <button class="primary compact" data-to-sha="${commit.sha}">${index === 0 ? "Use Latest" : "To"}</button>
      </div>
    </div>
  `).join("");
  $("githubOutput").innerHTML = `<pre>${escapeHtml(JSON.stringify({ repository: `${owner}/${repo}`, commits: commits.length }, null, 2))}</pre>`;
  document.querySelectorAll("[data-sha]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!$("ghFrom").value) $("ghFrom").value = button.dataset.sha;
      else $("ghTo").value = button.dataset.sha;
    });
  });
  document.querySelectorAll("[data-from-sha]").forEach((button) => {
    button.addEventListener("click", () => {
      $("ghFrom").value = button.dataset.fromSha;
    });
  });
  document.querySelectorAll("[data-to-sha]").forEach((button) => {
    button.addEventListener("click", () => {
      $("ghTo").value = button.dataset.toSha;
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
  $("evidenceUri").value = `github://${body.owner}/${body.repo}/commit/${body.to || result.report.subject?.[0]?.digest?.gitTo || ""}`;
  $("githubOutput").innerHTML = `<pre>${escapeHtml(JSON.stringify({ hash: result.hash, evidenceUri: $("evidenceUri").value }, null, 2))}</pre>`;
}

function bind() {
  $("refresh").addEventListener("click", load);
  $("connect").addEventListener("click", () => connectWallet().catch(alert));
  $("connectGithub").addEventListener("click", () => connectGithub().catch(alert));
  $("loadProfile").addEventListener("click", () => loadProfile().catch((err) => $("profileResult").textContent = err.message));
  $("loadBadge").addEventListener("click", () => loadBadge().catch((err) => $("badgeResult").textContent = err.message));
  $("loadRepos").addEventListener("click", () => loadRepos().catch(alert));
  $("loadCommits").addEventListener("click", () => loadCommits().catch(alert));
  $("generateGithubReport").addEventListener("click", () => generateGithubReport().catch(alert));
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action).catch(alert));
  });
}

bind();
loadGithubSession().catch(() => {});
load().catch((err) => {
  $("network").textContent = err.message;
});
