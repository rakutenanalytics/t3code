# Company-safe fork

This public fork builds macOS Apple Silicon desktop and standalone CLI releases with a managed capability policy. It keeps normal provider use and direct LAN/Tailscale access. It disables optional T3-owned cloud and diagnostic paths by default.

| Disabled by default                                     | Why                                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| Product analytics                                       | Prevent automatic product-event delivery                                   |
| T3 Connect, saved cloud tunnels and activity publishing | Keep cloud linking and relay delivery opt-in                               |
| Desktop automatic updates                               | Keep installed builds on reviewed safe releases                            |
| OTLP telemetry export                                   | Prevent saved settings or environment variables from exporting diagnostics |
| Provider feedback uploads                               | Prevent T3-triggered diagnostic uploads                                    |

Safe builds run beside the official T3 Code with their own app name, bundle id, data directory (`~/.t3-safe`), ports, URL scheme and `t3safe` command. See [Coexists with official T3](INSTALL.md#coexists-with-official-t3). Use [INSTALL.md](INSTALL.md) to install (DMG from Releases; curl is optional), [POLICY.md](POLICY.md) to opt capabilities in, and [MAINTAINING.md](MAINTAINING.md) to update the fork. Running `vp run dev` from this checkout also uses the managed policy.

These gates are not a network sandbox. Providers, agents, Git/SSH, browsers, media, theme search, metadata checks and optional installers can still contact selected or upstream destinations. Mobile is not distributed here; its Expo OTA path remains outside this policy. See the [egress inventory](../../security/egress-inventory.md) and [threat model](../../security/threat-model.md) before approving destinations.
