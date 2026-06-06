const { PROOF_CONTRACT_ADDRESS, handleError, proofAbi, readJson, send } = require("../lib/shared");
const { ethers } = require("ethers");

const allowed = new Set([
  "createProject",
  "addMember",
  "createTask",
  "submitContribution",
  "approveContribution"
]);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  try {
    if (!PROOF_CONTRACT_ADDRESS) throw new Error("PROOF_CONTRACT_ADDRESS is not configured");
    const body = await readJson(req);
    if (!allowed.has(body.method)) throw new Error("Unsupported contract method");
    const iface = new ethers.Interface(proofAbi);
    const data = iface.encodeFunctionData(body.method, body.args || []);
    send(res, 200, { to: PROOF_CONTRACT_ADDRESS, data });
  } catch (error) {
    handleError(res, error);
  }
};
