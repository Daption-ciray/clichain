const { REGISTRY_ADDRESS, asNumber, handleError, provider, registry, send } = require("./_shared");

module.exports = async function handler(req, res) {
  try {
    const contract = registry();
    const nextReportId = asNumber(await contract.nextReportId());
    const reports = [];

    for (let id = 1; id < nextReportId; id += 1) {
      const report = await contract.reports(id);
      if (asNumber(report.repoId) === 0) continue;
      reports.push({
        id,
        repoId: asNumber(report.repoId),
        contributor: report.contributor,
        commitSha: report.commitSha,
        reportHash: report.reportHash,
        uri: report.uri,
        policyId: report.policyId,
        attestationCount: asNumber(report.attestationCount),
        status: asNumber(report.status),
        submittedAt: asNumber(report.submittedAt)
      });
    }

    let events = [];
    try {
      const currentBlock = await provider().getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100);
      const logs = await provider().getLogs({
        address: REGISTRY_ADDRESS,
        fromBlock,
        toBlock: "latest"
      });
      events = logs.slice(-40).map((log) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return {
            blockNumber: log.blockNumber,
            name: parsed.name,
            txHash: log.transactionHash
          };
        } catch {
          return {
            blockNumber: log.blockNumber,
            name: "Unknown",
            txHash: log.transactionHash
          };
        }
      });
    } catch {
      events = [];
    }

    send(res, 200, { reports, events });
  } catch (error) {
    handleError(res, error);
  }
};
