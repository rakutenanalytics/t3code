# Security baseline review

Each change to a security file requires a new entry naming that exact path and the reason/evidence. CI compares added entries against the PR base. Keep source-line review in the PR; this log does not authorize widened capabilities.

## 2026-10-28 — v0.1.2 packaged client contexts

- baseline-update: security/artifact-hosts.json — Reviews six changed client literal contexts from CI run 40617280141 and their identical-byte CLI path mirrors. Auth-return validation, prompt URLs, hosted pairing, download navigation and inert project schema/help text retain previously accepted behavior; only minified context changed. The actual DMG and ZIP app.asar match SHA-256 e3e9079bee17557a62f9cc1911456f7e58e4da410e2a84559083e95561811c80, packaged policy/identity verification passes, and scanning then reports zero unapproved literals. No scanner relaxation or runtime network grant. New informational host pele.run occurs only in third-party license metadata.

## 2026-10-28 — reject commented YAML document separators

- baseline-update: security/network-baseline.json — Reviews the dependency lockfile parser separator regex change to recognize space/tab-separated trailing comments. Multiple documents are rejected before package extraction, preventing later-document dependencies from being omitted from release-age scanning. The existing regression now covers bare and commented separators; no host, dependency or capability changes.

## 2026-10-28 — preserve the reviewed pnpm hook in install stages

- baseline-update: security/network-baseline.json — Desktop, Windows sidecar and CLI staging copy the exact reviewed root `.pnpmfile.cjs` before their frozen installs. This preserves the lockfile's hook checksum rather than deleting it or resolving new dependencies; CLI cleanup removes the hook after installation. Root hook contents, locked resolutions and lifecycle permissions are unchanged.

## 2026-10-28 — separate online age checks from baseline drift

- baseline-update: security/network-baseline.json — Reviews an explicit non-writing `--online --age-only` scanner mode and its CLI regression test. The advisory job checks changed registry release ages against the PR base without treating reviewed manifest/lockfile drift as an age failure. The required full scanner still enforces baseline drift, hooks, archives and exact build grants. Young/unknown releases remain unresolved.

## 2026-10-28 — sync PR creation and regression checks

- baseline-update: security/network-baseline.json — Refreshes the PR workflow fingerprint after adding the reviewed age-floor and affected policy regression tests, including the diagram browser case, to CI. Action pins, install policy and runtime network permissions stay unchanged.

## 2026-10-27 — v0.1.2 security review

- baseline-update: security/egress-inventory.md — Records Muse metadata lookup gating for both normal and fresh requests, attachment transfers before Send to selected authenticated environments, diagram URL filtering and escaped/image-function rejection before mount in SVG/MathML attributes, mobile native icon loaders constrained to fixed bundled assets or the development asset server, Electron installer mirror/remote-checksum build-host inputs and separate fallback checksum verification, explicit Windows signing authority and thread CLI bearer sessions. Thread CLI rejects a dead recorded process before token issuance; local runtime state and owner-level auth storage remain trusted. The CLI does not inherit provider thread ceilings; provider shell sandboxing is outside the existing threat model. Repository identity URLs strip HTTP(S) userinfo and query tokens before crossing environments; explicit clone retries preserve the selected host and use target-side Git credentials.
- baseline-update: security/allowlist.json — Reviews scripts/lib/windows-jsign.ts specifically: configured Windows signing uses the existing Microsoft RFC3161 timestamp endpoint and configured Azure signing service. Safe macOS-only builds do not invoke it; no runtime capability grant.

- baseline-update: security/dependency-baseline.json — Reviews the v0.1.2 lockfile/manifests, local react-native-screens archive and NSIS patch, preserving the 4320-minute age floor, strict trust checks and exact lifecycle grants. All 120 changed registry releases meet the floor; no new package exceptions. The compiler's renamed exact build grant retains its reviewed own-bin version rewrite.
- baseline-update: security/stage-lock-baseline.json — Updates deterministic desktop and CLI projections from the reviewed root lockfile; staged installs remain frozen and version checked.
- baseline-update: security/network-baseline.json — Records the reviewed upstream runtime/build diff and preserved fork gates, including Muse metadata denial, diagram resource filtering, HTTP repository identity redaction, dead-process CLI rejection and checksum-verified Electron fallback. Scanner changes accept age-qualified registry upgrades and leave unknown/young ages unresolved; source and build permissions remain diff reviewed.
- baseline-update: security/last-approved-upstream — Records the reviewed v0.1.2 target 044f07257c9684ae4543bd1e1ebf9c394e9e3830 and sync count 1.

## 2026-10-27 — desktop preload no longer bundles Effect

- baseline-update: security/network-baseline.json — Refreshes whole-file fingerprints for `apps/desktop/src/preload.ts`, `apps/desktop/vite.config.ts` and the preload bundle verifier with its test. The preload reads the baked managed policy constant directly instead of importing Effect, the verifier now runs the bundle inside an Electron-like function wrapper and the desktop build runs it. No network statement, host or capability grant changes; the baked policy still denies `t3Connect`.

## 2026-10-23 — version-stable gated literal fingerprints

- baseline-update: security/artifact-hosts.json — Gated-literal context now normalizes the embedded build version (`N.N.N-safe.N` → `0.0.0-safe.*`) before hashing, so releases no longer break the ledger. Replaces the per-version `runtime-*.js` `https://t3.codes/download` entries (safe.0 and safe.1, DMG and CLI forms) with one normalized entry per form (S6, user-initiated navigation only, no automatic request). Recomputed from the real extracted safe.0 and safe.1 bundles: both hash to the same value, each scan passes with 0 unapproved, and no other ledger entry contains a version in its context. Any other change near a literal still changes the fingerprint. No runtime capability change.
- baseline-update: security/network-baseline.json — Refreshes whole-file fingerprints for the artifact host review and its test (version normalization and focused regression cases). Dependency inputs unchanged; no capability grants change.

## 2026-10-23 — release-version literal context

- baseline-update: security/artifact-hosts.json — Adds the DMG and CLI-mirror gated contexts for the `runtime-*.js` chunk's `https://t3.codes/download` anchor (S6, user-initiated navigation only, no automatic request). The 80-character context embeds the build version, so release 0.1.0-safe.1 hashes differently from the 0.1.0-safe.0 entry; code is otherwise identical (verified by diffing contexts). Release run 39910806296 failed on it while PR run 39909638426 (safe.0) passed. No runtime capability change.

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

## 2026-10-26 — opt-in use of the official T3 home

- baseline-update: security/network-baseline.json — Refreshes fingerprints of files that gain the opt-in home choice (`t3safe home use-official`, saved in the safe Electron profile, off by default): DesktopEnvironment, DesktopStatePaths, DesktopBackendPool (clearer "another instance" dialog), serverOwnership (message only), bin.ts (offline `home` command), the t3safe wrapper (doctor reports the effective home), packages/shared/package.json (new `./homeChoice` subpath export) and the affected tests. The default home stays ~/.t3-safe and app-identity.json is unchanged; no host, URL or network statement added.
