# T3 Code Safe

Managed fork of [T3 Code](https://github.com/pingdotgg/t3code) for macOS on Apple Silicon. Optional cloud, analytics and auto-update paths are disabled by a policy baked into the build.

## Install

```sh
curl -fsSL https://github.com/rakutenanalytics/t3code/releases/latest/download/install.sh | bash
```

Installs `T3 Code Safe.app` and the `t3safe` command. Checks every download against the release `SHA256SUMS`.

**Update:** run the same command again (quit the app first). `t3safe update` does the same.

Other ways to install (CLI only, pinned version, manual DMG, verification) and troubleshooting: [docs/safe-fork/INSTALL.md](docs/safe-fork/INSTALL.md).

Check an install with `t3safe doctor`. If macOS blocks the app: `xattr -dr com.apple.quarantine "/Applications/T3 Code Safe.app"` (adjust the path). Uninstall: [INSTALL.md](docs/safe-fork/INSTALL.md#uninstall).

Install and sign in to at least one provider CLI (for example Codex or Claude Code) before starting a thread.

## What is different

| Area                         | Safe fork                                         |
| ---------------------------- | ------------------------------------------------- |
| Product analytics            | Off                                               |
| T3 Connect, cloud tunnels    | Off                                               |
| Desktop auto-update          | Off (update with the command above)               |
| OTLP export, feedback upload | Off                                               |
| LAN / Tailscale access       | On                                                |
| App, data, command           | `T3 Code Safe.app`, `~/.t3-safe`, `t3safe`        |
| Official T3 Code             | Runs side by side; data shared only if you opt in |

These gates are not a network sandbox: providers, Git and browsers still reach their own hosts. Details: [docs/safe-fork/README.md](docs/safe-fork/README.md).

## Policy

Policy is fixed when the build is made. An installed app cannot be changed by environment variable, setting or flag. To change it, edit [`security/managed-policy.json`](security/managed-policy.json) and rebuild: see [Choose allowed capabilities](docs/safe-fork/POLICY.md). Check what an install enforces with `t3safe doctor`.

## Docs

- [Install and update](docs/safe-fork/INSTALL.md)
- [Policy and capabilities](docs/safe-fork/POLICY.md)
- [Maintaining the fork](docs/safe-fork/MAINTAINING.md)

## Upstream user guides

These guides are written for the official build. In the safe fork, replace `t3` with `t3safe` and `~/.t3` with `~/.t3-safe`, and note that features disabled by policy are unavailable.

- [Permission modes](./docs/user/permission-modes.md)
- [Keyboard shortcuts](./docs/user/keybindings.md)
- [Project settings](./docs/user/project-settings.md)
- [Appearance preferences](./docs/user/appearance.md)
- [Remote access from a phone or another machine](./docs/user/remote-access.md)
- [Connect Claude Code, Codex, ChatGPT and other agents over MCP](./docs/user/outside-agents.md)
- [Source control integrations](./docs/user/source-control.md)
- Multiple accounts: [Codex](./docs/user/providers-codex.md) · [Claude](./docs/user/providers-claude.md)
- [Run T3 Code as a background service](./docs/user/background-service.md)

Building from source? Start at [docs/internals/overview.md](./docs/internals/overview.md).

## If you REALLY want to contribute still.... read this first

### Install `vp`

T3 Code uses Vite+ so you'll need to install the global `vp` command-line tool.

#### macOS / Linux

```bash
curl -fsSL https://vite.plus | bash
```

#### Windows

```bash
irm https://vite.plus/ps1 | iex
```

Checkout their getting started guide for more information: https://viteplus.dev/guide/

### Install dependencies

```bash
vp i
```

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before reporting a bug or opening a PR.

Have a feature request? Start an [Ideas discussion](https://github.com/pingdotgg/t3code/discussions/categories/ideas).

Need support? Join the [Discord](https://discord.gg/jn4EGJjrvv).
