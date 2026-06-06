const { handleError, readJson, reportHash, send } = require("../_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  try {
    const body = await readJson(req);
    const owner = body.owner;
    const repo = body.repo;
    const from = body.from;
    const to = body.to;
    if (!owner || !repo || !to) throw new Error("owner, repo and to commit are required");

    const compareUrl = from
      ? `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(from)}...${encodeURIComponent(to)}`
      : `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(to)}`;
    const response = await fetch(compareUrl, { headers: { "user-agent": "contribution-chain-web" } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "GitHub request failed");

    const commits = Array.isArray(data.commits) ? data.commits : [data];
    const report = {
      _type: "https://in-toto.io/Statement/v1",
      predicateType: "https://akadaltr.dev/attestation/contribution-report/v1",
      subject: [{
        name: `${owner}/${repo}`,
        digest: {
          gitFrom: from || "",
          gitTo: to
        }
      }],
      predicate: {
        generatedAt: new Date().toISOString(),
        commitCount: commits.length,
        contributors: [...new Set(commits.map((commit) => commit.commit?.author?.name).filter(Boolean))],
        commits: commits.map((commit) => ({
          sha: commit.sha,
          message: (commit.commit?.message || "").split("\n")[0],
          author: commit.commit?.author?.name || ""
        }))
      }
    };

    send(res, 200, { report, hash: reportHash(report) });
  } catch (error) {
    handleError(res, error);
  }
};
