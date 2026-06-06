const { handleError, send } = require("../../lib/shared");
const { githubHeaders } = require("../../lib/githubAuth");

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const owner = url.searchParams.get("owner");
    const repo = url.searchParams.get("repo");
    if (!owner || !repo) throw new Error("owner and repo are required");

    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=20`, {
      headers: githubHeaders(req)
    });
    const commits = await response.json();
    if (!response.ok) throw new Error(commits.message || "GitHub request failed");

    send(res, 200, commits.map((commit) => ({
      sha: commit.sha,
      message: commit.commit?.message || "",
      author: {
        name: commit.commit?.author?.name || ""
      }
    })));
  } catch (error) {
    handleError(res, error);
  }
};
