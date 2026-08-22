# Native Messaging protocol

The extension uses Chromium Native Messaging with host name
`com.listenpresence.connector`. The browser frames each UTF-8 JSON message with a
little-endian 32-bit byte length. The host accepts messages up to 1 MiB and rejects unknown
fields.

## Request envelope

Every request contains:

```json
{
  "version": 1,
  "id": "request-id",
  "type": "ping"
}
```

The only valid `type` values are `ping`, `set_activity`, `clear_activity`, and
`get_status`. A request with an unknown type is rejected. `id` is echoed in the response.

## Activity request

`set_activity` accepts only a Discord Listening activity:

```json
{
  "version": 1,
  "id": "request-id",
  "type": "set_activity",
  "activity": {
    "type": 2,
    "details": "Track title",
    "state": "Artist - Album",
    "assets": {
      "large_image": "https://i.ytimg.com/vi/example/hqdefault.jpg",
      "large_text": "YouTube Music"
    },
    "timestamps": {
      "start": 1700000000,
      "end": 1700000210
    },
    "buttons": [
      {
        "label": "Open in YouTube Music",
        "url": "https://music.youtube.com/watch?v=example"
      }
    ]
  }
}
```

The host validates the activity type, text lengths, timestamp order, HTTPS image hosts,
and the YouTube Music button URL. It never maps a request field to an arbitrary Discord
command or process operation.

## Response envelope

Success responses have `ok: true` and a typed result. Errors have `ok: false` with a
stable code and a short message. Track data is not written to stderr.

## Host registration

On Windows, Chrome and Brave read the manifest path from the current user's registry hive:

```text
HKCU\Software\Google\Chrome\NativeMessagingHosts\com.listenpresence.connector
HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.listenpresence.connector
```

The manifest has `type: stdio`, an absolute executable path, and one exact
`chrome-extension://<id>/` entry in `allowed_origins`.
