# Changelog

All notable changes to ListenPresence are documented here.

## [0.1.0] - Unreleased

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
  time only as a fallback, preventing stale end times after automatic track changes.
