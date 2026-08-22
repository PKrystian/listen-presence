# ListenPresence Windows installer

## Public users

Public releases use `ListenPresence-Setup.exe`. It contains the connector and the project's
public Discord application ID, registers Native Messaging for Chrome and Brave, and shows
plain-language completion or error instructions. The user only needs to double-click it.

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
