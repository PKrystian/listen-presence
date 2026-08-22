# ListenPresence - working rules

The project is a Manifest V3 Chromium extension paired with a small Go Native Messaging
host for Windows. The extension reads only YouTube Music playback metadata and the host
publishes it to Discord Desktop through local RPC/IPC.

Follow `AGENTS.md` for the complete repository rules. The important constraints are:

- no Discord user tokens, OAuth, cookies, passwords, self-bots, or Discord page automation
- no backend, telemetry, public listener, remote code, or `<all_urls>` permission
- no explanatory code comments, emoji, em-dash, or en-dash characters
- only the four documented Native Messaging commands are accepted
- changes require tests and the local quality gates before release

The extension is launched from `dist/extension`. The connector is launched by Chromium
through `chrome.runtime.connectNative` after the Windows registry manifest is installed.
