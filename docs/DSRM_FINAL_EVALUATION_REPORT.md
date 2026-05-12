# Proof-of-Contribution System

**Final DSRM Evaluation Report**  
**Project:** Smart Contract Supported Proof-of-Contribution and Soulbound Achievement Badge System  
**Students:** Abdullah Gokalp Ciray, Orhan Efe Kocaoglu  
**Base Proposal:** Blockchain-Based Verification of Contribution Ownership in Group Projects  
**Repository:** https://github.com/Daption-ciray/clichain  
**Date:** May 12, 2026

## 1. Executive Summary

This project has reached a public testnet academic demo level. The original DSRM proposal aimed to create a blockchain-supported Proof-of-Contribution system where contribution evidence in group projects can be recorded as immutable, timestamped, and externally verifiable records, and where approved contributors can receive non-transferable Soulbound achievement badges.

The implemented system satisfies the core research claim of the proposal: contribution evidence can be represented as an off-chain report, hashed, recorded on-chain, approved by an authorized role, finalized, verified later against the original report file, and connected to a non-transferable badge.

The final implementation uses:

- Solidity smart contracts for contribution report registry and soulbound badges
- Polygon Amoy public testnet deployment
- TypeScript CLI
- Local web dashboard with wallet connect
- Git-based report generation
- in-toto Statement v1 report format
- Canonical JSON hashing with `keccak256`
- Threshold-based attestation and finalization
- Soulbound badge minting
- Report verification against on-chain hash
- Lightweight backend/indexer API
- GitHub repository integration foundation
- Pinata/IPFS upload support in code

The project does not yet implement the full task/member/project-management platform described in the broad proposal. Instead, it implements the core verification layer at report level, which is the most important blockchain-specific part of the proposal.

## 2. DSRM Alignment

### 2.1 Problem Identification and Motivation

The proposal identified a common problem in group projects: individual contributions are difficult to verify after the project is completed. Informal claims, centralized task boards, or subjective statements are not strong enough when an instructor, supervisor, or external evaluator needs to verify who contributed, when the contribution happened, what evidence supports it, and who approved it.

The implemented system directly addresses this problem by anchoring contribution report hashes on a public blockchain and requiring an authorized attestation process before finalization.

**Status:** Addressed.

### 2.2 Definition of Objectives for a Solution

The proposal defined the following main objectives:

| Objective | Current Status | Evidence |
|---|---:|---|
| Create project records | Implemented as repo records | `createRepo`, Amoy `repoId: 1` |
| Add team members through wallets | Partially implemented | Approver wallet management exists; member model is not separate yet |
| Submit contribution evidence | Implemented at report level | `submitReport`, report hash stored on-chain |
| Approve evidence through authorized users | Implemented | `attest`, threshold-based approver authorization |
| Write approved records to blockchain | Implemented | finalized Amoy report |
| Generate contribution profiles | Partially implemented | contributor metrics are inside `report.json`, no profile UI yet |
| Issue non-transferable Soulbound badges | Implemented | `ContributionBadge`, `locked: true` |

**Status:** Core objectives addressed; broad task/member/profile objectives partially addressed.

### 2.3 Design and Development

The artifact consists of four main layers:

| Layer | Implemented Component |
|---|---|
| Smart contract layer | `ContributionRegistry`, `ContributionBadge` |
| Off-chain evidence layer | Git scan, in-toto `report.json`, canonical hash |
| Storage/reference layer | URI field supports GitHub/IPFS; Pinata upload code exists |
| Interaction layer | CLI and local web dashboard |

The strongest design decision from the proposal was preserved: files are not stored directly on-chain. The blockchain stores compact evidence traces such as `reportHash`, `commitSha`, `uri`, timestamp, approval count, and finalization status.

**Status:** Addressed.

### 2.4 Demonstration

The final academic demo was executed on Polygon Amoy.

**Public testnet contracts:**

| Component | Address |
|---|---|
| ContributionRegistry | `0x1a485444437761c39Bc13598b20C226893DF9F10` |
| ContributionBadge | `0x623ccdb6a8C16F6F8ba9840b51F9E705256F56B1` |

**Demo state:**

| Field | Value |
|---|---|
| Repo ID | `1` |
| Report ID | `1` |
| Badge Token ID | `1` |
| Report Status | `Finalized` |
| Attestations | `1` |
| Badge Owner | `0x9aC8Be516C08f6cB7A638fb07A76E135F5508629` |
| Badge Locked | `true` |
| Report Hash | `0x2ead7402e623729b39076c20777b1c8fa6e6a6fa36b04e2c792c0e3a5af0de95` |
| Report URI | `https://github.com/Daption-ciray/clichain` |

**Transactions:**

| Action | Transaction Hash |
|---|---|
| Submit report | `0xaa89e513669babac69cc83a22b3afd26dd774a24efc8b8b271beaea5cac28b1c` |
| Attest report | `0x7414d470b2a081d64820b978271dd8b5725916e9ad7da478511308718bc25126` |
| Finalize and mint badge | `0x6584b851f6a7167445b3d08175b8e42ef9531e1c95cfc88e127243eda8133bdb` |

**Status:** Addressed with public testnet evidence.

### 2.5 Evaluation

The proposal defined evaluation criteria around authorization, duplicate prevention, immutability, approval, interface flow, and badge non-transferability. The current system has been evaluated through smart contract tests, CLI build checks, public testnet read checks, and tamper-resistance verification.

The detailed evaluation table is provided in Section 3.

**Status:** Addressed for the implemented MVP scope.

### 2.6 Communication

The project deliverables are available as:

- GitHub repository: https://github.com/Daption-ciray/clichain
- Solidity contracts
- CLI commands
- Web dashboard
- DSRM progress/final reports
- Public Amoy contract addresses and transaction hashes
- Test outputs
- Demo evidence

**Status:** Addressed.

## 3. Evaluation Criteria and Tests

### 3.1 Evaluation Summary

| Test Area | Proposal Question | Result | Evidence |
|---|---|---:|---|
| Verifiability | Can a contribution record be traced through contributor, evidence hash/URI, approver, and timestamp? | Pass | Amoy report stores contributor, hash, URI, status, attestation count |
| Immutability | Can an approved contribution record be silently modified later? | Pass | On-chain `reportHash` remains fixed; tampered local report fails verification |
| Authorization | Can only authorized users approve reports? | Pass | Contract test blocks non-approver attestation |
| Approval mechanism | Does approval happen before finalization? | Pass | `finalize` requires threshold attestations |
| Duplicate prevention | Can the same evidence hash be submitted repeatedly? | Pass | Contract test rejects duplicate report hash per repo |
| Soulbound restriction | Can the badge be transferred? | Pass | Contract test verifies transfer revert; Amoy badge reports `locked: true` |
| Interface flow | Can users operate through an interface? | Pass for local prototype | `poc web` dashboard provides wallet connect, verifier, actions, indexer |
| Membership control | Can non-members be blocked? | Partial | Dedicated member model is not implemented; approver authorization exists |
| Task records | Are task IDs/categories/weights on-chain? | Partial | Task data is represented off-chain in report-level metrics, not as on-chain task structs |
| IPFS evidence | Can report/metadata be pinned to IPFS? | Partial | Pinata/IPFS support exists and previously worked; final Amoy demo used GitHub URI because supplied JWT returned 401 |

### 3.2 Smart Contract Test Evidence

Command:

```bash
cd contracts
npm test
```

Observed result:

```text
ContributionRegistry
  ✔ submits report and requires threshold attestations
  ✔ rejects duplicate report hashes per repo
  ✔ blocks non-approver attestation
  ✔ rejects repo approval sets that cannot satisfy the threshold
  ✔ rejects zero-address approvers
  ✔ prevents removing approvers below the active threshold
  ✔ blocks duplicate attestations from the same approver
  ✔ mints a non-transferable contribution badge when a report is finalized
  ✔ can finalize with a separate NFT metadata URI

9 passing
```

Interpretation:

- Authorization is enforced.
- Threshold finalization is enforced.
- Duplicate hashes are rejected.
- Approver threshold edge cases are protected.
- Badge minting works.
- Badge transfer restriction is tested.
- Separate NFT metadata URI is supported.

### 3.3 CLI Build Evidence

Command:

```bash
cd cli
npm run build
```

Observed result:

```text
> contribution-chain-cli@0.1.0 build
> tsc -p tsconfig.json
```

Interpretation:

- TypeScript CLI compiles successfully.
- CLI commands are available through the `poc` binary.

### 3.4 Report Generation Evidence

The demo report was generated from the project Git history.

Commit range:

```text
from: ae0b8a29edce485fc11be0800803d27cef3aa086
to:   f42c1ba6cc04463defd1fa6a8ed35c0a77f2fc8f
```

Command:

```bash
poc scan \
  --from ae0b8a29edce485fc11be0800803d27cef3aa086 \
  --to f42c1ba6cc04463defd1fa6a8ed35c0a77f2fc8f \
  --generated-at 2026-05-12T09:00:00.000Z \
  --out report.json
```

Generated report format:

```text
_type: https://in-toto.io/Statement/v1
predicateType: https://akadaltr.dev/attestation/contribution-report/v1
repoUrl: https://github.com/Daption-ciray/clichain.git
repoId: 1
contributors[0].identity.gitAuthorEmail: abdullahgokalpciray@ogr.iu.edu.tr
contributors[0].metrics.commits: 4
contributors[0].metrics.filesChanged: 62
contributors[0].metrics.additions: 15030
contributors[0].metrics.deletions: 1405
contributors[0].metrics.netLines: 13625
```

Report hash:

```text
0x2ead7402e623729b39076c20777b1c8fa6e6a6fa36b04e2c792c0e3a5af0de95
```

Interpretation:

- The report uses a standard in-toto Statement v1 envelope.
- The report records a Git commit range and contribution metrics.
- The hash is deterministic for this generated report because `--generated-at` was fixed.

### 3.5 Public Testnet Verification Evidence

Command:

```bash
poc verify-chain --report-id 1 --file report.json
```

Observed result:

```text
reportId: 1
status: 1
attestations: 1
uri: https://github.com/Daption-ciray/clichain
OK - file hash matches on-chain reportHash
```

Interpretation:

- The local report file hashes to the same value stored on Polygon Amoy.
- The report has been finalized.
- The report has one valid attestation, matching the threshold used for the easy demo.

### 3.6 Tamper-Resistance Evidence

A copy of `report.json` was modified by changing a metric value. The modified file was verified against the original expected hash.

Command:

```bash
poc verify \
  --expected-hash 0x2ead7402e623729b39076c20777b1c8fa6e6a6fa36b04e2c792c0e3a5af0de95 \
  --file /private/tmp/tampered-report.json
```

Observed result:

```text
FAIL - hash mismatch
expected: 0x2ead7402e623729b39076c20777b1c8fa6e6a6fa36b04e2c792c0e3a5af0de95
actual:   0x72c9ddd102f241ebd103b48e1f1ca1cf4d1bff0acaf497da46f15b0fbd6240a5
```

Interpretation:

- If the off-chain report is changed after submission, the hash no longer matches.
- This demonstrates tamper evidence, which is the main reason for anchoring the report hash on-chain.

### 3.7 Soulbound Badge Evidence

Command:

```bash
poc badge --token-id 1
```

Observed result:

```text
tokenId: 1
owner: 0x9aC8Be516C08f6cB7A638fb07A76E135F5508629
reportId: 1
repoId: 1
reportHash: 0x2ead7402e623729b39076c20777b1c8fa6e6a6fa36b04e2c792c0e3a5af0de95
uri: https://github.com/Daption-ciray/clichain
reportUri: https://github.com/Daption-ciray/clichain
metadataUri: https://github.com/Daption-ciray/clichain
mintedAt: 1778610021
locked: true
```

Interpretation:

- A badge was minted after finalization.
- The badge is linked to the report hash.
- `locked: true` confirms the soulbound state.
- Smart contract tests also verify that transfer functions revert.

## 4. Proposal Coverage Matrix

| Proposal Feature | Current Implementation | Coverage |
|---|---|---:|
| Blockchain-backed contribution evidence | Report hash stored on Polygon Amoy | Full |
| Timestamped records | `submittedAt` stored on-chain | Full |
| External verification | `verify-chain` compares local report hash with on-chain hash | Full |
| Evidence hash / CID model | `reportHash`, `commitSha`, `uri` fields | Full |
| Authorized approval | repo approvers and threshold attestation | Full |
| Duplicate prevention | duplicate report hash rejected per repo | Full |
| Soulbound badge | non-transferable badge contract, `locked` state | Full |
| Web interface | local dashboard with wallet connect and indexer | Partial to Full for demo |
| Project/task records | repo-level record implemented, task-level structs not implemented | Partial |
| Member management | approver management implemented, full member roles not implemented | Partial |
| Contribution profile | metrics in report, no full profile UI | Partial |
| IPFS storage | Pinata integration implemented; final Amoy URI used GitHub due JWT 401 | Partial |

## 5. Limitations and Honest Scope Boundary

The current system is a strong academic MVP, not a full SaaS product.

Remaining limitations:

- Task-level records are not stored as separate on-chain structs.
- Project member management is not fully implemented.
- Contribution profiles are represented in the report but not as a complete profile UI.
- GitHub OAuth is not implemented.
- The dashboard is local-first, not hosted with production authentication.
- The final Amoy demo used a GitHub URI because the supplied Pinata JWT returned `401`.
- The report metrics are Git-stat based and should not be treated as final grading logic.

These limitations do not invalidate the main DSRM objective because the blockchain-specific verification mechanism has been implemented and demonstrated.

## 6. Final Conclusion

The project satisfies the core DSRM proposal claim: approved contribution evidence can be represented off-chain, hashed, recorded on-chain, authorized through approver attestations, finalized, verified later, and connected to a non-transferable achievement badge.

The system now has concrete public testnet evidence on Polygon Amoy, passing smart contract tests, a working CLI, a local product dashboard, and a GitHub repository containing the implementation. The broader task/member/profile platform described in the proposal remains future work, but the central blockchain artifact has been designed, developed, demonstrated, and evaluated successfully.

Therefore, the project can be presented as a completed academic MVP that fulfills the essential DSRM objectives while clearly documenting the remaining product-level extensions.

