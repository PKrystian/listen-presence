# Changelog

All notable changes to ListenPresence are documented here.

## [1.0.0] - 2026-08-28

### Added

- Native connector support for Windows, macOS, and Linux.
- Per-user macOS and Linux installers for Chrome, Brave, and Chromium.
- Cross-platform connector builds, release packages, and CI coverage.
- Tests for track-transition consistency and multi-tab playback selection.
- Maintainer tooling for Windows Authenticode signing, macOS Developer ID signing and
  notarization, and detached GPG signatures for release checksums.

### Changed

- Prefer matching, highest-resolution Media Session album art over stale player images.
- Observe YouTube Music text changes and sample playback every 500 milliseconds.
- Use precise media time when it agrees with the visible player timer.
- Register the self-contained Windows setup for Chromium in addition to Chrome and Brave.
- Package macOS connectors as ZIP archives accepted by Apple's notary service.

### Fixed

- Prevent a new title from being published with the previous track's image, URL, or timing.
- Limit track-transition stabilization to 1.2 seconds so complete metadata arrives within the
  2-second update target.
- Prevent paused or closed secondary YouTube Music tabs from clearing the activity of a tab
  that is still playing.
- Ignore hidden stale YouTube Music player bars when reading metadata.
- Respond to Discord IPC keepalive frames and complete short IPC writes reliably.

## [0.1.0] - 2026-08-25

### Added

- Initial Manifest V3 extension for YouTube Music.
- Local Native Messaging protocol with a Windows Go connector.
- Discord Desktop Rich Presence through local IPC.
- Self-contained Windows setup for Chrome and Brave.
- Privacy, security, contribution, support, and release documentation.

### Changed

- Restyled the popup around the ListenPresence dark, blue-accented UI system.
- Removed the long privacy panel from the popup; complete privacy details remain in the
  repository documentation.
- Prefer active media timing while playback is available and use the YouTube Music player-bar
  time as a fallback.
