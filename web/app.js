let account = "";
let config = null;
let githubSession = { authenticated: false, oauthConfigured: false };

const $ = (id) => document.getElementById(id);
const POLYGON_CHAIN_ID = "0x89";
const contributionStatus = ["Pending", "Approved"];
const short = (value) => value ? `${String(value).slice(0, 10)}...${String(value).slice(-8)}` : "";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));

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

function detailPanel(details) {
  if (!details?.length) return "";
  return `<div class="row-details">${details.map(({ label, value, copy = true }) => `
    <div class="detail-line">
      <span>${escapeHtml(label)}</span>
      <code>${escapeHtml(value)}</code>
      ${copy ? `<button class="copy-button" type="button" data-copy="${escapeHtml(value)}">Copy</button>` : ""}
    </div>
  `).join("")}</div>`;
}

function table(headers, rows) {
  if (!rows.length) return '<p class="empty">No data yet.</p>';
  return `<div class="table-scroll"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row, index) => {
      const cells = Array.isArray(row) ? row : row.cells;
      const details = Array.isArray(row) ? [] : row.details;
      return `<tr class="data-row" data-detail-row="${index}">${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>
        ${details?.length ? `<tr class="detail-row" data-detail="${index}"><td colspan="${headers.length}">${detailPanel(details)}</td></tr>` : ""}`;
    })
    .join("")}</tbody></table></div>`;
}

function bindTableDetails(root = document) {
  root.querySelectorAll("[data-detail-row]").forEach((row) => {
    row.addEventListener("click", () => {
      const detail = row.parentElement.querySelector(`[data-detail="${row.dataset.detailRow}"]`);
      if (!detail) return;
      detail.classList.toggle("open");
    });
  });
  root.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const value = button.dataset.copy;
      await navigator.clipboard.writeText(value);
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1200);
    });
  });
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
    state.projects.map((project) => ({
      cells: [
        project.id,
        escapeHtml(project.name),
        `<code title="${escapeHtml(project.owner)}">${escapeHtml(short(project.owner))}</code>`,
        `<code title="${escapeHtml(project.supervisor)}">${escapeHtml(short(project.supervisor))}</code>`,
        project.memberCount,
        project.taskCount,
      ],
      details: [
        { label: "Project ID", value: project.id, copy: false },
        { label: "Name", value: project.name },
        { label: "Owner", value: project.owner },
        { label: "Supervisor", value: project.supervisor },
        { label: "Members", value: project.memberCount, copy: false },
        { label: "Tasks", value: project.taskCount, copy: false },
      ]
    }))
  );

  $("taskCount").textContent = `${state.tasks.length} tasks`;
  $("tasksTable").innerHTML = table(
    ["ID", "Project", "Title", "Category", "Weight"],
    state.tasks.map((task) => ({
      cells: [
        task.id,
        task.projectId,
        escapeHtml(task.title),
        escapeHtml(task.category),
        task.weight,
      ],
      details: [
        { label: "Task ID", value: task.id, copy: false },
        { label: "Project ID", value: task.projectId, copy: false },
        { label: "Title", value: task.title },
        { label: "Category", value: task.category },
        { label: "Weight", value: task.weight, copy: false },
      ]
    }))
  );

  $("contributionCount").textContent = `${state.contributions.length} contributions`;
  $("contributionsTable").innerHTML = table(
    ["ID", "Project", "Task", "Contributor", "Status", "Evidence", "Badge"],
    state.contributions.map((contribution) => ({
      cells: [
        contribution.id,
        contribution.projectId,
        contribution.taskId,
        `<code title="${escapeHtml(contribution.contributor)}">${escapeHtml(short(contribution.contributor))}</code>`,
        `<span class="pill ${contribution.status === 1 ? "finalized" : ""}">${contributionStatus[contribution.status] || contribution.status}</span>`,
        `<code title="${escapeHtml(contribution.evidenceUri || contribution.evidenceHash)}">${escapeHtml(short(contribution.evidenceUri || contribution.evidenceHash))}</code>`,
        contribution.badgeTokenId || "-",
      ],
      details: [
        { label: "Contribution ID", value: contribution.id, copy: false },
        { label: "Project ID", value: contribution.projectId, copy: false },
        { label: "Task ID", value: contribution.taskId, copy: false },
        { label: "Contributor", value: contribution.contributor },
        { label: "Status", value: contributionStatus[contribution.status] || contribution.status, copy: false },
        { label: "Evidence URI", value: contribution.evidenceUri || "" },
        { label: "Evidence Hash", value: contribution.evidenceHash || "" },
        { label: "Badge Token ID", value: contribution.badgeTokenId || "-", copy: false },
      ]
    }))
  );

  $("eventCount").textContent = `${state.events.length} events`;
  $("events").innerHTML = table(
    ["Block", "Event", "Tx"],
    state.events.slice(-12).reverse().map((event) => ({
      cells: [
        event.blockNumber,
        event.name,
        `<code title="${escapeHtml(event.txHash)}">${escapeHtml(short(event.txHash))}</code>`,
      ],
      details: [
        { label: "Block", value: event.blockNumber, copy: false },
        { label: "Event", value: event.name, copy: false },
        { label: "Transaction Hash", value: event.txHash },
      ]
    }))
  );
  bindTableDetails(document);
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
  await validateAction(method, args);
  const tx = await api("/api/calldata", {
    method: "POST",
    body: JSON.stringify({ method, args }),
  });
  const txParams = { from: account, to: tx.to, data: tx.data };
  try {
    const estimatedGas = BigInt(await window.ethereum.request({
      method: "eth_estimateGas",
      params: [txParams],
    }));
    const gasWithBuffer = estimatedGas + (estimatedGas / 3n);
    if (gasWithBuffer > 1_500_000n) {
      throw new Error(`Gas estimate is unexpectedly high: ${gasWithBuffer.toString()}`);
    }
    txParams.gas = `0x${gasWithBuffer.toString(16)}`;
  } catch (error) {
    throw new Error(`Gas estimate failed. Check project/task IDs, membership and duplicate evidence URI. ${error.message || error}`);
  }
  return window.ethereum.request({
    method: "eth_sendTransaction",
    params: [txParams],
  });
}

async function validateAction(method, args) {
  if (!["submitContribution", "approveContribution", "createTask", "addMember"].includes(method)) return;
  const state = await api("/api/indexer");

  if (method === "createTask" || method === "addMember") {
    const projectId = Number(args[0]);
    if (!state.projects.some((project) => project.id === projectId)) {
      throw new Error(`Project ${projectId} does not exist. Create the project first or use an existing Project ID.`);
    }
  }

  if (method === "submitContribution") {
    const [projectId, taskId, evidenceUri] = args;
    const project = state.projects.find((item) => item.id === Number(projectId));
    if (!project) throw new Error(`Project ${projectId} does not exist.`);
    const task = state.tasks.find((item) => item.id === Number(taskId));
    if (!task) throw new Error(`Task ${taskId} does not exist.`);
    if (task.projectId !== Number(projectId)) {
      throw new Error(`Task ${taskId} belongs to Project ${task.projectId}, not Project ${projectId}. Use Project ${task.projectId} or create a task under Project ${projectId}.`);
    }
    if (!String(evidenceUri || "").trim()) throw new Error("Evidence URI is empty. Generate Evidence first.");
    const duplicate = state.contributions.find((item) => item.evidenceUri === evidenceUri);
    if (duplicate) {
      throw new Error(`This Evidence URI was already submitted as Contribution ${duplicate.id}. Generate a new IPFS evidence URI first.`);
    }
  }

  if (method === "approveContribution") {
    const contributionId = Number(args[0]);
    const contribution = state.contributions.find((item) => item.id === contributionId);
    if (!contribution) throw new Error(`Contribution ${contributionId} does not exist.`);
    if (contribution.status === 1) throw new Error(`Contribution ${contributionId} is already approved.`);
  }
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
    $("disconnectGithub").hidden = false;
    await loadRepos();
    return;
  }
  $("connectGithub").textContent = "Connect GitHub";
  $("disconnectGithub").hidden = true;
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

async function disconnectGithub() {
  githubSession = await api("/api/github/me", { method: "DELETE" });
  $("connectGithub").textContent = "Connect GitHub";
  $("disconnectGithub").hidden = true;
  $("repoList").innerHTML = "";
  $("commitList").innerHTML = "";
  $("githubOutput").innerHTML = `<pre>${escapeHtml(JSON.stringify({ disconnected: true }, null, 2))}</pre>`;
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
  $("evidenceUri").value = result.evidenceUri;
  $("githubOutput").innerHTML = `<pre>${escapeHtml(JSON.stringify({
    reportHash: result.hash,
    evidenceUri: result.evidenceUri,
    ipfsCid: result.pin?.cid || null,
    pinata: result.pin ? "pinned" : "not configured; using GitHub URI fallback",
    note: "Submit Contribution writes the URI reference to Polygon; the full report stays off-chain."
  }, null, 2))}</pre>`;
}

function bind() {
  bindLandingInteractions();
  $("refresh").addEventListener("click", load);
  $("connect").addEventListener("click", () => connectWallet().catch(alert));
  $("connectGithub").addEventListener("click", () => connectGithub().catch(alert));
  $("disconnectGithub").addEventListener("click", () => disconnectGithub().catch(alert));
  $("loadProfile").addEventListener("click", () => loadProfile().catch((err) => $("profileResult").textContent = err.message));
  $("loadBadge").addEventListener("click", () => loadBadge().catch((err) => $("badgeResult").textContent = err.message));
  $("loadRepos").addEventListener("click", () => loadRepos().catch(alert));
  $("loadCommits").addEventListener("click", () => loadCommits().catch(alert));
  $("generateGithubReport").addEventListener("click", () => generateGithubReport().catch(alert));
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action).catch(alert));
  });
}

function bindLandingInteractions() {
  const mobileToggle = $("mobileToggle");
  const siteNav = $("siteNav");
  if (mobileToggle && siteNav) {
    mobileToggle.addEventListener("click", () => siteNav.classList.toggle("open"));
    siteNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => siteNav.classList.remove("open"));
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("in-view"));
  }

  const terminal = $("terminalText");
  if (terminal && !terminal.dataset.typed) {
    terminal.dataset.typed = "true";
    const text = terminal.textContent;
    terminal.textContent = "";
    let index = 0;
    const tick = () => {
      terminal.textContent = text.slice(0, index);
      index += 1;
      if (index <= text.length) window.setTimeout(tick, 18);
    };
    tick();
  }
}

bind();
loadGithubSession().catch(() => {});
load().catch((err) => {
  $("network").textContent = err.message;
});
