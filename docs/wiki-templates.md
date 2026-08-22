# ListenPresence documentation templates

This repository keeps project documentation in Markdown so it can be reviewed together
with code. Use the following templates when adding a page. Keep private release keys,
Discord secrets, user data, and local configuration out of the repository.

## Architecture note

```markdown
# Component or decision name

## Purpose

What problem does this component or decision solve?

## Data flow

Describe inputs, outputs, trust boundaries, and whether data leaves the machine.

## Security constraints

List allowed inputs, rejected inputs, permissions, and failure behavior.

## Alternatives

Record the relevant alternatives and why they were not selected.

## Verification

List tests, manual checks, and platform-specific checks.
```

## Troubleshooting note

```markdown
# Symptom

## Expected behavior

## Checks

1. Check the browser extension ID.
2. Check the per-user Native Messaging registry entry.
3. Check that Discord Desktop is running and activity sharing is enabled.

## Safe recovery

Describe reversible steps. Never request a password, cookie, Discord user token, or
client secret.

## Logs and privacy

State which local logs are safe to share and remove track URLs or other personal data.
```

## Release note

```markdown
# Version

## User-visible changes

## Permission or privacy changes

## Connector and installer changes

## Tests and platforms checked

## Upgrade and rollback notes
```

## Privacy or security review

```markdown
# Review title

## Data involved

## Source and destination

## Retention

## User control

## Threats considered

## Decision and follow-up
```
