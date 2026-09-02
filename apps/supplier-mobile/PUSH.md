# Push Notifications setup (Expo)

BoliBazzar uses Expo Push (which routes to APNs on iOS and FCM on Android) so a single API call notifies both platforms.

## Local dev / device testing

```bash
npx expo install expo-notifications expo-device
```

On app start, register the device with the backend (already stubbed in `lib/push.ts`).

## Server API

The Next.js backend exposes:

- `POST /api/push/register` — body `{ email, expo_token, platform }` — stores the token in `push_tokens` collection
- `POST /api/push/notify` — body `{ email, title, body, data }` — sends via https://exp.host/--/api/v2/push/send

Every time a new offer is added to a buyer's request, the backend automatically pushes
"🔔 New offer on your BoliBazzar request — ₹X from Store Name" to their device.

## iOS production

1. `eas credentials → iOS → Push Notifications key` — EAS creates & uploads it automatically.
2. Ensure `expo-notifications` is listed in `app.json → plugins`.

## Android production

1. Create a Firebase project → add Android app → download `google-services.json`.
2. `eas credentials → Android → FCM v1 → upload service account JSON`.
