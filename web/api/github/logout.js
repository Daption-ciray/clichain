module.exports = async function handler(req, res) {
  res.statusCode = 302;
  res.setHeader("set-cookie", "gh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
  res.setHeader("location", "/?github=logout");
  res.end();
};
