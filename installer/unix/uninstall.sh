#!/bin/sh

set -eu

host_name='com.listenpresence.connector'
browser='all'

while [ "$#" -gt 0 ]; do
  case "$1" in
    --browser)
      browser=${2-}
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
    printf 'This uninstaller supports macOS and Linux.\n' >&2
    exit 1
    ;;
esac

remove_manifest() {
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
  rm -f "$manifest_directory/$host_name.json"
}

if [ "$browser" = 'all' ]; then
  for target_browser in chrome brave chromium; do
    remove_manifest "$target_browser"
  done
else
  remove_manifest "$browser"
fi

case "$install_root" in
  */ListenPresence)
    rm -f "$install_root/listenpresence-connector"
    rm -f "$install_root/config.json"
    rm -f "$install_root/$host_name.json"
    rmdir "$install_root" 2>/dev/null || true
    ;;
  *)
    printf 'Refusing to remove an unexpected installation path.\n' >&2
    exit 1
    ;;
esac

printf 'ListenPresence connector registration and per-user files were removed.\n'
