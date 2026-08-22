# ListenPresence UI guidelines

The extension popup is intentionally small and dependency-free. New controls should
follow these rules so the popup remains understandable when the connector is missing,
Discord is closed, or YouTube Music has no readable metadata.

## Core principles

- Every action has a visible text label or an accessible name.
- Never communicate state with color alone. Include text such as `Connected`, `Missing`,
  or `Discord Desktop is not running`.
- The sharing toggle exposes its state through a native checkbox and its label.
- Errors and status changes are available to assistive technology through an `aria-live`
  region or `role="alert"` when immediate attention is needed.
- The privacy explanation stays visible in the popup. Do not hide it behind a tooltip or
  a settings page.
- Links open the documented external destination and must not silently collect analytics.

## Layout and interaction

- Keep the popup usable at a 320 px viewport width and at 200 percent browser zoom.
- Use native buttons and form controls with visible keyboard focus.
- Keep the primary action obvious. Installing the connector is the primary recovery action
  when the connector is missing.
- Do not disable the sharing toggle merely because Discord is unavailable. The user should
  be able to change the preference while Discord is closed.
- Status rows should remain readable while they are loading, connected, disconnected, or
  showing an error.
- Use plain language and explain that the local connector is required before linking to an
  installer or release.

## Adding a UI change

Before opening a pull request, check the normal, loading, missing-connector, disconnected-
Discord, disabled-sharing, and error states. Test keyboard navigation, visible focus,
screen-reader names, narrow width, and 200 percent zoom. Run the repository quality gates
after changing popup HTML, CSS, or behavior.
