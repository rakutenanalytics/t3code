# Security baseline review

Each change to a security file requires a new entry naming that exact path and the reason/evidence. CI compares added entries against the PR base. Keep source-line review in the PR; this log does not authorize widened capabilities.

## 2026-11-13 — private release script downloads

- baseline-update: security/network-baseline.json — Reviews install.sh and t3safe selecting authenticated gh release reads/downloads after gh auth status, plus offline subprocess fixtures covering both transports, explicit tags and checksum rejection. Public curl paths and verification stay unchanged; scripts never extract credentials.
- baseline-update: security/egress-inventory.md — Records gh-owned authenticated release metadata and asset reads for the fixed fork, public fallback and account-associated metadata without workspace payload.
- baseline-update: security/threat-model.md — Records script authentication selection, gh-owned credentials and failure behavior while preserving checksum/signature checks and GitHub release trust.

## 2026-11-13 — private repository updater bridge

- baseline-update: security/threat-model.md — Reviews gh-sourced public/private release reads, child-only removal of inherited token overrides, bounded credential lookup, public fallback, fixed API credential destinations and full downloads. Preserves baked/admin denials and certificate-pinned installation; records remaining packaged validation.
- baseline-update: security/egress-inventory.md — Records stored-login lookup and gh refresh semantics, account-associated metadata, credential-free CDN redirects and local Squirrel delivery. No workspace payload or destination expansion.
- baseline-update: security/artifact-hosts.json — Updates the public-only updater description to include authenticated private reads with the same API/CDN destinations. Denylist, accepted contexts and seen hosts are unchanged; packaged validation remains in CI.
- baseline-update: security/network-baseline.json — Reviews the desktop updater, composition, credential lookup, isolated-session guard and focused fake-only tests. The PR policy workflow runs the focused updater suites. Desktop typecheck and fake-only tests cover public fallback, policy denial, reserved lookup, token refresh, static errors and restricted Authorization. No dependency or runtime capability changes.

## 2026-11-13 — security maintenance tooling

- baseline-update: security/alert-ledger.json — Adds the dated 2026-11-11 inventory and review groups as baseline triage, with all dependency and worker fixes still required. No local remediation evidence or human risk acceptance is recorded in this tooling layer. New, changed and expired findings require a fresh agent audit.
- baseline-update: security/network-baseline.json — Reviews weekly Dependabot version-update configuration and enabling the existing secret-free PR checks for the stacked security tooling branch. Actions remain pinned, permissions stay read-only, and dependency versions, runtime code and release/signing workflows are unchanged.

## 2026-11-13 — signing requirement verification syntax

- baseline-update: security/network-baseline.json — Reviews the release signer verifying the leaf pin with a bare requirement expression, since the previous "designated =>" form is rejected by codesign --test-requirement. Only the sign-macos.cjs source fingerprint changes; the pinned certificate, signing requirement, runner trust policy, triggers and network grants remain unchanged.

## 2026-11-12 — maintainer-dispatched releases

- baseline-update: security/egress-inventory.md — Records explicit maintainer dispatch on main as the only release trigger. Merges and tag pushes start no release build; publication destinations and payloads are unchanged.
- baseline-update: security/network-baseline.json — Reviews the release workflow removing all push triggers and tag-event handling, and restricting planning to refs/heads/main. Retains main-tip, monotonic-version, published-release and explicit-tag retry checks, plus the already-tagged skip when no tag is supplied. Signing, updater policy and other workflows are unchanged.

## 2026-11-12 — release signing keychain lookup

- baseline-update: security/network-baseline.json — Reviews the release importer adding its ephemeral signing keychain to the user search list while preserving existing entries, then requiring a valid code-signing identity and a successful binary sign/verify probe before export. The five isolated command-fake regressions run in PR checks and never invoke real trust commands. Only these three source fingerprints change; certificate pin, PKCS#12 encoding, runner trust policy, release triggers and runtime network grants remain unchanged.

## 2026-11-11 — provider PATH discovery ordering

- baseline-update: security/network-baseline.json — Reviews the desktop backend waiting for existing bounded shell discovery before spawning, plus a focused regression using a synthetic PATH. Managed provider telemetry denials still copy and sanitize the environment. Only two source fingerprints change; literal hosts, URLs, dependencies, runtime capabilities and signing remain unchanged.

## 2026-11-10 — v0.1.7 packaged host contexts

- baseline-update: security/artifact-hosts.json — Rebuilds final-head desktop/client and single-file CLI inputs, including installed production dependency text. Reviews six DMG client contexts reported by CI, the local privacy-link variant caused by a clipped chunk suffix, and thirteen CLI source/client contexts that would fail the later scan. These are inert schema/help/label strings, URL construction or user-initiated navigation with no automatic request; baked analytics/Connect denials remain verified. Records six informational dependency hosts, including the conditional Slack MCP workspace-validation POST as intentional provider behavior, not dormant catalogue text. Local inventory matches CI's 299 hosts; native DMG/SEA validation remains required in CI. No denylist, provider trust prefix or runtime capability changes.

## 2026-11-10 — triage policy recovery

- baseline-update: security/egress-inventory.md — Corrects the stale triage row to name the enforced remoteContent gate at both entry points. Server capability and recovery guidance now honor the baked denial; no capability grant changes.
- baseline-update: security/network-baseline.json — Refreshes scanner-required whole-file fingerprints for the triage capability, failure toast and boot recovery changes plus focused tests. Literal hosts and URLs are unchanged; the new hook test performs no network access. No capability or destination grant changes.

## 2026-11-10 — v0.1.7 advisory remediation

- baseline-update: security/dependency-baseline.json — Applies age-qualified fixes for the inherited advisory set, including all undici majors, direct sharp pins, DOMPurify, Seroval and MCP SDK dependencies. Verifies registry integrity and tarball lifecycle metadata. Removes sharp's obsolete install grant because 0.35.5 has no install hook; pnpm 11.10.0, strict 4320-minute age checks, trust rules and all other exact grants remain intact. Two residual tooling advisories have no path through desktop, server or web production dependencies; no advisory exception is added.
- baseline-update: security/stage-lock-baseline.json — Refreshes deterministic desktop/CLI projections for the reviewed fixes. Zod's server root is exact 4.6.6 so the existing projection uses the same patched resolution; both projected stages pass frozen production lock validation.
- baseline-update: security/network-baseline.json — Reviews dependency manifest/workspace changes and a peer-client test fixture that temporarily permits only peerLinks while testing session reuse and refusal. Fork denial coverage remains unchanged. No destination, runtime capability or lifecycle grant is added.
- baseline-update: security/last-approved-upstream — Advances the incorporated source/dependency review anchor to v0.1.7, 322f6544dfad0a3c8a0c8cbecf2c7f7874b14268, sync count 2. Eligible advisory fixes and local targeted checks are complete. Full packaged DMG/standalone CLI validation remains required in CI before release approval or publication.

## 2026-11-10 — v0.1.7 local sync candidate

- baseline-update: security/allowlist.json — Reviews Cursor api.cursor.com, Claude downloads.claude.ai and GitHub media.githubusercontent.com destinations behind metadata/media denials; adds default-denied peerLinks without widening the baked allow list.
- baseline-update: security/artifact-hosts.json — Traces 20 changed literal contexts in locally assembled desktop/server/web bundles to source constants, explicit navigation, local identifiers or baked-denied analytics; records 23 informational hosts. Assembled policy/identity and host scans pass. Full DMG extraction remains unverified because Rust/Cargo is unavailable; these entries do not approve a release.
- baseline-update: security/dependency-baseline.json — Records age-qualified v0.1.7 dependency inputs and Electron 44.10.2 with pnpm 11, 4320-minute strict age floor, no age exclusions and exact build grants. Removes the automatic EAS source-map upload hook. Advisory findings remain release blockers, not accepted exceptions.
- baseline-update: security/dependency-exceptions.json — Removes the stale uniwind age exception. Retains seven exact historical provenance exceptions; no new age exception is approved.
- baseline-update: security/egress-inventory.md — Documents independent baked/admin policy contracts, denied Cursor/npm metadata, source-control media, outbound peers, app/CLI triage and native/JS Expo Observe export denial; records dynamic Git-host actions and removed build-cache/EAS upload hooks.
- baseline-update: security/network-baseline.json — Reviews v0.1.2 to v0.1.7 runtime/build source and fixture changes with preserved baked gates, new peerLinks denial, early metadata/media/triage denials, mobile preview and Expo Observe dispatch gating, removed remote task cache and retained fork workflows. Scanner excludes vendored references; touched checks batch their source inputs. No network grant is added.
- baseline-update: security/stage-lock-baseline.json — Projects desktop/CLI dependencies with root exact overrides, including node-pty, and Electron 44.10.2. Stage installs remain frozen; focused staging regression passes.
- baseline-update: security/threat-model.md — Clarifies independent baked/admin denials and outbound peer links versus allowed inbound network clients. Provider shell sandboxing remains outside the managed build boundary.

## 2026-10-28 — Bash 3.2 update argument forwarding (#11)

- baseline-update: security/network-baseline.json — Reviews only `scripts/safe/t3safe`, its new offline `scripts/safe/t3safe.test.ts` regression and the macOS CI invocation in `.github/workflows/pr-checks.yml`. Guarded array expansion preserves zero arguments under Bash 3.2 nounset without changing installer checksum verification, mode selection or options. The new www.gnu.org literal is a Bash manual comment only; fixture GitHub URLs are served by a local curl stub. No runtime network grant, dependency or scanner policy changes.

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
- baseline-update: security/network-baseline.json — Records the three macOS workflow files after moving jobs from macos-14, which hosted runners no longer provision, to macos-15. The change is the runner label only; no step, action pin, permission, network host or secret handling changes.

- baseline-update: security/artifact-hosts.json — Rebaseline all four clipped privacy-link chunk-hash contexts as two desktop/CLI keys; all 96 prior keys traced to preserved context evidence, other 92 fingerprints unchanged. Release run 42769575199 and PR-CI-shaped bundles retain host, path and call-site approval requirements.
- baseline-update: security/network-baseline.json — Review scanner-only equal-length chunk-hash masking and inert regression fixture changes; refresh the two complete source fingerprints and fixture host inventory without changing network permissions.

- baseline-update: security/network-baseline.json — Narrow pre-slice masking to complete quoted relative JavaScript chunks with dash-separated eight-character hashes; add URL-path and executable-property rejection regressions. All 94 artifact ledger keys retain their fingerprints; refresh only the two scanner/test source fingerprints and inert fixture inventory.

## 2026-11-12 — signed safe-fork desktop updates, issue #17 phase 1

- baseline-update: security/managed-policy.json — Allows desktopAutoUpdate alongside remoteAccess.network. All other capabilities remain default-denied; the safe desktop pins repository and channel before checking or downloading.
- baseline-update: security/allowlist.json — Removes desktopAutoUpdate from denied capabilities and documents only rakutenanalytics/t3code GitHub metadata/assets and GitHub CDN redirects. Machine/custom/mock feeds cannot redirect safe builds.
- baseline-update: security/artifact-hosts.json — Reviews GitHub release CDN hosts and the existing t3ProjectFile schema URL metadata context after the baked policy changes minified bindings. Fresh PR-version desktop/server/web source policy and identity verified; no new T3-owned egress grant. Native DMG/SEA packaging remains a CI check.
- baseline-update: security/network-baseline.json — Reviews complete-file changes for the pinned updater, protected main-only signing, shared secret-free build action, public fingerprint/doctor, scanners and inert regression fixtures. Release traffic contains update metadata and artifacts, never workspace data. No other runtime capability enabled.
- baseline-update: security/signing-certificate.sha256 — Adds a fail-closed bootstrap marker. The maintainer must generate the stable key into release environment secrets and commit its public fingerprint before merging; no private identity was generated for production or stored in this repository.
- baseline-update: security/egress-inventory.md — Records the safe release-only updater and metadata/CDN payload boundary; administrator policy may disable but cannot redirect it.
- baseline-update: security/threat-model.md — Records certificate-pinned update continuity and the required manual migration from ad-hoc installs while retaining all other capability denials.
- baseline-update: security/signing-certificate.sha256 — Records the reviewed public SHA-256 of the stable release signing certificate (5e75fa893e4fc425fecd50ec9c10eb5cc33a99896d6a11f29d26fe76bbbd3ae4); the private key exists only as release-environment secrets, generated 2026-11-12.
