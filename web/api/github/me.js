const { githubHeaders, githubToken, oauthConfigured } = require("../../lib/githubAuth");
const { handleError, send } = require("../../lib/shared");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "DELETE") {
      res.setHeader("set-cookie", "gh_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure");
      return send(res, 200, { authenticated: false, oauthConfigured: oauthConfigured(), disconnected: true });
    }

    if (!oauthConfigured()) return send(res, 200, { authenticated: false, oauthConfigured: false });
    if (!githubToken(req)) return send(res, 200, { authenticated: false, oauthConfigured: true });

    const response = await fetch("https://api.github.com/user", { headers: githubHeaders(req) });
    const user = await response.json();
    if (!response.ok) throw new Error(user.message || "GitHub user request failed");

    send(res, 200, {
      authenticated: true,
      oauthConfigured: true,
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url
    });
  } catch (error) {
    handleError(res, error);
  }
};
