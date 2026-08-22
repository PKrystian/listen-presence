# Privacy

ListenPresence is a local-first browser extension with a local Windows connector. It has
no ListenPresence account system, analytics, advertising system, application server, or
telemetry service.

## Data flow

1. The content script runs only on `https://music.youtube.com/*`.
2. It reads the visible player metadata, Media Session metadata, media playback state,
   current position, duration, and the current YouTube Music URL.
3. It sends the track snapshot to the extension service worker through extension
   messaging.
4. If sharing is enabled, the service worker builds a Rich Presence activity and sends it
   through Chromium Native Messaging.
5. Chromium starts the installed connector executable on demand. The connector validates
   the message and sends `SET_ACTIVITY` or a clear activity command over Discord's local
   IPC named pipe.

There is no ListenPresence network request in this flow. The Discord desktop client may
make its own request for a public thumbnail URL supplied as the Rich Presence image. That
request goes to the image host selected by YouTube Music and is governed by that provider's
privacy policy. ListenPresence does not download, proxy, cache, or upload the image.

## Data stored locally

The extension stores only the sharing toggle in `chrome.storage.local`. The connector
stores its Discord application ID in a local `config.json` created by the installer. It
does not store track history, titles, artists, albums, images, Discord account data,
cookies, browser history, passwords, or authentication credentials.

## Data not accessed

The project does not read cookies, browsing history, passwords, form data, Discord pages,
Google pages, Discord user tokens, Google OAuth tokens, or data from other websites. It
does not inject code into `discord.com` and does not use `<all_urls>`.

## Local connector

The Windows installer registers a Native Messaging manifest under the current user's
`HKCU` registry hive and copies the connector under `%LOCALAPPDATA%\ListenPresence`. It
does not create a service, scheduled task, public listener, or Windows startup entry. The
connector exists only while Chromium has an open Native Messaging connection.

## Contact

Privacy questions can be sent through the maintainer contact channels at
https://github.com/PKrystian. Do not include sensitive track history or credentials in a
public issue.
