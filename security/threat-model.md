# Managed build threat model

A leak is disclosure of workspace content, conversation text, attachments, terminal or browser data, credentials, project/thread titles, identifying metadata, or operational logs to an unapproved destination. Cloud tunnels also disclose a reachable control surface, even before content moves.

This build permits direct network access and keeps normal agent/provider use. It denies product analytics, T3 Connect (including saved tunnels, activity publishing and tracing), desktop auto-update, OTLP export and provider feedback uploads. Environment variables, CLI flags and saved preferences cannot grant these capabilities.

The boundary is T3-owned feature execution in compiled desktop, web and server/CLI artifacts. This is not a host firewall, provider sandbox, browser destination filter, or defense against arbitrary code execution. Agent subprocesses, user-selected URLs, provider APIs, SSH, Git hosting and optional installers still need destination approval. A person able to replace the application can replace its policy.

`managed-policy.json` is validated and embedded at build time. Removing it before building selects upstream behavior; an empty allow list denies every modeled capability. Invalid data fails the build. Runtime files and environment variables cannot replace the embedded policy. Source execution without the build define is unmanaged; distribute compiled artifacts for enforcement.

`last-approved` records the local merge-base of HEAD and origin/main used for this baseline. It is a review anchor, not a claim of independent upstream security approval.
