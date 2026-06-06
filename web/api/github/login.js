const crypto = require("crypto");
const { baseUrl, oauthConfigured } = require("../../lib/githubAuth");
const { send } = require("../_shared");

module.exports = async function handler(req, res) {
  if (!oauthConfigured()) {
    return send(res, 500, {
      error: "GitHub OAuth app is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Vercel."
    });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${baseUrl(req)}/api/github/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "repo read:user",
    state
  });

  res.statusCode = 302;
  res.setHeader("set-cookie", `gh_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
  res.setHeader("location", `https://github.com/login/oauth/authorize?${params.toString()}`);
  res.end();
};
