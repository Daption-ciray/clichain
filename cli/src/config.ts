import fs from "node:fs";
import path from "node:path";
import { PocConfig } from "./types";

export const CONFIG_FILE = ".pocrc.json";

const defaultConfig: PocConfig = {
  rpcUrl: "https://polygon-amoy.infura.io/v3/YOUR_KEY",
  contractAddress: "0x0000000000000000000000000000000000000000",
  repoId: 1,
  policyId: "score-v1",
  privateKeyEnv: "POC_PRIVATE_KEY",
};

export function initConfig(force = false): PocConfig {
  const file = path.resolve(process.cwd(), CONFIG_FILE);
  if (fs.existsSync(file) && !force) {
    throw new Error(`${CONFIG_FILE} already exists. Use --force to overwrite.`);
  }
  fs.writeFileSync(file, JSON.stringify(defaultConfig, null, 2));
  return defaultConfig;
}

export function loadConfig(): PocConfig {
  const file = path.resolve(process.cwd(), CONFIG_FILE);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${CONFIG_FILE}. Run: poc init`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as PocConfig;
}

export function saveConfig(config: PocConfig): void {
  const file = path.resolve(process.cwd(), CONFIG_FILE);
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
}

export function updateConfig(partial: Partial<PocConfig>): PocConfig {
  const current = loadConfig();
  const definedPartial = Object.fromEntries(
    Object.entries(partial).filter(([, value]) => value !== undefined)
  ) as Partial<PocConfig>;
  const next: PocConfig = { ...current, ...definedPartial };
  saveConfig(next);
  return next;
}
