# Local Test Network

This setup uses Hardhat as the local chain and the lightweight CLI explorer as the local block explorer.

## 1) Start the chain

```bash
cd contracts
poc chain
```

Keep this terminal open. The chain lives in memory and resets when the process stops.

## 2) Deploy the registry

Open another terminal:

```bash
cd contracts
poc deploy-local
```

Copy the deployed contract address.
The deploy script also prints the `ContributionBadge` address.

## 3) Configure the CLI

```bash
cd ../cli
poc config \
  --rpc-url "http://127.0.0.1:8545" \
  --contract-address "<LOCAL_CONTRACT_ADDRESS>" \
  --badge-contract-address "<LOCAL_BADGE_ADDRESS>" \
  --repo-id 1 \
  --policy-id "score-v1" \
  --private-key-env "POC_PRIVATE_KEY"
```

Hardhat account #0 private key:

```bash
export POC_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## 4) Run the flow

Create the repo with two local approvers:

```bash
poc create-repo \
  --name "demo-repo-local" \
  --approvers "0x70997970C51812dc3A010C7d01b50e0d17dc79C8,0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" \
  --threshold 2
```

Generate and submit a report:

```bash
poc scan \
  --from <oldCommit> \
  --to <newCommit> \
  --generated-at "2026-05-08T10:00:00.000Z" \
  --out report.json
poc hash --file report.json
poc submit --commit <newCommitSha40Hex> --uri "local://report.json" --file report.json
```

The generated `report.json` is an in-toto Statement v1 attestation. The contribution metrics live under `predicate`, and the attested git commit range lives under `subject`. The `--generated-at` option is useful for demos because it keeps the report hash stable across repeated scans of the same commit range.

For real IPFS storage, create a Pinata API key, export the JWT, and upload before submit:

```bash
export PINATA_JWT="<YOUR_PINATA_JWT>"
poc ipfs-upload --file report.json --name "report-1.json"
```

Or pin and submit in one step:

```bash
poc submit \
  --commit <newCommitSha40Hex> \
  --upload-ipfs \
  --ipfs-name "report-1.json" \
  --file report.json
```

In that mode the contract `uri` field receives the resulting `ipfs://CID` value instead of `local://report.json`.

Attest from the two approver accounts:

```bash
POC_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  poc attest --report-id 1

POC_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a \
  poc attest --report-id 1
```

Finalize:

```bash
poc finalize --report-id 1
```

Read the minted soulbound badge:

```bash
poc badge --token-id 1
```

Verify the local file against the on-chain hash:

```bash
poc verify-chain --report-id 1 --file report.json
```

Optional repo owner commands:

```bash
poc add-approver --repo-id 1 --approver <address>
poc set-threshold --repo-id 1 --threshold 2
poc remove-approver --repo-id 1 --approver <address>
```

## 5) Open the explorer

```bash
cd cli
poc explorer
```

Open:

```text
http://127.0.0.1:8787
```

The explorer shows the local chain id, latest blocks, transactions, registry events, and report finalization state.

## 6) Open the product dashboard

```bash
cd cli
poc web
```

Open:

```text
http://127.0.0.1:8788
```

The dashboard provides wallet connect, report status, repo actions, attestation/finalization, report verification, badge lookup, GitHub repo/commit selection, and an event indexer view.
