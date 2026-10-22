# Choose allowed capabilities

Edit `security/managed-policy.json`, review the change, and rebuild:

```json
{ "allow": ["remoteAccess.network"] }
```

Only named capabilities are allowed when this file exists. An empty list denies all modeled capabilities. Removing the file restores upstream unmanaged behavior; safe CI rejects a missing policy. Unknown capability names fail the build and source startup.

| Capability             | Default | Controls                                                      |
| ---------------------- | ------- | ------------------------------------------------------------- |
| `remoteAccess.network` | Allowed | LAN listeners and Tailscale Serve                             |
| `productAnalytics`     | Denied  | T3 product analytics collection/delivery                      |
| `t3Connect`            | Denied  | Cloud auth/linking, saved tunnels, relay activity and tracing |
| `desktopAutoUpdate`    | Denied  | Desktop updater checks/download/install                       |
| `telemetryExport`      | Denied  | OTLP endpoint selection and endpoint tests                    |
| `providerFeedback`     | Denied  | T3-triggered provider feedback uploads                        |

To enable Connect, for example, add `t3Connect` to `allow`. Also update `security/allowlist.json` so `deniedCapabilities` matches the intended policy, and review its destinations in the egress inventory. A host entry documents a review decision; it does not grant a capability or filter traffic.

Denied controls remain visible, disabled, with "Disabled by managed policy". Server commands enforce denial even if another client sends a request. Some direct endpoint tests return their existing unreachable result. Policy does not delete old credentials or revoke remote resources.

Packaged artifacts embed this policy. Environment variables, saved settings and CLI flags cannot enable a denied capability. `t3 managed-policy` prints the effective CLI policy without starting a server. Source execution, including `vp run dev` on main, reads the repository policy independently of the working directory; restart after changing it. Web development bundles embed the same file. Mobile local presentation and native OTA controls are outside this release.
