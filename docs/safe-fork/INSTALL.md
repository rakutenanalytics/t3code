# Install and update

Requires macOS on Apple Silicon. Releases and downloads are public; no GitHub login, Node, or compiler required.

## Install with curl

Select a reviewed tag from [Releases](https://github.com/rakutenanalytics/t3code/releases), then download its installer and checksums into an empty directory:

```sh
tag=vX.Y.Z-safe.N # replace with the reviewed release tag
base="https://github.com/rakutenanalytics/t3code/releases/download/$tag"
curl -fSL --proto '=https' --proto-redir '=https' "$base/install.sh" -o install.sh
curl -fSL --proto '=https' --proto-redir '=https' "$base/SHA256SUMS" -o SHA256SUMS
awk '$2 == "install.sh" || $2 == "./install.sh"' SHA256SUMS > INSTALLER-SHA256
[ "$(wc -l < INSTALLER-SHA256 | tr -d ' ')" = 1 ] && shasum -a 256 --check INSTALLER-SHA256 && bash install.sh --version "$tag"
```

The installer verifies each asset before extraction, copies `T3 Code Safe.app` to `/Applications` when writable or `~/Applications` otherwise, and puts only `t3safe` in `~/.local/bin`. It never creates a `t3` command, so the official CLI keeps working. If an earlier safe install left a `t3` symlink pointing into `~/.local/share/t3safe`, the installer removes that symlink and says so; any other `t3` file or link is left alone. Add `~/.local/bin` to PATH if needed. It removes quarantine metadata. A failed Developer ID signature is rejected; only absent or ad-hoc signatures may be repaired. Quit the app before updating.

Add `--cli-only` or `--app-only` to select one component. Inspect the plan with `--dry-run`. `--prefix /path` installs command files and the app below that directory; relative prefixes are normalized. Repeating an install is supported. Installing a lower version requires explicit `--allow-downgrade`, even with `--version`.

## Install from a DMG

Download the `*-darwin-arm64.dmg` and `SHA256SUMS` from [Releases](https://github.com/rakutenanalytics/t3code/releases). Compare `shasum -a 256 <downloaded.dmg>` with its entry before opening it. Drag `T3 Code Safe.app` to Applications; it installs next to the official app without replacing it. A manual DMG install does not install the `t3safe` management command; use the curl installer for it. The Settings "install CLI command" button creates a `t3safe` launcher for the installed app, using the patched build without a download. It never creates `t3`.

These builds have no Apple Developer ID or notarization. Browser downloads can have quarantine metadata. For this reviewed app, remove it with `xattr -dr com.apple.quarantine "/Applications/T3 Code Safe.app"`, adjusting the path to the actual install location. If macOS still blocks launch, use System Settings → Privacy & Security → Open Anyway when available. Device policy may prohibit an unsigned app. Curl normally does not set download quarantine, and the installer clears it explicitly; launch on every managed Mac is not guaranteed.

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

The safe build never reads, copies, locks or migrates anything from `~/.t3`, the official Electron profile or `T3CODE_HOME`. Nothing is imported automatically: sign in to providers and add projects again in the safe app. To move a project, open its folder in the safe app; do not copy the official database. An ambient `T3CODE_HOME` is ignored. Set `T3SAFE_HOME` only to place safe state somewhere else. The desktop app and `t3safe` share `~/.t3-safe`, so run only one server for it at a time.

## Verify and update

```sh
t3safe version
t3safe doctor
t3safe update
```

Doctor prints the installed version, release policy, data directory (and warns if it points inside `~/.t3`), effective CLI policy when installed, a warning for any legacy `t3` link left by an earlier safe install, and quarantine status. `t3safe` runs any other command through the bundled T3 CLI (CLI installs only), for example `t3safe pair`. App-only installs report the release policy; they do not introspect a running app. Update resolves the selected release, downloads its installer and SHA256SUMS, verifies the installer before execution, and preserves app-only or CLI-only selection. It never executes the installer from main. Use `t3safe update --version vX.Y.Z-safe.N` for a specific version. Use this updater for safe releases. `npx t3` installs a separate upstream distribution and is outside this installer’s policy boundary.

SHA256 detects a mismatched download. The release and checksums share GitHub trust; they do not provide independent publisher authentication. Release builds also publish GitHub provenance: `gh attestation verify <asset> --repo rakutenanalytics/t3code`.

## Uninstall

Remove the app at the path printed by doctor, then remove `~/.local/bin/t3safe` and `~/.local/share/t3safe`. For a custom prefix, use those paths under the prefix. Never remove `~/.local/bin/t3` unless it is a symlink into `~/.local/share/t3safe` left by an earlier safe install; otherwise it belongs to the official CLI. Safe application data (`~/.t3-safe` and `~/Library/Application Support/t3code-safe`) is retained. Delete it only when you intend to lose the safe app's conversations and credentials; uninstalling never touches official T3 data.

If a command is missing, check `~/.local/bin` is on PATH. On a checksum mismatch, stop and download the same release again; do not bypass verification. A `403` from the public GitHub API can be an anonymous rate limit; retry later or choose `--version` to avoid latest-release lookup.
