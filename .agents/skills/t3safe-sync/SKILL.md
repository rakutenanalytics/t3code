---
name: t3safe-sync
description: Merge an upstream T3 Code release into the safe fork, review new outbound capabilities, and prepare a reviewed safe release with two human approval pauses.
---

# t3safe-sync

Run on the maintainer's laptop, in a fresh thread on `rakutenanalytics/t3code`. Read repository AGENTS.md, `security/threat-model.md`, `security/egress-inventory.md`, and `docs/safe-fork/MAINTAINING.md` first.

```text
preflight → merge tag → hunt new egress → repatch → scanners + tests
                                                    ↓
                          PAUSE 1: approve draft PR + remote commands
                                                    ↓
                          push → fork PR → CI green → review
                                                    ↓
                          PAUSE 2: approve merge + tag + release
                                                    ↓
                          merge → tag on main → release CI → verify
```

## Rules

- Keep `main` managed. Work on `sync/<tag>`; merge upstream, never rebase or force-push. Never push directly to main or bypass its PR checks.
- Never commit internal data, hostnames, credentials, screenshots of private content, or internal documents. The public GitHub organization name is sufficient context.
- Pass `--repo rakutenanalytics/t3code` to every repository-scoped `gh` command. In particular, fork `gh pr create` otherwise defaults to the upstream parent. Auth-only `gh auth status` has no `--repo` flag; use public curl for upstream API reads; keep all repository-scoped gh operations on the fork.
- Never skip scanners or regenerate baselines merely to make them pass. Every new destination and network action needs a gate or a justified review entry.
- No dev servers, browsers, real credentials or live T3 data. Use focused tests and isolated fixture state. Keep scratch material outside the repository.
- Before either approval pause, finish the local work and show concrete commands. An invocation of this skill does not grant either approval. No remote write before Pause 1; no merge/tag/release before Pause 2.

## 1. Preflight and target

1. Confirm the working tree is clean, the current repository is the fork, and `gh auth status` succeeds. Stop if unrelated changes exist. Record the starting branch/SHA.
2. Read `security/last-approved-upstream`. Its `sha` is the reviewed source anchor; its `tag` is the most recent incorporated stable release, which can precede that anchor.
3. Read the latest stable release using public curl at `https://api.github.com/repos/pingdotgg/t3code/releases/latest`. Accept a user-selected stable tag instead. Validate `vX.Y.Z` before using it in shell commands or branch names.
4. Fetch upstream tags from `https://github.com/pingdotgg/t3code.git`, plus fork main. Record the target tag's peeled commit SHA. If the target is already an ancestor of the reviewed anchor, report that no update is needed and stop. Otherwise check that the previous anchor is an ancestor of the target; explain divergence before proceeding. Reuse an existing sync branch only after inspecting it.
5. Create `sync/<tag>` from current fork main. Merge the tag using `git merge --no-ff <tag>`. Resolve conflicts using the `resolving-merge-conflicts` skill if available. Prefer upstream implementations while preserving policy gates, source enforcement, fork CI and distribution. Review the resulting diff against both parents, not just conflict markers.

Done when the branch has the merge, all conflicts resolved, and the old review anchor and target SHA are recorded.

## 2. Security review and repatch

Read [review-brief.md](review-brief.md) and use its prompt for two separate worker subagents. Apply the maintainer's available `model-picker` rules. Discover live allowed inexpensive models; use those for bounded diff reviews. Never select Opus without explicit approval. Each worker owns one read-only review: one runtime/client egress, one dependencies/installers/workflows. They are not alone in the codebase; they must not revert others' changes or edit files. Include the exact anchor, target and fork diff in both briefs. If delegation is unavailable, report it and obtain an equivalent human review before publication.

Review `git diff <previous-sha> <target-sha>` for newly introduced upstream behavior, then `git diff origin/main...HEAD` for the integrated fork result. Eagerly hunt NEW or UNKNOWN outbound/leaking capabilities beyond the known gates. Do not limit review to the six capability names. Resolve every finding as a policy gate/capability, a justified allowlist entry, or a release blocker. The parent owns patches and integration.

Run a full audit every fifth sync and on every upstream major version change. Use `syncCount + 1`, not elapsed time. Re-inventory all runtime/build networking and dependency scripts using the threat model, reset baselines after review, and record why the audit was due.

After review and patching:

```sh
node scripts/safe/egress-scan.ts
node scripts/safe/dependency-scan.ts
node scripts/safe/policy-verify.ts
vp test run scripts/safe/managed-policy.test.ts apps/server/src/telemetry/ManagedGates.test.ts apps/desktop/src/updates/ManagedUpdates.test.ts
node scripts/safe/touched-checks.ts origin/main
```

For an intentional reviewed change, first update the host justification/inventory, then use the relevant scanner's `--write-baseline`, inspect the baseline diff, and rerun without that flag. Review lockfile changes before installing new dependencies. Follow MAINTAINING.md for package typechecks. Browser presentation and full artifacts run in CI; do not launch them locally without a separate user request.

Update `last-approved-upstream` with target tag, peeled SHA and incremented sync count. Update inventory, threat model and baselines to describe the actual boundaries. Remove stale exceptions. Commit logical changes with conventional titles. Done when findings are resolved, focused local checks pass, and the full diff is ready for a human.

## 3. PAUSE 1: approve publication

Show the draft PR title/body and exact planned remote-write commands. The body states upstream tag/SHA, new egress findings and decisions, validation, full-audit status and remaining gaps. End it with model and harness. Wait for explicit user approval before ANY push or gh write. Explain this pause is required by this skill and the public-fork rule in AGENTS.md.

After approval, push only `sync/<tag>` to the fork and create the PR:

```sh
git push -u origin 'sync/<tag>'
gh pr create --repo rakutenanalytics/t3code --base main --head 'sync/<tag>' --title '<approved title>' --body-file '<reviewed temporary body file>'
```

If T3 PR linking is available, register the returned PR URL immediately. Watch checks using the app's PR watcher when available; otherwise `gh pr checks --repo rakutenanalytics/t3code <number> --watch` or `gh run watch --repo rakutenanalytics/t3code <run-id>`. Investigate failures and fix locally. Approval covers fixes to this reviewed scope, not new external actions. Do not merge with failing/skipped required checks. Changes that expand the approved scope require a new draft approval.

## 4. PAUSE 2: approve merge, tag and release

Show the reviewed PR URL, green head SHA/checks, resolved findings, target release tag and exact merge/tag/push commands. Choose the next unused `v<upstream-version>-safe.<n>` tag. Wait for explicit approval to merge and publish. Explain that pushing this tag invokes release.yml and makes artifacts public.

After approval, merge through the PR using `gh pr merge --repo rakutenanalytics/t3code <number> --merge --match-head-commit <reviewed-sha>`. Fetch the merged main commit without writing directly to main. Create an annotated safe tag at that exact merged commit and push only that tag to the fork. Let release.yml publish; do not run upstream publishers. Watch the run and verify every expected asset plus SHA256SUMS exists via `gh release view --repo rakutenanalytics/t3code <safe-tag>`.

Download that release's install.sh with public curl into a temporary directory. Run `bash install.sh --version <safe-tag> --dry-run --prefix <temporary-directory>`. Download selected assets/checksums separately and verify SHA256 without installing. Dry-run confirms the plan, not launch/Gatekeeper behavior. Do not claim a real installation was tested. Stop on a mismatch or failed release; show the failure before considering a replacement tag.

Finish with [final-report.md](final-report.md), including approvals, PR/release URLs, exact validation and remaining limits. Unwatch the PR when handing it back if the app supports it.
