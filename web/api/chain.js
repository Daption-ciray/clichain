const { CHAIN_ID, EXPLORER_URL, PROOF_CONTRACT_ADDRESS, handleError, provider, send } = require("./_shared");

module.exports = async function handler(req, res) {
  try {
    const network = await provider().getNetwork();
    const latestBlock = await provider().getBlockNumber();
    send(res, 200, {
      chainId: Number(network.chainId || CHAIN_ID),
      latestBlock,
      contractAddress: PROOF_CONTRACT_ADDRESS,
      proofContractAddress: PROOF_CONTRACT_ADDRESS,
      explorerUrl: EXPLORER_URL,
      mode: "polygon-mainnet"
    });
  } catch (error) {
    handleError(res, error);
  }
};
