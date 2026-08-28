#!/bin/sh

set -eu

host_name='com.listenpresence.connector'
browser='all'
connector=''
extension_id=''
application_id=''

while [ "$#" -gt 0 ]; do
  case "$1" in
    --extension-id)
      extension_id=${2-}
      shift 2
      ;;
    --discord-application-id)
      application_id=${2-}
      shift 2
      ;;
    --browser)
      browser=${2-}
      shift 2
      ;;
    --connector)
      connector=${2-}
      shift 2
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      exit 2
      ;;
  esac
done

case "$browser" in
  chrome|brave|chromium|all) ;;
  *)
    printf 'Browser must be chrome, brave, chromium, or all.\n' >&2
    exit 2
    ;;
esac

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
if [ -z "$extension_id" ] && [ -f "$script_directory/.listenpresence-extension-id" ]; then
  extension_id=$(sed -n '1p' "$script_directory/.listenpresence-extension-id")
fi
if [ -z "$application_id" ] && [ -f "$script_directory/.listenpresence-discord-application-id" ]; then
  application_id=$(sed -n '1p' "$script_directory/.listenpresence-discord-application-id")
fi
if ! printf '%s' "$extension_id" | grep -Eq '^[a-p]{32}$'; then
  printf 'Extension ID must contain 32 letters from a to p.\n' >&2
  exit 2
fi
if ! printf '%s' "$application_id" | grep -Eq '^[0-9]{17,20}$'; then
  printf 'Discord application ID must contain 17 to 20 digits.\n' >&2
  exit 2
fi
if [ -z "$connector" ]; then
  if [ -f "$script_directory/listenpresence-connector" ]; then
    connector="$script_directory/listenpresence-connector"
  else
    connector="$script_directory/../../dist/native-host/listenpresence-connector"
  fi
fi
if [ ! -f "$connector" ]; then
  printf 'Connector binary was not found: %s\n' "$connector" >&2
  exit 1
fi
connector_directory=$(CDPATH= cd -- "$(dirname -- "$connector")" && pwd -P)
connector="$connector_directory/$(basename -- "$connector")"

platform=$(uname -s)
case "$platform" in
  Darwin)
    install_root="$HOME/Library/Application Support/ListenPresence"
    ;;
  Linux)
    data_home=${XDG_DATA_HOME:-"$HOME/.local/share"}
    install_root="$data_home/ListenPresence"
    ;;
  *)
    printf 'This installer supports macOS and Linux.\n' >&2
    exit 1
    ;;
esac

mkdir -p "$install_root"
installed_connector="$install_root/listenpresence-connector"
cp "$connector" "$installed_connector"
chmod 755 "$installed_connector"
printf '{"discordApplicationId":"%s"}\n' "$application_id" > "$install_root/config.json"

escaped_connector=$(printf '%s' "$installed_connector" | sed 's/\\/\\\\/g; s/"/\\"/g')
manifest="$install_root/$host_name.json"
printf '{\n  "name": "%s",\n  "description": "ListenPresence local Discord Rich Presence connector",\n  "path": "%s",\n  "type": "stdio",\n  "allowed_origins": ["chrome-extension://%s/"]\n}\n' \
  "$host_name" "$escaped_connector" "$extension_id" > "$manifest"

register_manifest() {
  target_browser=$1
  case "$platform:$target_browser" in
    Darwin:chrome)
      manifest_directory="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
      ;;
    Darwin:brave)
      manifest_directory="$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
      ;;
    Darwin:chromium)
      manifest_directory="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
      ;;
    Linux:chrome)
      config_home=${XDG_CONFIG_HOME:-"$HOME/.config"}
      manifest_directory="$config_home/google-chrome/NativeMessagingHosts"
      ;;
    Linux:brave)
      config_home=${XDG_CONFIG_HOME:-"$HOME/.config"}
      manifest_directory="$config_home/BraveSoftware/Brave-Browser/NativeMessagingHosts"
      ;;
    Linux:chromium)
      config_home=${XDG_CONFIG_HOME:-"$HOME/.config"}
      manifest_directory="$config_home/chromium/NativeMessagingHosts"
      ;;
  esac
  mkdir -p "$manifest_directory"
  cp "$manifest" "$manifest_directory/$host_name.json"
  printf 'Registered ListenPresence for %s.\n' "$target_browser"
}

if [ "$browser" = 'all' ]; then
  for target_browser in chrome brave chromium; do
    register_manifest "$target_browser"
  done
else
  register_manifest "$browser"
fi

printf 'ListenPresence connector installed for the current user.\n'
printf 'No service or login startup entry was created.\n'
