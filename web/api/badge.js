const { asNumber, handleError, proof, send } = require("./_shared");

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const tokenId = Number(url.searchParams.get("tokenId") || "1");
    const contract = proof();
    const [owner, tokenURI, locked, data] = await Promise.all([
      contract.ownerOf(tokenId),
      contract.tokenURI(tokenId),
      contract.locked(tokenId),
      contract.badges(tokenId)
    ]);

    send(res, 200, {
      tokenId,
      owner,
      tokenURI,
      locked,
      contributionId: asNumber(data.contributionId),
      projectId: asNumber(data.projectId),
      taskId: asNumber(data.taskId),
      evidenceHash: data.evidenceHash,
      metadataUri: data.metadataUri,
      mintedAt: asNumber(data.mintedAt)
    });
  } catch (error) {
    if (error.code === "CALL_EXCEPTION") {
      return send(res, 404, {
        error: "Badge token is not minted yet.",
        tokenId: Number(new URL(req.url, `https://${req.headers.host || "localhost"}`).searchParams.get("tokenId") || "1")
      });
    }
    handleError(res, error);
  }
};
