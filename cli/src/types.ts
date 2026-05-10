export type PocConfig = {
  rpcUrl: string;
  contractAddress: string;
  badgeContractAddress?: string;
  repoId: number;
  policyId: string;
  privateKeyEnv: string;
};

export type ChainBadge = {
  tokenId: number;
  owner: string;
  reportId: string;
  repoId: string;
  reportHash: string;
  uri: string;
  reportUri: string;
  metadataUri: string;
  mintedAt: number;
  locked: boolean;
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

export type ContributionPredicate = {
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

export type ResourceDescriptor = {
  name: string;
  uri?: string;
  digest: Record<string, string>;
};

export type ContributionReport = {
  _type: "https://in-toto.io/Statement/v1";
  subject: ResourceDescriptor[];
  predicateType: "https://akadaltr.dev/attestation/contribution-report/v1";
  predicate: ContributionPredicate;
};
