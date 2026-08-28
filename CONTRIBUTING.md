# Contributing to ListenPresence

Thanks for helping improve ListenPresence. Contributions should preserve the local-only
architecture and make the security boundary easy to review.

## Prerequisites

- Node.js 22 or newer and npm
- Go 1.26 or newer for connector changes
- Chrome, Brave, or Chromium for manual extension testing
- Discord Desktop for Rich Presence testing

## Getting started

```powershell
npm ci
npm run build:extension
```

Load `dist/extension` as an unpacked extension. Build and register the connector using
[docs/INSTALLATION.md](docs/INSTALLATION.md).

## Quality gates

Run the complete extension check:

```powershell
npm run verify
```

For connector changes also run:

```powershell
go -C native-host test ./...
npm run build:native:all
```

Behavior changes require tests for normal, empty, invalid, and failure paths where those
paths apply. Popup changes require keyboard and narrow-width checks. Integration changes
require the Chrome, Brave, and Chromium manual acceptance flow on affected operating
systems.

## Project conventions

- Keep content script access limited to `https://music.youtube.com/*`.
- Keep the Native Messaging command set closed and validate every field.
- Never add a user token, OAuth flow, cookie access, password access, or Discord page code.
- Never add a backend, telemetry, public listener, remote script, or `<all_urls>`.
- Use plain hyphens and no emoji in shipped files.
- Avoid explanatory code comments. Keep only functional tool directives.
- Keep user-facing errors actionable without exposing track content in logs.

## Pull requests

Use the pull request template. Describe the privacy impact, permissions, Native Messaging
changes, and manual test browsers. Update the relevant documentation and
`THIRD_PARTY_NOTICES.md` when adding a dependency or external asset.

## Releases

Update the version in `package.json`, the package lock, and `CHANGELOG.md`. Follow
`docs/RELEASE_CHECKLIST.md`. Do not publish a connector binary without a reproducible
build command and a matching source release.
