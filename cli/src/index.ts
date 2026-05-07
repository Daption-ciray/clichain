#!/usr/bin/env node
import fs from "node:fs";
import { execSync } from "node:child_process";
import { Command } from "commander";
import {
  attestOnChain,
  createRepoOnChain,
  finalizeOnChain,
  submitReportOnChain,
} from "./chain";
import { initConfig, loadConfig, updateConfig } from "./config";
import { computeReportHash } from "./hash";
import { generateReport, readReport, writeReport } from "./report";

const program = new Command();

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
  .option("--repo-id <id>", "set repo id")
  .option("--policy-id <policy>", "set policy id")
  .option("--private-key-env <env>", "set private key env var name")
  .action((opts) => {
    const next = updateConfig({
      rpcUrl: opts.rpcUrl,
      contractAddress: opts.contractAddress,
      repoId: opts.repoId ? Number(opts.repoId) : undefined,
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
    const threshold = Number(opts.threshold);
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
  .action((opts) => {
    const conf = loadConfig();
    const report = generateReport(opts.from, opts.to, conf.repoId, conf.policyId);
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
  .requiredOption("--uri <uri>", "ipfs://... or https://... report location")
  .option("--file <file>", "report file", "report.json")
  .action(async (opts) => {
    const conf = loadConfig();
    const report = readReport(opts.file);
    const reportHash = computeReportHash(report);
    const txHash = await submitReportOnChain(conf, opts.commit, reportHash, opts.uri);
    console.log("Submitted. Tx:", txHash);
  });

program
  .command("attest")
  .description("Attest to a report on chain")
  .requiredOption("--report-id <id>", "report id")
  .action(async (opts) => {
    const conf = loadConfig();
    const txHash = await attestOnChain(conf, Number(opts.reportId));
    console.log("Attested. Tx:", txHash);
  });

program
  .command("finalize")
  .description("Finalize report after threshold attestations")
  .requiredOption("--report-id <id>", "report id")
  .action(async (opts) => {
    const conf = loadConfig();
    const txHash = await finalizeOnChain(conf, Number(opts.reportId));
    console.log("Finalized. Tx:", txHash);
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
  .command("watch")
  .description("Watch git HEAD and notify on changes")
  .option("--interval <seconds>", "poll interval in seconds", "30")
  .action((opts) => {
    const intervalMs = Number(opts.interval) * 1000;
    let lastHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    console.log("Watching HEAD from:", lastHead);

    setInterval(() => {
      const current = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
      if (current !== lastHead) {
        console.log(`[${new Date().toISOString()}] HEAD changed: ${lastHead} -> ${current}`);
        lastHead = current;
      }
    }, intervalMs);
  });

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof Error) console.error(err.message);
  else console.error(err);
  if (fs.existsSync(".pocrc.json")) {
    console.error("Loaded config from .pocrc.json");
  }
  process.exit(1);
});
