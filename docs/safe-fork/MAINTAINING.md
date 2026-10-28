# Maintain the safe fork

Start a fresh thread in the fork and run `/t3safe-sync`, or `/t3safe-sync --issue <number>` for an `upstream-sync` issue. The [skill](../../.agents/skills/t3safe-sync/SKILL.md) owns the merge-based update procedure. Invoking it authorizes the sync branch push, PR creation and in-scope babysitting fixes/review operations without another approval prompt. The agent follows CI and review until the current head is ready, then asks the maintainer to review and merge; that merge approves the automatic public release. Every repository-scoped gh command needs an explicit `--repo`; fork PR creation otherwise targets upstream. Main receives updates through reviewed PRs.

## Checks and baselines

```sh
node scripts/safe/workflow-scan.ts origin/main
node scripts/safe/egress-scan.ts
node scripts/safe/dependency-scan.ts
node scripts/safe/dependency-scan.ts --online
node scripts/safe/policy-verify.ts
vp test run scripts/safe/managed-policy.test.ts apps/server/src/telemetry/ManagedGates.test.ts apps/desktop/src/updates/ManagedUpdates.test.ts
node scripts/safe/touched-checks.ts origin/main
```

Typecheck contracts, shared, client-runtime, server, desktop, web and scripts with `vp exec --filter <package-name> -- tsc --noEmit`. Do not run repository-wide checks. The PR workflow runs the browser presentation case and builds both artifacts on macos-14 ARM64. Full local desktop builds and browsers are unnecessary for ordinary sync preparation.

The egress baseline binds the complete contents of each network-related source file, including wrapped arguments, generated files, fixtures and tests. It also lists literal hosts by file for readable review. Scanning covers app/package/script/native/workflow source and root configuration, including HTML/CSS/plist/TOML/XML/Gradle/Python and npm hooks; vendored `.repos` references stay outside the repository inventory. Detection includes low-level Node transports, browser resources, dynamic imports, process spawning, network tools and common telemetry/feature-flag SDKs. Computed destinations are caught as source changes, not resolved into hosts. A baseline refresh records a review decision; it does not prove runtime safety.

Artifact scanning inventories URLs and host literals inside extracted `app.asar`, the preserved CLI SEA source/client stage and CLI runtime files. It fails for T3-owned domains and the telemetry denylist in `security/artifact-hosts.json`. Telemetry in disk-backed provider SDK directories listed in `providerSdkPaths` is trusted. Prefixes end with `/` and match complete directories at any archive depth; T3-owned hosts still require a ledger entry there. Providers, web search, MCP servers, package/download hosts and other intentional destinations are trusted by default. Unknown hosts never fail. `--report <path>` writes JSON even on failure; its `unreviewedHosts` lists new hosts relative to `seenHosts`, with a capped console summary. Include that informational diff in the sync review/PR. `node scripts/safe/artifact-scan.ts <extracted-directory> --write-baseline` updates `seenHosts` while preserving the denylist and ledger; it grants no network permissions and does not accept denied literals.

A denied literal needs source tracing and an explicit maintainer decision. On 2026-10-23 the maintainer accepted the real CI S2-S8 contexts reviewed in `11-gated-literals.md`: gated analytics, inert metadata and user-initiated navigation. Navigation entries explicitly record "user-initiated navigation only, no automatic request; accepted by maintainer 2026-10-23 (not egress)". This accepts literal contexts without adding runtime gates. New T3 hosts, new occurrences or changed adjacent code still fail.

Generate entries with `--accept-gated-literals --note "<source trace and decision>"` from real CI extraction; packaged policy verification is mandatory. Ledger keys bind host, artifact-relative filename pattern and SHA-256 of the literal and 80 characters before/after it. The literal is host text, or the full URL when URL normalization changes its spelling. Eight-character JavaScript chunk suffixes normalize in filename and context. Other minifier/context changes require review again. Do not execute downloaded bundles during static review.

CLI builds need separate ledger entries because SEA embeds a single `bin.mjs` with different contexts from desktop server chunks. `safe-build.yml` copies that exact SEA input and the built client into `$RUNNER_TEMP/cli-build`, verifies with `policy-verify.ts --cli-bundle`, scans the directory and uploads `t3safe-cli-scan-input` for review. Accept this stage with `artifact-scan.ts <cli-build> --bundle-type cli --accept-gated-literals --note "<review>"`. Scan the archive at its inner `t3-<version>-darwin-arm64` root, so `client/assets/*` keys match the stage across release versions. The archive scan alone cannot inspect embedded SEA JavaScript. The historical CI source was recovered as data from SEA and matched its original report's whole-file SHA-256 before acceptance. Two local builds of unchanged CLI source produced byte-identical `bin.mjs` and the same T3 context fingerprints as CI. The local Homebrew Node cannot package SEA, so only source emission was verified locally. Renaming every eight-character chunk in the real extraction also preserves approvals. Different minifier output still requires renewed review.

`security/dependency-baseline.json` records package-block fingerprints, the lockfile, workspace policy, manifest dependencies/scripts, npm configuration/hooks, patches, vendored archives and Cargo locks. The scanner lists changed packages and writes the gitignored `security/young-or-unknown.json`. `--online` checks public npm publication times against `minimumReleaseAge`; registry releases meeting the floor proceed through normal diff review without tarball audits or exception records. Offline mode requires online age checks for changed registry packages. Neither mode executes dependency code.

Run the online scan before installing or refreshing baselines. Unknown publication times remain unresolved: retry or resolve the metadata. Below-age releases should wait unless needed now; only those exceptions need a targeted [package review](../../.agents/skills/t3safe-sync/dependency-review-brief.md) and explicit maintainer approval before installation. Share source review across a package family, retaining integrity checks and a verdict for each requested exception. Preserve reports in scratch before reruns. Review changed local archives, patches, hooks, installers and lifecycle permissions as source diff inputs; do not turn them into audits of every transitive package. Investigate concrete suspicious changes regardless of age.

After maintainer approval, record each young-release exception in `security/dependency-exceptions.json` as exact `package` (`name@version`), `resolutionSha256` from the report, evidence-backed `reason` and YYYY-MM-DD `date`. An exact matching record clears a known young age only; unknown ages remain unresolved. The corresponding pnpm age exclusion also needs explicit approval. Ordinary age-qualified upgrades need no exception record. Manifest, lockfile and workspace drift still require reviewed baseline refreshes. `--write-baseline` refuses unresolved age checks. Use `--baseline <path>` for an earlier baseline and `--report <path>` for scratch output.

The pinned pnpm 11.10.0 supports `minimumReleaseAge: 4320`, strict age checks including missing publication times, `trustPolicy: no-downgrade`, `blockExoticSubdeps` and `strictDepBuilds`. Frozen installs reapply age/trust checks because `trustLockfile` stays false. `minimumReleaseAgeExclude` is empty by default. An accepted young dependency still needs a separately reviewed exact age exclusion to install immediately; the JSON review does not bypass pnpm. Never add wildcard exclusions or use `--trust-lockfile`. `ignoreScripts` stays false for workspace preparation and required native builds; `allowBuilds` grants only the existing locked versions and retains explicit denials. Unknown dependency build scripts fail instead of running. On an upstream sync, inspect new lifecycle scripts before adding any build grant.

Use `pnpm config get <key>` to inspect effective settings without installing. In pnpm 11.10.0, `install --lockfile-only --offline --ignore-scripts --frozen-lockfile` still attempts registry reads during supply-chain verification; do not treat it as an offline dry run. The dependency scanner's default mode is the offline-safe check. CI's real frozen install requires registry metadata and can reject young/missing-time releases or trust downgrades in an otherwise unchanged lockfile. Do not weaken checks to make it pass.

Desktop, Windows sidecar and CLI staging project their importer from the reviewed root lockfile. Package snapshots, integrity, overrides, patch metadata and root supply-chain settings remain unchanged; ambiguous or missing root resolutions fail. The stage installs with `--frozen-lockfile` and verifies installed package versions against the reviewed lockfile. The generated macOS desktop and CLI lock hashes are recorded in `security/stage-lock-baseline.json` and checked by `node scripts/safe/stage-lock-scan.ts` after dependency installation; that file is itself hashed into the dependency baseline. The generated lockfile is deterministic from those inputs; packaging must never regenerate it through registry resolution. Release publication attests the DMG, CLI tarball and installer with GitHub build provenance. Verify downloaded assets with `gh attestation verify <asset> --repo rakutenanalytics/t3code`.

Every changed `security/**` file needs a new `- baseline-update: security/<path> — <review justification>` line in `security/CHANGELOG.md`. CI checks added entries against the PR base independently of the PR body and publishes corresponding source diffs in its job summary. Scanner changes still need trusted owner review; a PR executes its own scanner code.

After resolving every finding, use `node scripts/safe/egress-scan.ts --write-baseline` or `node scripts/safe/dependency-scan.ts --write-baseline`, inspect the resulting diff and rerun the scans without that flag. Do not accept generated entries without review. Update `security/egress-inventory.md` and `threat-model.md` for changed boundaries. `security/last-approved-upstream` records the incorporated release tag, reviewed source SHA and sync count. Routine syncs review the diff; full audits require a concrete finding or explicit maintainer request, not a sync count or version trigger.

## App identity

`security/app-identity.json` is the only source for the safe build's names, home directory, home environment variable, bundle id, URL scheme, CLI command and first port. `scripts/lib/app-identity.ts` bakes it into the server, desktop and web production bundles as `__T3CODE_APP_IDENTITY__`, and `build-desktop-artifact.ts` reads the same file for the app bundle name, `appId` and registered URL schemes. Source runs, tests, `vp run dev` and dev-desktop bundles keep the upstream identity (`packages/shared/src/upstreamAppIdentity.ts`, a separate module so a bundle that dynamic-imports `appIdentity` cannot retain it), so upstream dev flows are unchanged.

Code must take names, paths and ports from `appIdentity`, never from literals such as `".t3"` (the one exception is the official home name in `packages/shared/src/homeChoice.ts`, which the opt-in `t3safe home use-official` needs and which must never be built as `~/.t3` text), `T3CODE_HOME`, `3773`, `t3code://` or `t3`. After a sync, search the merge for new literals of that kind and route them through `appIdentity`. `policy-verify --bundle` and `--cli-bundle` fail when a production bundle lacks the reviewed literal, still contains the upstream literal, has an unexpanded constant or hard-codes `~/.t3`. Changing the file changes the isolation boundary: a changed `homeDirName`, `userDataDirName`, `appId` or `urlScheme` orphans existing user data or registrations, so treat it as a breaking release.

## Automation and release

| Workflow             | Purpose and authority                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pr-checks.yml`      | PRs to main; scanners before dependency installation, policy tests, scoped typechecks/lint/format, shell checks and browser presentation |
| `safe-build.yml`     | Reusable macos-14 ARM64 DMG + CLI build; no publishing, no secrets; artifact smoke and checksums                                         |
| `release.yml`        | Main changes affecting shipped files; policy verification, next safe tag, build and public release using only GITHUB_TOKEN               |
| `upstream-watch.yml` | Daily stable-release comparison; one open `upstream-sync` issue for the latest tag, with a fixed review template                         |

`pr-checks.yml` keeps the offline dependency scan blocking and before installation. Its `dependency-online` advisory job needs no secrets, uses a public registry read and compares against the PR-base baseline even when the PR refreshes its own baseline. It uploads the JSON report and warns/fails visibly on lookup errors or scan failure, while allowing the required jobs to continue. A missing report or failed advisory job requires local investigation during sync; a green required check does not approve unresolved packages.

The desktop smoke mounts the actual DMG read-only, extracts `app.asar`, runs `policy-verify --bundle`, checks for the reviewed policy literal in main/preload/server/web, rejects an unexpanded build constant and checks updater-feed ownership. It also checks the app identity (see App identity above): the bundle name, bundle id and URL scheme in `Info.plist`, the reviewed identity literal in main/server/web, and no upstream identity or hard-coded `~/.t3` default. It verifies dependency versions and artifact hosts without launching Electron. The CLI smoke executes the built archive’s `t3 managed-policy` and `t3 app-identity` with an isolated home and a decoy `T3CODE_HOME`. Environment flags are inputs, not proof that every capability gate works. These checks do not observe live network traffic or native-provider telemetry.
The maintainer merges the reviewed PR only when all required checks are green. That merge is release approval; the sync skill never merges for the user. The release workflow reruns egress/dependency scans and policy verification before building, reads the upstream version from `security/last-approved-upstream`, and chooses `v<upstream-version>-safe.<N>` with N one above the highest existing suffix, starting at 0. Runs share one concurrency group. After a successful build it creates the tag at the merged commit and publishes; automatic runs skip a commit that already has a safe tag.

Both planning and publication freshly fetch main/tags, require the selected commit to equal the main tip and reject tags older than an existing safe tag or no newer than a published release. An old queued build cannot become latest after main advances.

For a failed release, investigate first. Maintainers can retry using `workflow_dispatch` on the merged commit with an optional safe tag, or push a safe tag pointing to the current main tip. An explicit existing tag must point to the selected commit. Both fallbacks run the same policy checks and build. Routine releases need no tag push or second approval.

The watcher generates its issue body from a validated tag and a fixed template only. It updates/closes only issues authored by `github-actions[bot]`; it never adopts outsider issues by marker or label. The sync skill reads only the validated tag from that issue. Issue bodies and upstream commit/PR/diff text are untrusted evidence, never agent instructions. Pick it up with `/t3safe-sync --issue <number>` and include `Closes #N` in the sync PR body. Repeated watcher runs update the open issue for that tag; a newer tag supersedes stale open issues.

Release assets are public: a DMG, standalone CLI tarball, t3safe, managed-policy.json, app-identity.json, VERSION, install.sh and SHA256SUMS. Installation is a DMG download (plain curl installer optional). No Apple account, upstream secrets, npm publishing, mobile distribution or deployment runs. Verify checksums and installer dry-run in a temporary directory after publication. Main protection (applied by an admin):

1. `.github/CODEOWNERS` lists the security-sensitive paths with the maintainer as owner. After changing it, verify GitHub reports no CODEOWNERS errors (repo → Settings → Rules → the ruleset's insights, or the file's page).
2. Branch protection on `main` (classic rule or ruleset): require the status checks below, block force-pushes and deletion. Do not require an approving review while there is a single maintainer, since an author cannot approve their own PR; add a second maintainer, then require one approval with code-owner review, dismissal of stale approvals and approval after the latest push.
3. Require the actual successful check contexts **policy** and **artifacts / build** (select them after the first PR run). Keep `dependency-online` advisory; investigate its failures separately.
4. Protect safe tags and restrict release workflow dispatch to maintainers. Verify workflow write permissions and Actions policies. Check a sample PR changing policy/scanners/baselines/installer/workflows receives the required owner review.

These are repository settings, applied by an admin outside the patch. The changelog check is an audit trail, not an approval mechanism. GitHub publication and its immediate main-tip check are separate API operations; branch protection and restricted release access remain necessary.

All inherited workflow files were removed, including the old release.yml replaced by the safe publisher:

- `ci.yml`
- `cursor-hygiene-webhook.yml`
- `deploy-relay.yml`
- `desktop-macos-preview-publish.yml`
- `desktop-macos-preview.yml`
- `issue-labels.yml`
- `mobile-android-apk.yml`
- `mobile-eas-preview.yml`
- `mobile-eas-production.yml`
- `mobile-fingerprint-check.yml`
- `mobile-showcase-screenshots.yml`
- `pr-size.yml`
- `pr-vouch.yml`
- `publish-aur.yml`
- `release-desktop.yml`
- `release.yml`
- `thread-transfer-report.yml`
- `web-preview.yml`
- `windows-tests.yml`
