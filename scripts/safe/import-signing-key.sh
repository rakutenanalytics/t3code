#!/usr/bin/env bash
set -euo pipefail
umask 077
[[ ${GITHUB_REPOSITORY:-} == rakutenanalytics/t3code && ${GITHUB_REF:-} == refs/heads/main ]] || {
  echo 'Signing is restricted to rakutenanalytics/t3code main.' >&2; exit 1;
}
: "${SAFE_SIGNING_P12_BASE64:?Missing release environment secret}"
: "${SAFE_SIGNING_P12_PASSWORD:?Missing release environment secret}"
: "${RUNNER_TEMP:?}"
: "${GITHUB_ENV:?}"
keychain="$RUNNER_TEMP/t3safe-signing.keychain-db"
archive="$RUNNER_TEMP/t3safe-signing.p12"
certificate="$RUNNER_TEMP/t3safe-signing.pem"
trap 'rm -f "$archive"' EXIT
keychain_password=$(openssl rand -hex 32)
printf '%s' "$SAFE_SIGNING_P12_BASE64" | base64 --decode > "$archive"
security create-keychain -p "$keychain_password" "$keychain"
security set-keychain-settings -lut 7200 "$keychain"
security unlock-keychain -p "$keychain_password" "$keychain"
security import "$archive" -k "$keychain" -P "$SAFE_SIGNING_P12_PASSWORD" -T /usr/bin/codesign >/dev/null
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$keychain_password" "$keychain" >/dev/null
security find-certificate -p "$keychain" > "$certificate"
identity=$(openssl x509 -in "$certificate" -noout -fingerprint -sha1 | cut -d= -f2 | tr -d ':')
fingerprint=$(openssl x509 -in "$certificate" -noout -fingerprint -sha256 | cut -d= -f2 | tr -d ':' | tr '[:upper:]' '[:lower:]')
expected=$(cat security/signing-certificate.sha256)
[[ "$fingerprint" == "$expected" ]] || { echo 'Release certificate differs from the reviewed fingerprint.' >&2; exit 1; }
# Trust exists only on the ephemeral GitHub runner. The app requirement pins the leaf, not this trust store.
sudo /usr/bin/security add-trusted-cert -d -r trustRoot -p codeSign -k "$keychain" "$certificate"
printf 'SAFE_SIGNING_KEYCHAIN=%s\nSAFE_SIGNING_IDENTITY=%s\n' "$keychain" "$identity" >> "$GITHUB_ENV"
printf '%s\n' "$fingerprint" > "$RUNNER_TEMP/signing-certificate.sha256"
