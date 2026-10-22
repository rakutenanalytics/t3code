# Install and update

Requires macOS on Apple Silicon. Releases and downloads are public; no GitHub login, Node, or compiler required.

## Install with curl

```sh
curl -fsSL https://raw.githubusercontent.com/rakutenanalytics/t3code/main/install.sh | bash
```

The installer resolves the latest safe release, verifies SHA256 checksums, copies the app to `/Applications` when writable or `~/Applications` otherwise, and puts `t3` and `t3safe` in `~/.local/bin`. Add that directory to PATH if needed. It removes `com.apple.quarantine` and uses ad-hoc signing when the existing signature needs repair. Quit the app before updating.

For a CLI-only install:

```sh
curl -fsSL https://raw.githubusercontent.com/rakutenanalytics/t3code/main/install.sh | bash -s -- --cli-only
```

Use `--app-only` for desktop alone or `--version vX.Y.Z-safe.N` to pin a release. Inspect the plan with `--dry-run`. `--prefix /path` installs command files and the app below that directory. Repeating an install is supported.

## Install from a DMG

Download the `*-darwin-arm64.dmg` and `SHA256SUMS` from [Releases](https://github.com/rakutenanalytics/t3code/releases). Compare `shasum -a 256 <downloaded.dmg>` with its entry before opening it. Drag the app to Applications. A manual DMG install does not install `t3safe`; use the curl installer for its management commands.

These builds have no Apple Developer ID or notarization. Browser downloads can have quarantine metadata. For this reviewed app, remove it with `xattr -dr com.apple.quarantine "/Applications/T3 Code (Beta).app"`, adjusting the path to the actual app name. If macOS still blocks launch, use System Settings → Privacy & Security → Open Anyway when available. Device policy may prohibit an unsigned app. Curl normally does not set download quarantine, and the installer clears it explicitly; launch on every managed Mac is not guaranteed.

The fork currently shares upstream app identity and data paths. Installing it can replace an existing T3 Code app and use its existing state. Keep a backup and avoid running both versions together.

## Verify and update

```sh
t3safe version
t3safe doctor
t3safe update
```

Doctor prints the installed version, release policy, effective CLI policy when installed, and quarantine status. App-only installs report the release policy; they do not introspect a running app. Update reruns the public installer, preserving app-only or CLI-only selection. Use `t3safe update --version vX.Y.Z-safe.N` for a specific version. Use this updater for safe builds; upstream `t3 update`, `npx t3`, SSH provisioning and service bootstrap still follow upstream distribution paths.

SHA256 detects a mismatched download. The release and checksums share GitHub trust; they do not provide independent publisher authentication.

## Uninstall

Remove the app at the path printed by doctor, then remove `~/.local/bin/t3`, `~/.local/bin/t3safe`, and `~/.local/share/t3safe`. For a custom prefix, use those paths under the prefix. Application data is retained. Do not remove T3 data unless you intend to delete conversations and credentials.

If a command is missing, check `~/.local/bin` is on PATH. On a checksum mismatch, stop and download the same release again; do not bypass verification. A `403` from the public GitHub API can be an anonymous rate limit; retry later or choose `--version` to avoid latest-release lookup.
