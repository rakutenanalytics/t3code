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

The installer verifies each asset before extraction, copies the app to `/Applications` when writable or `~/Applications` otherwise, and puts `t3` and `t3safe` in `~/.local/bin`. Add that directory to PATH if needed. It removes quarantine metadata. A failed Developer ID signature is rejected; only absent or ad-hoc signatures may be repaired. Quit the app before updating.

Add `--cli-only` or `--app-only` to select one component. Inspect the plan with `--dry-run`. `--prefix /path` installs command files and the app below that directory; relative prefixes are normalized. Repeating an install is supported. Installing a lower version requires explicit `--allow-downgrade`, even with `--version`.

## Install from a DMG

Download the `*-darwin-arm64.dmg` and `SHA256SUMS` from [Releases](https://github.com/rakutenanalytics/t3code/releases). Compare `shasum -a 256 <downloaded.dmg>` with its entry before opening it. Drag the app to Applications. A manual DMG install does not install `t3safe`; use the curl installer for its management commands. The Settings "install CLI command" button creates a `t3` launcher for the installed app, using the patched build without a download; `t3safe` still needs the curl installer.

These builds have no Apple Developer ID or notarization. Browser downloads can have quarantine metadata. For this reviewed app, remove it with `xattr -dr com.apple.quarantine "/Applications/T3 Code (Beta).app"`, adjusting the path to the actual app name. If macOS still blocks launch, use System Settings → Privacy & Security → Open Anyway when available. Device policy may prohibit an unsigned app. Curl normally does not set download quarantine, and the installer clears it explicitly; launch on every managed Mac is not guaranteed.

The fork currently shares upstream app identity and data paths. Installing it can replace an existing T3 Code app and use its existing state. Keep a backup and avoid running both versions together.

## Verify and update

```sh
t3safe version
t3safe doctor
t3safe update
```

Doctor prints the installed version, release policy, effective CLI policy when installed, and quarantine status. App-only installs report the release policy; they do not introspect a running app. Update resolves the selected release, downloads its installer and SHA256SUMS, verifies the installer before execution, and preserves app-only or CLI-only selection. It never executes the installer from main. Use `t3safe update --version vX.Y.Z-safe.N` for a specific version. Use this updater for safe releases. `npx t3` installs a separate upstream distribution and is outside this installer’s policy boundary.

SHA256 detects a mismatched download. The release and checksums share GitHub trust; they do not provide independent publisher authentication. Release builds also publish GitHub provenance: `gh attestation verify <asset> --repo rakutenanalytics/t3code`.

## Uninstall

Remove the app at the path printed by doctor, then remove `~/.local/bin/t3`, `~/.local/bin/t3safe`, and `~/.local/share/t3safe`. For a custom prefix, use those paths under the prefix. Application data is retained. Do not remove T3 data unless you intend to delete conversations and credentials.

If a command is missing, check `~/.local/bin` is on PATH. On a checksum mismatch, stop and download the same release again; do not bypass verification. A `403` from the public GitHub API can be an anonymous rate limit; retry later or choose `--version` to avoid latest-release lookup.
