# Architecture

## Core principle

The chain does not calculate contribution quality.  
It anchors immutable evidence of a deterministic report:

- Git range + policy -> `report.json`
- Canonical serialization -> `reportHash`
- On-chain storage of `reportHash`, `commitSha`, `uri`, and attestations

## Security goals

- Contributors cannot silently change an already submitted report.
- A single actor cannot finalize reports without enough approver attestations.
- Duplicate report hash submissions are blocked per repository.

## Trust boundary

- Off-chain: report generation and scoring policy execution.
- On-chain: immutability, ordering, threshold attestation, and finalization state.
