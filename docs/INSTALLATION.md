# Installation

The extension and connector are separate. Chrome Web Store or Brave extension installation
does not install a local executable automatically. Install the connector once per Windows
user.

## End-user installation

After the extension is published, a user does not need Git, Node.js, Go, PowerShell
parameters, a Discord application ID, or a GitHub account.

1. Install ListenPresence from the Chrome Web Store, or click `Add to Brave` in Brave.
2. Download [ListenPresence-Setup.exe](https://github.com/PKrystian/listen-presence/releases/latest/download/ListenPresence-Setup.exe).
3. Double-click the setup file and accept the Windows security prompt if Windows shows one.
4. Start Discord Desktop and open YouTube Music.
5. Play a track. The connector starts automatically when the extension needs it.

The setup file already contains the connector and the project's public Discord application
ID. It registers Native Messaging for both Chrome and Brave for the published extension ID.
The user does not paste any IDs and does not start the connector manually.

To remove the installation, run `ListenPresence-Setup.exe /uninstall` or use the PowerShell
fallback below.

## Build from source

```powershell
npm ci
npm run build:extension
go -C native-host build -buildvcs=false -trimpath -ldflags="-s -w" -o ../dist/native-host/listenpresence-connector.exe ./cmd/listenpresence-connector
```

## Load the extension in Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked and select the repository's `dist/extension` directory.
4. Copy the 32-character extension ID shown by Chrome.

## Load the extension in Brave

1. Open `brave://extensions`.
2. Enable Developer mode.
3. Click Load unpacked and select the same `dist/extension` directory.
4. Copy the extension ID shown by Brave.

The ID should be stable for the same unpacked directory in that browser profile. A Web
Store extension has its own stable ID and requires that ID in the Native Messaging manifest.

## Register the connector for development builds

Run PowerShell as the current user:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\windows\install.ps1 `
  -ExtensionId <extension-id> `
  -DiscordApplicationId <discord-application-id> `
  -Browser Both
```

No administrator permission should be needed. The script writes `HKCU` and
`%LOCALAPPDATA%\ListenPresence` only. It does not create a service or startup entry.

This script is for maintainers and unpacked development builds. It is not the recommended
installation path for public users. Public releases use the self-contained
`ListenPresence-Setup.exe`.

For unpacked development builds, Chrome and Brave can assign different extension IDs.
In that case run the installer once with `-Browser Chrome` and the Chrome ID, then again
with `-Browser Brave` and the Brave ID. Use `-Browser Both` after publishing when both
browsers use the same Chrome Web Store extension ID.

## Use it

1. Start Discord Desktop.
2. Open YouTube Music at `https://music.youtube.com/`.
3. Play a track.
4. Open the ListenPresence popup and check Connector and Discord Desktop status.
5. Look at your Discord profile or ask a friend to verify the activity.

## Uninstall

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\windows\uninstall.ps1 -Browser Both
```

Then remove the unpacked extension from the browser's extensions page.

## Troubleshooting

- `Connector missing`: confirm the browser extension ID and registry browser path.
- `Discord disconnected`: start Discord Desktop and retry the popup status.
- No track metadata: reload YouTube Music, play a track, and inspect the content script.
- No image: YouTube Music may have returned an image host not included in the strict
  allowlist; the activity can still show text.
- Store installation: use the exact Web Store extension ID, not a development ID.
