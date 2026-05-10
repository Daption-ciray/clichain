#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { Command } from "commander";
import {
  addApproverOnChain,
  attestOnChain,
  createRepoOnChain,
  finalizeOnChain,
  finalizeWithBadgeUriOnChain,
  getBadgeOnChain,
  getReportOnChain,
  removeApproverOnChain,
  setThresholdOnChain,
  submitReportOnChain,
} from "./chain";
import { buildBadgeMetadata, writeBadgeMetadata } from "./badgeMetadata";
import { initConfig, loadConfig, updateConfig } from "./config";
import { computeReportHash } from "./hash";
import { uploadFileToIpfs } from "./ipfs";
import { generateReport, readReport, writeReport } from "./report";

const program = new Command();

function parsePositiveInteger(value: string, label: string): number {
  if (!/^\d+$/.test(String(value))) {
    throw new Error(`${label} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function parseThreshold(value: string): number {
  const parsed = parsePositiveInteger(value, "threshold");
  if (parsed > 255) throw new Error("threshold must be at most 255");
  return parsed;
}

function parseIsoDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new Error("generated-at must be an ISO-8601 UTC timestamp, e.g. 2026-05-08T10:00:00.000Z");
  }
  return value;
}

function gitHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function repoRoot(): string {
  return path.resolve(__dirname, "../..");
}

function hardhatBin(): string {
  return path.resolve(repoRoot(), "contracts/node_modules/.bin/hardhat");
}

function runLongLived(command: string, args: string[], cwd: string): void {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}

program.name("poc").description("Contribution registry CLI").version("0.1.0");

program
  .command("init")
  .description("Create .pocrc.json in current directory")
  .option("--force", "overwrite existing config")
  .action((opts) => {
    const conf = initConfig(Boolean(opts.force));
    console.log("Config created:", conf);
  });

program
  .command("config")
  .description("Update CLI config fields")
  .option("--rpc-url <url>", "set rpc url")
  .option("--contract-address <address>", "set deployed contract address")
  .option("--badge-contract-address <address>", "set deployed badge contract address")
  .option("--repo-id <id>", "set repo id")
  .option("--policy-id <policy>", "set policy id")
  .option("--private-key-env <env>", "set private key env var name")
  .action((opts) => {
    const next = updateConfig({
      rpcUrl: opts.rpcUrl,
      contractAddress: opts.contractAddress,
      badgeContractAddress: opts.badgeContractAddress,
      repoId: opts.repoId ? parsePositiveInteger(opts.repoId, "repo-id") : undefined,
      policyId: opts.policyId,
      privateKeyEnv: opts.privateKeyEnv,
    });
    console.log("Config updated:", next);
  });

program
  .command("create-repo")
  .description("Create on-chain repo registry and print repoId")
  .requiredOption("--name <name>", "repository display name")
  .requiredOption("--approvers <csv>", "comma-separated approver addresses")
  .requiredOption("--threshold <number>", "threshold M for M-of-N")
  .action(async (opts) => {
    const conf = loadConfig();
    const approvers = String(opts.approvers)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const threshold = parseThreshold(opts.threshold);
    const result = await createRepoOnChain(conf, opts.name, approvers, threshold);
    console.log("Repo created. Tx:", result.txHash);
    if (result.repoId !== undefined) {
      console.log("repoId:", result.repoId);
      console.log(`Tip: set it via \`poc config --repo-id ${result.repoId}\``);
    }
  });

program
  .command("scan")
  .description("Generate report.json from git range")
  .requiredOption("--from <commit>", "start commit (exclusive)")
  .requiredOption("--to <commit>", "end commit (inclusive)")
  .option("--out <file>", "output file", "report.json")
  .option("--generated-at <iso>", "override report generation timestamp for reproducible demos")
  .action((opts) => {
    const conf = loadConfig();
    const generatedAt = opts.generatedAt ? parseIsoDate(opts.generatedAt) : undefined;
    const report = generateReport(opts.from, opts.to, conf.repoId, conf.policyId, generatedAt);
    writeReport(opts.out, report);
    console.log(`Report written to ${opts.out}`);
  });

program
  .command("hash")
  .description("Compute deterministic hash for report")
  .option("--file <file>", "report file", "report.json")
  .action((opts) => {
    const report = readReport(opts.file);
    console.log(computeReportHash(report));
  });

program
  .command("submit")
  .description("Submit report hash to chain")
  .requiredOption("--commit <sha>", "git commit sha (40 hex chars)")
  .option("--uri <uri>", "ipfs://... or https://... report location")
  .option("--upload-ipfs", "upload report file to IPFS through Pinata before submitting")
  .option("--ipfs-name <name>", "name to use for the pinned IPFS file")
  .option("--file <file>", "report file", "report.json")
  .action(async (opts) => {
    const conf = loadConfig();
    const report = readReport(opts.file);
    const reportHash = computeReportHash(report);
    let uri = opts.uri as string | undefined;
    if (opts.uploadIpfs) {
      const upload = await uploadFileToIpfs(opts.file, opts.ipfsName);
      uri = upload.uri;
      console.log("IPFS CID:", upload.cid);
      console.log("IPFS URI:", upload.uri);
      console.log("Gateway:", upload.gatewayUrl);
    }
    if (!uri) {
      throw new Error("submit requires either --uri or --upload-ipfs");
    }
    const txHash = await submitReportOnChain(conf, opts.commit, reportHash, uri);
    console.log("Submitted. Tx:", txHash);
  });

program
  .command("ipfs-upload")
  .description("Upload a report file to IPFS through Pinata")
  .option("--file <file>", "report file", "report.json")
  .option("--name <name>", "name to use for the pinned IPFS file")
  .action(async (opts) => {
    const upload = await uploadFileToIpfs(opts.file, opts.name);
    console.log("CID:", upload.cid);
    console.log("URI:", upload.uri);
    console.log("Gateway:", upload.gatewayUrl);
    console.log("Size:", upload.size);
    console.log("Timestamp:", upload.timestamp);
    console.log("Duplicate:", upload.isDuplicate);
  });

program
  .command("attest")
  .description("Attest to a report on chain")
  .requiredOption("--report-id <id>", "report id")
  .action(async (opts) => {
    const conf = loadConfig();
    const txHash = await attestOnChain(conf, parsePositiveInteger(opts.reportId, "report-id"));
    console.log("Attested. Tx:", txHash);
  });

program
  .command("finalize")
  .description("Finalize report after threshold attestations")
  .requiredOption("--report-id <id>", "report id")
  .option("--badge-uri <uri>", "NFT metadata URI for the soulbound badge")
  .action(async (opts) => {
    const conf = loadConfig();
    const reportId = parsePositiveInteger(opts.reportId, "report-id");
    const txHash = opts.badgeUri
      ? await finalizeWithBadgeUriOnChain(conf, reportId, opts.badgeUri)
      : await finalizeOnChain(conf, reportId);
    console.log("Finalized. Tx:", txHash);
  });

program
  .command("add-approver")
  .description("Add an authorized approver to a repo")
  .requiredOption("--approver <address>", "approver wallet address")
  .option("--repo-id <id>", "repo id; defaults to config repoId")
  .action(async (opts) => {
    const conf = loadConfig();
    const repoId = opts.repoId ? parsePositiveInteger(opts.repoId, "repo-id") : conf.repoId;
    const txHash = await addApproverOnChain(conf, repoId, opts.approver);
    console.log("Approver added. Tx:", txHash);
  });

program
  .command("remove-approver")
  .description("Remove an authorized approver from a repo")
  .requiredOption("--approver <address>", "approver wallet address")
  .option("--repo-id <id>", "repo id; defaults to config repoId")
  .action(async (opts) => {
    const conf = loadConfig();
    const repoId = opts.repoId ? parsePositiveInteger(opts.repoId, "repo-id") : conf.repoId;
    const txHash = await removeApproverOnChain(conf, repoId, opts.approver);
    console.log("Approver removed. Tx:", txHash);
  });

program
  .command("set-threshold")
  .description("Set the required attestation threshold for a repo")
  .requiredOption("--threshold <number>", "threshold M for M-of-N")
  .option("--repo-id <id>", "repo id; defaults to config repoId")
  .action(async (opts) => {
    const conf = loadConfig();
    const repoId = opts.repoId ? parsePositiveInteger(opts.repoId, "repo-id") : conf.repoId;
    const txHash = await setThresholdOnChain(conf, repoId, parseThreshold(opts.threshold));
    console.log("Threshold updated. Tx:", txHash);
  });

program
  .command("verify")
  .description("Verify report hash against expected hash")
  .requiredOption("--expected-hash <hex>", "on-chain report hash")
  .option("--file <file>", "report file", "report.json")
  .action((opts) => {
    const report = readReport(opts.file);
    const actual = computeReportHash(report).toLowerCase();
    const expected = String(opts.expectedHash).toLowerCase();
    const ok = actual === expected;
    if (ok) {
      console.log("OK - hash matches");
    } else {
      console.log("FAIL - hash mismatch");
      console.log("expected:", expected);
      console.log("actual:  ", actual);
      process.exitCode = 1;
    }
  });

program
  .command("badge")
  .description("Read a soulbound contribution badge from chain")
  .requiredOption("--token-id <id>", "badge token id")
  .action(async (opts) => {
    const conf = loadConfig();
    const badge = await getBadgeOnChain(conf, parsePositiveInteger(opts.tokenId, "token-id"));
    console.log("tokenId:", badge.tokenId);
    console.log("owner:", badge.owner);
    console.log("reportId:", badge.reportId);
    console.log("repoId:", badge.repoId);
    console.log("reportHash:", badge.reportHash);
    console.log("uri:", badge.uri);
    console.log("reportUri:", badge.reportUri);
    console.log("metadataUri:", badge.metadataUri);
    console.log("mintedAt:", badge.mintedAt);
    console.log("locked:", badge.locked);
  });

program
  .command("badge-metadata")
  .description("Generate NFT-standard metadata JSON for a finalized report badge")
  .requiredOption("--report-id <id>", "on-chain report id")
  .option("--out <file>", "output metadata JSON file", "badge-metadata.json")
  .option("--image <uri>", "optional NFT image URI")
  .option("--external-url <url>", "optional external URL")
  .action(async (opts) => {
    const conf = loadConfig();
    const reportId = parsePositiveInteger(opts.reportId, "report-id");
    const report = await getReportOnChain(conf, reportId);
    const metadata = buildBadgeMetadata(reportId, report, opts.image, opts.externalUrl);
    writeBadgeMetadata(opts.out, metadata);
    console.log(`Badge metadata written to ${opts.out}`);
  });

program
  .command("verify-chain")
  .description("Verify report file hash against on-chain report hash")
  .requiredOption("--report-id <id>", "on-chain report id")
  .option("--file <file>", "report file", "report.json")
  .action(async (opts) => {
    const conf = loadConfig();
    const report = readReport(opts.file);
    const actual = computeReportHash(report).toLowerCase();
    const reportId = parsePositiveInteger(opts.reportId, "report-id");
    const chainReport = await getReportOnChain(conf, reportId);
    const expected = chainReport.reportHash.toLowerCase();
    const ok = actual === expected;

    console.log("reportId:", reportId);
    console.log("status:", chainReport.status);
    console.log("attestations:", chainReport.attestationCount);
    console.log("uri:", chainReport.uri);
    if (ok) {
      console.log("OK - file hash matches on-chain reportHash");
    } else {
      console.log("FAIL - file hash mismatch");
      console.log("on-chain:", expected);
      console.log("file:    ", actual);
      process.exitCode = 1;
    }
  });

program
  .command("watch")
  .description("Watch git HEAD and notify on changes")
  .option("--interval <seconds>", "poll interval in seconds", "30")
  .action((opts) => {
    const intervalMs = parsePositiveInteger(opts.interval, "interval") * 1000;
    let lastHead = gitHead();
    console.log("Watching HEAD from:", lastHead);

    setInterval(() => {
      const current = gitHead();
      if (current !== lastHead) {
        console.log(`[${new Date().toISOString()}] HEAD changed: ${lastHead} -> ${current}`);
        lastHead = current;
      }
    }, intervalMs);
  });

program
  .command("explorer")
  .description("Start the local chain explorer")
  .action(() => {
    const script = path.resolve(__dirname, "../scripts/local-explorer.js");
    runLongLived(process.execPath, [script], path.resolve(repoRoot(), "cli"));
  });

program
  .command("web")
  .description("Start the product dashboard with wallet, verifier, GitHub, and indexer APIs")
  .action(() => {
    const script = path.resolve(__dirname, "../scripts/web-server.js");
    runLongLived(process.execPath, [script], path.resolve(repoRoot(), "cli"));
  });

program
  .command("chain")
  .description("Start the local Hardhat chain")
  .action(() => {
    runLongLived(hardhatBin(), ["node"], path.resolve(repoRoot(), "contracts"));
  });

program
  .command("deploy-local")
  .description("Deploy registry and badge contracts to the local chain")
  .action(() => {
    runLongLived(
      hardhatBin(),
      ["run", "scripts/deploy.ts", "--network", "localhost"],
      path.resolve(repoRoot(), "contracts")
    );
  });

program
  .command("deploy-amoy")
  .description("Deploy registry and badge contracts to Polygon Amoy")
  .action(() => {
    runLongLived(
      hardhatBin(),
      ["run", "scripts/deploy.ts", "--network", "amoy"],
      path.resolve(repoRoot(), "contracts")
    );
  });

program
  .command("contracts-test")
  .description("Run smart contract tests")
  .action(() => {
    runLongLived(hardhatBin(), ["test"], path.resolve(repoRoot(), "contracts"));
  });

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof Error) console.error(err.message);
  else console.error(err);
  if (fs.existsSync(".pocrc.json")) {
    console.error("Loaded config from .pocrc.json");
  }
  process.exit(1);
});
