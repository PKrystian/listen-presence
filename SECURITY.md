# Security policy

## Supported version

Security fixes are applied to the current version on the main branch. Historical builds
and forks are not maintained by the ListenPresence project.

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could expose browser data, execute
untrusted code, bypass Native Messaging validation, access Discord credentials, or change
the connector's local IPC behavior.

Use GitHub private vulnerability reporting when it is enabled for the repository. If it is
not available, contact the maintainer through a private GitHub channel. Include the
affected version or commit, reproduction steps, operating system and browser, expected
impact, and suggested mitigation if known. Do not include real credentials or private
track history.

## Threat model

The extension treats YouTube Music DOM content and remote thumbnail URLs as untrusted. The
host treats every Native Messaging byte as untrusted. The host therefore uses a maximum
frame size, strict JSON decoding, a fixed command allowlist, bounded strings, HTTPS-only
YouTube image hosts, and YouTube Music-only button URLs.

The connector receives the Chromium caller origin and accepts only a Chromium extension
origin. The installer limits access further through the browser-specific Native Messaging
manifest `allowed_origins` entry. The connector never executes a command, opens a shell,
listens on TCP, or accepts a Discord token.

## Security-sensitive changes

Changes to manifest permissions, content script matches, Native Messaging schemas, URL
validation, installer registry paths, Discord IPC framing, or local file handling require a
security review and tests for invalid input.
