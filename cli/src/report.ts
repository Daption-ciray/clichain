import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { ContributionReport } from "./types";

type Stat = {
  commits: number;
  filesChanged: number;
  additions: number;
  deletions: number;
};

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
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

export function generateReport(from: string, to: string, repoId: number, policyId: string): ContributionReport {
  const repoUrl = run("git config --get remote.origin.url || echo local");
  const defaultBranch = run("git rev-parse --abbrev-ref HEAD");

  const commitsRaw = run(`git log --format="%ae|%H" ${from}..${to}`);
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
    const numstat = run(`git show --numstat --format="" ${sha}`);
    if (numstat) {
      const rows = numstat.split("\n");
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

  const contributors = [...statByAuthor.entries()].map(([email, s]) => ({
    identity: { gitAuthorEmail: email },
    metrics: {
      commits: s.commits,
      filesChanged: s.filesChanged,
      additions: s.additions,
      deletions: s.deletions,
      netLines: s.additions - s.deletions,
    },
  }));

  return {
    schemaVersion: "1.0",
    project: {
      repoUrl,
      repoId,
      defaultBranch,
    },
    range: {
      from,
      to,
      generatedAt: new Date().toISOString(),
    },
    policy: {
      id: policyId,
      notes: "Deterministic git-stat based report. On-chain stores hash only.",
    },
    contributors,
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
