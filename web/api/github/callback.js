const { baseUrl, parseCookies } = require("./_auth");
const { send } = require("../_shared");

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, baseUrl(req));
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expectedState = parseCookies(req).gh_state;
    if (!code || !state || !expectedState || state !== expectedState) throw new Error("Invalid GitHub OAuth state");

    const redirectUri = process.env.GITHUB_REDIRECT_URI || `${baseUrl(req)}/api/github/callback`;
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "user-agent": "contribution-chain-web"
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri
      })
    });
    const body = await response.json();
    if (!response.ok || body.error || !body.access_token) {
      throw new Error(body.error_description || body.error || "GitHub token exchange failed");
    }

    res.statusCode = 302;
    res.setHeader("set-cookie", [
      "gh_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      `gh_token=${encodeURIComponent(body.access_token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
    ]);
    res.setHeader("location", "/?github=connected");
    res.end();
  } catch (error) {
    send(res, 500, { error: error.message || String(error) });
  }
};
