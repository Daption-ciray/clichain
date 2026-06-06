const { REGISTRY_ADDRESS, handleError, readJson, registryAbi, send } = require("./_shared");
const { ethers } = require("ethers");

const allowed = new Set([
  "createRepo",
  "attest",
  "finalize",
  "finalizeWithBadgeUri",
  "submitReport"
]);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  try {
    const body = await readJson(req);
    if (!allowed.has(body.method)) throw new Error("Unsupported contract method");
    const iface = new ethers.Interface(registryAbi);
    const data = iface.encodeFunctionData(body.method, body.args || []);
    send(res, 200, { to: REGISTRY_ADDRESS, data });
  } catch (error) {
    handleError(res, error);
  }
};
