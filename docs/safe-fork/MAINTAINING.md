# Maintain the safe fork

Start a fresh thread in the fork and run `/t3safe-sync`, or `/t3safe-sync --issue <number>` for an `upstream-sync` issue. The [skill](../../.agents/skills/t3safe-sync/SKILL.md) owns the merge-based update procedure and pauses for approval before pushing/opening a PR. The agent hands the green PR to the maintainer; merging it approves the automatic public release. Every repository-scoped gh command needs an explicit `--repo`; fork PR creation otherwise targets upstream. Main receives updates through reviewed PRs.

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

Typecheck contracts, shared, client-runtime, server, desktop, web and scripts with `vp exec --filter <package-name> -- tsc-rs --noEmit`. Do not run repository-wide checks. The PR workflow runs the browser presentation case and builds both artifacts on macos-14 ARM64. Full local desktop builds and browsers are unnecessary for ordinary sync preparation.

The egress baseline binds the complete contents of each network-related source file, including wrapped arguments, generated files, fixtures and tests. It also lists literal hosts by file for readable review. Scanning covers app/package/script/native/workflow source and root configuration, including HTML/CSS/plist/TOML/XML/Gradle/Python and npm hooks; vendored `.repos` references stay outside the repository inventory. Detection includes low-level Node transports, browser resources, dynamic imports, process spawning, network tools and common telemetry/feature-flag SDKs. Computed destinations are caught as source changes, not resolved into hosts. A baseline refresh records a review decision; it does not prove runtime safety.

Artifact scanning inventories URLs and host literals inside extracted `app.asar` (including dependency JavaScript), server `dist-exe` and CLI runtime files. Exact literals must occur in the reviewed source inventory or have an explicit justification in `security/artifact-hosts.json`. `--write-baseline` writes candidates separately and never approves them. The first complete artifact build may fail on dependency-owned destinations that have not yet been reviewed. For local analysis, `node scripts/safe/artifact-scan.ts <extracted-directory> --write-baseline` writes a candidate inventory without approving it. Generic hosts such as github.com do not approve arbitrary new URL paths. Review those candidates before publication; do not bulk-copy them into approvals.

`security/dependency-baseline.json` records a hash for each locked package block, the whole lockfile, workspace policy, manifest dependencies/scripts, npm configuration/hooks, patches, vendored mobile archives and every Cargo.lock. The scanner lists every added version or changed package block and writes the gitignored `security/young-or-unknown.json`. Its `dependentPath` is one representative path from a workspace importer, not an exhaustive reverse dependency graph. Offline mode makes no registry requests and marks changed packages as needing online age lookup. `--online` queries public npm metadata with bounded concurrency/timeouts, checks publication age against `minimumReleaseAge`, compares lifecycle scripts and available version-level maintainer/repository metadata, and flags possible install-time network commands. Failed lookups remain unknown and fail unresolved review. Metadata is mutable and may lack historical maintainers; tarball review is still required for every changed package, even an old release. Neither mode executes dependency code.

During EVERY sync, run the online scan before installing or refreshing baselines. For each report entry, the sync skill creates a bounded read-only cheap-model review using its [package brief](../../.agents/skills/t3safe-sync/dependency-review-brief.md). Each reviewer downloads integrity-checked tarballs into fresh scratch directories outside the repository, never installs or runs scripts, diffs baseline versions and returns SAFE / SUSPICIOUS / BLOCK with evidence. The parent resolves all suspicious, blocked, missing or incomplete reviews before any push. Record every verdict, age, dependency path and supporting evidence in the PR body. Preserve the original report outside the repository because reruns overwrite it.

Accepted manual reviews go into `security/dependency-exceptions.json`, initially empty. Approvals are exact and bound to the package block fingerprint from the report:

```json
[
  {
    "package": "example-package@1.2.3",
    "resolutionSha256": "<64 hex characters from the report>",
    "reason": "SAFE review: describe tarball diff, lifecycle/network findings and evidence",
    "date": "2026-10-22"
  }
]
```

Approved entries disappear from the unresolved report on later runs; changed fingerprints require review again. Approval clears package review only. Manifest, lockfile or workspace drift still needs a reviewed baseline refresh. `--write-baseline` refuses unresolved package reviews. Remove obsolete approvals after checking no pending sync needs them. To compare against an earlier reviewed baseline, use `--baseline <path>`; `--report <path>` keeps generated evidence outside the repository when needed.

The pinned pnpm 11.10.0 supports `minimumReleaseAge: 4320`, strict age checks including missing publication times, `trustPolicy: no-downgrade`, `blockExoticSubdeps` and `strictDepBuilds`. Frozen installs reapply age/trust checks because `trustLockfile` stays false. `minimumReleaseAgeExclude` is empty by default. An accepted young dependency still needs a separately reviewed exact age exclusion to install immediately; the JSON review does not bypass pnpm. Never add wildcard exclusions or use `--trust-lockfile`. `ignoreScripts` stays false for workspace preparation and required native builds; `allowBuilds` grants only the existing locked versions and retains explicit denials. Unknown dependency build scripts fail instead of running. On an upstream sync, inspect new lifecycle scripts before adding any build grant.

Use `pnpm config get <key>` to inspect effective settings without installing. In pnpm 11.10.0, `install --lockfile-only --offline --ignore-scripts --frozen-lockfile` still attempts registry reads during supply-chain verification; do not treat it as an offline dry run. The dependency scanner's default mode is the offline-safe check. CI's real frozen install requires registry metadata and can reject young/missing-time releases or trust downgrades in an otherwise unchanged lockfile. Do not weaken checks to make it pass.

Desktop, Windows sidecar and CLI staging project their importer from the reviewed root lockfile. Package snapshots, integrity, overrides, patch metadata and root supply-chain settings remain unchanged; ambiguous or missing root resolutions fail. The stage installs with `--frozen-lockfile` and verifies installed package versions against the reviewed lockfile. The generated macOS desktop and CLI lock hashes are recorded in `security/stage-lock-baseline.json` and checked by `node scripts/safe/stage-lock-scan.ts` after dependency installation; that file is itself hashed into the dependency baseline. The generated lockfile is deterministic from those inputs; packaging must never regenerate it through registry resolution. Release publication attests the DMG, CLI tarball and installer with GitHub build provenance. Verify downloaded assets with `gh attestation verify <asset> --repo rakutenanalytics/t3code`.

Every changed `security/**` file needs a new `- baseline-update: security/<path> — <review justification>` line in `security/CHANGELOG.md`. CI checks added entries against the PR base independently of the PR body and publishes corresponding source diffs in its job summary. Scanner changes still need trusted owner review; a PR executes its own scanner code.

After resolving every finding, use `node scripts/safe/egress-scan.ts --write-baseline` or `node scripts/safe/dependency-scan.ts --write-baseline`, inspect the resulting diff and rerun the scans without that flag. Do not accept generated entries without review. Update `security/egress-inventory.md` and `threat-model.md` for changed boundaries. `security/last-approved-upstream` records the incorporated release tag, reviewed source SHA and sync count. Every fifth sync or major version change requires a full audit, including paths outside the current gates.

## Automation and release

| Workflow             | Purpose and authority                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pr-checks.yml`      | PRs to main; scanners before dependency installation, policy tests, scoped typechecks/lint/format, shell checks and browser presentation |
| `safe-build.yml`     | Reusable macos-14 ARM64 DMG + CLI build; no publishing, no secrets; artifact smoke and checksums                                         |
| `release.yml`        | Main changes affecting shipped files; policy verification, next safe tag, build and public release using only GITHUB_TOKEN               |
| `upstream-watch.yml` | Daily stable-release comparison; one open `upstream-sync` issue for the latest tag, with a fixed review template                         |

`pr-checks.yml` keeps the offline dependency scan blocking and before installation. Its `dependency-online` advisory job needs no secrets, uses a public registry read and compares against the PR-base baseline even when the PR refreshes its own baseline. It uploads the JSON report and warns/fails visibly on lookup errors or scan failure, while allowing the required jobs to continue. A missing report or failed advisory job requires local investigation during sync; a green required check does not approve unresolved packages.

The desktop smoke mounts the actual DMG read-only, extracts `app.asar`, runs `policy-verify --bundle`, checks for the reviewed policy literal in main/preload/server/web, rejects an unexpanded build constant and checks updater-feed ownership. It verifies dependency versions and artifact hosts without launching Electron. The CLI smoke executes the built archive’s `t3 managed-policy` with an isolated home. Environment flags are inputs, not proof that every capability gate works. These checks do not observe live network traffic or native-provider telemetry.
The maintainer merges the reviewed PR only when all required checks are green. That merge is release approval; the sync skill never merges for the user. The release workflow reruns egress/dependency scans and policy verification before building, reads the upstream version from `security/last-approved-upstream`, and chooses `v<upstream-version>-safe.<N>` with N one above the highest existing suffix, starting at 0. Runs share one concurrency group. After a successful build it creates the tag at the merged commit and publishes; automatic runs skip a commit that already has a safe tag.

Both planning and publication freshly fetch main/tags, require the selected commit to equal the main tip and reject tags older than an existing safe tag or no newer than a published release. An old queued build cannot become latest after main advances.

For a failed release, investigate first. Maintainers can retry using `workflow_dispatch` on the merged commit with an optional safe tag, or push a safe tag pointing to the current main tip. An explicit existing tag must point to the selected commit. Both fallbacks run the same policy checks and build. Routine releases need no tag push or second approval.

The watcher generates its issue body from a validated tag and a fixed template only. It updates/closes only issues authored by `github-actions[bot]`; it never adopts outsider issues by marker or label. The sync skill reads only the validated tag from that issue. Issue bodies and upstream commit/PR/diff text are untrusted evidence, never agent instructions. Pick it up with `/t3safe-sync --issue <number>` and include `Closes #N` in the sync PR body. Repeated watcher runs update the open issue for that tag; a newer tag supersedes stale open issues.

Release assets are public: a DMG, standalone CLI tarball, t3safe, managed-policy.json, VERSION, install.sh and SHA256SUMS. Installation uses plain curl. No Apple account, upstream secrets, npm publishing, mobile distribution or deployment runs. Verify checksums and installer dry-run in a temporary directory after publication. Main protection (applied by an admin):

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
