const { PROOF_CONTRACT_ADDRESS, asNumber, handleError, proof, provider, send } = require("../lib/shared");

module.exports = async function handler(req, res) {
  try {
    const contract = proof();
    const [nextProjectId, nextTaskId, nextContributionId] = await Promise.all([
      contract.nextProjectId(),
      contract.nextTaskId(),
      contract.nextContributionId()
    ]);

    const projects = [];
    for (let id = 1; id < asNumber(nextProjectId); id += 1) {
      const project = await contract.projects(id);
      if (!project.exists) continue;
      projects.push({
        id,
        name: project.name,
        owner: project.owner,
        supervisor: project.supervisor,
        memberCount: asNumber(project.memberCount),
        taskCount: asNumber(project.taskCount)
      });
    }

    const tasks = [];
    for (let id = 1; id < asNumber(nextTaskId); id += 1) {
      const task = await contract.tasks(id);
      if (!task.exists) continue;
      tasks.push({
        id,
        projectId: asNumber(task.projectId),
        title: task.title,
        category: task.category,
        weight: asNumber(task.weight)
      });
    }

    const contributions = [];
    for (let id = 1; id < asNumber(nextContributionId); id += 1) {
      const contribution = await contract.contributions(id);
      if (asNumber(contribution.submittedAt) === 0) continue;
      contributions.push({
        id,
        projectId: asNumber(contribution.projectId),
        taskId: asNumber(contribution.taskId),
        contributor: contribution.contributor,
        evidenceUri: contribution.evidenceUri,
        evidenceHash: contribution.evidenceHash,
        approver: contribution.approver,
        status: asNumber(contribution.status),
        submittedAt: asNumber(contribution.submittedAt),
        approvedAt: asNumber(contribution.approvedAt),
        badgeTokenId: asNumber(contribution.badgeTokenId)
      });
    }

    let events = [];
    try {
      const currentBlock = await provider().getBlockNumber();
      const logs = await provider().getLogs({
        address: PROOF_CONTRACT_ADDRESS,
        fromBlock: Math.max(0, currentBlock - 500),
        toBlock: "latest"
      });
      events = logs.slice(-40).map((log) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return { blockNumber: log.blockNumber, name: parsed.name, txHash: log.transactionHash };
        } catch {
          return { blockNumber: log.blockNumber, name: "Unknown", txHash: log.transactionHash };
        }
      });
    } catch {
      events = [];
    }

    send(res, 200, { projects, tasks, contributions, events });
  } catch (error) {
    handleError(res, error);
  }
};
