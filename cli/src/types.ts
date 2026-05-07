export type PocConfig = {
  rpcUrl: string;
  contractAddress: string;
  repoId: number;
  policyId: string;
  privateKeyEnv: string;
};

export type ContributorMetric = {
  identity: {
    gitAuthorEmail: string;
  };
  metrics: {
    commits: number;
    filesChanged: number;
    additions: number;
    deletions: number;
    netLines: number;
  };
};

export type ContributionReport = {
  schemaVersion: "1.0";
  project: {
    repoUrl: string;
    repoId: number;
    defaultBranch: string;
  };
  range: {
    from: string;
    to: string;
    generatedAt: string;
  };
  policy: {
    id: string;
    notes: string;
  };
  contributors: ContributorMetric[];
};
