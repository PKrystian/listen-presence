#!/bin/sh

set -eu

if [ "$(uname -s)" != 'Darwin' ]; then
  printf 'macOS signing and notarization must run on macOS.\n' >&2
  exit 1
fi

if [ -z "${LISTENPRESENCE_APPLE_SIGNING_IDENTITY:-}" ]; then
  printf 'LISTENPRESENCE_APPLE_SIGNING_IDENTITY is required.\n' >&2
  exit 2
fi
if [ -z "${LISTENPRESENCE_APPLE_NOTARY_PROFILE:-}" ]; then
  printf 'LISTENPRESENCE_APPLE_NOTARY_PROFILE is required.\n' >&2
  exit 2
fi

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
root=$(CDPATH= cd -- "$script_directory/.." && pwd -P)

for architecture in amd64 arm64; do
  connector="$root/dist/native-host/listenpresence-connector-darwin-$architecture"
  if [ ! -f "$connector" ]; then
    printf 'Connector build was not found: %s\n' "$connector" >&2
    exit 1
  fi
  codesign --force --options runtime --timestamp \
    --sign "$LISTENPRESENCE_APPLE_SIGNING_IDENTITY" "$connector"
  codesign --verify --strict --verbose=2 "$connector"
done

node "$root/scripts/build-unix-packages.mjs" --platform darwin

for architecture in amd64 arm64; do
  archive="$root/dist/release/listenpresence-darwin-$architecture.zip"
  xcrun notarytool submit "$archive" \
    --keychain-profile "$LISTENPRESENCE_APPLE_NOTARY_PROFILE" \
    --wait
  spctl --assess --type execute --verbose=2 \
    "$root/dist/native-host/listenpresence-connector-darwin-$architecture"
done

printf 'The macOS connectors are signed, packaged, notarized, and verified.\n'
