# ListenPresence architecture

ListenPresence has two processes and one browser extension. The extension has access to
YouTube Music only. The native host has access to Discord Desktop only through a local
IPC pipe.

## Data flow

```text
YouTube Music tab
  -> content script
  -> MV3 service worker
  -> chrome.runtime.connectNative
  -> Go Native Messaging host
  -> Discord local IPC
  -> Discord Desktop Rich Presence
```

The content script sends a snapshot when track identity, playback state, seek position,
duration, or image changes. During a track transition it waits up to 1.2 seconds for the
title, URL, and image sources to agree, preventing mixed old and new metadata. The service
worker tracks each YouTube Music tab, keeps a playing tab selected when another tab is
paused, and prefers an active playing tab. It builds a Listening activity and deduplicates
identical payloads. Timestamps let Discord render progress continuously between updates.

## Extension

`extension/src/content/metadata-parser.ts` reads the player bar, media element, Media
Session metadata, and current route. `media-observer.ts` watches media events, DOM changes,
history changes, and YouTube Music navigation events. `content-script.ts` limits outgoing
updates and sends them to the service worker.

`extension/src/background/service-worker.ts` owns the sharing setting and calls the native
client. `native-client.ts` opens one Native Messaging port when needed, matches responses
by request ID, handles disconnects, and keeps the last status for the popup.

The popup is plain HTML, TypeScript, and CSS. It can disable sharing, show connector and
Discord status, link to connector installation, and explain the privacy boundary.

## Connector

The Go host reads Chromium Native Messaging frames from stdin and writes responses to
stdout. It rejects invalid JSON, unknown fields, unknown commands, oversized messages,
arbitrary image hosts, and arbitrary button URLs. Diagnostics go to stderr.

The connector accepts four requests:

| Request          | Discord operation                                  |
| ---------------- | -------------------------------------------------- |
| `ping`           | No Discord operation                               |
| `set_activity`   | `SET_ACTIVITY` with a validated Listening activity |
| `clear_activity` | `SET_ACTIVITY` with a null activity                |
| `get_status`     | Local status and an IPC probe                      |

The host tries `discord-ipc-0` through `discord-ipc-9`, performs the RPC handshake, and
reconnects when Discord Desktop restarts. Windows uses named pipes. macOS and Linux use the
Discord Unix socket search order based on `XDG_RUNTIME_DIR`, `TMPDIR`, `TMP`, `TEMP`, and
`/tmp`, with the Flatpak Discord socket as a compatibility candidate. It stores the last
activity in memory only so it can restore it after a reconnect. When Chromium closes the
Native Messaging pipe, the host clears the activity and exits.

## Installation boundary

The Windows installer copies the executable to the current user's local application data
directory and registers Chrome, Brave, and Chromium manifests in `HKCU`. The macOS and Linux installer copies the
connector to the current user's application data directory and writes browser-specific
Native Messaging manifests under the user's browser configuration. Every manifest contains
the exact extension origin. No service, scheduled task, or startup entry is created.
