function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").map((part) => {
    const index = part.indexOf("=");
    if (index === -1) return ["", ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function githubToken(req) {
  return parseCookies(req).gh_token || "";
}

function githubHeaders(req) {
  const token = githubToken(req);
  return {
    "accept": "application/vnd.github+json",
    "user-agent": "contribution-chain-web",
    ...(token ? { "authorization": `Bearer ${token}` } : {})
  };
}

function oauthConfigured() {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

function baseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
}

module.exports = {
  baseUrl,
  githubHeaders,
  githubToken,
  oauthConfigured,
  parseCookies
};
