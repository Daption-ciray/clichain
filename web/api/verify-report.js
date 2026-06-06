const { handleError, readJson, reportHash, send } = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  try {
    const body = await readJson(req);
    const hash = reportHash(body.report);
    const expectedHash = body.expectedHash || "";
    send(res, 200, {
      hash,
      expectedHash,
      matches: expectedHash ? hash.toLowerCase() === expectedHash.toLowerCase() : null
    });
  } catch (error) {
    handleError(res, error);
  }
};
