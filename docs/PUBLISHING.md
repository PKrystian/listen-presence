# Publishing ListenPresence

Publishing has two separate deliverables: the browser extension package and native connector
packages for Windows, macOS, and Linux. The Chrome Web Store distributes only the extension.
The connector must remain a separate download because a store-installed extension cannot
silently install a native executable or register a Native Messaging host.

## 1. Make the source repository public

1. Create `PKrystian/listen-presence` on GitHub.
2. Keep `main` protected with required CI checks after the first workflow run.
3. Enable Dependabot, secret scanning, push protection, private vulnerability reporting,
   and CodeQL where available.
4. Set the repository description to explain that the connector is required and local.
5. Publish `README.md`, `PRIVACY.md`, `SECURITY.md`, `CONTRIBUTING.md`, and the license.
6. Create a GitHub release for every version and attach the extension ZIP, the self-contained
   `ListenPresence-Setup.exe`, and all macOS and Linux connector archives.

Do not put a Discord client secret, token, signing key, or a user's `config.json` in Git.

## 2. Prepare a release

From a clean checkout:

```powershell
npm ci
npm run verify
go -C native-host test ./...
$env:LISTENPRESENCE_EXTENSION_ID = '<published-extension-id>'
$env:LISTENPRESENCE_DISCORD_APPLICATION_ID = '<public-listenpresence-application-id>'
npm run build:release:all
```

The build writes `listenpresence-extension-v1.0.0.zip`, `ListenPresence-Setup.exe`, two
macOS ZIPs, two Linux tar.gz archives, and `SHA256SUMS.txt` under `dist/release`. It embeds
the published extension ID and public Discord application ID in connector installers. End
users do not provide any IDs. The Chrome Web Store ZIP contains only the extension and has
`manifest.json` at its root.

Record the Go version, Node version, commit, and SHA-256 checksums in the GitHub release.

### Windows signing

Obtain an OV code-signing certificate, Microsoft Artifact Signing identity, or approved
open-source signing service. The included script supports a certificate installed in the
current user's Personal certificate store and requires SignTool from the Windows SDK:

```powershell
npm run build:release:all
npm run release:sign:windows -- -CertificateThumbprint <40-character-thumbprint>
npm run release:verify:windows
```

The signing script uses SHA-256 and an RFC 3161 timestamp, signs the connector, rebuilds the
setup around that signed connector, then signs and verifies the setup. Rerun checksums after
every signature because signing changes the file bytes. Use the same trusted publisher
identity for every version. A self-signed certificate is not appropriate for public users.
Authenticode improves publisher trust, but a new signed publisher can still receive an
initial SmartScreen reputation warning. Microsoft Store distribution is the only supported
path that consistently avoids SmartScreen download warnings.

Remote signing services must preserve the same order: sign the connector, embed it by
rebuilding the setup, then sign the setup. If Microsoft Defender classifies a signed release
as malware rather than merely showing a SmartScreen reputation prompt, submit that exact
file to [Microsoft Security Intelligence](https://www.microsoft.com/wdsi/filesubmission) as
a software developer and wait for the verdict.

### macOS signing and notarization

Run the final macOS build on macOS with an Apple Developer Program membership, a Developer
ID Application certificate in the keychain, and a `notarytool` keychain profile:

```sh
xcrun notarytool store-credentials 'listenpresence-notary' \
  --apple-id '<apple-id>' \
  --team-id '<team-id>' \
  --password '<app-specific-password>'
export LISTENPRESENCE_APPLE_SIGNING_IDENTITY='Developer ID Application: Publisher (TEAMID)'
export LISTENPRESENCE_APPLE_NOTARY_PROFILE='listenpresence-notary'
npm run build:native:all
npm run release:sign:macos
```

The command signs both Mach-O connectors with hardened runtime and a secure timestamp,
creates the final macOS ZIPs, submits them with `notarytool --wait`, and checks them with
`codesign` and Gatekeeper. ZIP notarization tickets are available to Gatekeeper online and
cannot be stapled to the ZIP itself. Never publish the preliminary unsigned macOS ZIPs made
by a cross-platform build as final downloads.

### Release manifest signing

After all platform signatures and packages are final, recreate and sign the checksum list:

```powershell
npm run release:checksums
$env:LISTENPRESENCE_GPG_KEY_ID = '<16-to-40-character-key-id>'
npm run release:sign:checksums
```

Upload `SHA256SUMS.txt` and `SHA256SUMS.txt.asc`, and publish the signing key fingerprint in
the release notes and repository. The private Windows, Apple, and GPG signing keys must never
enter the repository or CI logs.

## 3. Publish to the Chrome Web Store

1. Register a Chrome Web Store developer account in the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
   Google currently requires developer registration, a one-time registration fee, and
   two-step verification before publishing.
2. Upload only `listenpresence-extension-v1.0.0.zip`. Do not include the connector binary
   in the extension package.
3. Fill in the Store Listing with the exact single purpose: `Shows the currently playing
YouTube Music track in Discord Rich Presence through a user-installed local connector.`
4. Explain in the first lines that Discord Desktop and the separate connector for the user's
   operating system are required. Never imply that the extension alone installs the
   connector.
5. Use screenshots that show the popup, the connector status, and the Discord activity.
6. In Privacy practices, declare the data read from YouTube Music and the local transfer to
   the connector and Discord Desktop. Local-only processing still needs disclosure.
7. Justify `storage`: it stores only the sharing toggle.
8. Justify `nativeMessaging`: it starts the user-installed local connector and sends the
   validated activity to Discord Desktop through local IPC.
9. Declare that the package does not use remote code. The image URL is data, not executable
   code.
10. Add a public privacy policy URL pointing to `PRIVACY.md`, for example the GitHub file
    URL or a GitHub Pages copy.
11. Set Distribution visibility to `Public` when the reviewer-ready release is complete.
    Use `Private` or `Unlisted` for initial testing if desired.
12. Add test instructions that mention supported operating systems, Chrome, Discord Desktop,
    a YouTube Music track, and the connector installer. Do not ask end users to provide an
    extension ID or Discord application ID.
13. Submit for review and wait for the review result. If approved, publish immediately or
    use deferred publishing.

Use the current [Chrome publishing guide](https://developer.chrome.com/docs/webstore/publish/),
[privacy fields guide](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy),
and [program policies](https://developer.chrome.com/docs/webstore/program-policies/policies).

## 4. Brave distribution

Brave supports Chromium extensions from the Chrome Web Store. Once the item is public in
the Chrome Web Store, users can choose `Add to Brave` from the listing. The self-contained
setup registers the published extension ID under both the Chrome and Brave registry paths.
End users do not run a browser-specific command.

See Brave's [extension installation guidance](https://support.brave.com/hc/en-us/articles/360017909112-How-can-I-add-extensions-to-Brave).

## 5. Discord tasks outside the repository

1. Create the `ListenPresence` application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Set its name, icon, description, and optional Rich Presence fallback art.
3. Configure the public Application ID in the release build. It is not a secret, and end
   users do not need to see or enter it.
4. Do not create a bot, OAuth flow, public interaction endpoint, or user token for this
   project.
5. Start Discord Desktop and enable activity sharing while testing.
6. Verify the button and image from a second Discord account because Rich Presence buttons
   are not shown to the person who sets the activity.

An application ID and local Rich Presence do not grant a developer profile badge. Discord
decommissioned the Active Developer Badge on December 5, 2025, and it is no longer
available to earn. Do not add a backend, bot, or application command to this project for
that purpose. See [docs/DISCORD_SETUP.md](DISCORD_SETUP.md) and Discord's [current badge
notice](https://support-dev.discord.com/hc/en-us/articles/10113997751447-Active-Developer-Badge).

## 6. Ongoing operations

- Keep the public privacy policy synchronized with the extension package.
- Review Chrome Web Store permission and data disclosures on every update.
- Publish connector checksums and source build commands with every release.
- Test Chrome and Brave after every manifest or installer change.
- Respond to security reports privately and remove a release if the connector is unsafe.
- Update the extension version and changelog before uploading a new package.
