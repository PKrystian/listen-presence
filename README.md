# ListenPresence

ListenPresence shows the track currently playing in YouTube Music as Discord Rich Presence.
Start with the user instructions below if you only want to use the application.

## Install for users

ListenPresence has two parts: the browser extension and a small local connector for Windows,
macOS, or Linux. Install both once.

1. Install ListenPresence from the Chrome Web Store. In Brave or another compatible Chromium
   browser, open the same listing and install the extension.
2. Open the [latest release](https://github.com/PKrystian/listen-presence/releases/latest).
3. On Windows, download and run `ListenPresence-Setup.exe`. On macOS or Linux, download the
   archive matching the operating system and CPU, extract it, and run `sh install.sh`.
4. Start Discord Desktop.
5. Open `https://music.youtube.com/` and play a track.

The connector starts automatically when the extension needs it. No manual connector launch
is required.

Users do not need a GitHub account, Node.js, Go, PowerShell parameters, a Discord
Application ID, a Discord token, OAuth, or their own Discord application. The setup already
contains the project's public connector configuration.

The Chrome Web Store can install the browser extension but cannot silently install a local
executable. That is why the one-time connector installation is required on every platform.

### If something does not work

- `Connector missing`: install the connector package for the current operating system, then
  click `Refresh` in the extension popup.
- `Discord disconnected`: start Discord Desktop and make sure activity sharing is enabled.
- No track appears: reload YouTube Music and play a track again.
- The activity is stale: pause and play the track, or click `Refresh` in the popup.
- Connector update fails: close Chrome, Brave, and Chromium, then run the installer again.

### Remove ListenPresence

1. Remove the extension from the browser's extensions page.
2. On Windows, run `ListenPresence-Setup.exe /uninstall`. On macOS or Linux, run
   `sh uninstall.sh` from the extracted connector package.

The setup removes the per-user connector files and Native Messaging registrations. It does
not create a service, scheduled task, or startup entry.

## Privacy at a glance

- The content script runs only on `https://music.youtube.com/*`.
- Only playback metadata is read: title, artist, album, image, URL, state, position, and
  duration.
- The extension stores only the local sharing setting.
- Metadata travels through the local Native Messaging pipe to the connector and then through
  Discord Desktop local IPC.
- There is no backend, telemetry, Discord login, user token, cookie, history, or password
  access.

Read [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for the complete details.

## Features

- Manifest V3 extension written in TypeScript
- YouTube Music metadata from the player DOM and Media Session API
- Play, pause, next, previous, seek, route, and SPA change detection
- Discord Listening activity with title, artist, album, thumbnail, timestamps, and a link
  back to YouTube Music
- Local sharing toggle and connector status in the popup
- Per-user connector installers for Windows, macOS, and Linux
- Strict Native Messaging protocol with only `ping`, `set_activity`, `clear_activity`, and
  `get_status`
- No telemetry, cookies, history, passwords, Discord OAuth, user tokens, or backend

## Requirements

End users need only:

- Windows 10 or newer, a currently supported macOS version, or a desktop Linux distribution
- Chrome, Brave, or another Chromium browser with Manifest V3 support
- Discord Desktop running and activity sharing enabled

Node.js 22 or newer, npm, and Go 1.22 or newer are needed only to build from source.

## Development

```powershell
npm ci
npm run verify
go -C native-host test ./...
go -C installer/windows test ./...
npm run build:all
```

Load `dist/extension` at `chrome://extensions` or `brave://extensions` with Developer mode
and Load unpacked. Copy the extension ID shown by the browser.

For an unpacked development extension, register the per-user host with the development ID:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\windows\install.ps1 `
  -ExtensionId <extension-id> `
  -DiscordApplicationId <discord-application-id> `
  -Browser Chrome
```

On macOS or Linux, build the current-platform connector and register it with:

```sh
npm run build:native
sh installer/unix/install.sh \
  --extension-id <extension-id> \
  --discord-application-id <discord-application-id> \
  --browser all
```

The Discord application ID is configured in `config.json` under the local connector
directory. It is an identifier, not a secret. See [docs/DISCORD_SETUP.md](docs/DISCORD_SETUP.md)
and [docs/INSTALLATION.md](docs/INSTALLATION.md).

For unpacked development builds, use each browser's own extension ID if Chrome and Brave
do not assign the same ID. The published Web Store ID can use `-Browser Both`.

For public GitHub, Chrome Web Store, Brave, release, and Discord tasks, see
[docs/PUBLISHING.md](docs/PUBLISHING.md).

## Commands

| Command                                                               | Purpose                                  |
| --------------------------------------------------------------------- | ---------------------------------------- |
| `npm run typecheck`                                                   | Check extension TypeScript               |
| `npm run lint`                                                        | Run ESLint                               |
| `npm run format:check`                                                | Check Prettier formatting                |
| `npm test`                                                            | Run parser, protocol, and presence tests |
| `npm run build:extension`                                             | Produce `dist/extension`                 |
| `npm run build:native`                                                | Build the current-platform connector     |
| `npm run build:native:all`                                            | Cross-build all connector targets        |
| `npm run package:extension`                                           | Build the Chrome Web Store ZIP           |
| `npm run build:release:unix`                                          | Build macOS and Linux release archives   |
| `npm run build:release`                                               | Build extension, connector, and setup    |
| `npm run build:release:all`                                           | Build all 1.0.0 release artifacts        |
| `npm run release:sign:windows -- -CertificateThumbprint <thumbprint>` | Sign Windows release files               |
| `npm run release:sign:macos`                                          | Sign and notarize macOS release files    |
| `npm run release:sign:checksums`                                      | GPG-sign the release checksum manifest   |
| `go -C native-host test ./...`                                        | Run connector tests                      |
| `go -C installer/windows test ./...`                                  | Run installer tests                      |
| `npm run verify`                                                      | Run the extension quality gates          |

## Debugging

Use the service worker Inspect link on the extensions page to inspect Native Messaging
errors. Inspect the YouTube Music tab for content script errors. Chrome reports missing
host registration, invalid host output, and broken framing in its extension error log.
Connector diagnostics go to stderr only and never include track titles or URLs.

If the popup reports a missing connector, check the extension ID in the Native Messaging
manifest, the connector path, and whether the selected browser matches the registration. If
the connector is available but Discord is disconnected, start Discord Desktop and retry the
popup status.

## Acceptance test

1. Start Discord Desktop and enable activity sharing.
2. Open YouTube Music and play a track.
3. Confirm the Discord profile shows ListenPresence, the title, artist, thumbnail, and
   progress.
4. Pause and confirm the activity is cleared.
5. Play a different track and confirm the activity changes without reloading the tab.
6. Restart Discord Desktop and confirm the activity returns after it reconnects.
7. Repeat the flow in Chrome, Brave, or Chromium on every supported operating system.

## Project status

The connector supports Windows, macOS, and Linux. A Chrome Web Store listing does not install
a native executable automatically, so each operating system uses a separate one-time
per-user connector package.

## Legal notice

ListenPresence is not affiliated with, endorsed by, or sponsored by YouTube, Google, or
Discord. YouTube, YouTube Music, Google, Discord, and related marks belong to their
respective owners. Source code is licensed under MIT. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening an issue or pull request.
