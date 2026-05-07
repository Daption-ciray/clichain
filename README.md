# Contribution Chain MVP

This repository contains an MVP implementation of a contribution integrity system:

- `contracts/`: Solidity smart contract for report registry + threshold attestations.
- `cli/`: TypeScript CLI that scans git data, creates deterministic reports, hashes reports, and sends on-chain transactions.
- `schemas/`: report schema definition.
- `docs/`: architecture notes.

## Why this design

The system prevents contribution tampering by anchoring immutable report hashes on-chain and requiring multi-party attestations before finalization.

## Quick start

1. Install dependencies:
   - `cd contracts && npm install`
   - `cd ../cli && npm install`
2. Compile contract:
   - `cd ../contracts && npm run build`
3. Build CLI:
   - `cd ../cli && npm run build`
4. Initialize CLI config:
   - `cd ../cli && npm run dev -- init`

## Deploy to Polygon Amoy

1. Configure deploy env:
   - `cd contracts && cp .env.example .env`
   - Fill `POLYGON_AMOY_RPC_URL` and `DEPLOYER_PRIVATE_KEY`
2. Deploy:
   - `npm run deploy:amoy`
3. Set CLI config:
   - `cd ../cli`
   - `node dist/index.js config --rpc-url "<RPC_URL>" --contract-address "<DEPLOYED_ADDRESS>"`

Full walkthrough: `docs/DEMO.md`

## CLI flow

1. `scan` generates `report.json` from git history.
2. `hash` computes deterministic hash of `report.json`.
3. `submit` sends report metadata to contract.
4. Approvers call `attest`.
5. Any user can call `finalize` once threshold is met.
