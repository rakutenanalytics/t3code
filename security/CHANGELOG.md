# Security baseline review

Each change to a security file requires a new entry naming that exact path and the reason/evidence. CI compares added entries against the PR base. Keep source-line review in the PR; this log does not authorize widened capabilities.

## 2026-10-22 — CI, installer and scanner audit

- baseline-update: security/network-baseline.json — A5 migrates line hashes to complete-file hashes and readable literal-host/URL inventories; scans generated code, fixtures and configuration. Includes the reviewed app-gate commit 00948e6f9; the migration anchor is not a fresh runtime safety approval.
- baseline-update: security/dependency-baseline.json — A12/A14 records existing npm hooks, patches, vendored mobile archives and all Cargo locks. Root package resolutions and lifecycle grants are unchanged from df41b3bec.
- baseline-update: security/artifact-hosts.json — A5/A7 starts with no additional approved dependency URLs or hosts. Built artifact unknowns block publication until individually reviewed and justified.

- baseline-update: security/stage-lock-baseline.json — A14 hashes deterministic macOS ARM64 desktop and CLI stage lock projections from reviewed root resolutions; CI compares before packaging.
- baseline-update: security/allowlist.json — Extends the denied-capability inventory for the reviewed app commit 00948e6f9 and removes the fork-built npm launcher from excluded surfaces; no host grants added.
- baseline-update: security/dependency-exceptions.json — Existing exact-package review exception ledger from df41b3bec; no blanket package approval added.
- baseline-update: security/egress-inventory.md — Records gates and residual boundaries from app commit 00948e6f9 plus the fork-built npm launcher denial; external legacy installers remain separately documented.
- baseline-update: security/last-approved — Existing initial upstream review anchor; unchanged by this audit patch.
- baseline-update: security/last-approved-upstream — Existing incorporated upstream tag, reviewed SHA and sync count; unchanged by this audit patch.
- baseline-update: security/managed-policy.json — Existing default-denied capability policy permitting only remoteAccess.network; this worker does not modify policy.
- baseline-update: security/threat-model.md — Updates absent/null runtime-policy semantics and four new denied capabilities from app commit 00948e6f9 while retaining native-provider limits.
