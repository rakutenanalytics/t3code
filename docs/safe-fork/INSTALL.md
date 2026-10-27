# Install and update

Requires macOS on Apple Silicon. Releases and downloads are public; no GitHub login, Node or compiler required.

## Install

```sh
curl -fsSL https://github.com/rakutenanalytics/t3code/releases/latest/download/install.sh | bash
```

Installs the app and the `t3safe` command from the newest release:

| What               | Where                                                             |
| ------------------ | ----------------------------------------------------------------- |
| `T3 Code Safe.app` | `/Applications` if writable, otherwise `~/Applications`           |
| `t3safe` command   | `~/.local/bin` (add it to `PATH` if needed); never creates a `t3` |
| Release files      | `~/.local/share/t3safe/versions/<tag>`                            |
| Data               | `~/.t3-safe`                                                      |

The installer checks every asset it downloads against the release `SHA256SUMS` before extraction and removes quarantine metadata. The script itself arrives over HTTPS from GitHub without a separate check, so you trust GitHub and this repository's release. Open the app, then install and sign in to a provider CLI such as Codex or Claude Code.

## Update

Quit the app, then run the install command again. Repeating an install is supported. Installing a lower version requires `--allow-downgrade`.

```sh
t3safe update                          # same result, from an installed CLI
t3safe update --version v0.1.0-safe.3  # a specific release
```

`t3safe update` downloads the selected release's installer, verifies it against `SHA256SUMS`, then runs it with your existing app-only or CLI-only selection. The desktop app does not update itself.

## Options

Pass options after `bash -s --`:

```sh
curl -fsSL https://github.com/rakutenanalytics/t3code/releases/latest/download/install.sh | bash -s -- --cli-only
```

| Option                      | Effect                                                             |
| --------------------------- | ------------------------------------------------------------------ |
| `--dry-run`                 | Print the plan, change nothing                                     |
| `--cli-only` / `--app-only` | Install one component                                              |
| `--prefix DIR`              | Put command files and the app below `DIR` (relative paths resolve) |
| `--version vX.Y.Z-safe.N`   | Install a specific release                                         |
| `--allow-downgrade`         | Permit installing a lower version than the installed one           |

Read the script first:

```sh
curl -fsSL https://github.com/rakutenanalytics/t3code/releases/latest/download/install.sh -o install.sh
less install.sh
bash install.sh
```

If an earlier safe install left a `t3` symlink pointing into `~/.local/share/t3safe`, the installer removes it and says so; any other `t3` file or link is left alone. An invalid Developer ID signature is rejected; only absent or ad-hoc signatures may be repaired.

The `t3safe doctor` and `t3safe update` commands come from this installer; a DMG-only install has the Settings launcher without them.

## Manual install (DMG)

1. Download the `*-darwin-arm64.dmg` and `SHA256SUMS` from [Releases](https://github.com/rakutenanalytics/t3code/releases).
2. Verify: compare `shasum -a 256 <downloaded.dmg>` with its line in `SHA256SUMS`.
3. Open the DMG and drag `T3 Code Safe.app` anywhere (for example `/Applications` or `~/Applications`).
4. The build is unsigned. Remove quarantine, adjusting the path:

   ```sh
   xattr -dr com.apple.quarantine "/Applications/T3 Code Safe.app"
   ```

5. Open the app. If macOS still blocks it, use System Settings → Privacy & Security → Open Anyway. Device policy may prohibit unsigned apps.
6. Optional terminal command: in the app, open Settings and press **Install** on the CLI command row. It creates `t3safe` only (never `t3`), using the installed app.

## Troubleshooting

- **macOS blocks the app:** run the `xattr` command above, or use Open Anyway.
- **`t3safe: command not found`:** add `~/.local/bin` to `PATH`.
- **Provider (`codex`, `claude`) not detected:** an app launched from Finder finds provider CLIs by running your login shell (`zsh -ilc`, 5 second limit). If the shell startup is slow or the CLI is elsewhere, set Settings → Providers → the provider → Binary path.
- **Checksum mismatch:** stop and download the same release again; do not bypass verification.
- **`403` from the GitHub API:** an anonymous rate limit. Retry later, or pass `--version` to skip the latest-release lookup.

## Coexists with official T3

The safe build has its own identity, so it can run beside the official T3 Code app, dev servers and `npx t3` without sharing anything:

|                                                          | Official T3 Code                           | T3 Code Safe                                  |
| -------------------------------------------------------- | ------------------------------------------ | --------------------------------------------- |
| App                                                      | `T3 Code (Beta).app`, `com.t3tools.t3code` | `T3 Code Safe.app`, `com.rakuten.t3code-safe` |
| Data directory                                           | `~/.t3`                                    | `~/.t3-safe`                                  |
| Home override variable                                   | `T3CODE_HOME`                              | `T3SAFE_HOME`                                 |
| Electron profile (Keychain/safeStorage, browser storage) | `~/Library/Application Support/t3code-v2`  | `~/Library/Application Support/t3code-safe`   |
| First backend port                                       | 3773                                       | 3873                                          |
| Deep link scheme                                         | `t3code://`                                | `t3safe://`                                   |
| Terminal command                                         | `t3`                                       | `t3safe`                                      |

By default the safe build never reads, copies, locks or migrates anything from `~/.t3`, the official Electron profile or `T3CODE_HOME`; it only touches `~/.t3` after you opt in (see below). Nothing is imported automatically: sign in to providers and add projects again in the safe app. To move a project, open its folder in the safe app; do not copy the official database. An ambient `T3CODE_HOME` is ignored. Set `T3SAFE_HOME` only to place safe state somewhere else. The desktop app and `t3safe` share `~/.t3-safe`, so run only one server for it at a time.

## Use your official T3 data

To work in your existing projects and threads instead of a separate copy, opt in. The choice is saved outside both homes, so the desktop app (launched from Finder) and `t3safe` follow it:

```sh
t3safe home              # show the home in use and why
t3safe home use-official # switch to ~/.t3
t3safe home use-isolated # back to ~/.t3-safe (the default)
```

Quit the app and any `t3safe` server, then start again. `T3SAFE_HOME`, when set, still wins over the saved choice. Before you switch:

- Both apps then share one database. Only one server can use a home at a time; the second one refuses to start and names the home.
- A database upgraded by one build may not open in an older build of the other. Keep both current.
- Provider sign-ins stay in each app's own Electron profile, so you may sign in again.
- The safe app also writes its `t3safe` launcher into `~/.t3/bin`.

## Verify and update with `t3safe`

```sh
t3safe version
t3safe doctor
```

Doctor prints the installed version, release policy, effective data directory and where it came from (it notes when that is the official home, and warns for any other path inside `~/.t3`), effective CLI policy when installed, a warning for any legacy `t3` link left by an earlier safe install, and quarantine status. `t3safe` runs any other command through the bundled T3 CLI (CLI installs only), for example `t3safe pair`. App-only installs report the release policy; they do not introspect a running app. Update never executes an installer from main. `npx t3` installs a separate upstream distribution and is outside this installer’s policy boundary.

SHA256 detects a mismatched download. The release and checksums share GitHub trust; they do not provide independent publisher authentication. Release builds also publish GitHub provenance: `gh attestation verify <asset> --repo rakutenanalytics/t3code`.

## Uninstall

Remove the app at the path printed by doctor, then remove `~/.local/bin/t3safe` and `~/.local/share/t3safe`. For a custom prefix, use those paths under the prefix. Never remove `~/.local/bin/t3` unless it is a symlink into `~/.local/share/t3safe` left by an earlier safe install; otherwise it belongs to the official CLI. Safe application data (`~/.t3-safe` and `~/Library/Application Support/t3code-safe`) is retained. Delete it only when you intend to lose the safe app's conversations and credentials; uninstalling never touches official T3 data.
