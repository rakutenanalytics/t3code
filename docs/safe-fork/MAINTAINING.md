# Maintain the safe fork

Start a fresh thread in the fork and run `/t3safe-sync`, or `/t3safe-sync --issue <number>` for an `upstream-sync` issue. The [skill](../../.agents/skills/t3safe-sync/SKILL.md) owns the merge-based update procedure and pauses for approval before pushing/opening a PR. The agent hands the green PR to the maintainer; merging it approves the automatic public release. Every repository-scoped gh command needs an explicit `--repo`; fork PR creation otherwise targets upstream. Main receives updates through reviewed PRs.

## Checks and baselines

```sh
node scripts/safe/egress-scan.ts
node scripts/safe/dependency-scan.ts
node scripts/safe/dependency-scan.ts --online
node scripts/safe/policy-verify.ts
vp test run scripts/safe/managed-policy.test.ts apps/server/src/telemetry/ManagedGates.test.ts apps/desktop/src/updates/ManagedUpdates.test.ts
node scripts/safe/touched-checks.ts origin/main
```

Typecheck contracts, shared, client-runtime, server, desktop, web and scripts with `vp exec --filter <package-name> -- tsc-rs --noEmit`. Do not run repository-wide checks. The PR workflow runs the browser presentation case and builds both artifacts on macos-14 ARM64. Full local desktop builds and browsers are unnecessary for ordinary sync preparation.

The host allowlist requires a purpose for global hosts or a file-specific justification for reviewed literals. Network statement fingerprints in `security/network-baseline.json` catch additions/changes even for an already known host or dynamic URL. Egress scanning covers app/package/script/native/workflow source and root source/configuration files, excludes tests, fixtures, generated schemas and vendored reference repositories, and does not resolve computed strings or dependencies. Comments/examples can be classified as reviewed literals. Source statements are review prompts, not proof of runtime safety.

`security/dependency-baseline.json` records a hash for each locked package block, the whole lockfile, workspace policy, manifest dependencies and scripts. The scanner lists every added version or changed package block and writes the gitignored `security/young-or-unknown.json`. Its `dependentPath` is one representative path from a workspace importer, not an exhaustive reverse dependency graph. Offline mode makes no registry requests and marks changed packages as needing online age lookup. `--online` queries public npm metadata with bounded concurrency/timeouts, checks publication age against `minimumReleaseAge`, compares lifecycle scripts and available version-level maintainer/repository metadata, and flags possible install-time network commands. Failed lookups remain unknown and fail unresolved review. Metadata is mutable and may lack historical maintainers; tarball review is still required for every changed package, even an old release. Neither mode executes dependency code.

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

The pinned pnpm 11.10.0 supports `minimumReleaseAge: 10080`, strict age checks including missing publication times, `trustPolicy: no-downgrade`, `blockExoticSubdeps` and `strictDepBuilds`. Frozen installs reapply age/trust checks because `trustLockfile` stays false. `minimumReleaseAgeExclude` is empty by default. An accepted young dependency still needs a separately reviewed exact age exclusion to install immediately; the JSON review does not bypass pnpm. Never add wildcard exclusions or use `--trust-lockfile`. `ignoreScripts` stays false for workspace preparation and required native builds; `allowBuilds` grants only the existing locked versions and retains explicit denials. Unknown dependency build scripts fail instead of running. On an upstream sync, inspect new lifecycle scripts before adding any build grant.

Use `pnpm config get <key>` to inspect effective settings without installing. In pnpm 11.10.0, `install --lockfile-only --offline --ignore-scripts --frozen-lockfile` still attempts registry reads during supply-chain verification; do not treat it as an offline dry run. The dependency scanner's default mode is the offline-safe check. CI's real frozen install requires registry metadata and can reject young/missing-time releases or trust downgrades in an otherwise unchanged lockfile. Do not weaken checks to make it pass.

Stage packaging still resolves some production ranges outside the root lockfile. Frozen stage closures and artifact attestations remain follow-up work.

After resolving every finding, use `node scripts/safe/egress-scan.ts --write-baseline` or `node scripts/safe/dependency-scan.ts --write-baseline`, inspect the resulting diff and rerun the scans without that flag. Do not accept generated entries without review. Update `security/egress-inventory.md` and `threat-model.md` for changed boundaries. `security/last-approved-upstream` records the incorporated release tag, reviewed source SHA and sync count. Every fifth sync or major version change requires a full audit, including paths outside the six current gates.

## Automation and release

| Workflow             | Purpose and authority                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pr-checks.yml`      | PRs to main; scanners before dependency installation, policy tests, scoped typechecks/lint/format, shell checks and browser presentation |
| `safe-build.yml`     | Reusable macos-14 ARM64 DMG + CLI build; no publishing, no secrets; artifact smoke and checksums                                         |
| `release.yml`        | Main changes affecting shipped files; policy verification, next safe tag, build and public release using only GITHUB_TOKEN               |
| `upstream-watch.yml` | Daily stable-release comparison; one open `upstream-sync` issue for the latest tag, with agent instructions                              |

`pr-checks.yml` keeps the offline dependency scan blocking and before installation. Its `dependency-online` advisory job needs no secrets, uses a public registry read and compares against the PR-base baseline even when the PR refreshes its own baseline. It uploads the JSON report and warns/fails visibly on lookup errors or scan failure, while allowing the required jobs to continue. A missing report or failed advisory job requires local investigation during sync; a green required check does not approve unresolved packages.

The artifact smoke runs the built CLI's read-only `managed-policy` command with enablement overrides and an isolated temporary home. It checks baked policy without opening a listener or launching providers. Together with focused no-op/endpoint tests and static scans, this is the deterministic substitute for startup egress capture. It does not log attempted runtime hosts. Real server startup would also require controlled provider discovery, settings and dependency-owned network instrumentation; native processes, redirects and SDK traffic would still need host-level observation. Do not claim zero egress from this smoke.

The maintainer merges the reviewed PR only when all required checks are green. That merge is release approval; the sync skill never merges for the user. The release workflow reruns egress/dependency scans and policy verification before building, reads the upstream version from `security/last-approved-upstream`, and chooses `v<upstream-version>-safe.<N>` with N one above the highest existing suffix, starting at 0. Runs share one concurrency group. After a successful build it creates the tag at the merged commit and publishes; automatic runs skip a commit that already has a safe tag.

For a failed release, investigate first. Maintainers can retry using `workflow_dispatch` on the merged commit with an optional safe tag, or push a safe tag pointing to a commit on main. An explicit existing tag must point to the selected commit. Both fallbacks run the same policy checks and build. Routine releases need no tag push or second approval.

The watcher issue records the upstream tag, the comparison against the reviewed anchor and the last-approved version. Pick it up with `/t3safe-sync --issue <number>` and include `Closes #N` in the sync PR body. Repeated watcher runs update the open issue for that tag; a newer tag supersedes stale open issues.

Release assets are public: a DMG, standalone CLI tarball, t3safe, managed-policy.json, VERSION, install.sh and SHA256SUMS. Installation uses plain curl. No Apple account, upstream secrets, npm publishing, mobile distribution or deployment runs. Verify checksums and installer dry-run in a temporary directory after publication. Require the `policy` and artifact build checks in main branch protection before accepting updates; repository settings are a separate maintainer operation.

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
