const { asNumber, handleError, proof, send } = require("../lib/shared");

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const projectId = Number(url.searchParams.get("projectId") || "1");
    const user = url.searchParams.get("user");
    const category = url.searchParams.get("category");
    if (!user) throw new Error("user is required");

    const contract = proof();
    if (category) {
      const categoryWeight = await contract.categoryWeightOf(projectId, user, category);
      return send(res, 200, { projectId, user, category, categoryWeight: asNumber(categoryWeight) });
    }

    const profile = await contract.viewContributionProfile(projectId, user);
    send(res, 200, {
      projectId,
      user,
      totalWeight: asNumber(profile.totalWeight),
      approvedContributions: asNumber(profile.approvedContributions),
      badgeCount: asNumber(profile.badgeCount)
    });
  } catch (error) {
    handleError(res, error);
  }
};
