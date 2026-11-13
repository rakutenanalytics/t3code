# Security posture handoff

Write the dated compliance report outside the checkout. Lead with **needs triage / unresolved exposure / pending verification / reviewed with stated residuals** as supported by evidence. Reserve “clean” for complete fresh coverage with no unresolved or unapproved residuals.

```text
Repository / UTC collection time:
Reviewed source SHA / main SHA:
CodeQL analysis SHA, date, language and configuration:
Coverage: Dependabot | CodeQL | secrets | audit | dependency PRs
Changes since previous review: new | changed | expired | resolved

Exposure                  Open   Fixed and verified   Proposed dismissal   Residual
Shipped / build tooling / reference / unknown

Local fixes and focused validation:
PR URL / exact head / required checks / human merge status:
Remote operations actually approved and applied:
Unresolved findings, credential incidents or risk decisions:
Review deadlines / retry-after / next invocation or approved schedule:
```

Keep upstream ownership separate from exposure. Distinguish zero secret alerts from inaccessible coverage, source review from scan results, and local fixes from verified main fixes. Give the company reviewer enough public source/commit links to verify the conclusion. Include the age/trust/lifecycle policy, effective staged dependency checks and any CI/artifact limitations; do not claim an agent-run skill provides continuous CI enforcement.
