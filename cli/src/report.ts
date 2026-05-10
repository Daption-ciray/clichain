import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ContributionPredicate, ContributionReport } from "./types";

const IN_TOTO_STATEMENT_TYPE = "https://in-toto.io/Statement/v1";
const CONTRIBUTION_PREDICATE_TYPE = "https://akadaltr.dev/attestation/contribution-report/v1";

type Stat = {
  commits: number;
  filesChanged: number;
  additions: number;
  deletions: number;
};

function runGit(args: string[], fallback?: string): string {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw err;
  }
}

function assertSafeGitRef(ref: string, label: string): void {
  if (!/^[0-9A-Za-z._/@:+~^-]+$/.test(ref)) {
    throw new Error(`${label} contains unsupported characters: ${ref}`);
  }
}

function resolveCommit(ref: string, label: string): string {
  assertSafeGitRef(ref, label);
  const sha = runGit(["rev-parse", "--verify", `${ref}^{commit}`]);
  if (!/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error(`${label} did not resolve to a commit: ${ref}`);
  }
  return sha;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted = Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize(obj[key]);
        return acc;
      }, {});
    return sorted;
  }
  return value;
}

export function canonicalJSONString(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function generateReport(
  from: string,
  to: string,
  repoId: number,
  policyId: string,
  generatedAt = new Date().toISOString()
): ContributionReport {
  const fromSha = resolveCommit(from, "--from");
  const toSha = resolveCommit(to, "--to");
  const repoUrl = runGit(["config", "--get", "remote.origin.url"], "local");
  const defaultBranch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);

  const commitsRaw = runGit(["log", "--format=%ae|%H", `${fromSha}..${toSha}`]);
  const lines = commitsRaw ? commitsRaw.split("\n") : [];
  const statByAuthor = new Map<string, Stat>();

  for (const line of lines) {
    const [author, sha] = line.split("|");
    if (!author || !sha) continue;
    const entry = statByAuthor.get(author) ?? {
      commits: 0,
      filesChanged: 0,
      additions: 0,
      deletions: 0,
    };

    entry.commits += 1;
    const numstat = runGit(["show", "--numstat", "--format=", sha]);
    if (numstat) {
      const rows = numstat.split("\n").filter(Boolean);
      entry.filesChanged += rows.length;
      for (const row of rows) {
        const [a, d] = row.split("\t");
        const add = Number.isNaN(Number(a)) ? 0 : Number(a);
        const del = Number.isNaN(Number(d)) ? 0 : Number(d);
        entry.additions += add;
        entry.deletions += del;
      }
    }

    statByAuthor.set(author, entry);
  }

  const contributors = [...statByAuthor.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([email, s]) => ({
    identity: { gitAuthorEmail: email },
    metrics: {
      commits: s.commits,
      filesChanged: s.filesChanged,
      additions: s.additions,
      deletions: s.deletions,
      netLines: s.additions - s.deletions,
    },
  }));

  const predicate: ContributionPredicate = {
    schemaVersion: "1.0",
    project: {
      repoUrl,
      repoId,
      defaultBranch,
    },
    range: {
      from: fromSha,
      to: toSha,
      generatedAt,
    },
    policy: {
      id: policyId,
      notes: "Git-stat based contribution attestation. On-chain stores hash only.",
    },
    contributors,
  };

  return {
    _type: IN_TOTO_STATEMENT_TYPE,
    subject: [
      {
        name: `${repoUrl}#${from}..${to}`,
        uri: repoUrl,
        digest: {
          gitCommitFrom: fromSha,
          gitCommitTo: toSha,
        },
      },
    ],
    predicateType: CONTRIBUTION_PREDICATE_TYPE,
    predicate,
  };
}

export function writeReport(filePath: string, report: ContributionReport): void {
  const target = path.resolve(process.cwd(), filePath);
  fs.writeFileSync(target, JSON.stringify(report, null, 2));
}

export function readReport(filePath: string): ContributionReport {
  const target = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(target, "utf8")) as ContributionReport;
}
