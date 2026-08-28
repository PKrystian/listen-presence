# Installation

The extension and connector are separate. Chrome Web Store or Brave extension installation
does not install a local executable automatically. Install the connector once per operating
system user on Windows, macOS, or Linux.

## End-user installation

After the extension is published, a user does not need Git, Node.js, Go, PowerShell
parameters, a Discord application ID, or a GitHub account.

1. Install ListenPresence from the Chrome Web Store, or open the same listing in Brave or a
   compatible Chromium browser.
2. Open the [latest release](https://github.com/PKrystian/listen-presence/releases/latest).
3. On Windows, download and run `ListenPresence-Setup.exe`.
4. On macOS or Linux, download the archive matching the operating system and CPU. Use
   `darwin-arm64` for Apple Silicon, `darwin-amd64` for Intel Macs, `linux-amd64` for most
   Linux PCs, or `linux-arm64` for 64-bit ARM. Extract it and run `sh install.sh`.
5. Start Discord Desktop and open YouTube Music.
6. Play a track. The connector starts automatically when the extension needs it.

Release packages already contain the connector, published extension ID, and the project's
public Discord application ID. The user does not paste any IDs and does not start the
connector manually. Every platform registers Chrome, Brave, and Chromium for the current
user.

Official Windows releases must have a valid Authenticode publisher signature. Official
macOS ZIPs must contain a Developer ID-signed connector and be accepted by Apple's notary
service. Linux archives are covered by the signed `SHA256SUMS.txt` release manifest. Do not
install a public release whose signatures or checksums do not match the release notes.

To remove the installation, run `ListenPresence-Setup.exe /uninstall` on Windows or
`sh uninstall.sh` from the macOS or Linux package.

## Build from source

```powershell
npm ci
npm run build:extension
npm run build:native
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
installation path for public users. Public releases use the self-contained Windows setup or
a preconfigured macOS/Linux archive.

On macOS or Linux, register a development build with:

```sh
sh installer/unix/install.sh \
  --extension-id <extension-id> \
  --discord-application-id <discord-application-id> \
  --browser all
```

The script writes only to the current user's application data and browser configuration
directories. `--browser` also accepts `chrome`, `brave`, or `chromium`.

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

On macOS or Linux:

```sh
sh installer/unix/uninstall.sh --browser all
```

Then remove the unpacked extension from the browser's extensions page.

## Troubleshooting

- `Connector missing`: confirm the browser extension ID and Native Messaging manifest path.
- `Discord disconnected`: start Discord Desktop and retry the popup status.
- No track metadata: reload YouTube Music, play a track, and inspect the content script.
- No image: YouTube Music may have returned an image host not included in the strict
  allowlist; the activity can still show text.
- Store installation: use the exact Web Store extension ID, not a development ID.
- Linux with Discord from Flatpak: keep the default Discord RPC socket integration enabled.
  ListenPresence checks both the standard runtime socket and the Flatpak application socket.
