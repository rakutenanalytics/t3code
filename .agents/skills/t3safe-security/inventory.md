# Inventory details

Use paginated GETs; record exit status before interpreting an empty output. `--slurp` wraps the pages, so flatten one level before comparing identities. Keep evidence in the current run's scratch directory.

```sh
gh api --method GET --paginate --slurp 'repos/rakutenanalytics/t3code/dependabot/alerts?state=open&per_page=100'
gh api --method GET --paginate --slurp 'repos/rakutenanalytics/t3code/code-scanning/alerts?state=open&per_page=100'
gh api --method GET 'repos/rakutenanalytics/t3code/code-scanning/default-setup'
gh api --method GET --paginate --slurp 'repos/rakutenanalytics/t3code/code-scanning/analyses?ref=refs/heads/main&per_page=100'
gh api --method GET 'repos/rakutenanalytics/t3code'
gh pr list --repo rakutenanalytics/t3code --author 'app/dependabot' --state open --limit 1000 --json number,title,headRefName,baseRefName,url,updatedAt
gh pr view <number> --repo rakutenanalytics/t3code --json files,commits,headRefOid,statusCheckRollup,body
node_modules/.bin/vp exec pnpm audit --json
```

If a PR list reaches the limit, use REST pagination and filter the complete pulls list by `user.login == "dependabot[bot]"`. Retain the file pagination/coverage outcome for large PRs too. For CodeQL flows, download the relevant analysis SARIF through the API with `Accept: application/sarif+json`; use alert instances to distinguish configurations and branches.

Secret scanning must be projected **before** any file write or log output. This projection deliberately excludes `secret`, raw URLs, locations and resolution comments. A failure is unknown coverage. Save only these public-safe metadata fields; investigate any actual credential privately.

```sh
gh api --method GET --paginate \
  'repos/rakutenanalytics/t3code/secret-scanning/alerts?state=open&per_page=100' \
  --jq '.[] | {number, state, secret_type, created_at, updated_at, validity}'
```

Ledger keys are `dependabot:<number>`, `codeql:<number>`, `secret:<number>` and `audit:<GHSA>:<package>@<version>`. Dependabot matching includes manifest, package and GHSA; retain vulnerable range and advisory update time. CodeQL matching includes rule, path, location and SHA-256 of the entire reviewed source file; retain scan commit/configuration. Audit-only identities coexist with GitHub identities; reports deduplicate exposure by advisory/package/version rather than adding both feeds' counts.

The checked-in ledger is a review record, not a live GitHub cache. Compare current data on every run. Review groups supply shared rationale/evidence and dates; each entry points to one group. `proposedDismissal` is a suggestion, `humanApproval: null` means no human approval, and `remoteAction: "none"` means nothing has been applied. Missing, changed or expired evidence must be re-triaged; a copied classification cannot clear the run.
