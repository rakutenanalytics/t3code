# Choose allowed capabilities

The policy is fixed when a release is built. An installed app or CLI has no runtime override: environment variables, saved settings and CLI flags cannot enable a denied capability, and the `managed-policy.json` shipped beside an install is a record for `t3safe doctor`, not an input. `t3safe doctor` shows the release policy and, for a CLI install, the effective CLI policy (`t3safe managed-policy` prints the latter).

To change it, edit `security/managed-policy.json`, review the change, and build a new release:

```json
{ "allow": ["remoteAccess.network"] }
```

Only named capabilities are allowed. An empty list denies all modeled capabilities. The shared runtime adapter now uses an empty list when the source policy file is missing, filesystem access is unavailable, or the baked policy is null. An undefined build constant selects source-file loading, which also denies all when the file is missing. Safe CI still rejects a missing policy before producing artifacts; unknown capability names fail decoding.

The low-level `allowsManagedCapability(null, capability)` and `createManagedPolicy({ policy: null })` helpers retain permissive upstream semantics. The exported runtime `managedPolicy` adapter no longer supplies null. This is a runtime-adapter change, not a change to the raw helper contract.

| Capability             | Default | Controls                                                                                                                                                                        |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `remoteAccess.network` | Allowed | LAN listeners and Tailscale Serve                                                                                                                                               |
| `productAnalytics`     | Denied  | T3 product analytics collection/delivery                                                                                                                                        |
| `t3Connect`            | Denied  | Cloud auth/linking, saved tunnels, relay activity and tracing                                                                                                                   |
| `desktopAutoUpdate`    | Denied  | Desktop updater checks/download/install                                                                                                                                         |
| `telemetryExport`      | Denied  | OTLP endpoint selection and endpoint tests                                                                                                                                      |
| `providerFeedback`     | Denied  | T3-triggered provider feedback uploads                                                                                                                                          |
| `upstreamUpdate`       | Denied  | Upstream CLI/server updates, pinned-runtime downloads, missing SSH runtime bootstrap, and npm launcher binary execution/downloads                                               |
| `remoteContent`        | Denied  | Automatic remote media in chat/PR content and remote favicons; desktop image/media CSP. Data/blob and loopback resources remain supported                                       |
| `providerMetadata`     | Denied  | Upstream model-manifest refresh, provider maintenance lookups and web npm release probes; bundled model data remains available                                                  |
| `providerTelemetry`    | Denied  | T3’s provider-process environment: strips inherited OTEL settings and sets supported telemetry/error-reporting opt-outs; provider-owned traffic remains outside a host firewall |

To enable Connect, for example, add `t3Connect` to `allow` and remove it from `deniedCapabilities` in `security/allowlist.json`; `node scripts/safe/policy-verify.ts` fails if the two disagree. Review the destinations in the [egress inventory](../../security/egress-inventory.md). Every changed `security/**` file also needs a line in `security/CHANGELOG.md` (see [MAINTAINING.md](MAINTAINING.md)).

Releases are built by this repository's release workflow, which runs only for `rakutenanalytics/t3code`; `install.sh` and `t3safe update` also fetch only from that repository. A different policy therefore ships as a reviewed change to this repository. A separate fork must change those repository names to publish its own builds. A host entry documents a review decision; it does not grant a capability or filter traffic.

Controls with policy-aware presentation remain visible and disabled with "Disabled by managed policy"; blocked remote media shows a placeholder. The npm launcher refuses both downloads and cached upstream execution and directs users to `t3safe update`. Server commands enforce denial even if another client sends a request. Some direct endpoint tests return their existing unreachable result. Policy does not delete old credentials or revoke remote resources.

Packaged artifacts embed this policy. Environment variables, saved settings and CLI flags cannot enable a denied capability. `t3safe managed-policy` prints the effective CLI policy without starting a server. Source execution, including `vp run dev` on main, reads the repository policy independently of the working directory; restart after changing it. Web development bundles embed the same file. Mobile local presentation and native OTA controls are outside this release.

Artifact host review uses tiered trust. T3-owned domains and the explicit telemetry/analytics denylist in `security/artifact-hosts.json` fail unless each literal has a fingerprint-bound maintainer approval. Telemetry inside provider SDK directory prefixes listed as `providerSdkPaths` is provider-owned and trusted; the exemption never covers T3-owned hosts. The 2026-10-23 ledger accepts reviewed gated/inert contexts and user-initiated T3 navigation links, which make no automatic request. These links remain available; new hosts or changed contexts still fail. Provider hosts, web search, MCP servers, documentation, registries, test hosts and other destinations are trusted by default. Unknown hosts only appear in informational `unreviewedHosts` reports; `seenHosts` records the last inventory. This build check is not a runtime host firewall and does not restrict intentional provider or user traffic.
