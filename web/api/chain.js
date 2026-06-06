const { BADGE_ADDRESS, POLICY_ID, REGISTRY_ADDRESS, REPO_ID, handleError, provider, send } = require("./_shared");

module.exports = async function handler(req, res) {
  try {
    const network = await provider().getNetwork();
    const latestBlock = await provider().getBlockNumber();
    send(res, 200, {
      chainId: Number(network.chainId),
      latestBlock,
      contractAddress: REGISTRY_ADDRESS,
      badgeContractAddress: BADGE_ADDRESS,
      repoId: REPO_ID,
      policyId: POLICY_ID
    });
  } catch (error) {
    handleError(res, error);
  }
};
