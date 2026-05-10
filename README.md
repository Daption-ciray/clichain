# Contribution Chain MVP

This repository contains an MVP implementation of a contribution integrity system:

- `contracts/`: Solidity smart contracts for report registry, threshold attestations, and soulbound contribution badges.
- `cli/`: TypeScript CLI that scans git data, creates in-toto contribution attestations, hashes reports, uploads reports to IPFS, and sends on-chain transactions.
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
   - `cd ../cli && poc init`

## Local chain + explorer

For local development, use Hardhat as the private test network and the built-in lightweight explorer:

- Chain: `cd contracts && poc chain`
- Deploy: `cd contracts && poc deploy-local`
- Explorer: `cd cli && poc explorer`
- Product dashboard: `cd cli && poc web`

Local walkthrough: `docs/LOCAL.md`

## Deploy to Polygon Amoy

1. Configure deploy env:
   - `cd contracts && cp .env.example .env`
   - Fill `POLYGON_AMOY_RPC_URL` and `DEPLOYER_PRIVATE_KEY`
2. Deploy:
   - `poc deploy-amoy`
3. Set CLI config:
   - `cd ../cli`
   - `poc config --rpc-url "<RPC_URL>" --contract-address "<REGISTRY_ADDRESS>" --badge-contract-address "<BADGE_ADDRESS>"`

Full walkthrough: `docs/DEMO.md`

## CLI flow

1. `scan` generates `report.json` from git history. Use `--generated-at` for reproducible demo hashes.
2. `report.json` is an in-toto Statement v1 document with contribution metrics in `predicate`.
3. `hash` computes deterministic hash of `report.json`.
4. `ipfs-upload` can pin the report file to IPFS through Pinata.
5. `submit` sends report metadata to contract. Use `--upload-ipfs` to pin the report and submit its `ipfs://CID` URI in one step.
6. Approvers call `attest`.
7. Any user can call `finalize` once threshold is met; the registry mints a non-transferable contribution badge if the badge contract is linked.
8. `badge` reads the soulbound badge metadata from chain.
9. `verify-chain` compares the local `report.json` hash with the on-chain `reportHash`.

Repo owners can manage authorization with `add-approver`, `remove-approver`, and `set-threshold`.

The product dashboard includes wallet connect, report verification, GitHub repo/commit selection, and a lightweight event indexer API:

```bash
poc web
```

Open `http://127.0.0.1:8788`.

For real IPFS uploads, create a Pinata API key and export its JWT:

```bash
export PINATA_JWT="<YOUR_PINATA_JWT>"
```
