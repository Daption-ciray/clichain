const { handleError, send } = require("../_shared");
const { githubHeaders, githubToken } = require("./_auth");

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const owner = url.searchParams.get("owner");
    const token = githubToken(req);

    const endpoint = token && !owner
      ? "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member"
      : `https://api.github.com/users/${encodeURIComponent(owner || "")}/repos?per_page=50&sort=updated`;
    if (!token && !owner) throw new Error("owner is required");

    const response = await fetch(endpoint, { headers: githubHeaders(req) });
    const repos = await response.json();
    if (!response.ok) throw new Error(repos.message || "GitHub request failed");

    send(res, 200, repos.map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner?.login || owner,
      private: Boolean(repo.private),
      defaultBranch: repo.default_branch
    })));
  } catch (error) {
    handleError(res, error);
  }
};
