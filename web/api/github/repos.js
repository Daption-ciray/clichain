const { handleError, send } = require("../_shared");

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const owner = url.searchParams.get("owner");
    if (!owner) throw new Error("owner is required");

    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=50&sort=updated`, {
      headers: { "user-agent": "contribution-chain-web" }
    });
    const repos = await response.json();
    if (!response.ok) throw new Error(repos.message || "GitHub request failed");

    send(res, 200, repos.map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch
    })));
  } catch (error) {
    handleError(res, error);
  }
};
