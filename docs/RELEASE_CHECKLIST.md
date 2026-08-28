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
- Run `npm run build:release:all` with the published extension ID and public Discord
  application ID.
- Run `go -C native-host test ./...` on Windows, macOS, and Linux.
- Build the connector on Windows, macOS, and Linux for amd64 and arm64 release targets.
- Confirm `dist/release/ListenPresence-Setup.exe` contains the connector and release IDs.
- Confirm every macOS ZIP and Linux tar.gz archive contains the connector, installer scripts, release
  IDs, license, copyright, and third-party notices.
- Confirm `listenpresence-extension-v1.0.0.zip` has `manifest.json` at the archive root and
  contains no source maps or connector binaries.
- Authenticode-sign the Windows connector before embedding it, rebuild the setup, then sign
  and verify the final setup with `npm run release:verify:windows`.
- Sign and notarize both macOS connector architectures, then verify them with `codesign` and
  Gatekeeper on macOS before publishing the final ZIPs.
- Recreate `SHA256SUMS.txt` only after every platform signature is final.
- Create and verify `SHA256SUMS.txt.asc` with the maintainer's published GPG key.
- Verify every published artifact against `SHA256SUMS.txt`.
- Confirm no unsigned Windows or preliminary unnotarized macOS artifact is attached to the
  public release.
- Inspect the extension manifest and confirm there is no `<all_urls>` permission.
- Inspect the installer registry entries and confirm they use `HKCU` only.

## Manual acceptance

- Test fresh installation with `ListenPresence-Setup.exe` in Chrome with Discord Desktop running.
- Test fresh installation with `ListenPresence-Setup.exe` in Brave with Discord Desktop running.
- Test fresh installation with `install.sh` on Intel and Apple Silicon macOS where hardware
  is available.
- Test fresh installation with `install.sh` on amd64 and arm64 Linux where hardware is
  available, including packaged Discord variants used by the release audience.
- Play a track and verify title, artist, album, image, timestamps, and button.
- Pause and verify clear activity.
- Seek and verify timestamps update.
- Use next and previous and verify all metadata changes within 2 seconds without showing the
  previous track's image or timing.
- Open two YouTube Music tabs and confirm that pausing or closing one does not clear the
  activity of the other playing tab.
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
- Publish `ListenPresence-Setup.exe`, macOS and Linux archives, installer source scripts, and
  source notices with the release.
- Configure repository description, topics, issue templates, pull request template, and
  security reporting.
- Publish Chrome Web Store privacy answers that match `PRIVACY.md`.
- Explain that the local connector is a separate required installation.
