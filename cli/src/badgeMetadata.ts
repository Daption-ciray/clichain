import fs from "node:fs";
import path from "node:path";
import { ChainReport } from "./chain";

export type BadgeMetadata = {
  name: string;
  description: string;
  external_url?: string;
  image?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    reportId: number;
    repoId: string;
    reportHash: string;
    reportUri: string;
    contributor: string;
    policyId: string;
  };
};

export function buildBadgeMetadata(
  reportId: number,
  report: ChainReport,
  image?: string,
  externalUrl?: string
): BadgeMetadata {
  return {
    name: `Proof of Contribution #${reportId}`,
    description:
      "Soulbound badge proving that a contribution report was finalized through threshold-based on-chain attestation.",
    ...(image ? { image } : {}),
    ...(externalUrl ? { external_url: externalUrl } : {}),
    attributes: [
      { trait_type: "Report ID", value: reportId },
      { trait_type: "Repo ID", value: report.repoId },
      { trait_type: "Status", value: report.status === 1 ? "Finalized" : String(report.status) },
      { trait_type: "Attestations", value: report.attestationCount },
      { trait_type: "Policy", value: report.policyId },
    ],
    properties: {
      reportId,
      repoId: report.repoId,
      reportHash: report.reportHash,
      reportUri: report.uri,
      contributor: report.contributor,
      policyId: report.policyId,
    },
  };
}

export function writeBadgeMetadata(filePath: string, metadata: BadgeMetadata): void {
  const target = path.resolve(process.cwd(), filePath);
  fs.writeFileSync(target, JSON.stringify(metadata, null, 2));
}
