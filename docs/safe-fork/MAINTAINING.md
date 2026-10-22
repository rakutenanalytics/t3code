# Maintain the safe fork

Start a fresh thread in the fork and run `/t3safe-sync`. The [skill](../../.claude/skills/t3safe-sync/SKILL.md) owns the merge-based update procedure and two approval pauses: before pushing/opening a PR, then before merging/tagging a public release. Every repository-scoped gh command needs an explicit `--repo`; fork PR creation otherwise targets upstream. Main receives updates through reviewed PRs.

## Checks and baselines

```sh
node scripts/safe/egress-scan.ts
node scripts/safe/dependency-scan.ts
node scripts/safe/policy-verify.ts
vp test run scripts/safe/managed-policy.test.ts apps/server/src/telemetry/ManagedGates.test.ts apps/desktop/src/updates/ManagedUpdates.test.ts
node scripts/safe/touched-checks.ts origin/main
```

Typecheck contracts, shared, client-runtime, server, desktop, web and scripts with `vp exec --filter <package-name> -- tsc-rs --noEmit`. Do not run repository-wide checks. The PR workflow runs the browser presentation case and builds both artifacts on macos-14 ARM64. Full local desktop builds and browsers are unnecessary for ordinary sync preparation.

The host allowlist requires a purpose for global hosts or a file-specific justification for reviewed literals. Network statement fingerprints in `security/network-baseline.json` catch additions/changes even for an already known host or dynamic URL. Egress scanning covers app/package/script/workflow source, excludes tests, fixtures, generated schemas and vendored reference repositories, and does not resolve computed strings or dependencies. Comments/examples can be classified as reviewed literals. Source statements are review prompts, not proof of runtime safety.

`security/dependency-baseline.json` records lockfile package IDs and hashes, workspace build permissions, manifest dependencies and scripts. Any lockfile, dependency or script change requires review before refreshing it. This catches additions and changed preinstall/postinstall commands in workspace manifests. Transitive lifecycle contents are not in the lockfile; inspect the changed packages and their downloads. Stage packaging still resolves some production ranges outside the root lockfile. Frozen stage closures and artifact attestations remain follow-up work.

After resolving every finding, use `node scripts/safe/egress-scan.ts --write-baseline` or `node scripts/safe/dependency-scan.ts --write-baseline`, inspect the resulting diff and rerun the scans without that flag. Do not accept generated entries without review. Update `security/egress-inventory.md` and `threat-model.md` for changed boundaries. `security/last-approved-upstream` records the incorporated release tag, reviewed source SHA and sync count. Every fifth sync or major version change requires a full audit, including paths outside the six current gates.

## Automation and release

| Workflow             | Purpose and authority                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pr-checks.yml`      | PRs to main; scanners before dependency installation, policy tests, scoped typechecks/lint/format, shell checks and browser presentation |
| `safe-build.yml`     | Reusable macos-14 ARM64 DMG + CLI build; no publishing, no secrets; artifact smoke and checksums                                         |
| `release.yml`        | `vX.Y.Z-safe.N` tags on main; separate publisher with contents write, using only GITHUB_TOKEN                                            |
| `upstream-watch.yml` | Daily stable-release comparison; one issue updated using issues write, without updating code                                             |

The artifact smoke runs the built CLI's read-only `managed-policy` command with enablement overrides and an isolated temporary home. It checks baked policy without opening a listener or launching providers. Together with focused no-op/endpoint tests and static scans, this is the deterministic substitute for startup egress capture. It does not log attempted runtime hosts. Real server startup would also require controlled provider discovery, settings and dependency-owned network instrumentation; native processes, redirects and SDK traffic would still need host-level observation. Do not claim zero egress from this smoke.

Tag only after the second approval and green PR checks. Release assets are public: a DMG, standalone CLI tarball, t3safe, managed-policy.json, VERSION, install.sh and SHA256SUMS. Installation uses plain curl. No Apple account, upstream secrets, npm publishing, mobile distribution or deployment runs. Verify checksums and installer dry-run in a temporary directory after publication. Require the `policy` and artifact build checks in main branch protection before accepting updates; repository settings are a separate maintainer operation.

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
