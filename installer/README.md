# ListenPresence connector installers

## Public users

Windows releases use `ListenPresence-Setup.exe`. It contains the connector and the project's
public Discord application ID, registers Native Messaging for Chrome, Brave, and Chromium,
and shows plain-language completion or error instructions.

macOS releases use notarized ZIP archives. Linux releases use tar.gz archives. Each archive
contains the connector, `install.sh`, `uninstall.sh`, the published extension ID, and the
public Discord application ID. `install.sh` registers Chrome, Brave, and Chromium for the
current user. Release users do not provide either ID.

The Windows connector must be Authenticode-signed before it is embedded in the setup, and
the final setup must be signed separately. The macOS connector must be signed before its ZIP
is submitted to Apple's notary service. Linux release integrity is published through a
detached GPG signature for `SHA256SUMS.txt`.

The setup also accepts `/uninstall` and `--uninstall`.

## Maintainer and development fallback

The installer registers the Native Messaging host for the current Windows user. It writes
only under `HKCU` and `%LOCALAPPDATA%\ListenPresence`. It does not create a Windows service,
scheduled task, login startup entry, public server, or background process.

Build the connector first:

```powershell
go -C native-host build -buildvcs=false -trimpath -ldflags="-s -w" -o ../dist/native-host/listenpresence-connector.exe ./cmd/listenpresence-connector
```

Install for Chrome and Brave:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\windows\install.ps1 `
  -ExtensionId <32-character-extension-id> `
  -DiscordApplicationId <discord-application-id> `
  -Browser Both
```

`ExtensionId` must match the installed extension. For an unpacked extension, copy the ID
shown at `chrome://extensions` or `brave://extensions`. For a Chrome Web Store build, use
the stable Web Store ID. The same extension ID can be registered for both browsers.

The script stores the Discord application ID in the local connector directory. This ID is
not a secret. Create the application in the Discord Developer Portal, set its name to
`ListenPresence`, then upload application artwork if you want a fallback icon. The
extension does not perform Discord OAuth and does not ask for a Discord token.

Uninstall:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\windows\uninstall.ps1 -Browser Both
```

After installation, Chromium launches the connector when the extension calls
`chrome.runtime.connectNative`. The user does not need to start the connector manually.

## macOS and Linux development fallback

Build the current-platform connector:

```sh
npm run build:native
```

Register it for the current user:

```sh
sh installer/unix/install.sh \
  --extension-id <32-character-extension-id> \
  --discord-application-id <discord-application-id> \
  --browser all
```

Uninstall it with `sh installer/unix/uninstall.sh --browser all`. The scripts do not use
administrator access and do not create a service or login startup entry.
