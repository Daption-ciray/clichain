<a id="readme-top"></a>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=230&color=0:0B0D08,55:171B10,100:F7D64A&text=Clichain&fontColor=FFFBEA&fontSize=72&fontAlignY=38&desc=Contribution%20proofs%20for%20software%20teams&descAlignY=58&descSize=18" alt="Clichain banner" />

  <h1>Clichain</h1>

  <p>
    <strong>Turn Git contributions into deterministic reports, IPFS evidence, on-chain attestations, and soulbound badges.</strong>
  </p>

  <p>
    <a href="https://web-weld-five-32.vercel.app"><strong>Live Demo</strong></a>
    ·
    <a href="https://polygonscan.com/address/0x0e0e36378e7B8fE8F7743A10e9e942Bd6A2b04A7"><strong>Polygon Contract</strong></a>
    ·
    <a href="docs/DEMO.md"><strong>Demo Guide</strong></a>
    ·
    <a href="docs/ARCHITECTURE.md"><strong>Architecture</strong></a>
  </p>

  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-F7D64A?style=for-the-badge&labelColor=111111" alt="MIT License" /></a>
    <a href="https://github.com/Daption-ciray/clichain/stargazers"><img src="https://img.shields.io/github/stars/Daption-ciray/clichain?style=for-the-badge&labelColor=111111&color=F7D64A" alt="GitHub stars" /></a>
    <a href="https://github.com/Daption-ciray/clichain/commits/main"><img src="https://img.shields.io/github/last-commit/Daption-ciray/clichain?style=for-the-badge&labelColor=111111&color=2BD576" alt="Last commit" /></a>
    <img src="https://komarev.com/ghpvc/?username=Daption-ciray-clichain&label=Repository%20views&color=F7D64A&style=for-the-badge" alt="Repository views" />
  </p>

  <p>
    <img src="https://img.shields.io/badge/Solidity-0.8.x-363636?style=flat-square&logo=solidity&logoColor=white" alt="Solidity" />
    <img src="https://img.shields.io/badge/TypeScript-CLI-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Hardhat-Contracts-F7D64A?style=flat-square&logo=ethereum&logoColor=111111" alt="Hardhat" />
    <img src="https://img.shields.io/badge/Polygon-Mainnet-8247E5?style=flat-square&logo=polygon&logoColor=white" alt="Polygon" />
    <img src="https://img.shields.io/badge/IPFS-Pinata-65C2CB?style=flat-square&logo=ipfs&logoColor=111111" alt="IPFS Pinata" />
    <img src="https://img.shields.io/badge/Vercel-Dashboard-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
  </p>
</div>

---

## About

**Clichain** is a Contribution Chain MVP for proving the integrity of software work. It turns Git history into a standardized **in-toto Statement v1** report, computes a deterministic hash, optionally stores the report on **IPFS/Pinata**, and anchors the proof on-chain.

Most contribution evidence still lives as screenshots, editable documents, manual claims, or fragile repository snapshots. Clichain makes that evidence verifiable: the file can be re-hashed locally, the hash can be compared with the chain, and authorized approvers can attest before a non-transferable badge is minted.

**What it delivers**

- Deterministic contribution reports from Git commit ranges.
- IPFS-backed report storage with only compact proof data written on-chain.
- Solidity contracts for report registry, threshold attestations, and badge minting.
- A TypeScript CLI for repeatable developer workflows.
- A product dashboard with wallet connect, GitHub repo/commit selection, report verification, and lightweight event indexing.

---

## Features

| Feature | Description |
| --- | --- |
| Git evidence scanner | Generates contribution reports from a selected commit range. |
| in-toto Statement v1 | Normalizes contribution evidence into a supply-chain friendly format. |
| Deterministic hashing | Produces stable report hashes that can be verified locally and on-chain. |
| IPFS report storage | Pins full report files through Pinata while keeping chain writes compact. |
| Threshold attestations | Requires authorized approvers to confirm a report before finalization. |
| Soulbound badges | Mints non-transferable contribution badges with metadata URI support. |
| Product dashboard | Connects wallet, verifies reports, selects GitHub repos/commits, and reads chain state. |
| CLI-first workflow | Supports scan, hash, ipfs-upload, submit, attest, finalize, badge, and verify-chain. |

---

## Tech Stack

<div align="center">

| Layer | Technologies |
| --- | --- |
| Smart Contracts | ![Solidity](https://img.shields.io/badge/Solidity-0.8.x-363636?style=for-the-badge&logo=solidity&logoColor=white) ![Hardhat](https://img.shields.io/badge/Hardhat-F7D64A?style=for-the-badge&logo=ethereum&logoColor=111111) |
| CLI | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-111111?style=for-the-badge&logo=node.js&logoColor=5FA04E) ![Commander](https://img.shields.io/badge/Commander.js-222222?style=for-the-badge) |
| Chain Access | ![Ethers](https://img.shields.io/badge/Ethers.js-2535A0?style=for-the-badge&logo=ethereum&logoColor=white) ![MetaMask](https://img.shields.io/badge/MetaMask-F6851B?style=for-the-badge&logo=metamask&logoColor=white) |
| Storage | ![IPFS](https://img.shields.io/badge/IPFS-65C2CB?style=for-the-badge&logo=ipfs&logoColor=111111) ![Pinata](https://img.shields.io/badge/Pinata-F7D64A?style=for-the-badge) |
| Product UI | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111111) |
| Standards | ![in-toto](https://img.shields.io/badge/in--toto-Statement%20v1-2BD576?style=for-the-badge) ![JSON Schema](https://img.shields.io/badge/JSON%20Schema-111111?style=for-the-badge&logo=json&logoColor=white) |

</div>

---

## Installation

### Prerequisites

- Node.js 18+
- npm
- Git
- MetaMask for dashboard transactions
- A Polygon RPC URL for live chain usage
- Optional: Pinata JWT for IPFS uploads

### Clone the repository

```bash
git clone https://github.com/Daption-ciray/clichain.git
cd clichain
```

### Install packages

```bash
cd contracts
npm install

cd ../cli
npm install

cd ../web
npm install
```

### Configure contracts

```bash
cd contracts
cp .env.example .env
```

Add your own RPC and deployer values to `contracts/.env`.

```env
POLYGON_RPC_URL="https://polygon-rpc.example"
POLYGON_AMOY_RPC_URL="https://amoy-rpc.example"
DEPLOYER_PRIVATE_KEY="0x..."
```

> Never commit private keys, GitHub OAuth secrets, Pinata tokens, or RPC credentials.

---

## Usage

### Run contract checks

```bash
cd contracts
npm test
npm run build
```

### Start a local chain and deploy

```bash
cd cli
npm run dev -- chain
npm run dev -- deploy-local
```

### Generate and verify a contribution report

```bash
cd cli

# 1. Generate an in-toto report from a Git range
npm run dev -- scan \
  --from <BASE_COMMIT_SHA> \
  --to <HEAD_COMMIT_SHA> \
  --out report.json

# 2. Compute the deterministic report hash
npm run dev -- hash --file report.json

# 3. Optional: pin the full report to IPFS through Pinata
export PINATA_JWT="<YOUR_PINATA_JWT>"
npm run dev -- ipfs-upload --file report.json --name clichain-report.json
```

### Submit, attest, finalize, and verify on-chain

```bash
cd cli

# Configure deployed contracts
npm run dev -- config \
  --rpc-url "<RPC_URL>" \
  --contract-address "<REGISTRY_CONTRACT>" \
  --badge-contract-address "<BADGE_CONTRACT>"

# Submit a compact on-chain proof
npm run dev -- submit \
  --commit <HEAD_COMMIT_SHA> \
  --upload-ipfs \
  --file report.json

# Authorized approvers attest the report
npm run dev -- attest --report-id 1

# Finalize after the threshold is met and mint the badge
npm run dev -- finalize \
  --report-id 1 \
  --badge-uri "ipfs://<BADGE_METADATA_CID>"

# Compare local report hash with the on-chain hash
npm run dev -- verify-chain --report-id 1 --file report.json
```

### Open the product dashboard

```bash
cd cli
npm run dev -- web
```

Open `http://127.0.0.1:8788`, connect MetaMask, select a GitHub repository and commit range, generate evidence, verify reports, and inspect indexed on-chain events.

Live deployment:

```text
https://web-weld-five-32.vercel.app
```

Main Polygon contract:

```text
0x0e0e36378e7B8fE8F7743A10e9e942Bd6A2b04A7
```

---

## Project Structure

```text
clichain/
|-- cli/
|   |-- src/
|   |   |-- badgeMetadata.ts
|   |   |-- chain.ts
|   |   |-- config.ts
|   |   |-- hash.ts
|   |   |-- index.ts
|   |   |-- ipfs.ts
|   |   |-- report.ts
|   |   `-- types.ts
|   |-- scripts/
|   |   |-- local-explorer.js
|   |   `-- web-server.js
|   `-- package.json
|-- contracts/
|   |-- contracts/
|   |   |-- ContributionBadge.sol
|   |   |-- ContributionRegistry.sol
|   |   `-- ProofOfContribution.sol
|   |-- scripts/
|   |   |-- deploy.ts
|   |   `-- deploy-proof.ts
|   |-- test/
|   |   |-- ContributionRegistry.ts
|   |   `-- ProofOfContribution.ts
|   `-- hardhat.config.ts
|-- web/
|   |-- api/
|   |   |-- github/
|   |   |-- badge.js
|   |   |-- chain.js
|   |   |-- indexer.js
|   |   |-- profile.js
|   |   `-- verify-report.js
|   |-- lib/
|   |-- app.js
|   |-- index.html
|   `-- styles.css
|-- schemas/
|   `-- report.schema.json
|-- docs/
|   |-- ARCHITECTURE.md
|   |-- DEMO.md
|   |-- LOCAL.md
|   `-- PROJECT_STATUS.md
|-- LICENSE
`-- README.md
```

---

## Roadmap

- [x] Deterministic Git contribution reports
- [x] in-toto Statement v1 report format
- [x] IPFS/Pinata report upload flow
- [x] Solidity registry and threshold attestation contracts
- [x] Soulbound contribution badge minting
- [x] CLI workflow for scan, hash, submit, attest, finalize, badge, and verify-chain
- [x] Product dashboard with wallet connect and report verification
- [x] GitHub repo and commit picker
- [x] Polygon mainnet deployment
- [ ] GitHub App installation flow for organization repositories
- [ ] Richer event indexer with filtering and pagination
- [ ] Badge gallery and profile sharing page
- [ ] Subgraph or hosted indexing backend
- [ ] Security review and gas optimization pass

---

## Screenshots

> Replace these placeholders with real assets under `docs/assets/screenshots/` before the public launch.

| Landing Page | Product Dashboard |
| --- | --- |
| <img src="https://placehold.co/1200x675/0B0D08/F7D64A?text=Clichain+Landing+Page" alt="Clichain landing page screenshot placeholder" /> | <img src="https://placehold.co/1200x675/0B0D08/2BD576?text=Contribution+Dashboard" alt="Clichain dashboard screenshot placeholder" /> |

| CLI Flow | On-chain Verification |
| --- | --- |
| <img src="https://placehold.co/1200x675/111111/F7D64A?text=CLI+Demo+GIF+Slot" alt="CLI demo GIF placeholder" /> | <img src="https://placehold.co/1200x675/111111/65C2CB?text=Polygon+Verification" alt="Polygon verification screenshot placeholder" /> |

### Visual banner direction

- Hero banner: dark terminal grid, yellow proof accent, Git commit graph, and chain anchor line.
- Demo GIF: terminal running `poc scan`, `poc hash`, `poc submit`, `poc attest`, and `poc verify-chain`.
- Dashboard shot: wallet connected, GitHub commit picker open, report verification panel visible.
- Architecture visual: Git history to in-toto report to IPFS CID to Polygon proof to soulbound badge.

### Repository pulse

<div align="center">
  <img height="165" src="https://github-readme-stats.vercel.app/api?username=Daption-ciray&show_icons=true&theme=gruvbox&hide_border=true&title_color=F7D64A&icon_color=F7D64A" alt="GitHub stats" />
  <img height="165" src="https://github-readme-stats.vercel.app/api/top-langs/?username=Daption-ciray&layout=compact&theme=gruvbox&hide_border=true&title_color=F7D64A" alt="Top languages" />
</div>

<p align="center">
  <img src="https://placehold.co/1200x220/0B0D08/F7D64A?text=Contribution+Snake+Animation+Slot" alt="Contribution snake animation placeholder" />
</p>

<details>
  <summary>Contribution snake target</summary>

  Add a GitHub Actions snake workflow later and publish the generated SVG to the `output` branch:

  ```markdown
  <img alt="Contribution snake animation" src="https://raw.githubusercontent.com/Daption-ciray/clichain/output/github-contribution-grid-snake.svg" />
  ```
</details>

---

## Contributing

Contributions are welcome. Keep changes small, tested, and aligned with the proof-of-contribution workflow.

```bash
git checkout -b feature/your-feature

# Contract checks
cd contracts
npm test

# CLI build
cd ../cli
npm run build
```

Before opening a pull request:

- Describe the problem and the implementation clearly.
- Include screenshots or CLI output when the change affects UX.
- Add or update tests for contract behavior.
- Never include private keys, access tokens, RPC secrets, or Pinata credentials.

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

## Contact

- GitHub: [@Daption-ciray](https://github.com/Daption-ciray)
- Repository: [Daption-ciray/clichain](https://github.com/Daption-ciray/clichain)
- Website: [web-weld-five-32.vercel.app](https://web-weld-five-32.vercel.app)
- Contract: [PolygonScan](https://polygonscan.com/address/0x0e0e36378e7B8fE8F7743A10e9e942Bd6A2b04A7)
- Issues: [Open a GitHub issue](https://github.com/Daption-ciray/clichain/issues)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
