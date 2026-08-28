# ListenPresence - working rules

ListenPresence is an unofficial, open-source Chromium extension and local desktop
connector. It reads playback metadata from YouTube Music and publishes Discord Rich
Presence through official local RPC/IPC. There is no backend, account system, telemetry,
Discord user token, or browser automation.

## Non-negotiable house style

This public repository should read like a careful human-maintained project.

1. No emoji in source code, documentation, UI text, or commit messages.
2. Use a plain hyphen. Do not use em-dash or en-dash characters.
3. Do not add explanatory code comments. Keep only functional directives such as
   `//go:build`, `eslint-disable`, `@ts-expect-error`, `@license`, and equivalent tool
   directives.
4. Do not add debug logging, user tracking, defensive catch blocks that hide errors, or
   dependencies that are not needed by the extension or connector.
5. Never add Discord OAuth, user tokens, cookies, passwords, self-bot behavior, Discord
   page automation, a public server, or a remote code loader.

## Security boundaries

- The content script matches only `https://music.youtube.com/*`.
- The extension stores only local settings in `chrome.storage.local`.
- Native Messaging accepts `ping`, `set_activity`, `clear_activity`, and `get_status`.
- Native Messaging messages use strict schemas and reject unknown fields.
- The connector accepts only HTTPS YouTube image URLs and YouTube Music watch URLs.
- Discord communication uses local IPC only and never a web API or OAuth flow.
- The connector is started by `connectNative`; it is not a service and does not auto-start
  with Windows.

## Quality gates

Before a change is ready:

```text
npm ci
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build:extension
go -C native-host test ./...
npm run build:native:all
go -C installer/windows test ./...
```

Release builds also require `LISTENPRESENCE_EXTENSION_ID` and
`LISTENPRESENCE_DISCORD_APPLICATION_ID` before `npm run build:release`. These values are
maintainer configuration; they are not requested from end users.

Public connector releases require Authenticode signatures on the Windows connector and
setup, Developer ID signing and Apple notarization for both macOS connectors, and a detached
GPG signature for the final checksum manifest. Never publish preliminary unsigned connector
artifacts as final downloads.

The Go commands require Go 1.22 or newer. If the change affects the popup, content
script, installer, or Discord integration, perform the manual test in
`docs/RELEASE_CHECKLIST.md` on both Chrome and Brave.

Tests should cover success, empty, invalid, and error paths for every new behavior.

## Release hygiene

Every release updates `package.json`, the matching package lock, and `CHANGELOG.md`.
Release archives must include source notices and the Windows installer scripts. Never
publish a connector binary without documenting how it was built.

## Git and files

Leave commits, tags, branches, and publishing to the repository owner. Keep generated
files out of Git unless a document explicitly says they are release artifacts.

## Layout

- `extension/src/content/` contains the YouTube Music parser and playback observer.
- `extension/src/background/` contains the MV3 service worker and Native Messaging client.
- `extension/src/popup/` contains the dependency-light popup.
- `extension/src/shared/` contains contracts, validation, and Rich Presence building.
- `native-host/internal/nativeprotocol/` contains framing and message validation.
- `native-host/internal/discordipc/` contains local Discord IPC.
- `native-host/internal/connector/` contains the limited Native Messaging command loop.
- `installer/windows/` contains per-user Chrome, Brave, and Chromium registration.
- `docs/` contains architecture, installation, Discord setup, and release guidance.

## Contribution decisions

Keep UI behavior accessible from the keyboard and readable at browser zoom. Do not use
color as the only status signal. Keep the popup strings in plain English unless a future
localization plan is added. Any new network request must be rejected unless the privacy
notice and threat model are updated first.
