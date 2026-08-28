# Discord setup

The connector needs a Discord application ID. It does not need OAuth, a bot user, a
Discord password, a user token, or a public HTTP endpoint.

## Create the application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application named `ListenPresence`.
3. On the General Information page, copy the Application ID.
4. Add a square application icon if you want a branded fallback icon in Discord.
5. Do not create a bot, add OAuth scopes, or copy a client secret for this connector.

The application name shown by Discord comes from the Developer Portal application. The
RPC activity payload supplies the track details and state; it does not use a user identity
token.

## Configure a release

The maintainer creates one `ListenPresence` Discord application and embeds its public
Application ID in every platform's connector package. End users do not create an application
and do not enter an ID.

For a local source build, pass the Application ID to the developer installer:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\windows\install.ps1 `
  -ExtensionId <extension-id> `
  -DiscordApplicationId <application-id> `
  -Browser Both
```

On macOS or Linux:

```sh
sh installer/unix/install.sh \
  --extension-id <extension-id> \
  --discord-application-id <application-id> \
  --browser all
```

The installer writes the non-secret ID to `config.json` in the per-user ListenPresence
application data directory.

## Test Rich Presence

Start Discord Desktop, open User Settings, confirm activity sharing is enabled, then play
a track in YouTube Music. Discord desktop must be running for local Rich Presence. The
button is visible to other viewers, so use a second account or ask a friend to verify it.

## Verification and discovery

Discord verification and App Directory discovery are separate programs for apps that use
Discord's platform features. They are not required for a local Rich Presence connector.
Do not claim that ListenPresence is verified or endorsed by Discord. If you later publish a
separate Discord app, review the [verification requirements](https://support-dev.discord.com/hc/en-us/articles/23926564536471-How-Do-I-Get-My-App-Verified)
and [Discovery requirements](https://docs.discord.com/developers/discovery/enabling-discovery).
