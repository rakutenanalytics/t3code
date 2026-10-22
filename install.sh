#!/usr/bin/env bash
set -euo pipefail

repository=rakutenanalytics/t3code
version=
mode=both
dry_run=false
prefix=
usage() {
  printf '%s\n' 'Usage: install.sh [--version vX.Y.Z-safe.N] [--cli-only|--app-only] [--dry-run] [--prefix DIR]'
}
fail() { printf 't3safe: %s\n' "$*" >&2; exit 1; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) [[ $# -ge 2 ]] || fail '--version needs a tag'; version=$2; shift 2 ;;
    --prefix) [[ $# -ge 2 && -n "$2" ]] || fail '--prefix needs a directory'; prefix=$2; shift 2 ;;
    --cli-only) mode=cli; shift ;;
    --app-only) mode=app; shift ;;
    --dry-run) dry_run=true; shift ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; fail "Unknown option: $1" ;;
  esac
done
[[ $(uname -s) == Darwin && $(uname -m) == arm64 ]] || fail 'Requires macOS on Apple Silicon.'
if [[ -n "$version" ]]; then
  [[ "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-safe\.[0-9]+$ ]] || fail 'Expected vX.Y.Z-safe.N.'
fi
install_root=${prefix:-"$HOME/.local"}
app_dir="$HOME/Applications"
if [[ -w /Applications ]]; then app_dir=/Applications; fi
if [[ -n "$prefix" ]]; then app_dir="$prefix/Applications"; fi
if $dry_run; then
  printf 'Resolve %s from public GitHub API: %s\n' "${version:-latest safe release}" "$repository"
  printf 'Download selected assets and SHA256SUMS with curl; verify SHA256 before extraction.\n'
  printf 'Install mode: %s\nManagement command: %s/bin/t3safe\nCLI versions: %s/share/t3safe/versions\nApp directory: %s\n' "$mode" "$install_root" "$install_root" "$app_dir"
  printf 'Strip com.apple.quarantine; verify signatures, ad-hoc sign if needed; publish symlinks.\n'
  exit 0
fi
for command in curl plutil shasum tar ditto hdiutil xattr codesign; do command -v "$command" >/dev/null || fail "Missing command: $command"; done
work=$(mktemp -d "${TMPDIR:-/tmp}/t3safe-install.XXXXXX")
mounted=false
cleanup() {
  if $mounted; then hdiutil detach "$work/mount" -quiet || true; fi
  rm -rf "$work"
}
trap cleanup EXIT
curl_public() { curl --fail --silent --show-error --location --retry 3 --proto '=https' --proto-redir '=https' "$@"; }
if [[ -z "$version" ]]; then
  curl_public "https://api.github.com/repos/$repository/releases/latest" -o "$work/release.json"
  version=$(plutil -extract tag_name raw -o - "$work/release.json")
  [[ "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-safe\.[0-9]+$ ]] || fail 'Latest release is not a safe release. Select --version explicitly.'
fi
release_url="https://github.com/$repository/releases/download/$version"
curl_public "$release_url/SHA256SUMS" -o "$work/SHA256SUMS"
download_verified() {
  local name=$1 expected actual
  curl_public "$release_url/$name" -o "$work/$name"
  expected=$(awk -v name="$name" '$2 == name || $2 == "./" name { print $1 }' "$work/SHA256SUMS")
  [[ "$expected" =~ ^[a-fA-F0-9]{64}$ ]] || fail "Missing or duplicate checksum: $name"
  actual=$(shasum -a 256 "$work/$name")
  actual=${actual%% *}
  [[ "$actual" == "$expected" ]] || fail "Checksum mismatch: $name"
}
for asset in t3safe managed-policy.json VERSION; do download_verified "$asset"; done
[[ $(cat "$work/VERSION") == "$version" ]] || fail 'Release VERSION does not match selected tag.'
release_dir="$install_root/share/t3safe/versions/$version"
mkdir -p "$work/payload" "$install_root/bin" "$(dirname "$release_dir")"
if [[ "$mode" != app ]]; then
  archive="t3safe-${version#v}-darwin-arm64.tar.gz"
  download_verified "$archive"
  archive_root="t3-${version#v}-darwin-arm64"
  tar -tzf "$work/$archive" > "$work/archive-files"
  if ! awk -v root="$archive_root" 'index($0, root "/") != 1 || $0 ~ /(^|\/)\.\.(\/|$)/ { bad=1 } END { exit bad }' "$work/archive-files"; then fail 'Unexpected CLI archive paths.'; fi
  tar -xzf "$work/$archive" -C "$work/payload" --strip-components=1
  [[ -x "$work/payload/t3" ]] || fail 'CLI executable missing.'
  xattr -dr com.apple.quarantine "$work/payload"
  codesign --verify "$work/payload/t3" 2>/dev/null || codesign --force --sign - --preserve-metadata=entitlements,requirements,flags,runtime --timestamp=none "$work/payload/t3"
  codesign --verify "$work/payload/t3"
fi
if [[ "$mode" != cli ]]; then
  dmg="t3safe-${version#v}-darwin-arm64.dmg"
  download_verified "$dmg"
  mkdir "$work/mount"
  hdiutil attach "$work/$dmg" -readonly -nobrowse -mountpoint "$work/mount" -quiet
  mounted=true
  apps=("$work/mount/"*.app)
  [[ ${#apps[@]} -eq 1 && -d "${apps[0]}" ]] || fail 'Expected one app in DMG.'
  app_name=$(basename "${apps[0]}")
  ditto "${apps[0]}" "$work/installed.app"
  xattr -dr com.apple.quarantine "$work/installed.app"
  codesign --verify --deep "$work/installed.app" 2>/dev/null || codesign --force --deep --sign - --preserve-metadata=entitlements,requirements,flags,runtime --timestamp=none "$work/installed.app"
  codesign --verify --deep "$work/installed.app"
  mkdir -p "$app_dir"
  if [[ -e "$app_dir/$app_name" ]]; then
    [[ -d "$app_dir/$app_name/Contents" && ! -L "$app_dir/$app_name" ]] || fail "Unexpected app destination: $app_dir/$app_name"
    rm -rf "${app_dir:?}/${app_name:?}"
  fi
  ditto "$work/installed.app" "$app_dir/$app_name"
  printf '%s\n' "$app_dir/$app_name" > "$work/payload/APP_PATH"
fi
# Preserve the other component when repeating an app-only or CLI-only install of this version.
mkdir -p "$release_dir"
ditto "$work/payload" "$release_dir"
for asset in t3safe managed-policy.json VERSION; do cp "$work/$asset" "$release_dir/$asset"; done
chmod +x "$release_dir/t3safe"
ln -sfn "$release_dir/t3safe" "$install_root/bin/t3safe"
if [[ "$mode" != app ]]; then ln -sfn "$release_dir/t3" "$install_root/bin/t3"; fi
printf 'Installed %s (%s). Add %s/bin to PATH, then run t3safe doctor.\n' "$version" "$mode" "$install_root"
