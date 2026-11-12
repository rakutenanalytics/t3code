#!/usr/bin/env bash
# Run by the maintainer only. Stdout is the base64 PKCS#12 secret; never run with shell tracing.
set -euo pipefail
umask 077
: "${SAFE_SIGNING_P12_PASSWORD:?Set a strong PKCS#12 password first}"
export SAFE_SIGNING_P12_PASSWORD
# Private material stays in shell memory and pipes. Only the public fingerprint is written to disk.
private_key=$(openssl genrsa 4096 2>/dev/null)
certificate=$(printf '%s\n' "$private_key" | openssl req -new -x509 -key /dev/stdin -sha256 -days 3650 \
  -subj '/CN=T3 Code Safe Release Signing/' \
  -addext 'basicConstraints=critical,CA:FALSE' \
  -addext 'keyUsage=critical,digitalSignature' \
  -addext 'extendedKeyUsage=critical,codeSigning')
printf '%s\n' "$certificate" | openssl x509 -noout -fingerprint -sha256 | cut -d= -f2 | tr -d ':' | tr '[:upper:]' '[:lower:]' > security/signing-certificate.sha256
printf 'Public certificate SHA-256: %s\n' "$(cat security/signing-certificate.sha256)" >&2
openssl pkcs12 -export -name 'T3 Code Safe Release Signing' \
  -inkey <(printf '%s\n' "$private_key") -in <(printf '%s\n' "$certificate") \
  -certpbe PBE-SHA1-3DES -keypbe PBE-SHA1-3DES -macalg sha1 \
  -passout env:SAFE_SIGNING_P12_PASSWORD | base64 | tr -d '\n'
