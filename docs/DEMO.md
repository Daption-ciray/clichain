# End-to-End Demo (Polygon Amoy)

## 1) Deploy contract

```bash
cd contracts
cp .env.example .env
# Fill POLYGON_AMOY_RPC_URL and DEPLOYER_PRIVATE_KEY
npm install
poc deploy-amoy
```

Copy deployed addresses from output:

`ContributionRegistry deployed to: 0x...`
`ContributionBadge deployed to: 0x...`

## 2) Configure CLI

```bash
cd ../cli
npm install
npm run build
poc init --force
poc config \
  --rpc-url "https://polygon-amoy.infura.io/v3/YOUR_KEY" \
  --contract-address "0xREGISTRY_CONTRACT" \
  --badge-contract-address "0xBADGE_CONTRACT" \
  --policy-id "score-v1" \
  --private-key-env "POC_PRIVATE_KEY"
```

Set account key used by CLI transactions:

```bash
export POC_PRIVATE_KEY=0x...
```

## 3) Create on-chain repo

```bash
poc create-repo \
  --name "demo-repo" \
  --approvers "0xApprover1,0xApprover2,0xApprover3" \
  --threshold 2
```

Set printed repo id:

```bash
poc config --repo-id 1
```

## 4) Generate and hash report

```bash
poc scan --from <oldCommit> --to <newCommit> --out report.json
poc hash --file report.json
```

## 5) Submit + attest + finalize

```bash
poc submit --commit <newCommitSha40Hex> --upload-ipfs --file report.json
poc attest --report-id 1
```

Attest from another approver wallet (switch `POC_PRIVATE_KEY`), then:

```bash
poc badge-metadata --report-id 1 --out badge-metadata.json
poc ipfs-upload --file badge-metadata.json --name "badge-1-metadata.json"
poc finalize --report-id 1 --badge-uri "ipfs://<metadata-cid>"
poc badge --token-id 1
```

## 6) Verify tamper-resistance

1. Keep original hash output from step 4.
2. Edit `report.json` manually.
3. Run:

```bash
poc verify --expected-hash <originalHash> --file report.json
```

Expected result: `FAIL - hash mismatch`.

## 7) Product dashboard

```bash
poc web
```

Open `http://127.0.0.1:8788`.
