# Release checklist

## Ownership and content

- Confirm the maintainer contact links.
- Confirm the project is still described as unofficial and independent.
- Review `PRIVACY.md`, `SECURITY.md`, `COPYRIGHT.md`, and `THIRD_PARTY_NOTICES.md`.
- Check dependency licenses and generate a software bill of materials if a binary archive
  is distributed.

## Quality

- Run `npm ci`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run format:check`.
- Run `npm test`.
- Run `npm run build:extension`.
- Run `npm run build:release` with the published extension ID and public Discord application ID.
- Run `go -C native-host test ./...` on Windows.
- Build the connector with the documented Go command on Windows.
- Confirm `dist/release/ListenPresence-Setup.exe` contains the connector and release IDs.
- Inspect the extension manifest and confirm there is no `<all_urls>` permission.
- Inspect the installer registry entries and confirm they use `HKCU` only.

## Manual acceptance

- Test fresh installation with `ListenPresence-Setup.exe` in Chrome with Discord Desktop running.
- Test fresh installation with `ListenPresence-Setup.exe` in Brave with Discord Desktop running.
- Play a track and verify title, artist, album, image, timestamps, and button.
- Pause and verify clear activity.
- Seek and verify timestamps update.
- Use next and previous and verify automatic track changes.
- Navigate to another YouTube Music route and back.
- Restart Discord Desktop and verify reconnect and activity restoration.
- Close the browser and verify the connector exits and activity is cleared.
- Toggle sharing off and confirm no activity is published.
- Test missing connector, missing Discord, malformed host message, and no-image fallback.

## GitHub and distribution

- Follow `docs/PUBLISHING.md` for public repository, Chrome Web Store, Brave, release, and
  Discord tasks.
- Update `package.json` and the package lock version.
- Update `CHANGELOG.md`.
- Build the extension archive from a clean checkout.
- Build the connector with a recorded Go version and commit.
- Publish `ListenPresence-Setup.exe`, installer source scripts, and source notices with the release.
- Configure repository description, topics, issue templates, pull request template, and
  security reporting.
- Publish Chrome Web Store privacy answers that match `PRIVACY.md`.
- Explain that the local connector is a separate required installation.
