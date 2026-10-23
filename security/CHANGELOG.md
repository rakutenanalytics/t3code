# Security baseline review

Each change to a security file requires a new entry naming that exact path and the reason/evidence. CI compares added entries against the PR base. Keep source-line review in the PR; this log does not authorize widened capabilities.

## 2026-10-23 — provider SDK trust and accepted CI literals

- baseline-update: security/artifact-hosts.json — Trusts telemetry only in listed disk-backed Cursor/Statsig SDK directories. Accepts 25 DMG and 15 stable CLI source/client T3 contexts from real CI extraction, traced to S2-S8 in 11-gated-literals.md. Navigation is explicitly maintainer-accepted as user-initiated, with no automatic request. CLI source recovered without execution matches the original CI report SHA-256; its staged policy is verified. New hosts and changed contexts still fail. No runtime capability change.
- baseline-update: security/network-baseline.json — Refreshes scanner, CLI policy verification, approved regression fixtures and stable CLI staging workflow fingerprints. Dependency inputs are unchanged.

## 2026-10-23 — tiered artifact trust

- baseline-update: security/artifact-hosts.json — Replaces blocking unknown-host approvals with informational seenHosts and an explicit small telemetry denylist. All other destinations remain trusted by default. Ledger fingerprints now bind host, normalized artifact filename and local literal context, rather than whole hashed chunks. Real CI DMG/CLI review is recorded in 11-gated-literals.md outside the repository; reachable T3 links remain unapproved.
- baseline-update: security/network-baseline.json — Refreshes fingerprints for the tiered scanner, approved regression cases and removal of temporary PR report-only wiring. Reports upload on failures; denied literals remain hard failures. No runtime capability changes.

## 2026-10-23 — gated artifact literal ledger

- baseline-update: security/artifact-hosts.json — Adds an empty gated-literal ledger keyed by forbidden host, exact artifact-relative path and whole-file SHA-256 with a required review note. Writing requires --accept-gated-literals and packaged policy verification. No host or literal is approved from the provisional local snapshot.
- baseline-update: security/network-baseline.json — Refreshes complete-file fingerprints for the ledger review, explicit writer, report-only CLI and focused regression cases. No runtime capability grants change.

## 2026-10-23 — bounded artifact host diagnostics

- baseline-update: security/network-baseline.json — Refreshes complete-file fingerprints for artifact host grouping, forbidden-domain checks, bounded desktop smoke diagnostics and their focused regression fixtures. Source inventory entries do not approve artifact hosts. security/artifact-hosts.json remains unchanged pending review.

## 2026-10-22 — formatted baseline output and packaged policy verification

- baseline-update: security/network-baseline.json — Formats the generated inventory with the repository formatter and refreshes whole-file fingerprints for the baseline writer, dependency report writer, desktop smoke command and formatter regression fixture. The packaged-policy fix accepts the emitted server chunk and static web backtick strings; negative fixtures still reject missing policies. No host, URL or capability grants added.

## 2026-10-22 — exact pnpm package exceptions

- baseline-update: security/dependency-exceptions.json — Records eight exact, fingerprint-bound SAFE tarball reviews for the existing upstream lockfile. Seven missing-provenance exceptions and one young Uniwind release are supported by 08-package-review.md; original reviewer objections and parent resolutions remain in that evidence. No dependency, script or build grant changes.
- baseline-update: security/dependency-baseline.json — Refreshes only the workspace policy hash for seven exact trust exclusions and uniwind@1.13.0's exact age exclusion. The 4320-minute floor, strict checks, lockfile, package fingerprints, scripts and lifecycle build permissions remain unchanged.
- baseline-update: security/network-baseline.json — Refreshes pnpm-workspace.yaml's complete-file fingerprint after the reviewed exact policy exceptions. No host, URL, runtime network capability or other source file is added.

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
- baseline-update: security/network-baseline.json — Refreshes the pnpm-workspace.yaml fingerprint after lowering minimumReleaseAge from 10080 to 4320 minutes; no other file or host changed.
- baseline-update: security/dependency-baseline.json — Updates the pnpm-workspace.yaml hash only, after lowering minimumReleaseAge from 10080 to 4320 minutes; no lockfile, script or build-permission change.
- baseline-update: security/network-baseline.json — Refreshes the scripts/build-npm-launcher.test.ts fingerprint after a test-only change comparing the resolved launcher path on macOS; no host or network behavior change.
- baseline-update: security/app-identity.json — New reviewed source for the safe build's app name, bundle id, data directory (~/.t3-safe), home variable (T3SAFE_HOME), URL scheme (t3safe), CLI command (t3safe) and first port (3873); isolates it from official T3 state, ports and commands. No host or capability added.
- baseline-update: security/network-baseline.json — Refreshes fingerprints of files that now read names, paths and ports from appIdentity (desktop, server CLI, service, SSH/WSL scripts, installer, shared URL-scheme helpers), the t3safe wrapper, build scripts and the new identity tests; no new host, URL or network statement.

## 2026-10-23 — isolated identity client chunk

- baseline-update: security/artifact-hosts.json — Gates the two existing app.t3.codes call sites (auth return origin, prompt link fallback) in the renamed client chunk main-*.js for the DMG and CLI bundles. Contexts are unchanged apart from minifier identifier renames (gf→hf, rH→aH) caused by the isolated-identity change; user-initiated navigation only, no new host, URL or request.

## 2026-10-23 — upstream identity out of the CLI bundle

- baseline-update: security/network-baseline.json — Refreshes the packages/shared/package.json fingerprint (new `./upstreamAppIdentity` subpath export) and the scripts/safe/bundle-policy.test.ts fingerprint (import path only). The upstream identity literal moves to its own module so the single-file CLI bundle, which dynamic-imports `appIdentity`, no longer retains it; no host, URL or network statement changed.
