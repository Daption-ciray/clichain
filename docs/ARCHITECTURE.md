# Architecture

## Core principle

The chain does not calculate contribution quality.  
It anchors immutable evidence of an in-toto Statement:

- Git range + policy -> in-toto `report.json`
- Canonical serialization -> `reportHash`
- Optional Pinata upload -> `ipfs://CID`
- On-chain storage of `reportHash`, `commitSha`, `uri`, and attestations
- Finalization -> non-transferable contribution badge minted to the on-chain contributor wallet

`report.json` uses the standard in-toto Statement envelope:

- `_type`: `https://in-toto.io/Statement/v1`
- `subject`: git commit range being attested
- `predicateType`: `https://akadaltr.dev/attestation/contribution-report/v1`
- `predicate`: project metadata, policy, and contribution metrics

## Security goals

- Contributors cannot silently change an already submitted report.
- A single actor cannot finalize reports without enough approver attestations.
- Duplicate report hash submissions are blocked per repository.
- Repo approval thresholds cannot be set above the number of unique approvers.
- Removing an approver cannot silently reduce a repo below its active threshold.

## Trust boundary

- Off-chain: report generation, scoring policy execution, and IPFS pinning.
- On-chain: immutability, ordering, threshold attestation, and finalization state.

The IPFS CID points to the report file, while the smart contract stores the canonical `reportHash`. Verification does not trust the gateway response by itself; the downloaded or local report must still hash to the on-chain `reportHash`.

## Soulbound badge

`ContributionBadge` is a minimal non-transferable badge contract. When `ContributionRegistry.finalize(reportId)` succeeds and a badge contract is linked, the registry mints one badge to the report contributor address. The badge stores `reportId`, `repoId`, `reportHash`, `uri`, and `mintedAt`.

The badge exposes `ownerOf`, `balanceOf`, `tokenURI`, and `locked`. Transfer and approval functions revert, so the badge cannot be sold or moved to another wallet.

`finalizeWithBadgeUri(reportId, badgeUri)` can be used when a separate NFT metadata JSON has been generated and pinned to IPFS. In that case `tokenURI` returns the metadata URI while the badge record still preserves the original report URI.

## Product dashboard and backend

`poc web` starts a small local product server on `http://127.0.0.1:8788`.

It serves:

- wallet-connected dashboard actions through MetaMask transaction calldata
- report verifier API using the same canonical hash algorithm as the CLI
- GitHub repo and commit selection endpoints
- GitHub-based contribution report generation for public repositories
- lightweight event indexing for repos, reports, attestations, finalization, and badge issuance

This is the first product-facing layer. It is intentionally local-first; a production deployment would move this server behind hosted auth, persistent storage, rate limiting, and HTTPS.

## Reproducibility note

The report hash is deterministic for a given `report.json` because hashing uses canonical JSON. Report generation includes `predicate.range.generatedAt`; repeated scans will produce different hashes unless the CLI is given a fixed `--generated-at` timestamp.
