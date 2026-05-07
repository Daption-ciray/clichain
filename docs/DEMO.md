# End-to-End Demo (Polygon Amoy)

## 1) Deploy contract

```bash
cd contracts
cp .env.example .env
# Fill POLYGON_AMOY_RPC_URL and DEPLOYER_PRIVATE_KEY
npm install
npm run deploy:amoy
```

Copy deployed address from output:

`ContributionRegistry deployed to: 0x...`

## 2) Configure CLI

```bash
cd ../cli
npm install
npm run build
node dist/index.js init --force
node dist/index.js config \
  --rpc-url "https://polygon-amoy.infura.io/v3/YOUR_KEY" \
  --contract-address "0xDEPLOYED_CONTRACT" \
  --policy-id "score-v1" \
  --private-key-env "POC_PRIVATE_KEY"
```

Set account key used by CLI transactions:

```bash
export POC_PRIVATE_KEY=0x...
```

## 3) Create on-chain repo

```bash
node dist/index.js create-repo \
  --name "demo-repo" \
  --approvers "0xApprover1,0xApprover2,0xApprover3" \
  --threshold 2
```

Set printed repo id:

```bash
node dist/index.js config --repo-id 1
```

## 4) Generate and hash report

```bash
node dist/index.js scan --from <oldCommit> --to <newCommit> --out report.json
node dist/index.js hash --file report.json
```

## 5) Submit + attest + finalize

```bash
node dist/index.js submit --commit <newCommitSha40Hex> --uri "ipfs://<cid>" --file report.json
node dist/index.js attest --report-id 1
```

Attest from another approver wallet (switch `POC_PRIVATE_KEY`), then:

```bash
node dist/index.js finalize --report-id 1
```

## 6) Verify tamper-resistance

1. Keep original hash output from step 4.
2. Edit `report.json` manually.
3. Run:

```bash
node dist/index.js verify --expected-hash <originalHash> --file report.json
```

Expected result: `FAIL - hash mismatch`.
