const { githubHeaders, githubToken, oauthConfigured } = require("./_auth");
const { handleError, send } = require("../_shared");

module.exports = async function handler(req, res) {
  try {
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
